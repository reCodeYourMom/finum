'use client'

/**
 * Onboarding Flow - Multi-step onboarding for new users
 * Guides users through initial setup and key features
 */

import { useState } from 'react'
import { ChevronRight, Check, Sparkles, TrendingUp, FileText, Rocket } from 'lucide-react'

interface OnboardingFlowProps {
  onComplete: () => void
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      id: 'welcome',
      title: 'Bienvenue sur Finum',
      icon: Sparkles,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Votre CFO Personnel
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Finum transforme votre budget en un système vivant et contraignant.
              Découvrons ensemble comment prendre le contrôle de vos finances.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Run-rate & Projections</h3>
              <p className="text-sm text-gray-600">
                Visualisez votre trajectoire financière en temps réel
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Buckets Budgétaires</h3>
              <p className="text-sm text-gray-600">
                Organisez vos dépenses par catégories intelligentes
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Coach IA</h3>
              <p className="text-sm text-gray-600">
                Recevez des conseils personnalisés et éthiques
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'budget',
      title: 'Créez votre premier budget',
      icon: FileText,
      content: (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Commencez par votre budget
            </h2>
            <p className="text-gray-600">
              Le budget est votre intention de dépense. Commencez simple, vous affinerez plus tard.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Importez un fichier CSV
                </h3>
                <p className="text-sm text-gray-600">
                  Utilisez notre template ou importez votre fichier existant
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Ou créez manuellement
                </h3>
                <p className="text-sm text-gray-600">
                  Définissez vos catégories et montants un par un
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
              Importer un CSV
            </button>
            <button className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Créer manuellement
            </button>
          </div>

          <p className="text-xs text-center text-gray-500">
            Vous pourrez toujours modifier votre budget plus tard
          </p>
        </div>
      ),
    },
    {
      id: 'transactions',
      title: 'Importez vos transactions',
      icon: TrendingUp,
      content: (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Vos transactions réelles
            </h2>
            <p className="text-gray-600">
              Importez vos relevés bancaires pour voir où va réellement votre argent.
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Formats supportés</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <p className="font-medium text-sm text-gray-900">CSV</p>
                <p className="text-xs text-gray-600">Tous les relevés bancaires</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <p className="font-medium text-sm text-gray-900">PDF</p>
                <p className="text-xs text-gray-600">Extraction automatique</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-gray-700">Conversion automatique en EUR</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-gray-700">Déduplication intelligente</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-gray-700">Assignation automatique aux buckets</span>
            </div>
          </div>

          <button className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
            Importer mes transactions
          </button>

          <p className="text-xs text-center text-gray-500">
            Finum ne se connecte jamais à vos comptes bancaires
          </p>
        </div>
      ),
    },
    {
      id: 'tour',
      title: 'Découvrez les fonctionnalités',
      icon: Rocket,
      content: (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Tour rapide des fonctionnalités
            </h2>
            <p className="text-gray-600">
              Voici les principales pages de Finum
            </p>
          </div>

          <div className="space-y-3">
            <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
              <h3 className="font-semibold text-gray-900 mb-1">📊 Cockpit</h3>
              <p className="text-sm text-gray-600">
                Vue d'ensemble de votre situation financière actuelle
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-1">💰 Budget</h3>
              <p className="text-sm text-gray-600">
                Gérez vos intentions de dépenses par catégorie
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-green-200">
              <h3 className="font-semibold text-gray-900 mb-1">📈 Transactions</h3>
              <p className="text-sm text-gray-600">
                Toutes vos dépenses réelles avec assignation aux buckets
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-yellow-200">
              <h3 className="font-semibold text-gray-900 mb-1">🔄 Patterns</h3>
              <p className="text-sm text-gray-600">
                Détectez automatiquement vos dépenses récurrentes
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
              <h3 className="font-semibold text-gray-900 mb-1">🤖 Coach</h3>
              <p className="text-sm text-gray-600">
                Revue hebdomadaire et conseils personnalisés par IA
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'complete',
      title: 'Vous êtes prêt !',
      icon: Rocket,
      content: (
        <div className="space-y-6 text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Rocket className="w-12 h-12 text-green-600" />
          </div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              C'est parti !
            </h2>
            <p className="text-lg text-gray-600 max-w-lg mx-auto">
              Vous avez maintenant toutes les clés en main pour reprendre le contrôle de vos finances.
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-gray-900">Prochaines étapes recommandées</h3>
            <ul className="text-left space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span>Importez votre budget et vos transactions</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span>Créez des règles d'assignation automatique</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span>Consultez votre première revue hebdomadaire avec le Coach IA</span>
              </li>
            </ul>
          </div>

          <button
            onClick={onComplete}
            className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Commencer à utiliser Finum
          </button>
        </div>
      ),
    },
  ]

  const currentStepData = steps[currentStep]
  const Icon = currentStepData.icon

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex-1 flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    index === currentStep
                      ? 'bg-purple-600 text-white scale-110'
                      : index < currentStep
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all ${
                      index < currentStep ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Bienvenue</span>
            <span className="text-center">Configuration</span>
            <span className="text-right">Terminé</span>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Step Icon & Title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-sm font-medium text-purple-600 mb-2">
              Étape {currentStep + 1} sur {steps.length}
            </p>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {currentStepData.content}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {currentStep > 0 && (
              <button
                onClick={previousStep}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Précédent
              </button>
            )}
            {currentStep < steps.length - 1 && (
              <button
                onClick={nextStep}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                Suivant
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Skip Button */}
          {currentStep < steps.length - 1 && (
            <button
              onClick={onComplete}
              className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Passer l'introduction
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
