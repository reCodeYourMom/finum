'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  TrendingUp,
  Lightbulb
} from 'lucide-react'

const navItems = [
  {
    href: '/cockpit',
    label: 'Cockpit',
    icon: LayoutDashboard,
    description: 'Vue trésorerie'
  },
  {
    href: '/budget',
    label: 'Budget',
    icon: Wallet,
    description: 'Gestion budgets'
  },
  {
    href: '/transactions',
    label: 'Transactions',
    icon: Receipt,
    description: 'Historique'
  },
  {
    href: '/patterns',
    label: 'Patterns',
    icon: TrendingUp,
    description: 'Récurrences'
  },
  {
    href: '/coach',
    label: 'Coach',
    icon: Lightbulb,
    description: 'Revue hebdo'
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="w-64 bg-white border-r border-finum-gray-200 min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-finum-dark">Finum</h1>
        <p className="text-xs text-finum-gray-500 mt-1">CFO Personnel</p>
      </div>

      <ul className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${isActive
                    ? 'bg-finum-blue text-white shadow-md'
                    : 'text-finum-gray-700 hover:bg-finum-gray-50'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className={`text-xs ${isActive ? 'text-white/80' : 'text-finum-gray-500'}`}>
                    {item.description}
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
