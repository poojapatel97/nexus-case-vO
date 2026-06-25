# The Nexus Case - AI-Powered Case Management Dashboard

A modern, professional B2B SaaS dashboard for intelligent case management with integrated AI copilot assistance, built with Next.js 16, Tailwind CSS, and shadcn/ui components.

## Features

### 1. **Responsive Sidebar Navigation**
- Modern vertical sidebar with gradient branding
- Navigation links: Dashboard, Case Files, Client Timelines, Audit Logs, Settings
- Mobile hamburger menu that collapses on smaller viewports
- User profile card with role display
- Fully responsive: collapsible on mobile, fixed on desktop

### 2. **Split-Screen Case Management Interface**

#### Left Panel: Case Profiles List
- Searchable case list with real-time filtering
- Case cards displaying:
  - Case number and title
  - Client name and assigned attorney
  - Status badges (Active, Pending, Closed) with color coding
  - Priority indicators (High, Medium, Low)
  - Last modified date
  - Document count
- Search functionality filters by case title, case number, or client name
- Selected case highlighted with primary color accent

#### Center Panel: Document Viewer
- Full document preview with metadata
- Multi-document support with sidebar navigation
- Document details showing:
  - Document type badges (Contract, Brief, Evidence, Memo, Other)
  - Upload date and file size
  - Full document content preview
- Quick action buttons: Download, Share, Delete
- Responsive layout adapts to viewport size

#### Right Panel: Gemini AI Copilot
- Collapsible chat interface positioned at bottom-right
- Three quick-action buttons:
  - **Summarize Case File** - Generate executive summary
  - **Extract JSON Metadata** - Extract structured metadata from documents
  - **Generate Compliance Checklist** - Create regulatory compliance checklist
- Real-time chat interface with message history
- Simulated AI responses (ready for real Gemini API integration)
- Collapse to floating action button with sparkle icon
- Expandable from floating button state

### 3. **Professional UI/UX Design**

#### Color System
- **Dark Theme**: Modern dark background (#1f1f1f) with professional appearance
- **Primary Accent**: Professional blue (#60 0.21 264.4 in oklch)
- **Status Colors**:
  - Active: Blue
  - Pending: Yellow/Orange
  - Closed: Green
- **Semantic Tokens**: Proper use of foreground, background, muted colors

#### Typography
- Geist Sans for body text
- Geist Mono for code/technical content
- Proper font hierarchy with heading levels
- Readable line heights and letter spacing

#### Accessibility
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- Proper color contrast ratios

### 4. **Responsive Breakpoints**

| Viewport | Behavior |
|----------|----------|
| Mobile (< 768px) | Hamburger menu, stacked layout, floating AI button |
| Tablet (768px - 1024px) | Sidebar visible, collapsible case list |
| Desktop (> 1024px) | Full split-screen with all panels visible |

### 5. **Mock Data System**

Pre-populated with 5 realistic case examples:
- **NXS-2024-001**: Contract Dispute - Tech Licensing Agreement
- **NXS-2024-002**: Employment Termination - Wrongful Dismissal Claim
- **NXS-2024-003**: Intellectual Property - Patent Infringement
- **NXS-2024-004**: Real Estate - Commercial Lease Dispute
- **NXS-2024-005**: Regulatory Compliance - Data Privacy Violation

Each case includes multiple documents with realistic legal content.

## Project Structure

```
/components
  /dashboard
    - DashboardLayout.tsx    # Main layout container
    - Sidebar.tsx            # Navigation sidebar
    - CaseList.tsx           # Case profile list
    - CaseCard.tsx           # Individual case card
    - DocumentViewer.tsx     # Document display
    - AICopilot.tsx          # AI chat interface
/lib
  - mockData.ts              # Mock case and document data
  - utils.ts                 # Utility functions
/app
  - layout.tsx               # Root layout with theme
  - page.tsx                 # Main dashboard page
  - globals.css              # Global styles and design tokens
```

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 with semantic design tokens
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **State Management**: React Hooks (useState)
- **Type Safety**: TypeScript
- **Font**: Geist Sans & Geist Mono (via next/font/google)

## Installation

```bash
# Clone and navigate to project
cd /path/to/nexus-case

# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

Visit `http://localhost:3000` to view the dashboard.

## Key Components

### DashboardLayout
Main container managing:
- Sidebar state and navigation
- Case selection
- Tab switching between different sections
- AI Copilot visibility

### Sidebar
Navigation component with:
- Icon-based menu items
- Mobile responsive hamburger
- User profile section
- Active state highlighting

### CaseList & CaseCard
- Real-time search filtering
- Visual status/priority indicators
- Document count display
- Selection state management

### DocumentViewer
- Multi-document selector
- Document metadata display
- Quick action buttons (download, share, delete)
- Content preview area

### AICopilot
- Floating chat interface
- Quick action buttons
- Message history
- Collapse/expand functionality
- Simulated AI responses

## Customization

### Adding New Cases
Edit `/lib/mockData.ts` to add cases to the `mockCases` array.

### Modifying Colors
Update the design tokens in `/app/globals.css`:
```css
--primary: oklch(0.60 0.21 264.4);  /* Blue */
--destructive: oklch(0.60 0.21 25); /* Red */
```

### Integrating Real AI
Replace the simulated responses in `AICopilot.tsx` with actual Gemini API calls:
```typescript
const response = await fetch('/api/gemini', {
  method: 'POST',
  body: JSON.stringify({ prompt: userMessage })
});
```

## Performance Optimizations

- React.memo for CaseCard component optimization
- Lazy loading for document content
- Efficient search filtering with useMemo
- CSS containment for layout performance
- Optimized re-renders with proper dependency arrays

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 13+, Chrome Android

## Future Enhancements

- [ ] Real Gemini AI integration
- [ ] Database backend (Supabase/Neon)
- [ ] User authentication
- [ ] Real-time collaboration features
- [ ] Document upload functionality
- [ ] Advanced filtering and sorting
- [ ] Dark/light theme toggle
- [ ] Export functionality (PDF, CSV)
- [ ] Audit log visualization
- [ ] Client timeline view
- [ ] Settings panel configuration

## License

Proprietary - Created with v0.app
