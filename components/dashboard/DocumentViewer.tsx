'use client'

import { Case } from '@/lib/mockData'
import { FileText, Download, Share2, Trash2, Calendar, FileIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface DocumentViewerProps {
  case: Case
}

export function DocumentViewer({ case: caseData }: DocumentViewerProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    caseData.documents.length > 0 ? caseData.documents[0].id : null
  )

  const selectedDoc = caseData.documents.find((d) => d.id === selectedDocId)

  const docTypeColors: Record<string, string> = {
    Contract: 'bg-blue-500/10 text-blue-400',
    Brief: 'bg-purple-500/10 text-purple-400',
    Evidence: 'bg-orange-500/10 text-orange-400',
    Memo: 'bg-green-500/10 text-green-400',
    Other: 'bg-gray-500/10 text-gray-400',
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {caseData.title}
        </h2>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">{caseData.caseNumber}</span> • {caseData.client}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Updated {new Date(caseData.lastModified).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document List */}
        <div className="w-48 border-r border-border bg-card overflow-y-auto">
          <div className="p-3 space-y-2">
            {caseData.documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                  selectedDocId === doc.id
                    ? 'bg-primary/10 border border-primary/50 text-foreground'
                    : 'border border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-start gap-2">
                  <FileIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium line-clamp-2 break-words">
                      {doc.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{doc.size}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedDoc ? (
            <>
              {/* Document Header */}
              <div className="border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedDoc.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className={`px-2 py-1 rounded ${docTypeColors[selectedDoc.type]}`}>
                        {selectedDoc.type}
                      </span>
                      <span>Uploaded {new Date(selectedDoc.uploadedDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    title="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Document Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="prose prose-invert max-w-none">
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {selectedDoc.content}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center flex-1 text-muted-foreground">
              <p>No document selected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
