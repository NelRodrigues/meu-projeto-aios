'use client'

import { X } from 'lucide-react'
import { Sidebar } from './sidebar'

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="fixed inset-y-0 left-0 w-64 shadow-xl">
        <button
          type="button"
          className="absolute right-3 top-3 z-10 rounded-md p-1 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Fechar menu</span>
        </button>

        <Sidebar />
      </div>
    </div>
  )
}
