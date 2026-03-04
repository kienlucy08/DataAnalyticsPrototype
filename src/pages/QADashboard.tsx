import React, { useState } from 'react'
import {
  ClipboardCheck, Clock, CheckCircle2, AlertCircle, TrendingUp,
  ChevronDown, ChevronRight, Search, MoreHorizontal, XCircle,
  UserCheck, Users, Lock,
} from 'lucide-react'
import { useRole } from '../context/RoleContext'

// ─── Types ─────────────────────────────────────────────────────────────────

type SurveyScope  = 'inspection' | 'cop' | 'jsa' | 'facilities' | 'other'
type SurveyStatus = 'unassigned' | 'pending' | 'in_progress' | 'completed' | 'overdue'
type VisitStatus  = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
type Priority     = 'high' | 'medium' | 'low'

interface Survey {
  id: string
  name: string
  siteId: string
  siteName: string
  organization: string
  scope: SurveyScope
  status: SurveyStatus
  assignee?: string
  progress?: number
  createdDate: string
  completedDate?: string
  dueDate?: string
  priority?: Priority
}

interface Scan {
  id: string
  name: string
  siteVisit?: string
  siteId: string
  siteName: string
  organization: string
  files: number
  technician: string
  createdDate: string
}

interface SiteVisit {
  id: string
  name: string
  siteId: string
  siteName: string
  organization: string
  scope: SurveyScope
  status: VisitStatus
  assignee: string
  scheduledDate: string
  processed: boolean
  processingDate?: string
  processedBy?: string
}

interface SiteData {
  id: string
  siteId: string
  siteName: string
  organization: string
  createdDate: string
  lastSiteVisit?: string
  lastProcessTime?: string
  isOverdue?: boolean
}

// ─── Fake data ─────────────────────────────────────────────────────────────

const ALL_SURVEYS: Survey[] = [
  { id: 'SV-1042', name: 'Compound Inspection [QA]',     siteId: '11046',      siteName: 'Garden City',      organization: 'FieldSync Org', scope: 'inspection', status: 'in_progress', assignee: 'Matt Edrich', progress: 60,  createdDate: 'Oct 14, 2025',  dueDate: 'Nov 1, 2025',  priority: 'high' },
  { id: 'SV-1043', name: 'TEST Light System COP',        siteId: '3667',       siteName: "Danny's Haus",     organization: 'FieldSync Org', scope: 'cop',        status: 'in_progress', assignee: 'Matt Edrich', progress: 30,  createdDate: 'Feb 9, 2026',   dueDate: 'Mar 1, 2026' },
  { id: 'SV-1044', name: 'Job Safety Analysis',          siteId: 'SA-001',     siteName: 'Safety Site A',    organization: 'Test Org',      scope: 'jsa',        status: 'completed',   assignee: 'Matt Edrich', progress: 100, createdDate: 'Oct 22, 2025',  completedDate: 'Nov 15, 2025' },
  { id: 'SV-1045', name: 'Guy Facilities Inspection',    siteId: 'T0B1105',    siteName: 'Hiawatha',         organization: 'Test Org',      scope: 'facilities', status: 'pending',     assignee: 'John Smith',  progress: 0,   createdDate: 'Dec 22, 2025',  dueDate: 'Jan 10, 2026', priority: 'high' },
  { id: 'SV-1046', name: 'TEST Safety Climb COP',        siteId: 'SA-safety',  siteName: 'Safety',           organization: 'Test Org',      scope: 'cop',        status: 'overdue',     assignee: 'John Smith',  progress: 45,  createdDate: 'Oct 21, 2025',  dueDate: 'Nov 30, 2025', priority: 'high' },
  { id: 'SV-1047', name: 'Annual Tower Inspection',      siteId: 'MN-1055',    siteName: 'Duluth 1',         organization: 'Test Org',      scope: 'inspection', status: 'unassigned',  progress: 0,   createdDate: 'Sep 23, 2025',  dueDate: 'Mar 15, 2026', priority: 'high' },
  { id: 'SV-1048', name: 'Compound Inspection',          siteId: 'Mango123',   siteName: 'Mango Site',       organization: 'Test Org',      scope: 'inspection', status: 'in_progress', assignee: 'John Smith',  progress: 55,  createdDate: 'Jan 20, 2026',  dueDate: 'Feb 28, 2026' },
  { id: 'SV-1049', name: 'RF Equipment Survey',          siteId: 'GA-01',      siteName: 'Glen Arbor',       organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'Matt Edrich', progress: 100, createdDate: 'Jan 16, 2026',  completedDate: 'Feb 10, 2026' },
  { id: 'SV-1050', name: 'Tower Structural Inspection',  siteId: 'UMT-II',     siteName: 'UMT II',           organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'John Smith',  progress: 100, createdDate: 'Aug 6, 2025',   completedDate: 'Sep 1, 2025' },
  { id: 'SV-1051', name: 'CONS-MOD 48 Hour Turnaround', siteId: 'Mango123',   siteName: 'Mango Site',       organization: 'Test Org',      scope: 'other',      status: 'pending',     assignee: 'John Smith',  progress: 0,   createdDate: 'Jan 20, 2026',  dueDate: 'Feb 1, 2026',  priority: 'low' },
  { id: 'SV-1052', name: 'Grounding Survey',             siteId: 'GA-02',      siteName: 'Glen Arbor North', organization: 'FieldSync Org', scope: 'inspection', status: 'unassigned',  progress: 0,   createdDate: 'Feb 15, 2026',  dueDate: 'Mar 20, 2026' },
  { id: 'SV-1053', name: 'Job Safety Analysis',          siteId: '3667',       siteName: "Danny's Haus",     organization: 'SomeOrg',       scope: 'jsa',        status: 'completed',   assignee: 'Mike Torres', progress: 100, createdDate: 'Nov 1, 2025',   completedDate: 'Nov 20, 2025' },
  { id: 'SV-1054', name: 'Compound Inspection [QA]',     siteId: 'SO-445',     siteName: 'Central Tower',    organization: 'SomeOrg',       scope: 'inspection', status: 'in_progress', assignee: 'Mike Torres', progress: 70,  createdDate: 'Dec 1, 2025',   dueDate: 'Jan 15, 2026' },
  { id: 'SV-1055', name: 'Annual Tower Inspection',      siteId: 'SO-210',     siteName: 'Westside Hub',     organization: 'SomeOrg',       scope: 'inspection', status: 'overdue',     assignee: 'Lisa Park',   progress: 20,  createdDate: 'Nov 10, 2025',  dueDate: 'Dec 31, 2025' },
  { id: 'SV-1056', name: 'TEST Light System COP',        siteId: 'UMT-III',    siteName: 'UMT III',          organization: 'FieldSync Org', scope: 'cop',        status: 'unassigned',  progress: 0,   createdDate: 'Feb 20, 2026',  dueDate: 'Apr 1, 2026',  priority: 'low' },
  { id: 'SV-1057', name: 'Guy Facilities Inspection v2', siteId: 'T0B1105',    siteName: 'Hiawatha',         organization: 'Test Org',      scope: 'facilities', status: 'completed',   assignee: 'Matt Edrich', progress: 100, createdDate: 'Dec 22, 2025',  completedDate: 'Jan 28, 2026' },
  { id: 'SV-1058', name: 'Grounding Survey',             siteId: 'MN-1055',    siteName: 'Duluth 1',         organization: 'Test Org',      scope: 'inspection', status: 'completed',   assignee: 'John Smith',  progress: 100, createdDate: 'Nov 5, 2025',   completedDate: 'Dec 10, 2025' },
  { id: 'SV-1059', name: 'RF Equipment Survey',          siteId: 'SO-100',     siteName: 'Metro Site',       organization: 'SomeOrg',       scope: 'inspection', status: 'pending',     assignee: 'Lisa Park',   progress: 0,   createdDate: 'Feb 25, 2026',  dueDate: 'Mar 30, 2026' },
  { id: 'SV-1060', name: 'Annual Tower Inspection',      siteId: 'GA-02',      siteName: 'Glen Arbor North', organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'Matt Edrich', progress: 100, createdDate: 'Jan 1, 2026',   completedDate: 'Jan 30, 2026' },
  { id: 'SV-1061', name: 'Grounding Survey',             siteId: 'SA-safety',  siteName: 'Safety',           organization: 'Test Org',      scope: 'inspection', status: 'completed',   assignee: 'John Smith',  progress: 100, createdDate: 'Aug 15, 2025',  completedDate: 'Sep 5, 2025' },
  { id: 'SV-1062', name: 'TEST Light System COP',        siteId: 'GA-01',      siteName: 'Glen Arbor',       organization: 'FieldSync Org', scope: 'cop',        status: 'completed',   assignee: 'Matt Edrich', progress: 100, createdDate: 'Dec 10, 2025',  completedDate: 'Jan 5, 2026' },
  { id: 'SV-1063', name: 'Compound Inspection [QA]',     siteId: 'UMT-III',    siteName: 'UMT III',          organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'John Smith',  progress: 100, createdDate: 'Nov 15, 2025',  completedDate: 'Dec 20, 2025' },
  { id: 'SV-1064', name: 'Job Safety Analysis',          siteId: 'Mango123',   siteName: 'Mango Site',       organization: 'Test Org',      scope: 'jsa',        status: 'completed',   assignee: 'Matt Edrich', progress: 100, createdDate: 'Sep 10, 2025',  completedDate: 'Oct 1, 2025' },
  { id: 'SV-1065', name: 'Annual Tower Inspection',      siteId: 'SO-445',     siteName: 'Central Tower',    organization: 'SomeOrg',       scope: 'inspection', status: 'completed',   assignee: 'Mike Torres', progress: 100, createdDate: 'Sep 20, 2025',  completedDate: 'Oct 15, 2025' },
  { id: 'SV-1066', name: 'RF Equipment Survey',          siteId: 'MN-1055',    siteName: 'Duluth 1',         organization: 'Test Org',      scope: 'inspection', status: 'pending',     assignee: 'Matt Edrich', progress: 0,   createdDate: 'Feb 25, 2026',  dueDate: 'Mar 25, 2026' },
]

