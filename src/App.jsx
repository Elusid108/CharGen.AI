import React, { useState, useEffect } from 'react'
import Sidebar from './components/shared/Sidebar'
import Header from './components/shared/Header'
import ContextPanel from './components/shared/ContextPanel'
import CharacterForm from './components/CharacterSheet/CharacterForm'
import GenerationPanel from './components/ImageGeneration/GenerationPanel'
import ImageAnalysis from './components/ImageAnalysis/ImageAnalysis'
import WardrobePanel from './components/WardrobeSystem/WardrobePanel'
import LibraryPanel from './components/Library/LibraryPanel'
import SettingsPanel from './components/shared/SettingsPanel'
import ToastContainer from './components/shared/ToastContainer'
import { useCharacterStore } from './hooks/useCharacter'
import { useToastStore } from './hooks/useToast'

const FORM_TABS = ['identity', 'physical', 'face', 'movement', 'psychology', 'narrative', 'social', 'adult']

export default function App() {
  const [currentTab, setCurrentTab] = useState('identity')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [contextInfo, setContextInfo] = useState({ title: 'Select an attribute', description: 'Hover over or change any field to see definitions, implications, and tips.' })
  const apiKey = useCharacterStore(s => s.apiKey)
  const [showSettings, setShowSettings] = useState(!apiKey)

  // Show settings on first launch if no API key
  useEffect(() => {
    if (!apiKey) setShowSettings(true)
  }, [apiKey])

  const isFormTab = FORM_TABS.includes(currentTab)

  return (
    <div className="h-screen flex overflow-hidden bg-slate-950">
      <ToastContainer />

      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative min-w-0">
        <Header
          currentTab={currentTab}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        <div className="flex-1 overflow-hidden flex">
          {/* Workspace */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
            {isFormTab && (
              <CharacterForm
                section={currentTab}
                onContextChange={setContextInfo}
              />
            )}
            {currentTab === 'generate' && <GenerationPanel />}
            {currentTab === 'analyze' && <ImageAnalysis />}
            {currentTab === 'wardrobe' && <WardrobePanel />}
            {currentTab === 'library' && <LibraryPanel />}
          </div>

          {/* Context Panel (Desktop) */}
          {isFormTab && (
            <ContextPanel contextInfo={contextInfo} />
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
