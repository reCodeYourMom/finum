'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react'

interface TransactionImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
}

export function TransactionImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: TransactionImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      setFile(acceptedFiles[0])
      setError(null)
      setResult(null)
    },
  })

  const handleImport = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import transactions')
      }

      setResult(data)

      // If successful, reload transactions after a short delay
      if (data.created > 0) {
        setTimeout(() => {
          onImportComplete()
          handleClose()
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setResult(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-premium-lg w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-finum-gray-200">
          <h2 className="text-xl font-bold text-finum-dark">
            Importer des transactions
          </h2>
          <button
            onClick={handleClose}
            className="text-finum-gray-500 hover:text-finum-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Instructions */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-finum-gray-700 mb-2">
              Format CSV attendu
            </h3>
            <div className="bg-finum-gray-50 rounded-lg p-4 font-mono text-xs">
              <div className="text-finum-gray-600">
                date,amount,merchant,currency,description,category
              </div>
              <div className="text-finum-gray-900 mt-1">
                2024-01-15,45.50,Carrefour,EUR,Courses,Alimentation
                <br />
                15/01/2024,120,Netflix,EUR,Abonnement,Loisirs
              </div>
            </div>
            <p className="text-xs text-finum-gray-500 mt-2">
              Colonnes requises : date, amount, merchant. Optionnelles :
              currency, description, category
            </p>
            <p className="text-xs text-finum-gray-500 mt-1">
              Formats de date acceptés : YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
            </p>
          </div>

          {/* Dropzone */}
          {!file && !result && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${
                  isDragActive
                    ? 'border-finum-blue bg-finum-blue/5'
                    : 'border-finum-gray-300 hover:border-finum-blue hover:bg-finum-gray-50'
                }
              `}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-finum-gray-400 mx-auto mb-4" />
              <p className="text-finum-gray-700 font-medium mb-1">
                Glisser-déposer un fichier CSV
              </p>
              <p className="text-sm text-finum-gray-500">
                ou cliquer pour sélectionner
              </p>
            </div>
          )}

          {/* File selected */}
          {file && !result && (
            <div className="border border-finum-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-finum-blue" />
                <div className="flex-1">
                  <p className="font-medium text-finum-dark">{file.name}</p>
                  <p className="text-sm text-finum-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-finum-gray-400 hover:text-finum-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-finum-red/10 border border-finum-red/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-finum-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-finum-red">Erreur d'import</p>
                <p className="text-sm text-finum-red/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-finum-green/10 border border-finum-green/20 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="w-5 h-5 text-finum-green flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-finum-green">Import réussi</p>
                  <div className="text-sm text-finum-green/80 mt-1 space-y-1">
                    <p>• {result.created} transaction(s) créée(s)</p>
                    {result.duplicates > 0 && (
                      <p>• {result.duplicates} doublon(s) ignoré(s)</p>
                    )}
                    {result.assigned > 0 && (
                      <p>• {result.assigned} assignée(s) automatiquement</p>
                    )}
                  </div>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-finum-green/20">
                  <p className="text-sm font-medium text-finum-gray-700 mb-2">
                    Erreurs ({result.errors.length})
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.slice(0, 5).map((err: any, i: number) => (
                      <p key={i} className="text-xs text-finum-gray-600">
                        • {err.merchant}: {err.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-finum-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-finum-gray-700 hover:bg-finum-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleImport}
            disabled={!file || isUploading || !!result}
            className="px-6 py-2 bg-finum-blue text-white rounded-lg font-medium hover:bg-finum-blue/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Import en cours...' : 'Importer'}
          </button>
        </div>
      </div>
    </div>
  )
}