const SCANS: Scan[] = [
  { id: 'SC-201', name: 'GardenCity-Scan - Oct 18, 2025 - 2:30 PM',      siteVisit: 'Q4 2025 Inspection',     siteId: '11046',     siteName: 'Garden City',      organization: 'FieldSync Org', files: 14, technician: 'Matt Edrich', createdDate: 'Oct 18, 2025' },
  { id: 'SC-202', name: 'DannysHaus-COP - Feb 12, 2026 - 9:15 AM',       siteVisit: 'Feb 2026 COP Visit',     siteId: '3667',      siteName: "Danny's Haus",     organization: 'FieldSync Org', files: 8,  technician: 'Matt Edrich', createdDate: 'Feb 12, 2026' },
  { id: 'SC-203', name: 'SafetySiteA-JSA - Nov 10, 2025 - 11:00 AM',     siteVisit: 'Safety Audit',           siteId: 'SA-001',    siteName: 'Safety Site A',    organization: 'Test Org',      files: 6,  technician: 'Matt Edrich', createdDate: 'Nov 10, 2025' },
  { id: 'SC-204', name: 'GlenArbor-RF - Jan 20, 2026 - 3:45 PM',         siteVisit: 'Glen Arbor RF Check',    siteId: 'GA-01',     siteName: 'Glen Arbor',       organization: 'FieldSync Org', files: 22, technician: 'Matt Edrich', createdDate: 'Jan 20, 2026' },
  { id: 'SC-205', name: 'Hiawatha-Facilities - Jan 5, 2026 - 10:20 AM',                                       siteId: 'T0B1105',   siteName: 'Hiawatha',         organization: 'Test Org',      files: 11, technician: 'Matt Edrich', createdDate: 'Jan 5, 2026' },
  { id: 'SC-206', name: 'GlenArborN-Annual - Jan 28, 2026 - 1:00 PM',    siteVisit: 'Glen Arbor North Survey', siteId: 'GA-02',    siteName: 'Glen Arbor North', organization: 'FieldSync Org', files: 9,  technician: 'Matt Edrich', createdDate: 'Jan 28, 2026' },
  { id: 'SC-207', name: 'GlenArbor-COP - Jan 5, 2026 - 8:30 AM',                                             siteId: 'GA-01',     siteName: 'Glen Arbor',       organization: 'FieldSync Org', files: 7,  technician: 'Matt Edrich', createdDate: 'Jan 5, 2026' },
  { id: 'SC-208', name: 'Safety-ClimbCOP - Oct 28, 2025 - 4:00 PM',      siteVisit: 'Safety Climb Review',    siteId: 'SA-safety', siteName: 'Safety',           organization: 'Test Org',      files: 9,  technician: 'John Smith',  createdDate: 'Oct 28, 2025' },
  { id: 'SC-209', name: 'MangoSite-Compound - Jan 25, 2026 - 2:15 PM',                                        siteId: 'Mango123',  siteName: 'Mango Site',       organization: 'Test Org',      files: 17, technician: 'John Smith',  createdDate: 'Jan 25, 2026' },
  { id: 'SC-210', name: 'UMT-II-Structural - Aug 15, 2025 - 9:00 AM',    siteVisit: 'UMT Structural Visit',   siteId: 'UMT-II',    siteName: 'UMT II',           organization: 'FieldSync Org', files: 31, technician: 'John Smith',  createdDate: 'Aug 15, 2025' },
  { id: 'SC-211', name: 'Duluth1-Grounding - Nov 20, 2025 - 11:30 AM',                                        siteId: 'MN-1055',   siteName: 'Duluth 1',         organization: 'Test Org',      files: 5,  technician: 'John Smith',  createdDate: 'Nov 20, 2025' },
  { id: 'SC-212', name: 'UMT-III-Compound - Dec 15, 2025 - 3:00 PM',                                          siteId: 'UMT-III',   siteName: 'UMT III',          organization: 'FieldSync Org', files: 13, technician: 'John Smith',  createdDate: 'Dec 15, 2025' },
  { id: 'SC-213', name: 'DannysHaus-JSA - Nov 8, 2025 - 10:00 AM',                                            siteId: '3667',      siteName: "Danny's Haus",     organization: 'SomeOrg',       files: 7,  technician: 'Mike Torres', createdDate: 'Nov 8, 2025' },
  { id: 'SC-214', name: 'CentralTower-QA - Dec 10, 2025 - 2:00 PM',      siteVisit: 'Central Tower Audit',    siteId: 'SO-445',    siteName: 'Central Tower',    organization: 'SomeOrg',       files: 19, technician: 'Mike Torres', createdDate: 'Dec 10, 2025' },
  { id: 'SC-215', name: 'WestsideHub-Annual - Nov 25, 2025 - 1:30 PM',                                        siteId: 'SO-210',    siteName: 'Westside Hub',     organization: 'SomeOrg',       files: 4,  technician: 'Lisa Park',   createdDate: 'Nov 25, 2025' },
]

