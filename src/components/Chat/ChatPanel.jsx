import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Send, Trash2, SlidersHorizontal, Image as ImageIcon } from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'
import {
  generateChatReply,
  generateImage as callGenerateImage,
  buildImagePrompt,
} from '../../utils/api'
import { composeChatSystemPrompt, CHAT_OPENERS, CHAT_HEATS } from '../../utils/chatPrompt'
import { parseReplyBlocks, stripProtocolTags, sleep } from '../../utils/chatProtocol'
import {
  resolveIdentityLock,
  modelSupportsReferenceImages,
  mergeNegativePrompt,
} from '../../utils/imageGeneration'
import { getImageEndpointForModel } from '../../utils/models'
import { DEFAULT_IMAGE_MODEL } from '../../utils/modelConstants'
import {
  base64ToDataUrl,
  compressImageBase64,
  generateId,
} from '../../utils/imageUtils'

function visualLine(character) {
  const bits = [
    character.species,
    character.hair_color,
    character.hair_style,
    character.eye_color,
    character.skin_tone,
    character.facial_structure,
    character.default_outfit === 'Custom'
      ? character.default_outfit_custom
      : character.default_outfit,
  ].filter((v) => v && v !== 'Custom')
  return bits.join(', ')
}

export default function ChatPanel() {
  const character = useCharacterStore((s) => s.character)
  const apiKey = useCharacterStore((s) => s.apiKey)
  const selectedTextModel = useCharacterStore((s) => s.selectedTextModel)
  const selectedImageModel = useCharacterStore((s) => s.selectedImageModel)
  const availableImageModels = useCharacterStore((s) => s.availableImageModels)
  const generatedImages = useCharacterStore((s) => s.generatedImages)
  const presentationMode = useCharacterStore((s) => s.presentationMode)
  const backstory = useCharacterStore((s) => s.backstory)
  const chatCanon = useCharacterStore((s) => s.chatCanon)
  const chat = useCharacterStore((s) => s.chat)
  const replaceChatApiAndUi = useCharacterStore((s) => s.replaceChatApiAndUi)
  const updateChatSettings = useCharacterStore((s) => s.updateChatSettings)
  const clearChat = useCharacterStore((s) => s.clearChat)
  const addToast = useToastStore((s) => s.addToast)

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [typing, setTyping] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState(null)
  const endRef = useRef(null)
  const abortRef = useRef(false)

  const name = String(character.name || '').trim()
  const portrait = generatedImages?.profile || generatedImages?.tpose
  const settings = chat?.settings || {}
  const userPersona = settings.userPersona || { name: '', notes: '', addressAs: '' }

  const systemPrompt = useMemo(
    () =>
      composeChatSystemPrompt({
        character,
        chatCanon,
        backstory,
        settings,
        visualLine: visualLine(character),
      }),
    [character, chatCanon, backstory, settings]
  )

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat?.ui?.length, typing])

  useEffect(() => () => {
    abortRef.current = true
  }, [])

  const trySendPic = async (picDescription) => {
    const lock = resolveIdentityLock(useCharacterStore.getState().generatedImages)
    if (!lock) {
      addToast('No identity lock yet — generate a T-pose lock to send photos.', 'warning')
      return null
    }
    const modelId = selectedImageModel || DEFAULT_IMAGE_MODEL
    const canRef = modelSupportsReferenceImages(availableImageModels, modelId)
    if (!canRef) {
      addToast('Photo send needs a Gemini image model (reference images).', 'warning')
      return null
    }
    const extraNegative = mergeNegativePrompt('fullbody', presentationMode, '')
    const prompt = `${buildImagePrompt(character, 'fullbody', {
      presentationMode,
      hasReferenceImage: true,
      extraNegative,
    })} Phone selfie / candid photo sent from their device: ${picDescription}.`
    try {
      const raw = await callGenerateImage(apiKey, prompt, {
        aspectRatio: '3:4',
        modelId,
        negativePrompt: extraNegative,
        imageEndpoint:
          availableImageModels.length > 0
            ? getImageEndpointForModel(availableImageModels, selectedImageModel)
            : 'generateContent',
        referenceImageBase64: lock,
      })
      return await compressImageBase64(raw)
    } catch (e) {
      addToast(`Photo failed: ${e.message}`, 'error', 5000)
      return null
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const userText = input.trim()
    if (!userText || sending) return
    if (!apiKey) {
      addToast('Please set your API key in Settings first.', 'warning')
      return
    }

    abortRef.current = false
    const prev = useCharacterStore.getState().chat
    const userUi = { id: generateId(), role: 'user', text: userText }
    const userApi = { role: 'user', parts: [{ text: userText }] }
    const nextApi = [...(prev.api || []), userApi]
    const nextUi = [...(prev.ui || []), userUi]
    replaceChatApiAndUi({ ui: nextUi, api: nextApi })
    setInput('')
    setSending(true)

    try {
      const reply = await generateChatReply(apiKey, systemPrompt, nextApi, {
        modelId: selectedTextModel,
      })
      const clean = stripProtocolTags(reply) || reply
      const apiModel = { role: 'model', parts: [{ text: clean }] }
      const blocks = parseReplyBlocks(reply)
      let uiAcc = nextUi

      if (!blocks.length) {
        uiAcc = [...uiAcc, { id: generateId(), role: 'model', text: clean }]
        replaceChatApiAndUi({ ui: uiAcc, api: [...nextApi, apiModel] })
      } else {
        for (const block of blocks) {
          if (abortRef.current) break
          setTyping(true)
          await sleep(block.delayMs)
          if (abortRef.current) break
          setTyping(false)
          let image = null
          if (block.picDescription) {
            image = await trySendPic(block.picDescription)
          }
          uiAcc = [
            ...uiAcc,
            {
              id: generateId(),
              role: 'model',
              text: block.text,
              ...(image ? { image } : {}),
            },
          ]
          replaceChatApiAndUi({ ui: uiAcc, api: [...nextApi, apiModel] })
        }
      }
    } catch (err) {
      replaceChatApiAndUi({
        ui: [
          ...nextUi,
          {
            id: generateId(),
            role: 'system',
            text: err instanceof Error ? err.message : String(err),
          },
        ],
        api: prev.api || [],
      })
      addToast('Chat failed: ' + (err instanceof Error ? err.message : String(err)), 'error', 5000)
    } finally {
      setSending(false)
      setTyping(false)
    }
  }

  const handleOpenerChange = (opener) => {
    if (opener === settings.opener) return
    const hasThread = (chat.ui || []).length > 0
    if (hasThread && !window.confirm('Change scene? This clears the current thread.')) return
    clearChat()
    updateChatSettings({ opener })
  }

  if (!name) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <MessageCircle size={40} className="mx-auto text-slate-700 mb-3" />
          <h2 className="text-lg font-bold text-white mb-1">Name the character first</h2>
          <p className="text-sm text-slate-500">
            Fill in a name on the Identity sheet (or Randomize All), then come back to text them.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex min-h-0 bg-slate-950">
      <aside className="hidden md:flex w-64 lg:w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-900/80">
        <div className="aspect-[3/4] bg-slate-950 overflow-hidden border-b border-slate-800">
          {portrait ? (
            <img src={base64ToDataUrl(portrait)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-700">
              <ImageIcon size={36} />
            </div>
          )}
        </div>
        <div className="p-4">
          <h2 className="text-white font-bold truncate">{name}</h2>
          <p className="text-xs text-slate-500 truncate">
            {character.species || 'Unknown species'}
            {character.archetype ? ` · ${character.archetype}` : ''}
          </p>
          <p className="text-[11px] text-slate-600 mt-3 leading-relaxed">
            Photos follow Canonical / Thirst from Generation Studio. Generate a T-pose lock for selfies.
          </p>
        </div>
      </aside>

      <section className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="h-14 shrink-0 border-b border-slate-800 flex items-center justify-between px-4 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="md:hidden w-8 h-8 rounded-full overflow-hidden bg-slate-800 shrink-0">
              {portrait ? (
                <img src={base64ToDataUrl(portrait)} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{name}</p>
              <p className="text-[10px] text-emerald-500/80">
                {typing ? 'Typing…' : 'Active now'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className={`p-2 rounded-lg ${showSettings ? 'text-cyan-400 bg-slate-800' : 'text-slate-500 hover:text-white'}`}
              title="Scene, heat, you"
            >
              <SlidersHorizontal size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                if ((chat.ui || []).length === 0) return
                if (window.confirm('Clear this chat thread?')) clearChat()
              }}
              className="p-2 rounded-lg text-slate-500 hover:text-red-400"
              title="Clear chat"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        {showSettings && (
          <div className="shrink-0 border-b border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/60">
            <div>
              <label className="section-heading mb-1 block">Scene</label>
              <select
                value={settings.opener || 'strangers'}
                onChange={(e) => handleOpenerChange(e.target.value)}
                className="input-field w-full text-xs"
              >
                {CHAT_OPENERS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="section-heading mb-1 block">Heat</label>
              <select
                value={settings.heat || 'flirty'}
                onChange={(e) => updateChatSettings({ heat: e.target.value })}
                className="input-field w-full text-xs"
              >
                {CHAT_HEATS.map((h) => (
                  <option key={h.id} value={h.id}>{h.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="section-heading mb-1 block">They call you</label>
              <input
                value={userPersona.addressAs || ''}
                onChange={(e) => updateChatSettings({ userPersona: { addressAs: e.target.value } })}
                placeholder="Optional nickname"
                className="input-field w-full text-xs"
              />
            </div>
            <div>
              <label className="section-heading mb-1 block">Your name</label>
              <input
                value={userPersona.name || ''}
                onChange={(e) => updateChatSettings({ userPersona: { name: e.target.value } })}
                placeholder="Who they think you are"
                className="input-field w-full text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="section-heading mb-1 block">Notes about you</label>
              <input
                value={userPersona.notes || ''}
                onChange={(e) => updateChatSettings({ userPersona: { notes: e.target.value } })}
                placeholder="What they know or assume"
                className="input-field w-full text-xs"
              />
            </div>
            <p className="sm:col-span-3 text-[11px] text-slate-500">
              Filthy heat can use Mature sheet details. Photos still use Generation Studio presentation (Canonical / Thirst).
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {(chat.ui || []).length === 0 && (
            <p className="text-center text-xs text-slate-600 py-8">
              Start the thread. They will text like {name}.
            </p>
          )}
          {(chat.ui || []).map((msg) => (
            <ChatBubble
              key={msg.id}
              msg={msg}
              portrait={portrait}
              onOpenImage={(img) => setFullscreenImage(img)}
            />
          ))}
          {typing && (
            <div className="flex items-end gap-2">
              <Avatar portrait={portrait} />
              <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:120ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:240ms]" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSend} className="shrink-0 border-t border-slate-800 p-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${name}…`}
            disabled={sending}
            className="input-field flex-1 text-sm"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="btn-primary px-4 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
      </section>

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setFullscreenImage(null)}
        >
          <img
            src={base64ToDataUrl(fullscreenImage)}
            className="max-w-full max-h-full object-contain rounded-lg border border-slate-700"
            alt=""
          />
        </div>
      )}
    </div>
  )
}

function Avatar({ portrait }) {
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 shrink-0">
      {portrait ? (
        <img src={base64ToDataUrl(portrait)} alt="" className="w-full h-full object-cover" />
      ) : null}
    </div>
  )
}

function ChatBubble({ msg, portrait, onOpenImage }) {
  if (msg.role === 'system') {
    return (
      <p className="text-center text-[11px] text-red-400/80 px-6">{msg.text}</p>
    )
  }
  const mine = msg.role === 'user'
  return (
    <div className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
      {!mine && <Avatar portrait={portrait} />}
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
          mine
            ? 'bg-purple-600 text-white rounded-br-sm'
            : 'bg-slate-800 text-slate-200 rounded-bl-sm'
        }`}
      >
        {msg.text}
        {msg.image && (
          <button
            type="button"
            onClick={() => onOpenImage(msg.image)}
            className="block mt-2 overflow-hidden rounded-lg"
          >
            <img src={base64ToDataUrl(msg.image)} alt="" className="max-h-64 w-full object-cover" />
          </button>
        )}
      </div>
    </div>
  )
}
