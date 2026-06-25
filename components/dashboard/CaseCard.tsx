'use client'

import { Case } from '@/lib/mockData'
import { Calendar, User } from 'lucide-react'

interface CaseCardProps {
  case: Case
  isSelected: boolean
  onClick: (caseId: string) => void
}

export function CaseCard({ case: caseData, isSelected, onClick }: CaseCardProps) {
  const statusColors: Record<string, string> = {
    Active: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    Closed: 'bg-green-500/10 text-green-400 border-green-500/20',
  }

  const priorityColors: Record<string, string> = {
    High: 'text-red-400',
    Medium: 'text-yellow-400',
    Low: 'text-green-400',
  }

  return (
    <button
      onClick={() => onClick(caseData.id)}
      className={`w-full rounded-lg border transition-all duration-200 p-4 text-left ${
        isSelected
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
          : 'border-border bg-card hover:border-primary/50 hover:bg-card/80'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {caseData.caseNumber}
          </p>
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 mt-1">
            {caseData.title}
          </h3>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium border whitespace-nowrap flex-shrink-0 ${
            statusColors[caseData.status]
          }`}
        >
          {caseData.status}
        </span>
      </div>

      {/* Client */}
      <p className="text-sm text-muted-foreground truncate mb-3">
        Client: <span className="text-foreground font-medium">{caseData.client}</span>
      </p>

      {/* Metadata */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{caseData.lastModified}</span>
        </div>
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span className="truncate">{caseData.assignedTo}</span>
        </div>
        <div className={`font-semibold ${priorityColors[caseData.priority]}`}>
          {caseData.priority} Priority
        </div>
      </div>

      {/* Document count */}
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{caseData.documents.length}</span> documents
        </p>
      </div>
    </button>
  )
}