const SITE_VISITS: SiteVisit[] = [
  { id: 'SV-V001', name: 'Q4 2025 Inspection',      siteId: '11046',     siteName: 'Garden City',      organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'Matt Edrich', scheduledDate: 'Oct 14, 2025', processed: true,  processingDate: 'Nov 2, 2025',   processedBy: 'Lucy Kien' },
  { id: 'SV-V002', name: 'Feb 2026 COP Visit',      siteId: '3667',      siteName: "Danny's Haus",     organization: 'FieldSync Org', scope: 'cop',        status: 'in_progress', assignee: 'Matt Edrich', scheduledDate: 'Feb 9, 2026',  processed: false },
  { id: 'SV-V003', name: 'Safety Audit',             siteId: 'SA-001',    siteName: 'Safety Site A',    organization: 'Test Org',      scope: 'jsa',        status: 'completed',   assignee: 'Matt Edrich', scheduledDate: 'Oct 22, 2025', processed: true,  processingDate: 'Nov 20, 2025',  processedBy: 'Sara Connor' },
  { id: 'SV-V004', name: 'Annual Structural Check',  siteId: 'T0B1105',   siteName: 'Hiawatha',         organization: 'Test Org',      scope: 'inspection', status: 'scheduled',   assignee: 'John Smith',  scheduledDate: 'Dec 22, 2025', processed: false },
  { id: 'SV-V005', name: 'Safety Climb Review',      siteId: 'SA-safety', siteName: 'Safety',           organization: 'Test Org',      scope: 'cop',        status: 'in_progress', assignee: 'John Smith',  scheduledDate: 'Oct 21, 2025', processed: false },
  { id: 'SV-V006', name: 'Q1 2026 Tower Survey',     siteId: 'MN-1055',   siteName: 'Duluth 1',         organization: 'Test Org',      scope: 'inspection', status: 'scheduled',   assignee: 'TBD',         scheduledDate: 'Mar 15, 2026', processed: false },
  { id: 'SV-V007', name: 'Glen Arbor RF Check',      siteId: 'GA-01',     siteName: 'Glen Arbor',       organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'Matt Edrich', scheduledDate: 'Jan 16, 2026', processed: true,  processingDate: 'Feb 5, 2026',   processedBy: 'Lucy Kien' },
  { id: 'SV-V008', name: 'UMT Structural Visit',     siteId: 'UMT-II',    siteName: 'UMT II',           organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'John Smith',  scheduledDate: 'Aug 6, 2025',  processed: true,  processingDate: 'Sep 10, 2025',  processedBy: 'Sara Connor' },
  { id: 'SV-V009', name: 'Glen Arbor North Survey',  siteId: 'GA-02',     siteName: 'Glen Arbor North', organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'Matt Edrich', scheduledDate: 'Jan 30, 2026', processed: false },
  { id: 'SV-V010', name: 'Central Tower Audit',      siteId: 'SO-445',    siteName: 'Central Tower',    organization: 'SomeOrg',       scope: 'inspection', status: 'in_progress', assignee: 'Mike Torres', scheduledDate: 'Dec 1, 2025',  processed: false },
  { id: 'SV-V011', name: 'Westside Inspection',      siteId: 'SO-210',    siteName: 'Westside Hub',     organization: 'SomeOrg',       scope: 'inspection', status: 'cancelled',   assignee: 'Lisa Park',   scheduledDate: 'Nov 10, 2025', processed: false },
]

const ALL_SITES: SiteData[] = [
  { id: 'ST-001', siteId: '11046',     siteName: 'Garden City',      organization: 'FieldSync Org', createdDate: 'Aug 1, 2025',   lastSiteVisit: 'Oct 14, 2025', lastProcessTime: 'Nov 2, 2025',   isOverdue: false },
  { id: 'ST-002', siteId: '3667',      siteName: "Danny's Haus",     organization: 'FieldSync Org', createdDate: 'Aug 5, 2025',   lastSiteVisit: 'Feb 9, 2026',  lastProcessTime: undefined,       isOverdue: true  },
  { id: 'ST-003', siteId: 'GA-01',     siteName: 'Glen Arbor',       organization: 'FieldSync Org', createdDate: 'Aug 10, 2025',  lastSiteVisit: 'Jan 16, 2026', lastProcessTime: 'Feb 5, 2026',   isOverdue: false },
  { id: 'ST-004', siteId: 'GA-02',     siteName: 'Glen Arbor North', organization: 'FieldSync Org', createdDate: 'Aug 10, 2025',  lastSiteVisit: 'Jan 30, 2026', lastProcessTime: undefined,       isOverdue: true  },
  { id: 'ST-005', siteId: 'UMT-II',    siteName: 'UMT II',           organization: 'FieldSync Org', createdDate: 'Jul 1, 2025',   lastSiteVisit: 'Aug 6, 2025',  lastProcessTime: 'Sep 10, 2025',  isOverdue: false },
  { id: 'ST-006', siteId: 'UMT-III',   siteName: 'UMT III',          organization: 'FieldSync Org', createdDate: 'Jul 1, 2025',   lastSiteVisit: undefined,      lastProcessTime: undefined,       isOverdue: true  },
  { id: 'ST-007', siteId: 'T0B1105',   siteName: 'Hiawatha',         organization: 'Test Org',      createdDate: 'Oct 1, 2025',   lastSiteVisit: 'Dec 22, 2025', lastProcessTime: undefined,       isOverdue: false },
  { id: 'ST-008', siteId: 'MN-1055',   siteName: 'Duluth 1',         organization: 'Test Org',      createdDate: 'Sep 1, 2025',   lastSiteVisit: 'Mar 15, 2026', lastProcessTime: undefined,       isOverdue: true  },
  { id: 'ST-009', siteId: 'Mango123',  siteName: 'Mango Site',       organization: 'Test Org',      createdDate: 'Dec 1, 2025',   lastSiteVisit: 'Jan 25, 2026', lastProcessTime: undefined,       isOverdue: false },
  { id: 'ST-010', siteId: 'SA-001',    siteName: 'Safety Site A',    organization: 'Test Org',      createdDate: 'Oct 5, 2025',   lastSiteVisit: 'Oct 22, 2025', lastProcessTime: 'Nov 20, 2025',  isOverdue: false },
  { id: 'ST-011', siteId: 'SA-safety', siteName: 'Safety',           organization: 'Test Org',      createdDate: 'Oct 5, 2025',   lastSiteVisit: 'Oct 21, 2025', lastProcessTime: undefined,       isOverdue: true  },
  { id: 'ST-012', siteId: 'SO-445',    siteName: 'Central Tower',    organization: 'SomeOrg',       createdDate: 'Sep 15, 2025',  lastSiteVisit: 'Dec 1, 2025',  lastProcessTime: 'Oct 15, 2025',  isOverdue: false },
  { id: 'ST-013', siteId: 'SO-210',    siteName: 'Westside Hub',     organization: 'SomeOrg',       createdDate: 'Sep 15, 2025',  lastSiteVisit: 'Nov 10, 2025', lastProcessTime: undefined,       isOverdue: true  },
  { id: 'ST-014', siteId: 'SO-100',    siteName: 'Metro Site',       organization: 'SomeOrg',       createdDate: 'Nov 1, 2025',   lastSiteVisit: undefined,      lastProcessTime: undefined,       isOverdue: true  },
]

