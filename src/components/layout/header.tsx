'use client'

import { useRouter } from 'next/navigation'
import { Menu, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications/notification-bell'

interface HeaderProps {
  userEmail: string
  onMenuClick: () => void
}

export function Header({ userEmail, onMenuClick }: HeaderProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-brand-100 bg-white px-4 lg:px-6">
      <button
        type="button"
        className="rounded-md p-2 text-gray-500 hover:text-gray-700 lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Abrir menu</span>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <NotificationBell />
        <span className="hidden text-sm text-gray-500 sm:block">{userEmail}</span>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
