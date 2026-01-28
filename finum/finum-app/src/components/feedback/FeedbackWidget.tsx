'use client'

/**
 * Feedback Widget - Floating button for user feedback
 * Allows users to quickly submit bugs, feature requests, or general feedback
 */

import { useState } from 'react'
import { MessageSquare, X, Bug, Lightbulb, MessageCircle, Heart } from 'lucide-react'

type FeedbackType = 'bug' | 'feature' | 'general' | 'praise'

interface FeedbackForm {
  type: FeedbackType
  title: string
  description: string
}

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState<FeedbackForm>({
    type: 'general',
    title: '',
    description: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const feedbackTypes = [
    { value: 'bug', label: 'Bug', icon: Bug, color: 'text-red-600' },
    { value: 'feature', label: 'Fonctionnalité', icon: Lightbulb, color: 'text-yellow-600' },
    { value: 'general', label: 'Général', icon: MessageCircle, color: 'text-blue-600' },
    { value: 'praise', label: 'Compliment', icon: Heart, color: 'text-pink-600' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Collect browser metadata
      const metadata = {
        browser: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          page: window.location.pathname,
          metadata,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      setSubmitted(true)
      setTimeout(() => {
        setIsOpen(false)
        setSubmitted(false)
        setForm({ type: 'general', title: '', description: '' })
      }, 2000)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      alert('Échec de l\'envoi du feedback. Réessayez plus tard.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-all hover:scale-110 z-50"
        aria-label="Ouvrir le formulaire de feedback"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Votre avis compte</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {submitted ? (
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium">Merci pour votre feedback !</p>
          <p className="text-sm text-gray-600 mt-1">Nous l'examinons rapidement.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {feedbackTypes.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, type: value as FeedbackType }))}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    form.type === value
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${form.type === value ? 'text-purple-600' : color}`} />
                  <span className={`text-sm font-medium ${
                    form.type === value ? 'text-purple-900' : 'text-gray-700'
                  }`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="feedback-title" className="block text-sm font-medium text-gray-700 mb-1">
              Titre
            </label>
            <input
              id="feedback-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Résumé en une ligne"
              maxLength={200}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="feedback-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="feedback-description"
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez votre problème, suggestion ou commentaire..."
              rows={4}
              maxLength={5000}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {form.description.length}/5000 caractères
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !form.title.trim() || !form.description.trim()}
            className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Envoi en cours...' : 'Envoyer le feedback'}
          </button>
        </form>
      )}
    </div>
  )
}
