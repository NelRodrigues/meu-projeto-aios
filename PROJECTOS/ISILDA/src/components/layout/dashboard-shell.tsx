'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { MobileSidebar } from './mobile-sidebar'
import { Header } from './header'

interface DashboardShellProps {
  userEmail: string
  children: React.ReactNode
}

export function DashboardShell({ userEmail, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      {/* Desktop sidebar */}
      <div className="hidden w-64 shrink-0 lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userEmail={userEmail} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
