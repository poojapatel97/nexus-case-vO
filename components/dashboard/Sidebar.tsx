'use client'

import { Home, FileText, Users, History, Settings, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  activeTab: string
  onTabChange: (tab: string) => void
}

export function Sidebar({ isOpen, onClose, activeTab, onTabChange }: SidebarProps) {
  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'cases', label: 'Case Files', icon: FileText },
    { id: 'timelines', label: 'Client Timelines', icon: Users },
    { id: 'audit', label: 'Audit Logs', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-sidebar transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-4">
          <h1 className="text-lg font-bold text-sidebar-foreground">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Nexus Case
            </span>
          </h1>
          <button
            onClick={onClose}
            className="lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5 text-sidebar-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-6">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id)
                  onClose()
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-3 rounded-md bg-sidebar-accent px-3 py-3">
            <div className="h-8 w-8 rounded-full bg-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">
                Sarah Johnson
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                Admin
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile hamburger button */}
      {!isOpen && (
        <div className="fixed left-4 top-4 z-40 lg:hidden">
          <Button
            size="sm"
            variant="outline"
            onClick={() => (typeof window !== 'undefined' && window.innerWidth < 1024) && onClose()}
            className="h-9 w-9 p-0"
            aria-label="Open sidebar"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  )
}