// ─── Derived role-scoped data ───────────────────────────────────────────────

const ORG_FILTER = ['FieldSync Org', 'Test Org']

const ORG_SURVEYS     = ALL_SURVEYS.filter(s => ORG_FILTER.includes(s.organization))
const MATT_SURVEYS    = ALL_SURVEYS.filter(s => s.assignee === 'Matt Edrich')
const JOHN_SURVEYS    = ALL_SURVEYS.filter(s => s.assignee === 'John Smith')

const ORG_SCANS       = SCANS.filter(s => ORG_FILTER.includes(s.organization))
const MATT_SCANS      = SCANS.filter(s => s.technician === 'Matt Edrich')
const JOHN_SCANS      = SCANS.filter(s => s.technician === 'John Smith')

const ORG_VISITS      = SITE_VISITS.filter(s => ORG_FILTER.includes(s.organization))
const MATT_VISITS     = SITE_VISITS.filter(s => s.assignee === 'Matt Edrich')
const JOHN_VISITS     = SITE_VISITS.filter(s => s.assignee === 'John Smith')

const ORG_SITES       = ALL_SITES.filter(s => ORG_FILTER.includes(s.organization))
const MATT_SITES      = ALL_SITES.filter(s => MATT_SURVEYS.some(sv => sv.siteId === s.siteId) || MATT_VISITS.some(v => v.siteId === s.siteId))
const JOHN_SITES      = ALL_SITES.filter(s => JOHN_SURVEYS.some(sv => sv.siteId === s.siteId) || JOHN_VISITS.some(v => v.siteId === s.siteId))

// ─── Shared UI helpers ─────────────────────────────────────────────────────

const STATUS_STYLES: Record<SurveyStatus, string> = {
  unassigned:  'text-text-muted bg-surface border-border',
  pending:     'text-amber-400 bg-amber-400/10 border-amber-400/30',
  in_progress: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  completed:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  overdue:     'text-red-400 bg-red-400/10 border-red-400/30',
}
const STATUS_LABELS: Record<SurveyStatus, string> = {
  unassigned: 'Unassigned', pending: 'Pending', in_progress: 'In Progress',
  completed: 'Completed', overdue: 'Overdue',
}
const VISIT_STYLES: Record<VisitStatus, string> = {
  scheduled:   'text-amber-400 bg-amber-400/10 border-amber-400/30',
  in_progress: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  completed:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  cancelled:   'text-text-muted bg-surface border-border',
}
const VISIT_LABELS: Record<VisitStatus, string> = {
  scheduled: 'Scheduled', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled',
}

function StatusBadge({ status }: { status: SurveyStatus }) {
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>
}
function VisitBadge({ status }: { status: VisitStatus }) {
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${VISIT_STYLES[status]}`}>{VISIT_LABELS[status]}</span>
}
function ProgressBar({ value }: { value: number }) {
  const color = value === 100 ? 'bg-emerald-400' : value > 50 ? 'bg-accent' : 'bg-amber-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] text-text-muted w-7 text-right">{value}%</span>
    </div>
  )
}

// ─── Priority helpers ───────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<Priority, string> = {
  high:   'text-red-400 bg-red-400/10 border-red-400/30',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  low:    'text-text-muted bg-surface border-border',
}
const PRIORITY_LABELS: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' }

function getEffectivePriority(s: Survey): Priority {
  return s.status === 'overdue' ? 'high' : (s.priority ?? 'medium')
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[priority]}`}>{PRIORITY_LABELS[priority]}</span>
}

// ─── KPI Card helper ────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className={`mb-1.5 ${color}`}>{icon}</div>
      <div className="text-text-primary text-2xl font-bold">{value}</div>
      <div className="text-text-muted text-xs mt-0.5">{label}</div>
    </div>
  )
}

// ─── Dashboard Tabs ─────────────────────────────────────────────────────────

type TabId = 'surveys' | 'scans' | 'site_visits' | 'sites'

const SCOPE_OPTIONS = [
  { value: 'all' as const,        label: 'All Scopes' },
  { value: 'inspection' as const, label: 'Inspection' },
  { value: 'cop' as const,        label: 'COP' },
  { value: 'jsa' as const,        label: 'JSA' },
  { value: 'facilities' as const, label: 'Facilities Inspection' },
  { value: 'other' as const,      label: 'Other' },
]

interface DashboardTabsProps {
  surveys: Survey[]
  scans: Scan[]
  siteVisits: SiteVisit[]
  sites: SiteData[]
  customSurveysContent?: React.ReactNode
}

function Checkbox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={[
        'w-3.5 h-3.5 rounded border flex items-center justify-center cursor-pointer transition-colors shrink-0',
        checked ? 'bg-accent border-accent' : 'bg-card border-border hover:border-accent/60',
      ].join(' ')}
    >
      {checked && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
    </div>
  )
}

function ActionCell() {
  return (
    <div className="flex items-center gap-0.5">
      <button className="text-text-muted hover:text-text-primary p-0.5 rounded transition-colors"><MoreHorizontal size={13} /></button>
      <button className="text-text-muted hover:text-text-primary p-0.5 rounded transition-colors"><ChevronRight size={13} /></button>
    </div>
  )
}

