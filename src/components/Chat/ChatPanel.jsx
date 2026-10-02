import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Send, Trash2, SlidersHorizontal, Image as ImageIcon } from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'
import {
  generateChatReply,
  generateImage as callGenerateImage,
  buildChatPhotoPrompt,
  buildImagePrompt,
} from '../../utils/api'
import { selectDisplay } from '../../utils/selectDisplay'
import { compileImageLine } from '../../utils/compileCharacter'
import { composeChatSystemPrompt, CHAT_OPENERS, CHAT_HEATS } from '../../utils/chatPrompt'
import {
  parseReplyBlocks,
  stripProtocolTags,
  sleep,
  userRecentlyAskedForPhoto,
  userRecentlyAskedForProfilePic,
} from '../../utils/chatProtocol'
import {
  resolveChatPhotoReference,
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
import { compileOutfitPrompt, migrateOutfit } from '../../utils/wardrobe'
import {
  formatClockStamp,
  formatElapsed,
  formatUserApiText,
  lastUserMessageAt,
  nextPhotoId,
  resolveAlbumPhoto,
} from '../../utils/chatMemory'

function visualLine(character, wornOutfit) {
  const bits = [
    compileImageLine('species', character),
    compileImageLine('hair_color', character),
    compileImageLine('hair_style', character),
    compileImageLine('eye_color', character),
    compileImageLine('skin_tone', character),
    compileImageLine('facial_structure', character),
    compileImageLine('silhouette', character),
    wornOutfit ? compileOutfitPrompt(wornOutfit) : selectDisplay(character, 'default_outfit'),
  ].filter((v) => v && v !== 'Custom')
  return bits.join(' ').replace(/\.\s*$/, '')
}

function wardrobeCatalog(wardrobe) {
  return (wardrobe || []).map((outfit, i) => ({
    tag: `w${i + 1}`,
    id: outfit.id,
    name: outfit.name,
    outfit: migrateOutfit(outfit),
  }))
}

function resolveWardrobeRef(wardrobe, token) {
  const t = String(token || '').trim()
  if (!t) return null
  return wardrobeCatalog(wardrobe).find((row) => (
    row.tag.toLowerCase() === t.toLowerCase()
    || String(row.id) === t
    || String(row.name || '').toLowerCase() === t.toLowerCase()
  )) || null
}

async function makeAlbumEntry(photos, image, caption) {
  const thumb = await compressImageBase64(image, { maxEdge: 256, quality: 0.7 })
  return {
    id: nextPhotoId(photos),
    createdAt: Date.now(),
    caption: String(caption || '').trim(),
    image,
    thumb,
  }
}

export default function ChatPanel() {
  const character = useCharacterStore((s) => s.character)
  const apiKey = useCharacterStore((s) => s.apiKey)
  const selectedTextModel = useCharacterStore((s) => s.selectedTextModel)
  const selectedImageModel = useCharacterStore((s) => s.selectedImageModel)
  const availableImageModels = useCharacterStore((s) => s.availableImageModels)
  const generatedImages = useCharacterStore((s) => s.generatedImages)
  const presentationMode = useCharacterStore((s) => s.presentationMode)
  const imagePrefs = useCharacterStore((s) => s.imagePrefs)
  const backstory = useCharacterStore((s) => s.backstory)
  const chatCanon = useCharacterStore((s) => s.chatCanon)
  const ledger = useCharacterStore((s) => s.ledger)
  const wardrobe = useCharacterStore((s) => s.wardrobe)
  const chat = useCharacterStore((s) => s.chat)
  const replaceChatApiAndUi = useCharacterStore((s) => s.replaceChatApiAndUi)
  const updateChatSettings = useCharacterStore((s) => s.updateChatSettings)
  const setGeneratedImage = useCharacterStore((s) => s.setGeneratedImage)
  const clearChat = useCharacterStore((s) => s.clearChat)
  const addToast = useToastStore((s) => s.addToast)

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [typing, setTyping] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState(null)
  const endRef = useRef(null)
  const abortRef = useRef(false)
  const formRef = useRef(null)
  const inputRef = useRef(null)

  const focusComposer = () => {
    inputRef.current?.focus()
  }

  const name = String(character.name || '').trim()
  const portrait = generatedImages?.profile || generatedImages?.tpose
  const settings = chat?.settings || {}
  const userPersona = settings.userPersona || { name: '', notes: '', addressAs: '' }
  const photos = chat?.photos || []
  const presence = settings.presence === 'inperson' ? 'inperson' : 'online'

  const wornRow = resolveWardrobeRef(wardrobe, settings.currentOutfitId)
  const wornOutfit = wornRow?.outfit || null

  const systemPrompt = useMemo(() => {
    const now = Date.now()
    const lastUserAt = lastUserMessageAt(chat?.ui)
    const catalog = wardrobeCatalog(wardrobe)
    const worn = catalog.find((row) => row.id === settings.currentOutfitId)
    const wardrobeLines = catalog.length
      ? catalog.map((row) => (
        `${row.tag} "${row.name || 'Untitled'}" (${row.outfit.styleTag}) — ${compileOutfitPrompt(row.outfit)}`
      )).join('\n')
      : 'No saved wardrobe looks yet. Fall back to Default Outfit / Intimate Attire.'
    const photoLines = photos.length
      ? [...photos].slice(-12).map((p) => (
        `#${p.id} · ${formatElapsed(p.createdAt, now) || formatClockStamp(p.createdAt)} · ${p.caption || 'photo'}`
      )).join('\n')
      : 'No photos sent yet.'

    const situation = `[CLOCK]
Local time: ${formatClockStamp(now)}
Last they wrote: ${lastUserAt ? formatElapsed(lastUserAt, now) : 'this is the first message'}
You are: ${presence === 'inperson' ? 'in person together' : 'online / texting'}${settings.place ? ` at ${settings.place}` : ''}
${settings.place && settings.lastPlaceChangeAt ? `Place last changed ${formatElapsed(settings.lastPlaceChangeAt, now)}.` : ''}
Wearing: ${worn ? `${worn.tag} "${worn.name}"` : 'Default / sheet outfit (no wardrobe look equipped)'}
${worn && settings.lastOutfitChangeAt ? `Outfit last changed ${formatElapsed(settings.lastOutfitChangeAt, now)}.` : ''}

[INERTIA]
Do not change clothes or location in seconds or a couple of minutes unless they clearly left and came back, or asked you to change.
${presence === 'inperson' ? 'If you are working on a car / in a shop / on a job and a wardrobe look matches (Casual, Athletic, work, shop), wear that.\n' : ''}If they ask for a specific wardrobe look, [WEAR] it first, then send the photo.`

    return composeChatSystemPrompt({
      character,
      chatCanon,
      backstory,
      settings,
      visualLine: visualLine(character, worn?.outfit),
      situation,
      wardrobeBlock: `[WARDROBE]\nSaved looks (use the w-id tags):\n${wardrobeLines}`,
      photoBlock: `[PHOTO MEMORY]\nRecent photos they can ask you to pull up or edit:\n${photoLines}`,
      ledger,
    })
  }, [character, chatCanon, backstory, settings, wardrobe, photos, chat?.ui, presence, ledger])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat?.ui?.length, typing])

  useEffect(() => () => {
    abortRef.current = true
  }, [])

  const imageCallOptions = () => {
    const modelId = selectedImageModel || DEFAULT_IMAGE_MODEL
    return {
      modelId,
      imageEndpoint:
        availableImageModels.length > 0
          ? getImageEndpointForModel(availableImageModels, selectedImageModel)
          : 'generateContent',
      seed: imagePrefs?.seed,
    }
  }

  const currentOutfitOverride = () => {
    const live = useCharacterStore.getState()
    const row = resolveWardrobeRef(live.wardrobe, live.chat?.settings?.currentOutfitId)
    return row ? compileOutfitPrompt(row.outfit) : null
  }

  const trySendPic = async (picDescription, extra = {}) => {
    const lock = resolveChatPhotoReference(
      useCharacterStore.getState().generatedImages,
      presentationMode,
    )
    if (!lock) {
      addToast('Generate a profile or T-pose lock first so photos can match their face.', 'warning')
      return null
    }
    const modelId = selectedImageModel || DEFAULT_IMAGE_MODEL
    const canRef = modelSupportsReferenceImages(availableImageModels, modelId)
    if (!canRef) {
      addToast('Photo send needs a Gemini image model (reference images).', 'warning')
      return null
    }
    const prefs = useCharacterStore.getState().imagePrefs || {}
    const extraNegative = mergeNegativePrompt('chatphoto', presentationMode, prefs.exclude || '')
    const refs = [lock]
    if (extra.priorImage) refs.push(extra.priorImage)
    const prompt = buildChatPhotoPrompt(character, picDescription, {
      presentationMode,
      hasReferenceImage: true,
      hasPriorPhoto: !!extra.priorImage,
      extraNegative,
      artStyle: prefs.artStyle,
      lighting: prefs.lighting,
      mood: prefs.mood,
      outfitOverride: extra.outfitOverride ?? currentOutfitOverride(),
    })
    try {
      const raw = await callGenerateImage(apiKey, prompt, {
        aspectRatio: extra.aspectRatio || '3:4',
        negativePrompt: extraNegative,
        ...imageCallOptions(),
        referenceImagesBase64: refs,
      })
      return await compressImageBase64(raw)
    } catch (e) {
      addToast(`Photo failed: ${e.message}`, 'error', 5000)
      return null
    }
  }

  const tryNewProfilePortrait = async (description) => {
    const lock = resolveChatPhotoReference(
      useCharacterStore.getState().generatedImages,
      presentationMode,
    )
    const prefs = useCharacterStore.getState().imagePrefs || {}
    const extraNegative = mergeNegativePrompt('profile', presentationMode, prefs.exclude || '')
    const prompt = buildImagePrompt(character, 'profile', {
      artStyle: prefs.artStyle,
      lighting: prefs.lighting,
      mood: prefs.mood,
      presentationMode,
      hasReferenceImage: !!lock,
      extraNegative,
      outfitOverride: currentOutfitOverride(),
    }) + (description ? ` Portrait moment: ${description}.` : '')
    try {
      const raw = await callGenerateImage(apiKey, prompt, {
        aspectRatio: '1:1',
        negativePrompt: extraNegative,
        ...imageCallOptions(),
        ...(lock ? { referenceImageBase64: lock } : {}),
      })
      return await compressImageBase64(raw)
    } catch (e) {
      addToast(`Profile photo failed: ${e.message}`, 'error', 5000)
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
    const createdAt = Date.now()
    const prev = useCharacterStore.getState().chat
    const userUi = { id: generateId(), role: 'user', text: userText, createdAt }
    const userApi = { role: 'user', parts: [{ text: formatUserApiText(userText, createdAt, { characterName: name, presence }) }] }
    const nextApi = [...(prev.api || []), userApi]
    const nextUi = [...(prev.ui || []), userUi]
    let photosAcc = [...(prev.photos || [])]
    replaceChatApiAndUi({ ui: nextUi, api: nextApi, photos: photosAcc })
    setInput('')
    setSending(true)
    requestAnimationFrame(focusComposer)

    try {
      const reply = await generateChatReply(apiKey, systemPrompt, nextApi, {
        modelId: selectedTextModel,
      })
      const blocks = parseReplyBlocks(reply)
      const allowPic = userRecentlyAskedForPhoto(nextApi)
      const allowProfile = userRecentlyAskedForProfilePic(nextApi)
      let uiAcc = nextUi
      let sentPic = false

      const commit = (photoSent) => {
        const clean = stripProtocolTags(reply, { photoSent }) || reply
        replaceChatApiAndUi({
          ui: uiAcc,
          api: [...nextApi, { role: 'model', parts: [{ text: clean }] }],
          photos: photosAcc,
        })
      }

      if (!blocks.length) {
        uiAcc = [...uiAcc, { id: generateId(), role: 'model', text: stripProtocolTags(reply) || reply, createdAt: Date.now() }]
        commit(false)
      } else {
        for (const block of blocks) {
          if (abortRef.current) break
          setTyping(true)
          await sleep(block.delayMs)
          if (abortRef.current) break
          setTyping(false)

          if (block.wearId) {
            const row = resolveWardrobeRef(useCharacterStore.getState().wardrobe, block.wearId)
            if (row) {
              updateChatSettings({ currentOutfitId: row.id, lastOutfitChangeAt: Date.now() })
            }
          }
          if (block.place) {
            updateChatSettings({ place: block.place, lastPlaceChangeAt: Date.now() })
          }

          let image = null
          if (block.resendPicId) {
            const prior = resolveAlbumPhoto(photosAcc, block.resendPicId)
            if (prior?.image) {
              image = prior.image
              sentPic = true
            }
          } else if (block.editPic && allowPic) {
            const prior = resolveAlbumPhoto(photosAcc, block.editPic.id)
            if (prior?.image) {
              image = await trySendPic(block.editPic.change || block.picDescription, { priorImage: prior.image })
              if (image) {
                sentPic = true
                const entry = await makeAlbumEntry(photosAcc, image, block.editPic.change || 'edited photo')
                photosAcc = [...photosAcc, entry]
              }
            }
          } else if (block.picDescription && allowPic) {
            image = await trySendPic(block.picDescription)
            if (image) {
              sentPic = true
              const entry = await makeAlbumEntry(photosAcc, image, block.picDescription)
              photosAcc = [...photosAcc, entry]
            }
          }

          if (block.setProfile) {
            if (block.setProfile.mode === 'id') {
              const prior = resolveAlbumPhoto(photosAcc, block.setProfile.id)
              if (prior?.image) {
                setGeneratedImage('profile', prior.image)
                addToast('Profile picture updated.', 'success')
              }
            } else if (allowProfile || allowPic) {
              const portraitImage = await tryNewProfilePortrait(block.setProfile.description)
              if (portraitImage) {
                setGeneratedImage('profile', portraitImage)
                const entry = await makeAlbumEntry(photosAcc, portraitImage, block.setProfile.description || 'new profile')
                photosAcc = [...photosAcc, entry]
                addToast('Profile picture updated.', 'success')
                if (!image) image = portraitImage
              }
            }
          }

          uiAcc = [
            ...uiAcc,
            {
              id: generateId(),
              role: 'model',
              text: block.text,
              createdAt: Date.now(),
              ...(image ? { image } : {}),
            },
          ]
          commit(sentPic)
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
            createdAt: Date.now(),
          },
        ],
        api: prev.api || [],
        photos: photosAcc,
      })
      addToast('Chat failed: ' + (err instanceof Error ? err.message : String(err)), 'error', 5000)
    } finally {
      setSending(false)
      setTyping(false)
      requestAnimationFrame(focusComposer)
    }
  }

  const handleComposerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
      e.preventDefault()
      formRef.current?.requestSubmit()
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
      <aside className="hidden md:flex w-64 lg:w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-900/80 min-h-0">
        <div className="aspect-[3/4] bg-slate-950 overflow-hidden border-b border-slate-800 shrink-0">
          {portrait ? (
            <img src={base64ToDataUrl(portrait)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-700">
              <ImageIcon size={36} />
            </div>
          )}
        </div>
        <div className="p-4 space-y-3 overflow-y-auto min-h-0">
          <div>
            <h2 className="text-white font-bold truncate">{name}</h2>
            <p className="text-xs text-slate-500 truncate">
              {character.species || 'Unknown species'}
              {character.archetype ? ` · ${character.archetype}` : ''}
            </p>
          </div>

          <div>
            <label className="section-heading mb-1 block">Where you are</label>
            <div className="flex rounded-lg border border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => updateChatSettings({ presence: 'online' })}
                className={`flex-1 py-1.5 text-[11px] font-medium ${
                  presence !== 'inperson'
                    ? 'bg-cyan-600/30 text-cyan-200'
                    : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                }`}
              >
                Online
              </button>
              <button
                type="button"
                onClick={() => updateChatSettings({ presence: 'inperson' })}
                className={`flex-1 py-1.5 text-[11px] font-medium ${
                  presence === 'inperson'
                    ? 'bg-amber-600/30 text-amber-200'
                    : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                }`}
              >
                In person
              </button>
            </div>
            {settings.place ? (
              <p className="text-[11px] text-slate-500 mt-1.5 truncate">Place: {settings.place}</p>
            ) : null}
            {wornOutfit ? (
              <p className="text-[11px] text-slate-500 truncate">Wearing: {wornRow?.name}</p>
            ) : null}
          </div>

          {photos.length > 0 && (
            <div>
              <label className="section-heading mb-1 block">Photos</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[...photos].slice(-9).reverse().map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    title={`${photo.id} · ${photo.caption || 'photo'}`}
                    onClick={() => setFullscreenImage(photo.image)}
                    className="aspect-square overflow-hidden rounded-md bg-slate-950 border border-slate-800"
                  >
                    <img
                      src={base64ToDataUrl(photo.thumb || photo.image)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-600 leading-relaxed">
            {presence === 'inperson'
              ? 'Actions and bare narration are remembered in their point of view. Put spoken lines in quotes. Photos match Generation Studio art style. Ask them to wear a wardrobe look or pull up a recent shot.'
              : 'This is a texting thread — no *action* stage directions. Photos match Generation Studio art style. Ask them to wear a wardrobe look or pull up a recent shot.'}
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
                {typing ? 'Typing…' : presence === 'inperson' ? 'Together' : 'Active now'}
              </p>
            </div>
            <div className="md:hidden flex rounded-lg border border-slate-700 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => updateChatSettings({ presence: 'online' })}
                className={`px-2 py-1 text-[10px] ${presence !== 'inperson' ? 'bg-cyan-600/30 text-cyan-200' : 'text-slate-500'}`}
              >
                Online
              </button>
              <button
                type="button"
                onClick={() => updateChatSettings({ presence: 'inperson' })}
                className={`px-2 py-1 text-[10px] ${presence === 'inperson' ? 'bg-amber-600/30 text-amber-200' : 'text-slate-500'}`}
              >
                In person
              </button>
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
              Filthy heat can use Mature sheet details. Photos follow Generation Studio art style and Canonical / Thirst.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {(chat.ui || []).length === 0 && (
            <p className="text-center text-xs text-slate-600 py-8">
              Start the thread. They will talk like {name}. Enter sends; Ctrl+Enter or Shift+Enter for a new line.
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

        <form ref={formRef} onSubmit={handleSend} className="shrink-0 border-t border-slate-800 p-3 flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder={presence === 'inperson'
              ? `Message ${name}…  *actions* · "spoken words"`
              : `Message ${name}…`}
            rows={2}
            className="input-field flex-1 text-sm resize-none min-h-[44px] max-h-40"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="btn-primary px-4 disabled:opacity-40 h-11"
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

function renderMarkedText(text) {
  const parts = String(text || '').split(/(\*[^*]+\*)/g)
  return parts.map((part, i) => {
    const match = part.match(/^\*([^*]+)\*$/)
    if (match) {
      return <em key={i} className="italic opacity-90">{match[1]}</em>
    }
    return <span key={i}>{part}</span>
  })
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
        {renderMarkedText(msg.text)}
        {msg.createdAt ? (
          <p className={`text-[10px] mt-1 ${mine ? 'text-white/50' : 'text-slate-500'}`}>
            {formatClockStamp(msg.createdAt)}
          </p>
        ) : null}
        {msg.image && (
          <button
            type="button"
            onClick={() => onOpenImage(msg.image)}
            className="block mt-2 overflow-hidden rounded-lg"
          >
            <img src={base64ToDataUrl(msg.image)} alt="" className="max-h-64 w-full object-contain bg-slate-950" />
          </button>
        )}
      </div>
    </div>
  )
}
