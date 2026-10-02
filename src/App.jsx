import React, { useState, useEffect } from 'react'
import Sidebar from './components/shared/Sidebar'
import Header from './components/shared/Header'
import ContextPanel from './components/shared/ContextPanel'
import CharacterForm from './components/CharacterSheet/CharacterForm'
import GenerationPanel from './components/ImageGeneration/GenerationPanel'
import ImageAnalysis from './components/ImageAnalysis/ImageAnalysis'
import WardrobePanel from './components/WardrobeSystem/WardrobePanel'
import LibraryPanel from './components/Library/LibraryPanel'
import ChatPanel from './components/Chat/ChatPanel'
import MotionPanel from './components/Motion/MotionPanel'
import Studio3DPanel from './components/Studio3D/Studio3DPanel'
import HistoryPanel from './components/CharacterSheet/HistoryPanel'
import { FORM_TAB_IDS } from './data/sheetTabs'
import SettingsPanel from './components/shared/SettingsPanel'
import ToastContainer from './components/shared/ToastContainer'
import { useCharacterStore } from './hooks/useCharacter'
import { useUiStore, isFullBleedTab } from './hooks/useUi'
import { resumeInFlightTripoJobs, refreshTripoBalanceSilent } from './utils/tripoJobs'

const FORM_TABS = FORM_TAB_IDS

export default function App() {
  const currentTab = useUiStore((s) => s.currentTab)
  const setCurrentTab = useUiStore((s) => s.setTab)
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const [contextInfo, setContextInfo] = useState({ title: 'Select an attribute', description: 'Hover over or change any field to see definitions, implications, and tips.' })
  const apiKey = useCharacterStore(s => s.apiKey)
  const tripoApiKey = useCharacterStore(s => s.tripoApiKey)
  const characterId = useCharacterStore(s => s.characterId)
  const settingsReady = useCharacterStore(s => s.settingsReady)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (!settingsReady) return
    if (!apiKey?.trim()) setShowSettings(true)
  }, [settingsReady, apiKey])

  useEffect(() => {
    if (!apiKey?.trim()) return
    void useCharacterStore.getState().refreshModels(apiKey)
  }, [apiKey])

  useEffect(() => {
    if (!tripoApiKey?.trim()) return
    void refreshTripoBalanceSilent()
    void resumeInFlightTripoJobs()
  }, [tripoApiKey, characterId])

  const isFormTab = FORM_TABS.includes(currentTab)
  const isSheetTab = isFormTab || currentTab === 'history'

  return (
    <div className="h-screen flex overflow-hidden bg-slate-950">
      <ToastContainer />

      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative min-w-0">
        <Header
          currentTab={currentTab}
          onToggleSidebar={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />

        <div className="flex-1 overflow-hidden flex">
          {isFullBleedTab(currentTab) ? (
            <div className="flex-1 overflow-hidden min-w-0">
              {currentTab === 'chat' && <ChatPanel />}
              {currentTab === 'studio3d' && <Studio3DPanel />}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
                {isFormTab && (
                  <CharacterForm
                    section={currentTab}
                    onContextChange={setContextInfo}
                  />
                )}
                {currentTab === 'history' && <HistoryPanel onContextChange={setContextInfo} />}
                {currentTab === 'generate' && <GenerationPanel />}
                {currentTab === 'analyze' && <ImageAnalysis />}
                {currentTab === 'wardrobe' && <WardrobePanel />}
                {currentTab === 'motion' && <MotionPanel />}
                {currentTab === 'library' && <LibraryPanel />}
              </div>
              {isSheetTab && (
                <ContextPanel contextInfo={contextInfo} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsPanel onClose={() => {
          if (apiKey) setShowSettings(false)
        }} />
      )}
    </div>
  )
}
