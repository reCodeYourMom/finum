'use client'

import { signOut } from 'next-auth/react'
import { LogOut, User } from 'lucide-react'
import { useState } from 'react'

interface DashboardHeaderProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  return (
    <header className="bg-white border-b border-finum-gray-200 px-8 py-4">
      <div className="flex items-center justify-end">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-finum-gray-50 transition-colors"
          >
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || ''}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-finum-blue text-white flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
            )}
            <div className="text-left">
              <div className="text-sm font-medium text-finum-dark">
                {user.name || 'Utilisateur'}
              </div>
              <div className="text-xs text-finum-gray-500">{user.email}</div>
            </div>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-premium border border-finum-gray-200 py-2">
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-finum-gray-700 hover:bg-finum-gray-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
