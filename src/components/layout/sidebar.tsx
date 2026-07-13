'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  UsersRound,
  Settings,
  GraduationCap,
  KanbanSquare,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
      { href: '/kanban', label: 'Kanban', icon: KanbanSquare },
      { href: '/clientes', label: 'Clientes', icon: Users },
      { href: '/catalogo', label: 'Catalogo', icon: GraduationCap },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { href: '/equipa', label: 'Equipa', icon: UsersRound },
      { href: '/configuracoes', label: 'Configuracoes', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex h-full flex-col bg-sidebar-bg text-sidebar-fg">
      <div className="flex h-16 items-center px-6 border-b border-white/10">
        <h2 className="font-heading text-xl font-bold text-rose-300">
          SIC Global Minds
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
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 px-6 py-4">
        <p className="text-xs text-gray-500">SIC v0.1.0</p>
      </div>
    </nav>
  )
}
