'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ScrollText,
  AlertCircle,
  MessageSquare,
  Users,
  Brain,
  FileText,
} from 'lucide-react'

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/admin/logs', label: 'Audit Logs', icon: ScrollText },
  { href: '/admin/errors', label: 'Erreurs', icon: AlertCircle },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/ai/metrics', label: 'Métriques IA', icon: Brain },
  { href: '/admin/ai/corpus', label: 'Corpus Éthique', icon: FileText },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1 px-3">
      {adminNavItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-finum-blue text-white'
                : 'text-finum-gray-700 hover:bg-finum-gray-100'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
