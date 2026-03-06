import React, { createContext, useContext, useState } from 'react'

export type DemoTier = 'mvp' | 'nice-to-have' | 'prototype'

export interface DemoStep {
  id: number
  act: number
  actTitle: string
  actColor: string          // tailwind text color for act badge
  actBg: string             // tailwind bg color for act badge
  title: string
  subtitle: string
  description: string
  action: string            // what to do on this step
  keyMessage: string        // what this step demonstrates
  route: string             // navigate here for this step
  role: string              // set role to this for this step
  tag?: string              // e.g. 'Tool 1', 'Bridge', 'Tool 2'
  tier: DemoTier            // mvp | nice-to-have | prototype
}

export const DEMO_STEPS: DemoStep[] = [
  // ─── ACT 1: Context ──────────────────────────────────────────────────────
  {
    id: 1,
    act: 1, actTitle: 'The Problem Today', actColor: 'text-text-muted', actBg: 'bg-surface',
    title: 'Where FieldSync Is Today',
    subtitle: 'Before we show the solution, set the context',
    description: 'Right now, answering any data question about field operations requires backend queries, manual exports, or waiting on a BI team. Survey tracking is disconnected from the data. There\'s no unified view.',
    action: 'Stay on this page. Walk the audience through the sidebar — show what FieldSync already does: QA Dashboard, Sites, Projects, Customers.',
    keyMessage: '"We have a strong operations foundation. What we\'re missing is the intelligence layer on top of it — and a way to close the loop between data and action."',
    route: '/qa-dashboard',
    role: 'admin',
    tag: 'Context',
    tier: 'prototype',
  },

  // ─── ACT 2: Custom Data Analytics ────────────────────────────────────────
  {
    id: 2,
    act: 2, actTitle: 'Custom Data Analytics', actColor: 'text-accent', actBg: 'bg-accent/10',
    title: 'Introducing the Analytics Interface',
    subtitle: 'Tool 1 — Ask any question in plain English',
    description: 'Navigate to Custom Data Analytics. Show the question input and the Suggested Questions panel on the right. Each question category is role-specific — admins see org-wide questions, technicians only see questions about their own work.',
    action: 'Navigate to Custom Data Analytics. Point out the suggested questions panel — click a few categories to show the breadth of questions available.',
    keyMessage: '"No SQL. No BI ticket. No waiting. Any team member can surface data in seconds — and the system enforces their access level automatically."',
    route: '/custom-data-analytics',
    role: 'admin',
    tag: 'Tool 1',
    tier: 'mvp',
  },
  {
    id: 3,
    act: 2, actTitle: 'Custom Data Analytics', actColor: 'text-accent', actBg: 'bg-accent/10',
    title: 'Ask Your First Question',
    subtitle: 'Watch Claude query the live database',
    description: 'Type a question that returns a single metric — something concrete and meaningful. The system parses the question, Claude queries the database through the MCP bridge, and returns a formatted answer.',
    action: 'Type in the input: "How many surveys are currently overdue?" — then hit Send and wait for the response.',
    keyMessage: '"This is a live query against real data — not a mock. Claude is actually talking to the database through a secure server bridge."',
    route: '/custom-data-analytics',
    role: 'admin',
    tag: 'Tool 1',
    tier: 'mvp',
  },
  {
    id: 4,
    act: 2, actTitle: 'Custom Data Analytics', actColor: 'text-accent', actBg: 'bg-accent/10',
    title: 'The Inline Metric Card',
    subtitle: 'Results auto-format to the right visualization',
    description: 'Single-value answers render as a metric card directly below the response text. Chart-type answers (trends, comparisons) auto-generate as bar, line, area, or pie charts. Every result has an "Add to Dashboard" button.',
    action: 'Point to the metric card below the response. Then ask a second question: "Show me survey completion rates by organization as a bar chart."',
    keyMessage: '"The visualization type is chosen intelligently — Claude decides whether the answer is a metric, a trend, or a comparison and formats it accordingly."',
    route: '/custom-data-analytics',
    role: 'admin',
    tag: 'Tool 1',
    tier: 'mvp',
  },
  {
    id: 5,
    act: 2, actTitle: 'Custom Data Analytics', actColor: 'text-accent', actBg: 'bg-accent/10',
    title: 'Save to Personal Dashboard',
    subtitle: 'Turn a one-off answer into a persistent metric',
    description: 'Click "Add to Dashboard" on the metric card. The widget is saved to the user\'s personal dashboard with their role as the key — Lucy\'s saved charts are invisible to Matt.',
    action: 'Click "Add to Dashboard" on the overdue count metric. You\'ll see a confirmation. Then navigate to My Custom Dashboard.',
    keyMessage: '"Each person builds their own analytical workspace. The metrics they care about, pinned where they need them — not a shared report they have to filter."',
    route: '/custom-data-analytics',
    role: 'admin',
    tag: 'Tool 1',
    tier: 'mvp',
  },
  {
    id: 6,
    act: 2, actTitle: 'Custom Data Analytics', actColor: 'text-accent', actBg: 'bg-accent/10',
    title: 'My Custom Dashboard',
    subtitle: 'A personal, drag-and-resize analytics workspace',
    description: 'The Custom Dashboard shows all saved widgets in a free-form grid. Widgets can be dragged, resized, and reorganized. Saved dashboard snapshots let users name and restore layouts.',
    action: 'Navigate to My Custom Dashboard. Drag the saved widget to a new position. Show the "Save Dashboard" button — give it a name.',
    keyMessage: '"This isn\'t a pre-built report someone else designed. Every user shapes their own view of the data — and those layouts persist between sessions."',
    route: '/custom-dashboard',
    role: 'admin',
    tag: 'Tool 1',
    tier: 'mvp',
  },
  {
    id: 7,
    act: 2, actTitle: 'Custom Data Analytics', actColor: 'text-accent', actBg: 'bg-accent/10',
    title: 'Role-Based Access in Action',
    subtitle: 'The system enforces what each person can see',
    description: 'Switch to QC Technician (Matt). Navigate to Custom Data Analytics and ask a question about org-level data. The system will immediately block it — before even calling the API.',
    action: 'Switch role to QC Technician (Matt). Go to Custom Data Analytics. Ask: "Show me all surveys across all organizations." Watch the instant denial banner.',
    keyMessage: '"Two-layer enforcement: the frontend catches obvious violations before wasting a single API token. The server-side Claude system prompt catches anything that slips through. Matt can never see data that isn\'t his."',
    route: '/custom-data-analytics',
    role: 'qc_technician',
    tag: 'Tool 1',
    tier: 'mvp',
  },

  // ─── ACT 3: The Bridge ───────────────────────────────────────────────────
  {
    id: 8,
    act: 3, actTitle: 'The Bridge', actColor: 'text-purple-400', actBg: 'bg-purple-400/10',
    title: 'Analytics Flows Into Operations',
    subtitle: 'The metric you built becomes a live KPI card',
    description: 'Switch back to Admin. Go to the QA Dashboard. Enter KPI edit mode on the Surveys tab. Click "Add Card +" and scroll to the "From Analytics Dashboard" section — your saved metric is there, ready to pin.',
    action: 'Switch role to Admin. Navigate to QA Dashboard. Click the pencil icon on the KPI row → Add Card + → scroll to "From Analytics Dashboard" → click the overdue metric.',
    keyMessage: '"You asked a question in analytics, got an answer, saved it — and now it lives in your daily operations view. One workflow, two tools, zero context switching."',
    route: '/qa-dashboard',
    role: 'admin',
    tag: 'Bridge',
    tier: 'nice-to-have',
  },

  // ─── ACT 4: QA Operations Dashboard ─────────────────────────────────────
  {
    id: 9,
    act: 4, actTitle: 'QA Operations Dashboard', actColor: 'text-emerald-400', actBg: 'bg-emerald-400/10',
    title: 'Admin View: The Full Picture',
    subtitle: 'Tool 2 — Every survey, scan, site visit, and site in one view',
    description: 'The admin sees everything — all organizations, all data, all tabs. The Overall Completion Rate progress bar surfaces systemic bottlenecks at a glance. Click through the tabs: Surveys, Scans, Site Visits, Sites.',
    action: 'Stay on QA Dashboard as Admin. Switch to "All Organizations" in the org dropdown. Click through each tab — Surveys, Scans, Site Visits, Sites.',
    keyMessage: '"This is the paper trail. Every work item has a status, an owner, a timeline. Nothing lives in someone\'s head or a spreadsheet — it\'s all here."',
    route: '/qa-dashboard',
    role: 'admin',
    tag: 'Tool 2',
    tier: 'mvp',
  },
  {
    id: 10,
    act: 4, actTitle: 'QA Operations Dashboard', actColor: 'text-emerald-400', actBg: 'bg-emerald-400/10',
    title: 'Organization Filtering',
    subtitle: 'Scope the view to a single organization',
    description: 'Use the org switcher in the header to scope to FieldSync Org. Notice the Organization column disappears from all tables — when you\'re scoped to one org, the column is redundant and adds visual noise.',
    action: 'Click the org switcher dropdown → select "FieldSync Org". Watch the org column disappear from the Surveys table.',
    keyMessage: '"The UI adapts to what\'s contextually relevant. We don\'t clutter views with columns that have no meaning in context. Admins can toggle back to All Organizations any time — other roles are permanently scoped."',
    route: '/qa-dashboard',
    role: 'admin',
    tag: 'Tool 2',
    tier: 'mvp',
  },
  {
    id: 11,
    act: 4, actTitle: 'QA Operations Dashboard', actColor: 'text-emerald-400', actBg: 'bg-emerald-400/10',
    title: 'Project Manager: Assigning Work',
    subtitle: 'PM separates assigning work from doing work',
    description: 'Switch to Project Manager (Susan). The Surveys tab has two sections: Needs Assignment and Assigned Surveys. High-priority surveys are sorted to the top. The PM can assign any survey to a technician or themselves.',
    action: 'Switch to PM role. Find an unassigned survey in "Needs Assignment". Click "Assign" → select Matt Edrich → click Assign.',
    keyMessage: '"No email chains. No Slack messages. The assignment happens in the platform, the technician\'s view updates instantly, and the PM has a record of every assignment decision."',
    route: '/qa-dashboard',
    role: 'pm',
    tag: 'Tool 2',
    tier: 'mvp',
  },
  {
    id: 12,
    act: 4, actTitle: 'QA Operations Dashboard', actColor: 'text-emerald-400', actBg: 'bg-emerald-400/10',
    title: 'PM\'s Own Work Queue',
    subtitle: 'PMs can also be assigned work — separate from their management view',
    description: 'Click "My Work" in the PM view toggle. This shows only surveys assigned to Susan — the same card-based layout technicians use. Assigning work and doing work are intentionally different modes.',
    action: 'Click the "My Work" tab in the PM view. If Susan has assigned surveys to herself, they appear here as technician-style priority cards.',
    keyMessage: '"A PM is sometimes also a doer. We don\'t force them to see their personal tasks buried in a full assignment table — they get their own focused work queue."',
    route: '/qa-dashboard',
    role: 'pm',
    tag: 'Tool 2',
    tier: 'nice-to-have',
  },
  {
    id: 13,
    act: 4, actTitle: 'QA Operations Dashboard', actColor: 'text-emerald-400', actBg: 'bg-emerald-400/10',
    title: 'Technician Receives the Assignment',
    subtitle: 'The survey appears instantly in Matt\'s active work',
    description: 'Switch to QC Technician (Matt). The survey assigned by Susan is now in his Active Surveys list — no refresh, no sync needed. His view shows only his own surveys, sorted by priority.',
    action: 'Switch to QC Technician (Matt). Verify the newly assigned survey is now visible in his Active Surveys list.',
    keyMessage: '"Real-time state — the assignment the PM just made is immediately visible here. In a production system this would be a push notification. In the prototype it shows the data model is correct."',
    route: '/qa-dashboard',
    role: 'qc_technician',
    tag: 'Tool 2',
    tier: 'mvp',
  },
  {
    id: 14,
    act: 4, actTitle: 'QA Operations Dashboard', actColor: 'text-emerald-400', actBg: 'bg-emerald-400/10',
    title: 'Priority Lock: Field Safety',
    subtitle: 'High-priority surveys block lower ones — but can be overridden',
    description: 'Switch to QC Technician 2 (John). John has overdue and high-priority surveys that block lower-priority work. But field conditions sometimes require working out of sequence — the Unblock feature handles this safely.',
    action: 'Switch to QC Technician 2 (John). Find a locked (grayed-out) survey card. Click "Unblock" — read the confirmation modal aloud to the audience.',
    keyMessage: '"This is a real field problem — work doesn\'t always happen in priority order. We enforce the rule by default but give field staff a documented way to override it. The override is intentional friction, not a workaround."',
    route: '/qa-dashboard',
    role: 'qc_technician_2',
    tag: 'Tool 2',
    tier: 'nice-to-have',
  },
  {
    id: 15,
    act: 4, actTitle: 'QA Operations Dashboard', actColor: 'text-emerald-400', actBg: 'bg-emerald-400/10',
    title: 'Survey Detail: The Work Itself',
    subtitle: 'Click into any survey to open the full inspection flow',
    description: 'Click any survey name to open the detail page. This is the survey workflow — accordion sections, field checklists, photo requirements, deficiencies. The progress bar tracks how many fields have been marked.',
    action: 'Click any survey name in John or Matt\'s active queue. Open a few accordion sections. Check off several fields and watch the "Marked Fields" progress bar update.',
    keyMessage: '"The detail view mirrors how a real inspection form works — sections, fields, photo requirements, deficiency logging. The progress bar gives both the technician and their manager real-time completion visibility."',
    route: '/qa-dashboard',
    role: 'qc_technician',
    tag: 'Tool 2',
    tier: 'nice-to-have',
  },
  {
    id: 16,
    act: 4, actTitle: 'QA Operations Dashboard', actColor: 'text-emerald-400', actBg: 'bg-emerald-400/10',
    title: 'Mark as Complete',
    subtitle: 'The completion propagates across all role views',
    description: 'Click "Mark as Complete" — confirm in the modal. The survey status updates to Completed with today\'s date. Switch back to the PM or Admin view to see it reflected there too.',
    action: 'Click "Mark as Complete" → confirm. Then close the detail view. Switch to PM role → look at the Assigned Surveys table. The survey now shows as Completed.',
    keyMessage: '"One action — complete. It\'s immediately visible to the PM, the org owner, and the admin. That\'s the paper trail closing. Every role sees the correct, current state."',
    route: '/qa-dashboard',
    role: 'qc_technician',
    tag: 'Tool 2',
    tier: 'nice-to-have',
  },

  // ─── ACT 5: Org Owner + Closing ──────────────────────────────────────────
  {
    id: 17,
    act: 5, actTitle: 'The Full Picture', actColor: 'text-amber-400', actBg: 'bg-amber-400/10',
    title: 'Org Owner: Health at a Glance',
    subtitle: 'Each stakeholder gets the view appropriate to their role',
    description: 'Switch to Org Owner. The org-level health cards span the full page width — each organization gets a summary card with total surveys, completed, in-progress, overdue, and a completion rate. Clean and decisive.',
    action: 'Switch to Org Owner. Show the full-width org health cards. Switch between FieldSync Org and Test Org in the org switcher.',
    keyMessage: '"The org owner doesn\'t need row-by-row detail — they need health signals. Are we on track? Where are the problems? This view answers that in under 10 seconds."',
    route: '/qa-dashboard',
    role: 'org_owner',
    tag: 'Closing',
    tier: 'nice-to-have',
  },
  {
    id: 18,
    act: 5, actTitle: 'The Full Picture', actColor: 'text-amber-400', actBg: 'bg-amber-400/10',
    title: 'Customizable KPI Cards',
    subtitle: 'Every user shapes their own signal-to-noise ratio',
    description: 'Back in any view, show the KPI customization system: the pencil icon enters edit mode, users can remove cards that don\'t matter, add from the registry, or import metrics from their Analytics Dashboard.',
    action: 'Switch to Admin. Click the pencil icon on any KPI row. Remove a card. Add a different one. Show the "From Analytics Dashboard" section in the dropdown.',
    keyMessage: '"No one\'s workflow is identical. The customization system means each person sees exactly the numbers they care about — and nothing else. Preferences persist between sessions per-role."',
    route: '/qa-dashboard',
    role: 'admin',
    tag: 'Closing',
    tier: 'nice-to-have',
  },
  {
    id: 19,
    act: 5, actTitle: 'The Full Picture', actColor: 'text-amber-400', actBg: 'bg-amber-400/10',
    title: 'The Value Proposition',
    subtitle: 'What this prototype proves is possible',
    description: 'Two tools, one platform, zero context switching. Analytics gives you the questions. QA gives you the accountability. Together they create a system where every data question has an answer and every work item has an owner.',
    action: 'Return to the Demo Guide page. Use the act timeline to walk back through the key moments of the demo if there are questions.',
    keyMessage: '"Today, answering \'how many overdue surveys do we have?\' requires a backend query or a manual count. With this system, any authorized user gets that answer in 10 seconds — and can pin it to the view where they need it. That\'s the gap we\'re closing."',
    route: '/demo',
    role: 'admin',
    tag: 'Closing',
    tier: 'prototype',
  },
]

interface DemoContextValue {
  isActive: boolean
  isMinimized: boolean
  currentStep: number
  totalSteps: number
  step: DemoStep
  startDemo: (stepIndex?: number) => void
  endDemo: () => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (n: number) => void
  toggleMinimize: () => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const totalSteps = DEMO_STEPS.length

  const startDemo = (stepIndex = 0) => {
    setCurrentStep(Math.max(0, Math.min(stepIndex, totalSteps - 1)))
    setIsActive(true)
    setIsMinimized(false)
  }

  const endDemo = () => {
    setIsActive(false)
    setIsMinimized(false)
  }

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, totalSteps - 1))
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 0))
  const goToStep = (n: number) => setCurrentStep(Math.max(0, Math.min(n, totalSteps - 1)))
  const toggleMinimize = () => setIsMinimized(v => !v)

  return (
    <DemoContext.Provider value={{
      isActive, isMinimized, currentStep, totalSteps,
      step: DEMO_STEPS[currentStep],
      startDemo, endDemo, nextStep, prevStep, goToStep, toggleMinimize,
    }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used within DemoProvider')
  return ctx
}
