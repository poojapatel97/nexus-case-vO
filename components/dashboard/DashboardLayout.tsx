'use client'

import { useState } from 'react'
import { mockCases } from '@/lib/mockData'
import { Sidebar } from './Sidebar'
import { CaseList } from './CaseList'
import { DocumentViewer } from './DocumentViewer'
import { AICopilot } from './AICopilot'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(
    mockCases.length > 0 ? mockCases[0].id : null
  )
  const [activeTab, setActiveTab] = useState('cases')

  const selectedCase = mockCases.find((c) => c.id === selectedCaseId)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSidebarOpen(true)}
            className="h-9 w-9 p-0"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <h1 className="text-sm font-semibold text-foreground">
            Nexus Case Dashboard
          </h1>
          <div className="w-9" />
        </div>

        {/* Cases Tab Content */}
        {activeTab === 'cases' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel: Case List */}
            <div className="hidden md:flex w-80 lg:w-96 flex-col border-r border-border bg-secondary">
              <div className="px-4 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground mb-2">
                  Active Case Profiles
                </h2>
                <p className="text-xs text-muted-foreground">
                  {mockCases.length} cases in system
                </p>
              </div>
              <CaseList
                cases={mockCases}
                selectedCaseId={selectedCaseId}
                onCaseSelect={setSelectedCaseId}
              />
            </div>

            {/* Mobile Case List Modal */}
            <div className="md:hidden fixed inset-0 z-30 bg-black/50" style={{ display: 'none' }} />

            {/* Right Panel: Document Viewer */}
            <div className="flex-1 p-4 overflow-hidden">
              {selectedCase ? (
                <DocumentViewer case={selectedCase} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Select a case to view details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Other Tabs Placeholder */}
        {activeTab !== 'cases' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground mb-2 capitalize">
                {activeTab === 'dashboard' && 'Dashboard Overview'}
                {activeTab === 'timelines' && 'Client Timelines'}
                {activeTab === 'audit' && 'Audit Logs'}
                {activeTab === 'settings' && 'Settings'}
              </h2>
              <p className="text-sm text-muted-foreground">
                This section is available for expansion with additional features.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* AI Copilot */}
      {activeTab === 'cases' && <AICopilot />}
    </div>
  )
}
