'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  UsersRound,
  ShoppingBag,
  Calendar,
  Cake,
  Bot,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/inbox', label: 'Inbox', icon: MessageCircle },
      { href: '/clientes', label: 'Clientes', icon: Users },
    ],
  },
  {
    title: 'Producao',
    items: [
      { href: '/catalogo', label: 'Catalogo', icon: Cake },
      { href: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
      { href: '/calendario', label: 'Calendario', icon: Calendar },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { href: '/ai-agent', label: 'Agente IA', icon: Bot },
      { href: '/equipa', label: 'Equipa', icon: UsersRound },
      { href: '/configuracoes', label: 'Configuracoes', icon: Settings },
    ],
  },
]

function useChecklistPendentes() {
  const [pendentes, setPendentes] = useState(0)
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSupabase(createClient())
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!supabase) return

    const hoje = new Date().toISOString().split('T')[0]
    Promise.all([
      supabase.from('checklist_tasks').select('id', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('checklist_completions').select('task_id').eq('completado_em', hoje),
    ])
      .then(([{ count: total }, { data: completions }]) => {
        const completedCount = completions?.length ?? 0
        setPendentes(Math.max(0, (total ?? 0) - completedCount))
      })
      // Fallback gracioso: backend offline -> mantem 0, sem rebentar a UI.
      .catch(() => setPendentes(0))
  }, [supabase])

  return pendentes
}

export function Sidebar() {
  const pathname = usePathname()
  const checklistPendentes = useChecklistPendentes()

  return (
    <nav className="flex h-full flex-col bg-sidebar-bg text-sidebar-fg">
      <div className="flex h-16 items-center px-6 border-b border-white/10">
        <h2 className="font-heading text-xl font-bold text-rose-300">
          Delicias da Isi
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="px-6 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {section.title}
            </p>
            <ul className="space-y-0.5 px-3">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.href === '/dashboard' && checklistPendentes > 0 && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                          {checklistPendentes}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 px-6 py-4">
        <p className="text-xs text-gray-500">CRM v0.1.0</p>
      </div>
    </nav>
  )
}