function DashboardTabs({ surveys, scans, siteVisits, sites, customSurveysContent }: DashboardTabsProps) {
  const [activeTab, setActiveTab]               = useState<TabId>('surveys')
  const [filterText, setFilterText]             = useState('')
  const [scopeFilter, setScopeFilter]           = useState<SurveyScope | 'all'>('all')
  const [showUnallocated, setShowUnallocated]   = useState(false)
  const [showUnallocatedScans, setShowUnallocatedScans] = useState(false)
  const [showUnprocessed, setShowUnprocessed]   = useState(false)
  const [scopeOpen, setScopeOpen]               = useState(false)
  const [selected, setSelected]                 = useState<Set<string>>(new Set())

  const q = filterText.toLowerCase()

  const filteredSurveys = surveys.filter(s => {
    if (showUnallocated && s.status !== 'unassigned') return false
    if (scopeFilter !== 'all' && s.scope !== scopeFilter) return false
    if (!q) return true
    return s.name.toLowerCase().includes(q) || s.siteId.toLowerCase().includes(q) ||
           s.siteName.toLowerCase().includes(q) || s.organization.toLowerCase().includes(q)
  })
  const filteredScans = scans.filter(s => {
    if (showUnallocatedScans && s.siteVisit) return false
    if (!q) return true
    return s.name.toLowerCase().includes(q) || s.siteId.toLowerCase().includes(q) ||
           s.siteName.toLowerCase().includes(q) || s.organization.toLowerCase().includes(q)
  })
  const filteredVisits = siteVisits.filter(s => {
    if (showUnprocessed && s.processed) return false
    if (scopeFilter !== 'all' && s.scope !== scopeFilter) return false
    if (!q) return true
    return s.name.toLowerCase().includes(q) || s.siteId.toLowerCase().includes(q) ||
           s.siteName.toLowerCase().includes(q) || s.organization.toLowerCase().includes(q)
  })
  const filteredSites = sites.filter(s =>
    !q || s.siteId.toLowerCase().includes(q) || s.siteName.toLowerCase().includes(q) ||
    s.organization.toLowerCase().includes(q)
  )

  const TABS = [
    { id: 'surveys'     as TabId, label: 'Surveys',     count: surveys.length },
    { id: 'scans'       as TabId, label: 'Scans',       count: scans.length },
    { id: 'site_visits' as TabId, label: 'Site Visits', count: siteVisits.length },
    { id: 'sites'       as TabId, label: 'Sites',       count: sites.length },
  ]

  const activeIds: string[] = activeTab === 'surveys'
    ? filteredSurveys.map(s => s.id)
    : activeTab === 'scans'
    ? filteredScans.map(s => s.id)
    : activeTab === 'site_visits'
    ? filteredVisits.map(s => s.id)
    : filteredSites.map(s => s.id)

  const allSelected = activeIds.length > 0 && activeIds.every(id => selected.has(id))

  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => { const next = new Set(prev); activeIds.forEach(id => next.delete(id)); return next })
    } else {
      setSelected(prev => new Set([...prev, ...activeIds]))
    }
  }
  const toggleRow = (id: string) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const handleTabChange = (tab: TabId) => { setActiveTab(tab); setSelected(new Set()) }

  const currentScopeLabel = SCOPE_OPTIONS.find(s => s.value === scopeFilter)?.label ?? 'Filter by scope...'
  const selectedCount = [...selected].filter(id => activeIds.includes(id)).length

  const thClass = 'px-3 py-2.5 text-left text-text-primary font-semibold text-xs'
  const tdClass = 'px-3 py-2.5'

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border px-4 pt-3 gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter bar — hidden when surveys tab is showing custom role-specific content */}
      {!(activeTab === 'surveys' && customSurveysContent) && <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border bg-surface/40">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            placeholder="Filter..."
            className="bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60 w-44"
          />
        </div>

        {activeTab === 'surveys' && (
          <>
            <div className="relative">
              <button
                onClick={() => setScopeOpen(v => !v)}
                className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                <span>{currentScopeLabel}</span>
                <ChevronDown size={11} className={`transition-transform ${scopeOpen ? 'rotate-180' : ''}`} />
              </button>
              {scopeOpen && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-2xl z-20 overflow-hidden">
                  {SCOPE_OPTIONS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => { setScopeFilter(s.value); setScopeOpen(false) }}
                      className={[
                        'w-full text-left px-3 py-2 text-xs transition-colors',
                        scopeFilter === s.value
                          ? 'bg-surface text-accent'
                          : 'text-text-secondary hover:bg-surface hover:text-text-primary',
                      ].join(' ')}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setShowUnallocated(v => !v)}
                className={[
                  'w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0',
                  showUnallocated ? 'bg-accent border-accent' : 'bg-surface border-border hover:border-accent/60',
                ].join(' ')}
              >
                {showUnallocated && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
              </div>
              <span className="text-xs text-text-secondary">Show unallocated surveys only</span>
            </label>
          </>
        )}
      </div>}

      {/* Custom surveys content (PM split tables / Technician split sections) */}
      {activeTab === 'surveys' && customSurveysContent && customSurveysContent}

      {/* Tables */}
      {!(activeTab === 'surveys' && customSurveysContent) && <div className="overflow-x-auto">

        {/* Surveys */}
        {activeTab === 'surveys' && (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="px-3 py-2.5 w-8"><Checkbox checked={allSelected} onClick={toggleAll} /></th>
                <th className={thClass}>Name</th>
                <th className={thClass}>Site ID</th>
                <th className={thClass}>Site Name</th>
                <th className={thClass}>Organization</th>
                <th className={thClass}>Assignee</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Progress</th>
                <th className={thClass}>
                  <span className="flex items-center gap-1">Created <ChevronDown size={10} /></span>
                </th>
                <th className="px-3 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody>
              {filteredSurveys.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                  <td className={tdClass}><Checkbox checked={selected.has(s.id)} onClick={() => toggleRow(s.id)} /></td>
                  <td className={`${tdClass} text-accent font-medium max-w-[180px] truncate`}>{s.name}</td>
                  <td className={`${tdClass} text-text-muted font-mono`}>{s.siteId}</td>
                  <td className={`${tdClass} text-text-primary`}>{s.siteName}</td>
                  <td className={`${tdClass} text-text-secondary`}>{s.organization}</td>
                  <td className={`${tdClass} text-text-secondary`}>{s.assignee ?? <span className="text-text-muted italic">Unassigned</span>}</td>
                  <td className={tdClass}><StatusBadge status={s.status} /></td>
                  <td className={`${tdClass} w-28`}>{s.progress !== undefined ? <ProgressBar value={s.progress} /> : '—'}</td>
                  <td className={`${tdClass} text-text-muted whitespace-nowrap`}>{s.createdDate}</td>
                  <td className={tdClass}><ActionCell /></td>
                </tr>
              ))}
              {filteredSurveys.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-text-muted">No surveys match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Scans */}
        {activeTab === 'scans' && (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="px-3 py-2.5 w-8"><Checkbox checked={allSelected} onClick={toggleAll} /></th>
                <th className={thClass}>Survey</th>
                <th className={thClass}>Site ID</th>
                <th className={thClass}>Site Name</th>
                <th className={thClass}>Organization</th>
                <th className={thClass}>Technician</th>
                <th className={thClass}>Files</th>
                <th className={thClass}>
                  <span className="flex items-center gap-1">Created <ChevronDown size={10} /></span>
                </th>
                <th className="px-3 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody>
              {filteredScans.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                  <td className={tdClass}><Checkbox checked={selected.has(s.id)} onClick={() => toggleRow(s.id)} /></td>
                  <td className={`${tdClass} text-accent font-medium max-w-[180px] truncate`}>{s.survey}</td>
                  <td className={`${tdClass} text-text-muted font-mono`}>{s.siteId}</td>
                  <td className={`${tdClass} text-text-primary`}>{s.siteName}</td>
                  <td className={`${tdClass} text-text-secondary`}>{s.organization}</td>
                  <td className={`${tdClass} text-text-secondary`}>{s.technician}</td>
                  <td className={`${tdClass} text-text-primary font-medium`}>{s.files}</td>
                  <td className={`${tdClass} text-text-muted whitespace-nowrap`}>{s.createdDate}</td>
                  <td className={tdClass}><ActionCell /></td>
                </tr>
              ))}
              {filteredScans.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-text-muted">No scans found.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Site Visits */}
        {activeTab === 'site_visits' && (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="px-3 py-2.5 w-8"><Checkbox checked={allSelected} onClick={toggleAll} /></th>
                <th className={thClass}>Name</th>
                <th className={thClass}>Site ID</th>
                <th className={thClass}>Site Name</th>
                <th className={thClass}>Organization</th>
                <th className={thClass}>Assignee</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>
                  <span className="flex items-center gap-1">Scheduled <ChevronDown size={10} /></span>
                </th>
                <th className="px-3 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody>
              {filteredVisits.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                  <td className={tdClass}><Checkbox checked={selected.has(s.id)} onClick={() => toggleRow(s.id)} /></td>
                  <td className={`${tdClass} text-accent font-medium`}>{s.name}</td>
                  <td className={`${tdClass} text-text-muted font-mono`}>{s.siteId}</td>
                  <td className={`${tdClass} text-text-primary`}>{s.siteName}</td>
                  <td className={`${tdClass} text-text-secondary`}>{s.organization}</td>
                  <td className={`${tdClass} text-text-secondary`}>{s.assignee}</td>
                  <td className={tdClass}><VisitBadge status={s.status} /></td>
                  <td className={`${tdClass} text-text-muted whitespace-nowrap`}>{s.scheduledDate}</td>
                  <td className={tdClass}><ActionCell /></td>
                </tr>
              ))}
              {filteredVisits.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-text-muted">No site visits found.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Sites */}
        {activeTab === 'sites' && (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="px-3 py-2.5 w-8"><div className="w-3.5 h-3.5 rounded border border-border bg-card" /></th>
                <th className={thClass}>Site ID</th>
                <th className={thClass}>Site Name</th>
                <th className={thClass}>Organization</th>
                <th className={thClass}>Tower Type</th>
                <th className={thClass}>Surveys</th>
                <th className={thClass}>
                  <span className="flex items-center gap-1">Last Survey <ChevronDown size={10} /></span>
                </th>
                <th className="px-3 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody>
              {filteredSites.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                  <td className={tdClass}><div className="w-3.5 h-3.5 rounded border border-border bg-card" /></td>
                  <td className={`${tdClass} text-text-muted font-mono`}>{s.siteId}</td>
                  <td className={`${tdClass} text-accent font-medium`}>{s.siteName}</td>
                  <td className={`${tdClass} text-text-secondary`}>{s.organization}</td>
                  <td className={`${tdClass} text-text-secondary`}>{s.towerType}</td>
                  <td className={`${tdClass} text-text-primary font-medium`}>{s.totalSurveys}</td>
                  <td className={`${tdClass} text-text-muted whitespace-nowrap`}>{s.lastSurveyDate}</td>
                  <td className={tdClass}><ActionCell /></td>
                </tr>
              ))}
              {filteredSites.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-text-muted">No sites found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>}

      {/* Footer — hidden for custom surveys content */}
      {!(activeTab === 'surveys' && customSurveysContent) && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-surface/40 text-xs text-text-muted">
          <span>{selectedCount} of {activeIds.length} row(s) selected.</span>
          <div className="flex items-center gap-3">
            <span>Rows per page: <span className="text-text-secondary font-medium">10</span></span>
            <div className="flex items-center gap-1">
              {['«', '‹', '›', '»'].map(ch => (
                <button key={ch} disabled className="px-1.5 py-0.5 rounded border border-border text-text-muted opacity-40 text-[11px]">{ch}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PM Surveys Content (split: Needs Assignment + Assigned) ───────────────

function PMSurveysContent({ surveys }: { surveys: Survey[] }) {
  const [assignOpen, setAssignOpen] = useState<string | null>(null)
  const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
  const unassigned = [...surveys.filter(s => s.status === 'unassigned')]
    .sort((a, b) => priorityOrder[getEffectivePriority(a)] - priorityOrder[getEffectivePriority(b)])
  const assigned   = surveys.filter(s => s.status !== 'unassigned')
  const TECHNICIANS = ['Matt Edrich', 'John Smith']

  const thClass = 'px-3 py-2.5 text-left text-text-primary font-semibold text-xs'

  return (
    <div className="p-4 space-y-6">
      {/* Needs Assignment */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-accent"><AlertCircle size={15} /></span>
          <h2 className="text-text-primary text-sm font-semibold">Needs Assignment</h2>
          <span className="text-[10px] text-text-muted bg-surface border border-border px-2 py-0.5 rounded-full">{unassigned.length}</span>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className={thClass}>Priority</th>
                <th className={thClass}>Name</th>
                <th className={thClass}>Site ID</th>
                <th className={thClass}>Site Name</th>
                <th className={thClass}>Organization</th>
                <th className={thClass}>Created</th>
                <th className={thClass}>Due Date</th>
                <th className={thClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {unassigned.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                  <td className="px-3 py-2.5"><PriorityBadge priority={getEffectivePriority(s)} /></td>
                  <td className="px-3 py-2.5 text-accent font-medium">{s.name}</td>
                  <td className="px-3 py-2.5 text-text-muted font-mono">{s.siteId}</td>
                  <td className="px-3 py-2.5 text-text-primary">{s.siteName}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.organization}</td>
                  <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">{s.createdDate}</td>
                  <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">{s.dueDate ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setAssignOpen(assignOpen === s.id ? null : s.id)}
                        className="flex items-center gap-1 text-accent hover:text-accent-hover border border-accent/30 hover:border-accent/60 px-2 py-1 rounded-lg transition-colors"
                      >
                        <UserCheck size={11} />
                        Assign
                        <ChevronDown size={10} className={`transition-transform ${assignOpen === s.id ? 'rotate-180' : ''}`} />
                      </button>
                      {assignOpen === s.id && (
                        <div className="absolute left-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-xl z-10 overflow-hidden">
                          {TECHNICIANS.map(name => (
                            <button
                              key={name}
                              onClick={() => setAssignOpen(null)}
                              className="w-full text-left px-3 py-2 text-text-secondary hover:bg-surface hover:text-text-primary transition-colors text-xs"
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {unassigned.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-text-muted">All surveys are assigned.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assigned Surveys */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-accent"><Users size={15} /></span>
          <h2 className="text-text-primary text-sm font-semibold">Assigned Surveys</h2>
          <span className="text-[10px] text-text-muted bg-surface border border-border px-2 py-0.5 rounded-full">{assigned.length}</span>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className={thClass}>Priority</th>
                <th className={thClass}>Name</th>
                <th className={thClass}>Site ID</th>
                <th className={thClass}>Site Name</th>
                <th className={thClass}>Assignee</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Progress</th>
                <th className={thClass}>Due / Completed</th>
              </tr>
            </thead>
            <tbody>
              {assigned.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                  <td className="px-3 py-2.5"><PriorityBadge priority={getEffectivePriority(s)} /></td>
                  <td className="px-3 py-2.5 text-accent font-medium max-w-[160px] truncate">{s.name}</td>
                  <td className="px-3 py-2.5 text-text-muted font-mono">{s.siteId}</td>
                  <td className="px-3 py-2.5 text-text-primary">{s.siteName}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.assignee ?? '—'}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={s.status} /></td>
                  <td className="px-3 py-2.5 w-28">{s.progress !== undefined ? <ProgressBar value={s.progress} /> : '—'}</td>
                  <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">
                    {s.status === 'completed'
                      ? <span className="text-emerald-400">✓ {s.completedDate}</span>
                      : s.status === 'overdue'
                      ? <span className="text-red-400">⚠ {s.dueDate}</span>
                      : s.dueDate ?? '—'}
                  </td>
                </tr>
              ))}
              {assigned.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-text-muted">No assigned surveys.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Technician Surveys Content (split: Active + Completed) ─────────────────

function TechSurveysContent({ surveys, showPriorityLock }: { surveys: Survey[]; showPriorityLock?: boolean }) {
  const active    = surveys.filter(s => s.status !== 'completed')
  const completed = surveys.filter(s => s.status === 'completed')

  const hasBlockers = showPriorityLock && active.some(s => getEffectivePriority(s) === 'high')
  const isLocked    = (s: Survey) => Boolean(showPriorityLock && hasBlockers && getEffectivePriority(s) !== 'high')
  const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
  const sortedActive = showPriorityLock
    ? [...active].sort((a, b) => priorityOrder[getEffectivePriority(a)] - priorityOrder[getEffectivePriority(b)])
    : active

  return (
    <div className="p-4 space-y-6">
      {/* Active / In Progress section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-accent"><Clock size={15} /></span>
          <h2 className="text-text-primary text-sm font-semibold">Active Surveys</h2>
          <span className="text-[10px] text-text-muted bg-surface border border-border px-2 py-0.5 rounded-full">{active.length}</span>
          {hasBlockers && (
            <span className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/30 px-2 py-0.5 rounded-full font-medium ml-1">
              {active.filter(s => getEffectivePriority(s) === 'high').length} survey(s) blocking progress
            </span>
          )}
        </div>
        <div className="space-y-2">
          {sortedActive.map(s => {
            const locked = isLocked(s)
            const isHigh = getEffectivePriority(s) === 'high'
            return (
              <div
                key={s.id}
                className={[
                  'rounded-xl border px-4 py-3 transition-opacity',
                  isHigh  ? 'border-red-400/30 bg-red-400/5' : 'border-border bg-surface/40',
                  locked  ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {locked && <Lock size={12} className="text-text-muted shrink-0" />}
                    <span className={`text-sm font-medium truncate ${locked ? 'text-text-muted' : 'text-text-primary'}`}>{s.name}</span>
                    <span className="text-text-muted text-xs font-mono shrink-0">{s.siteId}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted shrink-0 ml-3">
                    {locked
                      ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border text-text-muted bg-surface border-border">Locked</span>
                      : <StatusBadge status={s.status} />
                    }
                    {isHigh && <PriorityBadge priority="high" />}
                    <span>·</span>
                    <span>{s.siteName}</span>
                    {s.dueDate && <><span>·</span><span>Due {s.dueDate}</span></>}
                  </div>
                </div>
                <ProgressBar value={locked ? 0 : (s.progress ?? 0)} />
              </div>
            )
          })}
          {active.length === 0 && (
            <p className="text-text-muted text-sm py-4 text-center">No active surveys.</p>
          )}
        </div>
      </div>

      {/* Completed section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-accent"><CheckCircle2 size={15} /></span>
          <h2 className="text-text-primary text-sm font-semibold">Completed Surveys</h2>
          <span className="text-[10px] text-text-muted bg-surface border border-border px-2 py-0.5 rounded-full">{completed.length}</span>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="px-3 py-2.5 text-left text-text-primary font-semibold">Name</th>
                <th className="px-3 py-2.5 text-left text-text-primary font-semibold">Site ID</th>
                <th className="px-3 py-2.5 text-left text-text-primary font-semibold">Site Name</th>
                <th className="px-3 py-2.5 text-left text-text-primary font-semibold">Organization</th>
                <th className="px-3 py-2.5 text-left text-text-primary font-semibold">Completed</th>
              </tr>
            </thead>
            <tbody>
              {completed.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                  <td className="px-3 py-2.5 text-accent font-medium">{s.name}</td>
                  <td className="px-3 py-2.5 text-text-muted font-mono">{s.siteId}</td>
                  <td className="px-3 py-2.5 text-text-primary">{s.siteName}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.organization}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.completedDate ?? '—'}</td>
                </tr>
              ))}
              {completed.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-text-muted">No completed surveys yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Admin View ─────────────────────────────────────────────────────────────

function AdminView() {
  const completed   = ALL_SURVEYS.filter(s => s.status === 'completed').length
  const inProgress  = ALL_SURVEYS.filter(s => s.status === 'in_progress').length
  const overdue     = ALL_SURVEYS.filter(s => s.status === 'overdue').length
  const unassigned  = ALL_SURVEYS.filter(s => s.status === 'unassigned').length
  const rate        = Math.round((completed / ALL_SURVEYS.length) * 100)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total Surveys" value={ALL_SURVEYS.length} icon={<ClipboardCheck size={16} />} color="text-accent" />
        <KpiCard label="Completed"     value={completed}          icon={<CheckCircle2 size={16} />}  color="text-emerald-400" />
        <KpiCard label="In Progress"   value={inProgress}         icon={<TrendingUp size={16} />}    color="text-blue-400" />
        <KpiCard label="Overdue"       value={overdue}            icon={<AlertCircle size={16} />}   color="text-red-400" />
      </div>

      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-text-muted text-xs">Overall Completion Rate</span>
          <span className="text-text-primary text-xl font-bold">{rate}%</span>
        </div>
        <ProgressBar value={rate} />
        <div className="flex justify-between text-[10px] text-text-muted mt-2">
          <span>{completed} completed of {ALL_SURVEYS.length} total surveys</span>
          <span>{unassigned} unassigned · {overdue} overdue</span>
        </div>
      </div>

      <DashboardTabs surveys={ALL_SURVEYS} scans={SCANS} siteVisits={SITE_VISITS} sites={ALL_SITES} />
    </div>
  )
}

// ─── Org Owner View ─────────────────────────────────────────────────────────

function OrgOwnerView() {
  const orgStats = ORG_FILTER.map(org => {
    const s = ORG_SURVEYS.filter(x => x.organization === org)
    const completed  = s.filter(x => x.status === 'completed').length
    const inProgress = s.filter(x => x.status === 'in_progress').length
    const overdue    = s.filter(x => x.status === 'overdue').length
    const rate       = s.length ? Math.round((completed / s.length) * 100) : 0
    return { org, total: s.length, completed, inProgress, overdue, rate }
  })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {orgStats.map(org => (
          <div key={org.org} className="rounded-xl border border-border bg-card px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-text-primary text-sm font-semibold">{org.org}</span>
              <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium">
                {org.rate}% complete
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Total',       value: org.total,       color: 'text-text-primary' },
                { label: 'Completed',   value: org.completed,   color: 'text-emerald-400' },
                { label: 'In Progress', value: org.inProgress,  color: 'text-blue-400' },
                { label: 'Overdue',     value: org.overdue,     color: 'text-red-400' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-text-muted text-[10px] mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3"><ProgressBar value={org.rate} /></div>
          </div>
        ))}
      </div>
      <DashboardTabs surveys={ORG_SURVEYS} scans={ORG_SCANS} siteVisits={ORG_VISITS} sites={ORG_SITES} />
    </div>
  )
}

// ─── PM View ────────────────────────────────────────────────────────────────

function PMView() {
  const unassigned = ORG_SURVEYS.filter(s => s.status === 'unassigned').length
  const inProgress = ORG_SURVEYS.filter(s => s.status === 'in_progress').length
  const overdue    = ORG_SURVEYS.filter(s => s.status === 'overdue').length
  const completed  = ORG_SURVEYS.filter(s => s.status === 'completed').length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Needs Assignment" value={unassigned} icon={<AlertCircle size={16} />}  color="text-amber-400" />
        <KpiCard label="In Progress"      value={inProgress} icon={<TrendingUp size={16} />}   color="text-blue-400" />
        <KpiCard label="Overdue"          value={overdue}    icon={<XCircle size={16} />}       color="text-red-400" />
        <KpiCard label="Completed"        value={completed}  icon={<CheckCircle2 size={16} />}  color="text-emerald-400" />
      </div>
      <DashboardTabs
        surveys={ORG_SURVEYS}
        scans={ORG_SCANS}
        siteVisits={ORG_VISITS}
        sites={ORG_SITES}
        customSurveysContent={<PMSurveysContent surveys={ORG_SURVEYS} />}
      />
    </div>
  )
}

// ─── Technician View (Matt) ─────────────────────────────────────────────────

function TechnicianView() {
  const inProgress = MATT_SURVEYS.filter(s => s.status === 'in_progress').length
  const completed  = MATT_SURVEYS.filter(s => s.status === 'completed').length
  const notStarted = MATT_SURVEYS.filter(s => s.status === 'pending').length
  const overdue    = MATT_SURVEYS.filter(s => s.status === 'overdue').length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="In Progress"  value={inProgress} icon={<TrendingUp size={16} />}   color="text-blue-400" />
        <KpiCard label="Completed"    value={completed}  icon={<CheckCircle2 size={16} />} color="text-emerald-400" />
        <KpiCard label="Not Started"  value={notStarted} icon={<Clock size={16} />}         color="text-amber-400" />
        <KpiCard label="Overdue"      value={overdue}    icon={<AlertCircle size={16} />}  color="text-red-400" />
      </div>
      <DashboardTabs
        surveys={MATT_SURVEYS}
        scans={MATT_SCANS}
        siteVisits={MATT_VISITS}
        sites={MATT_SITES}
        customSurveysContent={<TechSurveysContent surveys={MATT_SURVEYS} />}
      />
    </div>
  )
}

// ─── QC Technician 2 View (John) ────────────────────────────────────────────

function QcTech2View() {
  const inProgress = JOHN_SURVEYS.filter(s => s.status === 'in_progress').length
  const completed  = JOHN_SURVEYS.filter(s => s.status === 'completed').length
  const notStarted = JOHN_SURVEYS.filter(s => s.status === 'pending').length
  const overdue    = JOHN_SURVEYS.filter(s => s.status === 'overdue').length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="In Progress"  value={inProgress} icon={<TrendingUp size={16} />}   color="text-blue-400" />
        <KpiCard label="Completed"    value={completed}  icon={<CheckCircle2 size={16} />} color="text-emerald-400" />
        <KpiCard label="Not Started"  value={notStarted} icon={<Clock size={16} />}         color="text-amber-400" />
        <KpiCard label="Overdue"      value={overdue}    icon={<AlertCircle size={16} />}  color="text-red-400" />
      </div>
      <DashboardTabs
        surveys={JOHN_SURVEYS}
        scans={JOHN_SCANS}
        siteVisits={JOHN_VISITS}
        sites={JOHN_SITES}
        customSurveysContent={<TechSurveysContent surveys={JOHN_SURVEYS} showPriorityLock={true} />}
      />
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

const ROLE_META = {
  admin:           { subtitle: 'Organization-wide survey overview, assignments, and performance metrics.' },
  org_owner:       { subtitle: 'Survey health, completion rates, and operational status across your managed organizations.' },
  pm:              { subtitle: 'Manage survey assignments and track QC technician progress across your organizations.' },
  qc_technician:   { subtitle: 'Your assigned surveys, progress, and completed inspection history.' },
  qc_technician_2: { subtitle: 'Your assigned surveys, progress, and completed inspection history.' },
}

const QADashboard: React.FC = () => {
  const { role } = useRole()
  const { subtitle } = ROLE_META[role]

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="flex items-start gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 shrink-0 mt-0.5">
          <ClipboardCheck className="text-accent" size={20} />
        </div>
        <div>
          <h1 className="text-text-primary text-2xl font-semibold leading-tight">QA Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">{subtitle}</p>
        </div>
      </div>

      {role === 'admin'           && <AdminView />}
      {role === 'org_owner'       && <OrgOwnerView />}
      {role === 'pm'              && <PMView />}
      {role === 'qc_technician'   && <TechnicianView />}
      {role === 'qc_technician_2' && <QcTech2View />}
    </div>
  )
}

export default QADashboard
