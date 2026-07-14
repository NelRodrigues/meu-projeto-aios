'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationList } from './notification-list'
import { useNotifications } from '@/hooks/use-notifications'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { notificacoes, naoLidas, loading, marcarComoLida, marcarTodasComoLidas } = useNotifications()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notificacoes"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Overlay para fechar */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className={cn(
            'absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50',
            'max-h-96 flex flex-col'
          )}>
            <NotificationList
              notificacoes={notificacoes}
              loading={loading}
              naoLidas={naoLidas}
              onMarcarLida={marcarComoLida}
              onMarcarTodasLidas={marcarTodasComoLidas}
              onClose={() => setOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  )
}
