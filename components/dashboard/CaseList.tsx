'use client'

import { Case } from '@/lib/mockData'
import { CaseCard } from './CaseCard'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useState, useMemo } from 'react'

interface CaseListProps {
  cases: Case[]
  selectedCaseId: string | null
  onCaseSelect: (caseId: string) => void
}

export function CaseList({ cases, selectedCaseId, onCaseSelect }: CaseListProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCases = useMemo(() => {
    return cases.filter(
      (c) =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.client.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [cases, searchTerm])

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border text-foreground placeholder-muted-foreground"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-4">
          {filteredCases.map((caseItem) => (
            <CaseCard
              key={caseItem.id}
              case={caseItem}
              isSelected={selectedCaseId === caseItem.id}
              onClick={onCaseSelect}
            />
          ))}
          {filteredCases.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No cases found. Try adjusting your search.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
