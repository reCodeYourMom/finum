import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FileText, CheckCircle, XCircle } from 'lucide-react'

async function getEthicalCorpus() {
  const [documents, stats] = await Promise.all([
    prisma.ethicalDocument.findMany({
      orderBy: { updatedAt: 'desc' },
    }),
    {
      total: await prisma.ethicalDocument.count(),
      withEmbeddings: await prisma.ethicalDocument.count({
        where: {
          embedding: {
            not: null,
          },
        },
      }),
    },
  ])

  // Group by category
  const byCategory = documents.reduce((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return { documents, stats, byCategory }
}

export default async function AdminAICorpusPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const { documents, stats, byCategory } = await getEthicalCorpus()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-finum-gray-900">Corpus Éthique</h1>
        <p className="text-finum-gray-600 mt-2">
          Documents utilisés pour le RAG (Retrieval-Augmented Generation)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Total Documents</p>
              <p className="text-3xl font-bold text-finum-gray-900 mt-2">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-finum-blue" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Avec Embeddings</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.withEmbeddings}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Manquants</p>
              <p className="text-3xl font-bold text-finum-red mt-2">
                {stats.total - stats.withEmbeddings}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-finum-red" />
          </div>
        </div>
      </div>

      {/* By Category */}
      <div className="bg-white rounded-lg shadow border border-finum-gray-200">
        <div className="p-6 border-b border-finum-gray-200">
          <h2 className="text-lg font-semibold text-finum-gray-900">Par Catégorie</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {Object.entries(byCategory).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm text-finum-gray-700">{category}</span>
                <span className="text-sm font-semibold text-finum-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow border border-finum-gray-200">
        <div className="p-6 border-b border-finum-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-finum-gray-900">Tous les Documents</h2>
          <p className="text-sm text-finum-gray-500">
            Pour ajouter/modifier, voir <code className="text-xs font-mono bg-finum-gray-100 px-2 py-1 rounded">prisma/seeds/ethical-corpus.json</code>
          </p>
        </div>
        <div className="divide-y divide-finum-gray-200">
          {documents.map((doc) => (
            <div key={doc.id} className="p-6 hover:bg-finum-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-semibold text-finum-gray-900">
                      {doc.title}
                    </h3>
                    {doc.embedding ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-finum-red" />
                    )}
                  </div>

                  <p className="text-sm text-finum-gray-700 mb-3">
                    {doc.content.length > 200
                      ? doc.content.substring(0, 200) + '...'
                      : doc.content}
                  </p>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="px-2 py-1 bg-finum-gray-100 text-finum-gray-700 rounded">
                      {doc.category}
                    </span>
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex gap-1">
                        {(doc.tags as string[]).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-finum-gray-500 whitespace-nowrap">
                  MAJ: {new Date(doc.updatedAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-3">Comment Mettre à Jour le Corpus</h3>
        <ol className="space-y-2 text-sm text-yellow-800 list-decimal list-inside">
          <li>Modifier le fichier <code className="font-mono bg-yellow-100 px-1 rounded">prisma/seeds/ethical-corpus.json</code></li>
          <li>Exécuter: <code className="font-mono bg-yellow-100 px-1 rounded">npm run db:seed</code></li>
          <li>Les embeddings seront générés automatiquement</li>
          <li>Vérifier ici que tous les documents ont leurs embeddings</li>
        </ol>
      </div>
    </div>
  )
}
