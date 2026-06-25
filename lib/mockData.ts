export type CaseStatus = 'Pending' | 'Active' | 'Closed'

export interface Case {
  id: string
  caseNumber: string
  title: string
  client: string
  status: CaseStatus
  priority: 'High' | 'Medium' | 'Low'
  createdDate: string
  lastModified: string
  assignedTo: string
  description: string
  documents: Document[]
}

export interface Document {
  id: string
  name: string
  type: 'Contract' | 'Brief' | 'Evidence' | 'Memo' | 'Other'
  uploadedDate: string
  size: string
  content: string
}

export const mockCases: Case[] = [
  {
    id: '1',
    caseNumber: 'NXS-2024-001',
    title: 'Contract Dispute - Tech Licensing Agreement',
    client: 'TechCorp Solutions Inc.',
    status: 'Active',
    priority: 'High',
    createdDate: '2024-01-15',
    lastModified: '2024-06-20',
    assignedTo: 'Sarah Johnson',
    description:
      'Dispute regarding software licensing terms and usage rights between TechCorp Solutions and Enterprise Software Ltd. The disagreement centers on the scope of permitted deployments and support obligations.',
    documents: [
      {
        id: 'd1',
        name: 'Original License Agreement.pdf',
        type: 'Contract',
        uploadedDate: '2024-01-15',
        size: '2.4 MB',
        content:
          'This Software License Agreement ("Agreement") is entered into as of January 1, 2024, between TechCorp Solutions Inc. and Enterprise Software Ltd. The agreement outlines the terms and conditions for the use of the software product...',
      },
      {
        id: 'd2',
        name: 'Amendment Proposal.docx',
        type: 'Memo',
        uploadedDate: '2024-02-10',
        size: '1.2 MB',
        content:
          'Following discussions with the opposing counsel, we propose the following amendments to the original agreement: 1) Extended deployment rights to include cloud environments, 2) Revised support SLA from 24 hours to 48 hours...',
      },
      {
        id: 'd3',
        name: 'Email Correspondence.pdf',
        type: 'Evidence',
        uploadedDate: '2024-03-05',
        size: '890 KB',
        content:
          'Chain of emails between project managers discussing implementation details and scope clarifications dated from November 2023 through March 2024...',
      },
    ],
  },
  {
    id: '2',
    caseNumber: 'NXS-2024-002',
    title: 'Employment Termination - Wrongful Dismissal Claim',
    client: 'DataFlow Systems',
    status: 'Active',
    priority: 'High',
    createdDate: '2024-02-20',
    lastModified: '2024-06-18',
    assignedTo: 'Michael Chen',
    description:
      'Former employee claims wrongful termination alleging discrimination based on age and family status. Case involves review of personnel files, performance evaluations, and witness testimonies.',
    documents: [
      {
        id: 'd4',
        name: 'Personnel File Summary.pdf',
        type: 'Brief',
        uploadedDate: '2024-02-20',
        size: '3.1 MB',
        content:
          'Comprehensive review of the employee\'s 8-year tenure at DataFlow Systems, including performance reviews, promotion history, and disciplinary records...',
      },
      {
        id: 'd5',
        name: 'Termination Letter.pdf',
        type: 'Evidence',
        uploadedDate: '2024-02-22',
        size: '245 KB',
        content:
          'Official termination letter dated February 15, 2024, citing restructuring and position elimination as grounds for separation...',
      },
    ],
  },
  {
    id: '3',
    caseNumber: 'NXS-2024-003',
    title: 'Intellectual Property - Patent Infringement',
    client: 'InnovateLabs LLC',
    status: 'Pending',
    priority: 'Medium',
    createdDate: '2024-04-10',
    lastModified: '2024-06-15',
    assignedTo: 'Alexandra Martinez',
    description:
      'Patent infringement claim against competitor regarding AI processing algorithms. Under review for validity and damages assessment.',
    documents: [
      {
        id: 'd6',
        name: 'Patent Documentation.pdf',
        type: 'Contract',
        uploadedDate: '2024-04-10',
        size: '1.8 MB',
        content: 'US Patent US10,123,456 - AI Processing Method and System...',
      },
    ],
  },
  {
    id: '4',
    caseNumber: 'NXS-2024-004',
    title: 'Real Estate - Commercial Lease Dispute',
    client: 'Urban Development Partners',
    status: 'Closed',
    priority: 'Low',
    createdDate: '2024-03-01',
    lastModified: '2024-05-30',
    assignedTo: 'James Wilson',
    description: 'Dispute over commercial lease terms and maintenance responsibilities. Case resolved through mediation.',
    documents: [
      {
        id: 'd7',
        name: 'Lease Agreement Final.pdf',
        type: 'Contract',
        uploadedDate: '2024-03-01',
        size: '1.5 MB',
        content: 'Commercial lease dated March 1, 2024 for 10,000 sq ft office space in downtown district...',
      },
      {
        id: 'd8',
        name: 'Settlement Agreement.pdf',
        type: 'Memo',
        uploadedDate: '2024-05-30',
        size: '567 KB',
        content:
          'Final settlement agreement resolving all disputes regarding maintenance obligations and lease renewal terms...',
      },
    ],
  },
  {
    id: '5',
    caseNumber: 'NXS-2024-005',
    title: 'Regulatory Compliance - Data Privacy Violation',
    client: 'HealthTech Innovations',
    status: 'Active',
    priority: 'High',
    createdDate: '2024-05-12',
    lastModified: '2024-06-19',
    assignedTo: 'Emma Robinson',
    description:
      'Investigation into potential GDPR violations and customer data mishandling. Regulatory agency audit in progress.',
    documents: [
      {
        id: 'd9',
        name: 'Audit Report.pdf',
        type: 'Evidence',
        uploadedDate: '2024-05-15',
        size: '2.7 MB',
        content: 'Preliminary audit findings identifying potential compliance gaps in data processing procedures...',
      },
    ],
  },
]

export const chatMessages = [
  {
    id: '1',
    sender: 'user',
    text: 'Can you summarize the key points from this contract?',
    timestamp: '2024-06-25T14:30:00Z',
  },
  {
    id: '2',
    sender: 'assistant',
    text: 'Based on the uploaded contract, here are the key points:\n\n1. **Parties**: TechCorp Solutions Inc. and Enterprise Software Ltd.\n2. **Scope**: Software licensing with cloud deployment rights\n3. **Term**: 3 years with automatic renewal\n4. **Support**: 48-hour response SLA\n5. **Pricing**: $50,000 annually\n6. **Termination**: Either party may terminate with 60 days notice\n\nWould you like me to extract specific metadata or create a compliance checklist?',
    timestamp: '2024-06-25T14:34:00Z',
  },
]

export const quickActions = [
  {
    id: 'summarize',
    label: 'Summarize Case File',
    icon: 'FileText',
    description: 'Generate executive summary of current case',
  },
  {
    id: 'extract',
    label: 'Extract JSON Metadata',
    icon: 'Database',
    description: 'Extract structured metadata from documents',
  },
  {
    id: 'compliance',
    label: 'Generate Compliance Checklist',
    icon: 'CheckSquare',
    description: 'Create regulatory compliance checklist',
  },
]
