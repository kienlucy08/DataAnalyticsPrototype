import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  ClipboardCheck, Clock, CheckCircle2, AlertCircle, TrendingUp,
  ChevronDown, ChevronRight, Search, MoreHorizontal, XCircle,
  UserCheck, Users, Lock, Pencil, Plus, X, Building2, MapPin,
  RefreshCw, Wifi, Trash2,
} from 'lucide-react'
import { useRole } from '../context/RoleContext'
import { useDashboard } from '../context/DashboardContext'

// ─── Types ─────────────────────────────────────────────────────────────────

type SurveyScope  = 'inspection' | 'cop' | 'jsa' | 'facilities' | 'other'
type SurveyStatus = 'unassigned' | 'pending' | 'in_progress' | 'completed' | 'overdue'
type VisitStatus  = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
type Priority     = 'high' | 'medium' | 'low'
type KpiContext   = 'surveys' | 'scans' | 'site_visits' | 'sites'

interface KpiData {
  surveys: Survey[]
  scans: Scan[]
  siteVisits: SiteVisit[]
  sites: SiteData[]
}

interface MetricDef {
  id: string
  label: string
  icon: React.ReactNode
  color: string
  compute: (data: KpiData) => number | string
}

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
  siteVisitId?: string
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
  assignee?: string
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
  { id: 'SV-1042', name: 'Compound Inspection [QA]',     siteId: '11046',      siteName: 'Garden City',      organization: 'FieldSync Org', scope: 'inspection', status: 'in_progress', assignee: 'Mike McGuire', progress: 60,  createdDate: 'Oct 14, 2025',  dueDate: 'Nov 1, 2025',  priority: 'high' },
  { id: 'SV-1043', name: 'TEST Light System COP',        siteId: '3667',       siteName: "Danny's Haus",     organization: 'FieldSync Org', scope: 'cop',        status: 'in_progress', assignee: 'Mike McGuire', progress: 30,  createdDate: 'Feb 9, 2026',   dueDate: 'Mar 1, 2026' },
  { id: 'SV-1044', name: 'Job Safety Analysis',          siteId: 'SA-001',     siteName: 'Safety Site A',    organization: 'Test Org',      scope: 'jsa',        status: 'completed',   assignee: 'Mike McGuire', progress: 100, createdDate: 'Oct 22, 2025',  completedDate: 'Nov 15, 2025' },
  { id: 'SV-1045', name: 'Guy Facilities Inspection',    siteId: 'T0B1105',    siteName: 'Hiawatha',         organization: 'Test Org',      scope: 'facilities', status: 'pending',     assignee: 'John Smith',  progress: 0,   createdDate: 'Dec 22, 2025',  dueDate: 'Jan 10, 2026', priority: 'high' },
  { id: 'SV-1046', name: 'TEST Safety Climb COP',        siteId: 'SA-safety',  siteName: 'Safety',           organization: 'Test Org',      scope: 'cop',        status: 'overdue',     assignee: 'John Smith',  progress: 45,  createdDate: 'Oct 21, 2025',  dueDate: 'Nov 30, 2025', priority: 'high' },
  { id: 'SV-1047', name: 'Annual Tower Inspection',      siteId: 'MN-1055',    siteName: 'Duluth 1',         organization: 'Test Org',      scope: 'inspection', status: 'unassigned',  progress: 0,   createdDate: 'Sep 23, 2025',  dueDate: 'Mar 15, 2026', priority: 'high' },
  { id: 'SV-1048', name: 'Compound Inspection',          siteId: 'Mango123',   siteName: 'Mango Site',       organization: 'Test Org',      scope: 'inspection', status: 'in_progress', assignee: 'John Smith',  progress: 55,  createdDate: 'Jan 20, 2026',  dueDate: 'Feb 28, 2026' },
  { id: 'SV-1049', name: 'RF Equipment Survey',          siteId: 'GA-01',      siteName: 'Glen Arbor',       organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'Mike McGuire', progress: 100, createdDate: 'Jan 16, 2026',  completedDate: 'Feb 10, 2026' },
  { id: 'SV-1050', name: 'Tower Structural Inspection',  siteId: 'UMT-II',     siteName: 'UMT II',           organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'John Smith',  progress: 100, createdDate: 'Aug 6, 2025',   completedDate: 'Sep 1, 2025' },
  { id: 'SV-1051', name: 'CONS-MOD 48 Hour Turnaround', siteId: 'Mango123',   siteName: 'Mango Site',       organization: 'Test Org',      scope: 'other',      status: 'pending',     assignee: 'John Smith',  progress: 0,   createdDate: 'Jan 20, 2026',  dueDate: 'Feb 1, 2026',  priority: 'low' },
  { id: 'SV-1052', name: 'Grounding Survey',             siteId: 'GA-02',      siteName: 'Glen Arbor North', organization: 'FieldSync Org', scope: 'inspection', status: 'unassigned',  progress: 0,   createdDate: 'Feb 15, 2026',  dueDate: 'Mar 20, 2026' },
  { id: 'SV-1053', name: 'Job Safety Analysis',          siteId: '3667',       siteName: "Danny's Haus",     organization: 'SomeOrg',       scope: 'jsa',        status: 'completed',   assignee: 'Mike Torres', progress: 100, createdDate: 'Nov 1, 2025',   completedDate: 'Nov 20, 2025' },
  { id: 'SV-1054', name: 'Compound Inspection [QA]',     siteId: 'SO-445',     siteName: 'Central Tower',    organization: 'SomeOrg',       scope: 'inspection', status: 'in_progress', assignee: 'Mike Torres', progress: 70,  createdDate: 'Dec 1, 2025',   dueDate: 'Jan 15, 2026' },
  { id: 'SV-1055', name: 'Annual Tower Inspection',      siteId: 'SO-210',     siteName: 'Westside Hub',     organization: 'SomeOrg',       scope: 'inspection', status: 'overdue',     assignee: 'Lisa Park',   progress: 20,  createdDate: 'Nov 10, 2025',  dueDate: 'Dec 31, 2025' },
  { id: 'SV-1056', name: 'TEST Light System COP',        siteId: 'UMT-III',    siteName: 'UMT III',          organization: 'FieldSync Org', scope: 'cop',        status: 'unassigned',  progress: 0,   createdDate: 'Feb 20, 2026',  dueDate: 'Apr 1, 2026',  priority: 'low' },
  { id: 'SV-1057', name: 'Guy Facilities Inspection v2', siteId: 'T0B1105',    siteName: 'Hiawatha',         organization: 'Test Org',      scope: 'facilities', status: 'completed',   assignee: 'Mike McGuire', progress: 100, createdDate: 'Dec 22, 2025',  completedDate: 'Jan 28, 2026' },
  { id: 'SV-1058', name: 'Grounding Survey',             siteId: 'MN-1055',    siteName: 'Duluth 1',         organization: 'Test Org',      scope: 'inspection', status: 'completed',   assignee: 'John Smith',  progress: 100, createdDate: 'Nov 5, 2025',   completedDate: 'Dec 10, 2025' },
  { id: 'SV-1059', name: 'RF Equipment Survey',          siteId: 'SO-100',     siteName: 'Metro Site',       organization: 'SomeOrg',       scope: 'inspection', status: 'pending',     assignee: 'Lisa Park',   progress: 0,   createdDate: 'Feb 25, 2026',  dueDate: 'Mar 30, 2026' },
  { id: 'SV-1060', name: 'Annual Tower Inspection',      siteId: 'GA-02',      siteName: 'Glen Arbor North', organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'Mike McGuire', progress: 100, createdDate: 'Jan 1, 2026',   completedDate: 'Jan 30, 2026' },
  { id: 'SV-1061', name: 'Grounding Survey',             siteId: 'SA-safety',  siteName: 'Safety',           organization: 'Test Org',      scope: 'inspection', status: 'completed',   assignee: 'John Smith',  progress: 100, createdDate: 'Aug 15, 2025',  completedDate: 'Sep 5, 2025' },
  { id: 'SV-1062', name: 'TEST Light System COP',        siteId: 'GA-01',      siteName: 'Glen Arbor',       organization: 'FieldSync Org', scope: 'cop',        status: 'completed',   assignee: 'Mike McGuire', progress: 100, createdDate: 'Dec 10, 2025',  completedDate: 'Jan 5, 2026' },
  { id: 'SV-1063', name: 'Compound Inspection [QA]',     siteId: 'UMT-III',    siteName: 'UMT III',          organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'John Smith',  progress: 100, createdDate: 'Nov 15, 2025',  completedDate: 'Dec 20, 2025' },
  { id: 'SV-1064', name: 'Job Safety Analysis',          siteId: 'Mango123',   siteName: 'Mango Site',       organization: 'Test Org',      scope: 'jsa',        status: 'completed',   assignee: 'Mike McGuire', progress: 100, createdDate: 'Sep 10, 2025',  completedDate: 'Oct 1, 2025' },
  { id: 'SV-1065', name: 'Annual Tower Inspection',      siteId: 'SO-445',     siteName: 'Central Tower',    organization: 'SomeOrg',       scope: 'inspection', status: 'completed',   assignee: 'Mike Torres', progress: 100, createdDate: 'Sep 20, 2025',  completedDate: 'Oct 15, 2025' },
  { id: 'SV-1066', name: 'RF Equipment Survey',          siteId: 'MN-1055',    siteName: 'Duluth 1',         organization: 'Test Org',      scope: 'inspection', status: 'pending',     assignee: 'Mike McGuire', progress: 0,   createdDate: 'Feb 25, 2026',  dueDate: 'Mar 25, 2026' },
]

const SCANS: Scan[] = [
  { id: 'SC-201', name: 'GardenCity-Scan - Oct 18, 2025 - 2:30 PM',      siteVisit: 'Q4 2025 Inspection',     siteId: '11046',     siteName: 'Garden City',      organization: 'FieldSync Org', files: 14, technician: 'Mike McGuire', createdDate: 'Oct 18, 2025' },
  { id: 'SC-202', name: 'DannysHaus-COP - Feb 12, 2026 - 9:15 AM',       siteVisit: 'Feb 2026 COP Visit',     siteId: '3667',      siteName: "Danny's Haus",     organization: 'FieldSync Org', files: 8,  technician: 'Mike McGuire', createdDate: 'Feb 12, 2026' },
  { id: 'SC-203', name: 'SafetySiteA-JSA - Nov 10, 2025 - 11:00 AM',     siteVisit: 'Safety Audit',           siteId: 'SA-001',    siteName: 'Safety Site A',    organization: 'Test Org',      files: 6,  technician: 'Mike McGuire', createdDate: 'Nov 10, 2025' },
  { id: 'SC-204', name: 'GlenArbor-RF - Jan 20, 2026 - 3:45 PM',         siteVisit: 'Glen Arbor RF Check',    siteId: 'GA-01',     siteName: 'Glen Arbor',       organization: 'FieldSync Org', files: 22, technician: 'Mike McGuire', createdDate: 'Jan 20, 2026' },
  { id: 'SC-205', name: 'Hiawatha-Facilities - Jan 5, 2026 - 10:20 AM',                                       siteId: 'T0B1105',   siteName: 'Hiawatha',         organization: 'Test Org',      files: 11, technician: 'Mike McGuire', createdDate: 'Jan 5, 2026' },
  { id: 'SC-206', name: 'GlenArborN-Annual - Jan 28, 2026 - 1:00 PM',    siteVisit: 'Glen Arbor North Survey', siteId: 'GA-02',    siteName: 'Glen Arbor North', organization: 'FieldSync Org', files: 9,  technician: 'Mike McGuire', createdDate: 'Jan 28, 2026' },
  { id: 'SC-207', name: 'GlenArbor-COP - Jan 5, 2026 - 8:30 AM',                                             siteId: 'GA-01',     siteName: 'Glen Arbor',       organization: 'FieldSync Org', files: 7,  technician: 'Mike McGuire', createdDate: 'Jan 5, 2026' },
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
  { id: 'SV-V001', name: 'Q4 2025 Inspection',      siteId: '11046',     siteName: 'Garden City',      organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'Mike McGuire', scheduledDate: 'Oct 14, 2025', processed: true,  processingDate: 'Nov 2, 2025',   processedBy: 'Lucy Kien' },
  { id: 'SV-V002', name: 'Feb 2026 COP Visit',      siteId: '3667',      siteName: "Danny's Haus",     organization: 'FieldSync Org', scope: 'cop',        status: 'in_progress', assignee: 'Mike McGuire', scheduledDate: 'Feb 9, 2026',  processed: false },
  { id: 'SV-V003', name: 'Safety Audit',             siteId: 'SA-001',    siteName: 'Safety Site A',    organization: 'Test Org',      scope: 'jsa',        status: 'completed',   assignee: 'Mike McGuire', scheduledDate: 'Oct 22, 2025', processed: true,  processingDate: 'Nov 20, 2025',  processedBy: 'Sara Connor' },
  { id: 'SV-V004', name: 'Annual Structural Check',  siteId: 'T0B1105',   siteName: 'Hiawatha',         organization: 'Test Org',      scope: 'inspection', status: 'scheduled',   assignee: 'John Smith',  scheduledDate: 'Dec 22, 2025', processed: false },
  { id: 'SV-V005', name: 'Safety Climb Review',      siteId: 'SA-safety', siteName: 'Safety',           organization: 'Test Org',      scope: 'cop',        status: 'in_progress', assignee: 'John Smith',  scheduledDate: 'Oct 21, 2025', processed: false },
  { id: 'SV-V006', name: 'Q1 2026 Tower Survey',     siteId: 'MN-1055',   siteName: 'Duluth 1',         organization: 'Test Org',      scope: 'inspection', status: 'scheduled',   assignee: 'TBD',         scheduledDate: 'Mar 15, 2026', processed: false },
  { id: 'SV-V007', name: 'Glen Arbor RF Check',      siteId: 'GA-01',     siteName: 'Glen Arbor',       organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'Mike McGuire', scheduledDate: 'Jan 16, 2026', processed: true,  processingDate: 'Feb 5, 2026',   processedBy: 'Lucy Kien' },
  { id: 'SV-V008', name: 'UMT Structural Visit',     siteId: 'UMT-II',    siteName: 'UMT II',           organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'John Smith',  scheduledDate: 'Aug 6, 2025',  processed: true,  processingDate: 'Sep 10, 2025',  processedBy: 'Sara Connor' },
  { id: 'SV-V009', name: 'Glen Arbor North Survey',  siteId: 'GA-02',     siteName: 'Glen Arbor North', organization: 'FieldSync Org', scope: 'inspection', status: 'completed',   assignee: 'Mike McGuire', scheduledDate: 'Jan 30, 2026', processed: false },
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

// Orgs each role is permitted to see
const ROLE_ORGS: Record<string, string[]> = {
  admin:           ['FieldSync Org', 'Test Org', 'SomeOrg'],
  org_owner:       ['FieldSync Org'],
  pm:              ['FieldSync Org', 'Test Org'],
  qc_technician:   ['FieldSync Org', 'Test Org'],
  qc_technician_2: ['FieldSync Org', 'Test Org'],
  clickup_admin:       [],
  clickup_org_owner:   [],
  clickup_pm:          [],
  clickup_technician:  [],
}

const ORG_SURVEYS     = ALL_SURVEYS.filter(s => ORG_FILTER.includes(s.organization))
const MIKE_SURVEYS    = ALL_SURVEYS.filter(s => s.assignee === 'Mike McGuire')
const JOHN_SURVEYS    = ALL_SURVEYS.filter(s => s.assignee === 'John Smith')

const ORG_SCANS       = SCANS.filter(s => ORG_FILTER.includes(s.organization))
const MIKE_SCANS      = SCANS.filter(s => s.technician === 'Mike McGuire')
const JOHN_SCANS      = SCANS.filter(s => s.technician === 'John Smith')

const ORG_VISITS      = SITE_VISITS.filter(s => ORG_FILTER.includes(s.organization))
const MIKE_VISITS     = SITE_VISITS.filter(s => s.assignee === 'Mike McGuire')
const JOHN_VISITS     = SITE_VISITS.filter(s => s.assignee === 'John Smith')

const ORG_SITES       = ALL_SITES.filter(s => ORG_FILTER.includes(s.organization))
const MIKE_SITES      = ALL_SITES.filter(s => MIKE_SURVEYS.some(sv => sv.siteId === s.siteId) || MIKE_VISITS.some(v => v.siteId === s.siteId))
const JOHN_SITES      = ALL_SITES.filter(s => JOHN_SURVEYS.some(sv => sv.siteId === s.siteId) || JOHN_VISITS.some(v => v.siteId === s.siteId))

// ─── Scope display labels ───────────────────────────────────────────────────

const SCOPE_LABEL: Record<SurveyScope, string> = {
  inspection: 'Tower Inspection',
  cop:        'COP Inspection',
  jsa:        'Job Safety Analysis',
  facilities: 'Facilities Inspection',
  other:      'General Survey',
}

// ─── KPI metric registry ────────────────────────────────────────────────────

const SURVEY_METRICS: MetricDef[] = [
  { id: 'sv_total',       label: 'Total Surveys',  icon: <ClipboardCheck size={16} />, color: 'text-accent',        compute: ({ surveys: s }) => s.length },
  { id: 'sv_completed',   label: 'Completed',      icon: <CheckCircle2 size={16} />,   color: 'text-emerald-400',   compute: ({ surveys: s }) => s.filter(x => x.status === 'completed').length },
  { id: 'sv_in_progress', label: 'In Progress',    icon: <TrendingUp size={16} />,     color: 'text-blue-400',      compute: ({ surveys: s }) => s.filter(x => x.status === 'in_progress').length },
  { id: 'sv_overdue',     label: 'Overdue',        icon: <AlertCircle size={16} />,    color: 'text-red-400',       compute: ({ surveys: s }) => s.filter(x => x.status === 'overdue').length },
  { id: 'sv_unassigned',  label: 'Unassigned',     icon: <AlertCircle size={16} />,    color: 'text-amber-400',     compute: ({ surveys: s }) => s.filter(x => x.status === 'unassigned').length },
  { id: 'sv_pending',     label: 'Not Started',    icon: <Clock size={16} />,          color: 'text-amber-400',     compute: ({ surveys: s }) => s.filter(x => x.status === 'pending').length },
  { id: 'sv_rate',        label: 'Completion %',   icon: <TrendingUp size={16} />,     color: 'text-accent',        compute: ({ surveys: s }) => s.length ? `${Math.round(s.filter(x => x.status === 'completed').length / s.length * 100)}%` : '0%' },
]

const SCAN_METRICS: MetricDef[] = [
  { id: 'sc_total',        label: 'Total Scans',   icon: <ClipboardCheck size={16} />, color: 'text-accent',         compute: ({ scans }) => scans.length },
  { id: 'sc_files',        label: 'Total Files',   icon: <TrendingUp size={16} />,     color: 'text-blue-400',       compute: ({ scans }) => scans.reduce((n, s) => n + s.files, 0) },
  { id: 'sc_unallocated',  label: 'Unallocated',   icon: <AlertCircle size={16} />,    color: 'text-amber-400',      compute: ({ scans }) => scans.filter(s => !s.siteVisit).length },
  { id: 'sc_unique_sites', label: 'Unique Sites',  icon: <Users size={16} />,          color: 'text-text-secondary', compute: ({ scans }) => new Set(scans.map(s => s.siteId)).size },
  { id: 'sc_technicians',  label: 'Technicians',   icon: <UserCheck size={16} />,      color: 'text-text-secondary', compute: ({ scans }) => new Set(scans.map(s => s.technician)).size },
]

const VISIT_METRICS: MetricDef[] = [
  { id: 'vt_total',       label: 'Total Visits',  icon: <ClipboardCheck size={16} />, color: 'text-accent',        compute: ({ siteVisits }) => siteVisits.length },
  { id: 'vt_processed',   label: 'Processed',     icon: <CheckCircle2 size={16} />,   color: 'text-emerald-400',   compute: ({ siteVisits }) => siteVisits.filter(s => s.processed).length },
  { id: 'vt_unprocessed', label: 'Unprocessed',   icon: <Clock size={16} />,          color: 'text-amber-400',     compute: ({ siteVisits }) => siteVisits.filter(s => !s.processed).length },
  { id: 'vt_in_progress', label: 'In Progress',   icon: <TrendingUp size={16} />,     color: 'text-blue-400',      compute: ({ siteVisits }) => siteVisits.filter(s => s.status === 'in_progress').length },
  { id: 'vt_scheduled',   label: 'Scheduled',     icon: <Clock size={16} />,          color: 'text-blue-400',      compute: ({ siteVisits }) => siteVisits.filter(s => s.status === 'scheduled').length },
  { id: 'vt_completed',   label: 'Completed',     icon: <CheckCircle2 size={16} />,   color: 'text-emerald-400',   compute: ({ siteVisits }) => siteVisits.filter(s => s.status === 'completed').length },
  { id: 'vt_cancelled',   label: 'Cancelled',     icon: <XCircle size={16} />,        color: 'text-text-muted',    compute: ({ siteVisits }) => siteVisits.filter(s => s.status === 'cancelled').length },
]

const SITE_METRICS: MetricDef[] = [
  { id: 'st_total',           label: 'Total Sites',     icon: <Users size={16} />,          color: 'text-accent',         compute: ({ sites }) => sites.length },
  { id: 'st_overdue',         label: 'Overdue',         icon: <AlertCircle size={16} />,    color: 'text-red-400',        compute: ({ sites }) => sites.filter(s => s.isOverdue).length },
  { id: 'st_never_processed', label: 'Never Processed', icon: <XCircle size={16} />,        color: 'text-amber-400',      compute: ({ sites }) => sites.filter(s => !s.lastProcessTime).length },
  { id: 'st_processed',       label: 'Processed',       icon: <CheckCircle2 size={16} />,   color: 'text-emerald-400',    compute: ({ sites }) => sites.filter(s => !!s.lastProcessTime && !s.isOverdue).length },
  { id: 'st_unique_orgs',     label: 'Organizations',   icon: <Users size={16} />,          color: 'text-text-secondary', compute: ({ sites }) => new Set(sites.map(s => s.organization)).size },
  { id: 'st_with_visit',      label: 'Has Site Visit',  icon: <ClipboardCheck size={16} />, color: 'text-blue-400',       compute: ({ sites }) => sites.filter(s => s.lastSiteVisit).length },
]

const DEFAULT_KPI_CONFIG: Record<KpiContext, string[]> = {
  surveys:     ['sv_total', 'sv_completed', 'sv_in_progress', 'sv_overdue'],
  scans:       ['sc_total', 'sc_files', 'sc_unallocated', 'sc_unique_sites'],
  site_visits: ['vt_total', 'vt_processed', 'vt_unprocessed', 'vt_in_progress'],
  sites:       ['st_total', 'st_overdue', 'st_never_processed', 'st_processed'],
}

// Bump this when role defaults change — clears stale cached configs
const KPI_CONFIG_VERSION = 4

function useKpiConfig(roleKey: string, defaultOverrides?: Partial<Record<KpiContext, string[]>>) {
  const effectiveDefaults: Record<KpiContext, string[]> = {
    ...DEFAULT_KPI_CONFIG,
    ...defaultOverrides,
  }
  const storageKey = `fieldsync_kpi_${roleKey}`
  const versionKey = `fieldsync_kpi_v_${roleKey}`
  const [config, setConfig] = useState<Record<KpiContext, string[]>>(() => {
    try {
      // If the stored version is stale, reset to fresh defaults
      const storedVersion = Number(localStorage.getItem(versionKey) ?? '0')
      if (storedVersion < KPI_CONFIG_VERSION) {
        localStorage.setItem(versionKey, String(KPI_CONFIG_VERSION))
        localStorage.removeItem(storageKey)
        return { ...effectiveDefaults }
      }
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
      return stored ? { ...effectiveDefaults, ...stored } : { ...effectiveDefaults }
    } catch { return { ...effectiveDefaults } }
  })
  const save = (next: Record<KpiContext, string[]>) => {
    setConfig(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }
  const addMetric    = (ctx: KpiContext, id: string) => save({ ...config, [ctx]: [...config[ctx], id] })
  const removeMetric = (ctx: KpiContext, id: string) => save({ ...config, [ctx]: config[ctx].filter(x => x !== id) })
  const resetContext = (ctx: KpiContext) => save({ ...config, [ctx]: [...effectiveDefaults[ctx]] })
  return { config, addMetric, removeMetric, resetContext }
}

// ─── Shared UI helpers ─────────────────────────────────────────────────────

const STATUS_STYLES: Record<SurveyStatus, string> = {
  unassigned:  'text-text-muted bg-surface border-border',
  pending:     'text-amber-400 bg-amber-400/10 border-amber-400/30',
  in_progress: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  completed:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  overdue:     'text-red-400 bg-red-400/10 border-red-400/30',
}
const STATUS_LABELS: Record<SurveyStatus, string> = {
  unassigned: 'Unassigned', pending: 'Not Started', in_progress: 'In Progress',
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

interface KpiSectionProps {
  variant?: 'default' | 'tab'
  context: KpiContext
  metrics: MetricDef[]
  activeIds: string[]
  data: KpiData
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  onReset: () => void
}

function KpiSection({ variant = 'default', metrics, activeIds, data, onAdd, onRemove, onReset }: KpiSectionProps) {
  const [editing, setEditing]   = useState(false)
  const [addOpen, setAddOpen]   = useState(false)

  // Pull metric-type widgets from the analytics dashboard for this role
  const { widgets: dashWidgets } = useDashboard()
  const dashMetrics = dashWidgets.filter(w => w.type === 'metric')

  // Resolve active cards — supports both registry IDs and `dash_{widgetId}` IDs
  const active = activeIds.map(id => {
    if (id.startsWith('dash_')) {
      const widget = dashMetrics.find(w => `dash_${w.id}` === id)
      if (!widget) return null
      return {
        id,
        label: widget.title,
        icon: <TrendingUp size={16} />,
        color: 'text-accent',
        compute: () => widget.value ?? '—',
      } as MetricDef
    }
    return metrics.find(m => m.id === id) ?? null
  }).filter(Boolean) as MetricDef[]

  const available     = metrics.filter(m => !activeIds.includes(m.id))
  const availableDash = dashMetrics.filter(w => !activeIds.includes(`dash_${w.id}`))
  const hasMore       = available.length > 0 || availableDash.length > 0

  const toggle = () => { setEditing(v => !v); setAddOpen(false) }

  const outer = variant === 'tab'
    ? 'relative px-4 py-4 border-b border-border bg-surface/20'
    : 'relative'

  return (
    <div className={outer}>
      {/* Edit controls — top-right */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        {editing && (
          <button
            onClick={() => { onReset(); setAddOpen(false) }}
            className="text-[10px] text-text-muted hover:text-accent transition-colors"
          >
            Reset
          </button>
        )}
        <button
          onClick={toggle}
          className={[
            'p-1 rounded-md transition-colors',
            editing ? 'text-text-primary bg-surface' : 'text-text-muted hover:text-text-primary',
          ].join(' ')}
          title={editing ? 'Done' : 'Customize KPIs'}
        >
          {editing ? <X size={13} /> : <Pencil size={13} />}
        </button>
      </div>

      {/* Empty state — no cards configured yet */}
      {active.length === 0 && !editing && (
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors py-1 pr-8"
        >
          <Plus size={12} />
          Add KPI cards
        </button>
      )}

      {/* Card grid */}
      {(active.length > 0 || editing) && <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pr-8">
        {active.map(m => (
          <div key={m.id} className="relative">
            <KpiCard label={m.label} value={m.compute(data)} icon={m.icon} color={m.color} />
            {/* Analytics-dashboard badge */}
            {m.id.startsWith('dash_') && (
              <span className="absolute bottom-1.5 right-2 text-[9px] text-text-muted font-medium">Analytics</span>
            )}
            {editing && (
              <button
                onClick={() => onRemove(m.id)}
                className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-400/20 hover:bg-red-400/40 text-red-400 flex items-center justify-center transition-colors"
              >
                <X size={9} />
              </button>
            )}
          </div>
        ))}

        {/* Add Card tile — shown when in edit mode and any options remain */}
        {editing && hasMore && (
          <div className="relative">
            <button
              onClick={() => setAddOpen(v => !v)}
              className="w-full h-full min-h-[84px] rounded-xl border-2 border-dashed border-border hover:border-accent/60 flex flex-col items-center justify-center gap-1 text-text-muted hover:text-accent transition-colors"
            >
              <Plus size={15} />
              <span className="text-[11px] font-medium">Add Card</span>
            </button>
            {addOpen && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-card border border-border rounded-xl shadow-2xl z-30 overflow-hidden max-h-72 overflow-y-auto">
                {/* Registry metrics */}
                {available.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { onAdd(m.id); setAddOpen(false) }}
                    className="w-full text-left px-3 py-2.5 text-xs text-text-secondary hover:bg-surface hover:text-text-primary transition-colors flex items-center gap-2"
                  >
                    <span className={m.color}>{m.icon}</span>
                    {m.label}
                  </button>
                ))}

                {/* Analytics Dashboard metrics */}
                {availableDash.length > 0 && (
                  <>
                    {available.length > 0 && <div className="border-t border-border my-1" />}
                    <div className="px-3 py-1.5 text-[10px] text-text-muted font-medium uppercase tracking-wide">
                      From Analytics Dashboard
                    </div>
                    {availableDash.map(w => (
                      <button
                        key={w.id}
                        onClick={() => { onAdd(`dash_${w.id}`); setAddOpen(false) }}
                        className="w-full text-left px-3 py-2.5 text-xs text-text-secondary hover:bg-surface hover:text-text-primary transition-colors flex items-center gap-2"
                      >
                        <TrendingUp size={13} className="text-accent shrink-0" />
                        <span className="flex-1 truncate">{w.title}</span>
                        <span className="text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded shrink-0">{w.value}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>}
    </div>
  )
}

// ─── Add-to-Site-Visit Modal ────────────────────────────────────────────────

interface SiteVisitModalSubmit {
  existingVisitId?: string
  newVisitName?: string
  assignee?: string
  dueDate?: string
}

function AddToSiteVisitModal({
  surveys,
  siteVisits,
  onClose,
  onSubmit,
}: {
  surveys: Survey[]
  siteVisits: SiteVisit[]
  onClose: () => void
  onSubmit: (opts: SiteVisitModalSubmit) => void
}) {
  const primarySurvey = surveys[0]
  const [search, setSearch]             = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedId, setSelectedId]     = useState<string>('new')
  const [assignee, setAssignee]         = useState('')
  const [dueDate, setDueDate]           = useState('')
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!dropdownOpen) return
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [dropdownOpen])

  const openVisits = siteVisits.filter(v => v.status !== 'completed' && v.status !== 'cancelled')
  const filtered = openVisits.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.siteName.toLowerCase().includes(search.toLowerCase())
  )

  const selectedLabel = selectedId === 'new'
    ? 'Create new site visit'
    : (openVisits.find(v => v.id === selectedId)?.name ?? 'Select a site visit')

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setSearch('')
    setDropdownOpen(false)
  }

  const handleSubmit = () => {
    if (selectedId === 'new') {
      const visitName = surveys.length === 1
        ? `${primarySurvey.siteName} Site Visit`
        : `Multi-Site Visit (${surveys.length} surveys)`
      onSubmit({
        newVisitName: visitName,
        assignee: assignee || undefined,
        dueDate: dueDate || undefined,
      })
    } else {
      onSubmit({
        existingVisitId: selectedId,
        assignee: assignee || undefined,
        dueDate: dueDate || undefined,
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-text-primary text-base font-semibold">Add to Site Visit</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors rounded-lg p-1">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Survey(s) being added */}
          <div>
            <p className="text-text-secondary text-xs mb-2">
              {surveys.length === 1 ? 'Adding survey to site visit' : `Adding ${surveys.length} surveys to site visit`}
            </p>
            <div className="bg-surface border border-border rounded-lg px-3 py-2.5 space-y-1 max-h-32 overflow-y-auto">
              {surveys.map(s => (
                <div key={s.id} className={surveys.length > 1 ? 'border-b border-border/50 pb-1 last:border-0 last:pb-0' : ''}>
                  <p className="text-text-primary text-sm font-medium">{s.siteName}</p>
                  <p className="text-accent text-xs">{SCOPE_LABEL[s.scope]}, Site ID: {s.siteId}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Site visit dropdown */}
          <div>
            <p className="text-text-secondary text-xs mb-2">to this site visit:</p>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="w-full flex items-center justify-between bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary hover:border-accent/50 transition-colors"
              >
                <span className={selectedId === 'new' ? 'text-text-muted' : 'text-text-primary'}>
                  {selectedLabel}
                </span>
                <ChevronDown size={14} className={`text-text-muted shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-2xl z-10 overflow-hidden">
                  {/* Search */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                    <Search size={12} className="text-text-muted shrink-0" />
                    <input
                      autoFocus
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search..."
                      className="flex-1 bg-transparent text-xs text-text-primary placeholder-text-muted outline-none"
                    />
                  </div>
                  {/* Create new option */}
                  <button
                    onClick={() => handleSelect('new')}
                    className={[
                      'w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2',
                      selectedId === 'new'
                        ? 'bg-accent/10 text-accent'
                        : 'text-text-primary hover:bg-surface',
                    ].join(' ')}
                  >
                    <Plus size={13} className="shrink-0" />
                    Create new site visit
                  </button>
                  {/* Existing visits */}
                  <div className="max-h-48 overflow-y-auto">
                    {filtered.map(v => (
                      <button
                        key={v.id}
                        onClick={() => handleSelect(v.id)}
                        className={[
                          'w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center gap-2',
                          selectedId === v.id
                            ? 'bg-accent/10 text-accent'
                            : 'text-text-secondary hover:bg-surface hover:text-text-primary',
                        ].join(' ')}
                      >
                        <MapPin size={11} className="shrink-0 text-text-muted" />
                        <span className="truncate">{v.name}</span>
                        <span className="ml-auto text-[10px] text-text-muted shrink-0">{v.siteName}</span>
                      </button>
                    ))}
                    {filtered.length === 0 && search && (
                      <p className="text-center text-text-muted text-xs py-3">No matches</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Optional: Assignee */}
          <div>
            <label className="text-text-secondary text-xs block mb-1.5">
              Assign to <span className="text-text-muted">(optional)</span>
            </label>
            <input
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              placeholder="e.g. Mike McGuire"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          {/* Optional: Due date */}
          <div>
            <label className="text-text-secondary text-xs block mb-1.5">
              Due date <span className="text-text-muted">(optional)</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-1.5 text-xs font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
          >
            {selectedId === 'new' ? 'Create Site Visit' : 'Add to Visit'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Org Switcher ───────────────────────────────────────────────────────────

interface OrgSwitcherProps {
  orgs: string[]
  value: string
  onChange: (org: string) => void
  allowAll?: boolean
  allLabel?: string
}

function OrgSwitcher({ orgs, value, onChange, allowAll = false, allLabel = 'All Organizations' }: OrgSwitcherProps) {
  const [open, setOpen] = useState(false)
  const label = value === 'all' ? allLabel : value

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 bg-card border border-border hover:border-accent/50 rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <Building2 size={14} className="text-accent shrink-0" />
        <span className="max-w-[160px] truncate">{label}</span>
        <ChevronDown size={12} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* All orgs option — admin only */}
          {allowAll && (
            <>
              <button
                onClick={() => { onChange('all'); setOpen(false) }}
                className={[
                  'w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center gap-2',
                  value === 'all'
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-surface hover:text-text-primary',
                ].join(' ')}
              >
                <Users size={13} className="shrink-0" />
                <span>{allLabel}</span>
                {value === 'all' && <span className="ml-auto text-accent">✓</span>}
              </button>
              <div className="border-t border-border mx-2 my-1" />
            </>
          )}

          {/* Individual orgs */}
          {orgs.map(org => (
            <button
              key={org}
              onClick={() => { onChange(org); setOpen(false) }}
              className={[
                'w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center gap-2',
                value === org
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-surface hover:text-text-primary',
              ].join(' ')}
            >
              <Building2 size={13} className="shrink-0" />
              <span className="truncate">{org}</span>
              {value === org && <span className="ml-auto text-accent">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Shared prop for org-aware role views
const ROLE_PERSONA_NAME: Record<string, string> = {
  admin:              'Lucy Kien',
  org_owner:          'Sara Connor',
  pm:                 'Susan Smith',
  qc_technician:      'Mike McGuire',
  qc_technician_2:    'John Smith',
  clickup_admin:      'Pryce Valencia',
  clickup_org_owner:  'Daniel Valencia',
  clickup_pm:         'Lucy Kien',
  clickup_technician: 'Mike McGuire',
}

interface RoleViewProps {
  orgFilter: string
  surveys: Survey[]
  allSiteVisits: SiteVisit[]
  onAssign: (surveyId: string, assignee: string, dueDate: string | null) => void
  onSelectSurvey: (id: string) => void
  onCreateSiteVisit: (surveys: Survey | Survey[]) => void
  onDeleteSiteVisit: (visitId: string) => void
  onTakeOnSiteVisit: (visitId: string) => void
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
  tabKpis?: Partial<Record<TabId, React.ReactNode>>
  showOrgColumn?: boolean
  onSelectSurvey?: (id: string) => void
  onAssign?: (survey: Survey) => void
  onCreateSiteVisit?: (surveys: Survey | Survey[]) => void
  onDeleteSiteVisit?: (visitId: string) => void
  onTakeOnVisit?: (visitId: string) => void
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

function SurveyActionMenu({ survey, onAssign, onCreateSiteVisit, onSelectSurvey }: {
  survey: Survey
  onAssign?: (s: Survey) => void
  onCreateSiteVisit?: (surveys: Survey | Survey[]) => void
  onSelectSurvey?: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const { role } = useRole()
  const isTechnician = role === 'qc_technician' || role === 'qc_technician_2' || role === 'clickup_technician'

  React.useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const items = [
    { icon: <ChevronRight size={13} />, label: 'View Survey',         action: () => { onSelectSurvey?.(survey.id); setOpen(false) } },
    { icon: <ChevronRight size={13} />, label: 'Download JSON',       action: () => {} },
    { icon: <ChevronRight size={13} />, label: 'Create Image Export', action: () => {} },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="text-text-muted hover:text-text-primary p-0.5 rounded transition-colors"
      >
        <MoreHorizontal size={13} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => { item.action(); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-surface hover:text-text-primary transition-colors flex items-center gap-2"
            >
              <span className="text-text-muted">{item.icon}</span>
              {item.label}
            </button>
          ))}

          {onAssign && (
            <>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => { onAssign(survey); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs text-accent hover:bg-accent/10 transition-colors flex items-center gap-2"
              >
                <UserCheck size={13} />
                {survey.assignee ? 'Reassign Survey' : 'Assign Survey'}
              </button>
            </>
          )}

          {onCreateSiteVisit && !isTechnician && (
            <>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => { onCreateSiteVisit(survey); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-400/10 transition-colors flex items-center gap-2"
              >
                <Plus size={13} />
                Add to Site Visit
              </button>
            </>
          )}

          <div className="border-t border-border my-1" />
          <button
            onClick={() => setOpen(false)}
            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2"
          >
            <XCircle size={13} />
            Delete Survey
          </button>
        </div>
      )}
    </div>
  )
}

function DashboardTabs({ surveys, scans, siteVisits, sites, customSurveysContent, tabKpis, showOrgColumn = false, onSelectSurvey, onAssign, onCreateSiteVisit, onDeleteSiteVisit, onTakeOnVisit }: DashboardTabsProps) {
  const [activeTab, setActiveTab]               = useState<TabId>('surveys')
  const [filterText, setFilterText]             = useState('')
  const [scopeFilter, setScopeFilter]           = useState<SurveyScope | 'all'>('all')
  const [showUnallocated, setShowUnallocated]   = useState(false)
  const [showUnallocatedScans, setShowUnallocatedScans] = useState(false)
  const [showUnprocessed, setShowUnprocessed]   = useState(false)
  const [scopeOpen, setScopeOpen]               = useState(false)
  const [selected, setSelected]                 = useState<Set<string>>(new Set())
  const [ctxMenu, setCtxMenu]                   = useState<{ x: number; y: number; surveyIds: string[] } | null>(null)

  React.useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    document.addEventListener('mousedown', close)
    document.addEventListener('scroll', close, true)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('scroll', close, true) }
  }, [ctxMenu])

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

  const handleTabChange = (tab: TabId) => { setActiveTab(tab); setSelected(new Set()); setCtxMenu(null) }

  const handleRowContextMenu = (e: React.MouseEvent, surveyId: string) => {
    if (!onCreateSiteVisit) return
    e.preventDefault()
    const ids = selected.has(surveyId) && selected.size > 1
      ? [...selected]
      : [surveyId]
    setCtxMenu({ x: e.clientX, y: e.clientY, surveyIds: ids })
  }

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

      {/* Tab KPIs */}
      {tabKpis?.[activeTab]}

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

        {/* Scope filter — surveys + site_visits tabs */}
        {(activeTab === 'surveys' || activeTab === 'site_visits') && (
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
        )}

        {/* Unallocated surveys toggle */}
        {activeTab === 'surveys' && (
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
        )}

        {/* Unallocated scans toggle */}
        {activeTab === 'scans' && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setShowUnallocatedScans(v => !v)}
              className={[
                'w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0',
                showUnallocatedScans ? 'bg-accent border-accent' : 'bg-surface border-border hover:border-accent/60',
              ].join(' ')}
            >
              {showUnallocatedScans && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
            </div>
            <span className="text-xs text-text-secondary">Show unallocated scans only</span>
          </label>
        )}

        {/* Unprocessed site visits toggle */}
        {activeTab === 'site_visits' && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setShowUnprocessed(v => !v)}
              className={[
                'w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0',
                showUnprocessed ? 'bg-accent border-accent' : 'bg-surface border-border hover:border-accent/60',
              ].join(' ')}
            >
              {showUnprocessed && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
            </div>
            <span className="text-xs text-text-secondary">Show unprocessed site visits only</span>
          </label>
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
                {showOrgColumn && <th className={thClass}>Organization</th>}
                <th className={thClass}>Assignee</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Progress</th>
                <th className={thClass}>
                  <span className="flex items-center gap-1">Created <ChevronDown size={10} /></span>
                </th>
                <th className="px-3 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {filteredSurveys.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40" onContextMenu={e => handleRowContextMenu(e, s.id)}>
                  <td className={tdClass}><Checkbox checked={selected.has(s.id)} onClick={() => toggleRow(s.id)} /></td>
                  <td className={`${tdClass} max-w-[180px] truncate`}>
                    {onSelectSurvey
                      ? <button onClick={() => onSelectSurvey(s.id)} className="text-accent font-medium hover:underline text-left truncate w-full">{s.name}</button>
                      : <span className="text-accent font-medium">{s.name}</span>}
                  </td>
                  <td className={`${tdClass} text-text-muted font-mono`}>{s.siteId}</td>
                  <td className={`${tdClass} text-text-primary`}>{s.siteName}</td>
                  {showOrgColumn && <td className={`${tdClass} text-text-secondary`}>{s.organization}</td>}
                  <td className={`${tdClass} text-text-secondary`}>{s.assignee ?? <span className="text-text-muted italic">Unassigned</span>}</td>
                  <td className={tdClass}><StatusBadge status={s.status} /></td>
                  <td className={`${tdClass} w-28`}>{s.progress !== undefined ? <ProgressBar value={s.progress} /> : '—'}</td>
                  <td className={`${tdClass} text-text-muted whitespace-nowrap`}>{s.createdDate}</td>
                  <td className={tdClass}><SurveyActionMenu survey={s} onAssign={onAssign} onCreateSiteVisit={onCreateSiteVisit} onSelectSurvey={onSelectSurvey} /></td>
                </tr>
              ))}
              {filteredSurveys.length === 0 && (
                <tr><td colSpan={showOrgColumn ? 10 : 9} className="px-4 py-8 text-center text-text-muted">No surveys match the current filters.</td></tr>
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
                <th className={thClass}>Name</th>
                <th className={thClass}>Site Visit</th>
                <th className={thClass}>Files</th>
                {showOrgColumn && <th className={thClass}>Organization</th>}
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
                  <td className={`${tdClass} text-accent font-medium max-w-[220px] truncate`}>{s.name}</td>
                  <td className={`${tdClass} text-text-secondary`}>
                    {s.siteVisit ?? <span className="text-text-muted italic">Unallocated</span>}
                  </td>
                  <td className={`${tdClass} text-text-primary font-medium`}>{s.files}</td>
                  {showOrgColumn && <td className={`${tdClass} text-text-secondary`}>{s.organization}</td>}
                  <td className={`${tdClass} text-text-muted whitespace-nowrap`}>{s.createdDate}</td>
                  <td className={tdClass}><ActionCell /></td>
                </tr>
              ))}
              {filteredScans.length === 0 && (
                <tr><td colSpan={showOrgColumn ? 7 : 6} className="px-4 py-8 text-center text-text-muted">No scans found.</td></tr>
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
                {showOrgColumn && <th className={thClass}>Organization</th>}
                <th className={thClass}>Assignee</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>
                  <span className="flex items-center gap-1">Scheduled <ChevronDown size={10} /></span>
                </th>
                <th className={thClass}>Processing Status</th>
                <th className={thClass}>Processed By</th>
                <th className="px-3 py-2.5 w-24" />
              </tr>
            </thead>
            <tbody>
              {filteredVisits.map(s => {
                const isOpen = !s.assignee && s.status === 'scheduled'
                return (
                  <tr key={s.id} className={`border-b border-border last:border-0 hover:bg-surface/40 ${isOpen ? 'bg-emerald-500/5' : ''}`}>
                    <td className={tdClass}><Checkbox checked={selected.has(s.id)} onClick={() => toggleRow(s.id)} /></td>
                    <td className={`${tdClass} text-accent font-medium max-w-[180px] truncate`}>
                      <div className="flex items-center gap-1.5">
                        {s.name}
                        {isOpen && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-400 border border-emerald-400/30 shrink-0">Open</span>}
                      </div>
                    </td>
                    <td className={`${tdClass} text-text-muted font-mono`}>{s.siteId}</td>
                    {showOrgColumn && <td className={`${tdClass} text-text-secondary`}>{s.organization}</td>}
                    <td className={`${tdClass} text-text-secondary`}>
                      {s.assignee ?? <span className="text-text-muted italic">Unassigned</span>}
                    </td>
                    <td className={tdClass}><VisitBadge status={s.status} /></td>
                    <td className={`${tdClass} text-text-muted whitespace-nowrap`}>{s.scheduledDate}</td>
                    <td className={tdClass}>
                      {s.processed
                        ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border text-emerald-400 bg-emerald-400/10 border-emerald-400/30">
                            Processed · {s.processingDate}
                          </span>
                        : <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border text-amber-400 bg-amber-400/10 border-amber-400/30">
                            Unprocessed
                          </span>
                      }
                    </td>
                    <td className={`${tdClass} text-text-secondary`}>
                      {s.processedBy ?? <span className="text-text-muted italic">—</span>}
                    </td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-2">
                        {isOpen && onTakeOnVisit && (
                          <button
                            onClick={() => onTakeOnVisit(s.id)}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors whitespace-nowrap"
                          >
                            <UserCheck size={11} /> Take On
                          </button>
                        )}
                        {onDeleteSiteVisit && (
                          <button
                            onClick={() => onDeleteSiteVisit(s.id)}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors whitespace-nowrap"
                            title="Delete site visit"
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        )}
                        {!isOpen && !onDeleteSiteVisit && <ActionCell />}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredVisits.length === 0 && (
                <tr><td colSpan={showOrgColumn ? 10 : 9} className="px-4 py-8 text-center text-text-muted">No site visits found.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Sites */}
        {activeTab === 'sites' && (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="px-3 py-2.5 w-8"><Checkbox checked={allSelected} onClick={toggleAll} /></th>
                <th className={thClass}>Name</th>
                <th className={thClass}>Site ID</th>
                {showOrgColumn && <th className={thClass}>Organization</th>}
                <th className={thClass}>
                  <span className="flex items-center gap-1">Created <ChevronDown size={10} /></span>
                </th>
                <th className={thClass}>Last Site Visit</th>
                <th className={thClass}>Last Process Time</th>
                <th className="px-3 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody>
              {filteredSites.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                  <td className={tdClass}><Checkbox checked={selected.has(s.id)} onClick={() => toggleRow(s.id)} /></td>
                  <td className={`${tdClass} text-accent font-medium`}>{s.siteName}</td>
                  <td className={`${tdClass} text-text-muted font-mono`}>{s.siteId}</td>
                  {showOrgColumn && <td className={`${tdClass} text-text-secondary`}>{s.organization}</td>}
                  <td className={`${tdClass} text-text-muted whitespace-nowrap`}>{s.createdDate}</td>
                  <td className={`${tdClass} text-text-muted whitespace-nowrap`}>
                    {s.lastSiteVisit ?? <span className="italic">None</span>}
                  </td>
                  <td className={tdClass}>
                    {s.isOverdue
                      ? <span className="flex items-center gap-1 text-red-400">
                          <AlertCircle size={11} />
                          {s.lastProcessTime ? s.lastProcessTime : <span className="italic">Never processed</span>}
                        </span>
                      : <span className="text-text-muted">{s.lastProcessTime ?? '—'}</span>
                    }
                  </td>
                  <td className={tdClass}><ActionCell /></td>
                </tr>
              ))}
              {filteredSites.length === 0 && (
                <tr><td colSpan={showOrgColumn ? 8 : 7} className="px-4 py-8 text-center text-text-muted">No sites found.</td></tr>
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

      {/* Right-click context menu */}
      {ctxMenu && onCreateSiteVisit && (
        <div
          className="fixed z-[100] bg-card border border-border rounded-xl shadow-2xl py-1 min-w-[180px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onMouseDown={e => e.stopPropagation()}
        >
          {ctxMenu.surveyIds.length > 1 && (
            <div className="px-3 py-1.5 text-[10px] text-text-muted font-medium uppercase tracking-wide border-b border-border mb-1">
              {ctxMenu.surveyIds.length} surveys selected
            </div>
          )}
          <button
            onClick={() => {
              const targetSurveys = filteredSurveys.filter(s => ctxMenu.surveyIds.includes(s.id))
              onCreateSiteVisit(targetSurveys.length === 1 ? targetSurveys[0] : targetSurveys)
              setCtxMenu(null)
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
          >
            <MapPin size={13} className="text-accent shrink-0" />
            <span>Add to Site Visit{ctxMenu.surveyIds.length > 1 ? ` (${ctxMenu.surveyIds.length})` : ''}</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Assignment Modal ────────────────────────────────────────────────────────

const ASSIGNABLE_USERS = ['Mike McGuire', 'John Smith', 'Susan Smith']

interface AssignModalProps {
  survey: Survey
  onClose: () => void
  onConfirm: (surveyId: string, assignee: string, dueDate: string | null) => void
  cuMembers?: CUMember[]
}

function AssignModal({ survey, onClose, onConfirm, cuMembers }: AssignModalProps) {
  const [step, setStep]             = useState<'assignee' | 'due_date'>('assignee')
  const [selected, setSelected]     = useState(survey.assignee ?? '')
  const [dueDate, setDueDate]       = useState<string | null>(null)
  const [customDate, setCustomDate] = useState('')
  const isReassign = Boolean(survey.assignee)

  const today  = new Date()
  const plus7  = new Date(today); plus7.setDate(today.getDate() + 7)
  const plus14 = new Date(today); plus14.setDate(today.getDate() + 14)
  const fmtDisplay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const fmtInput   = (d: Date) => d.toISOString().split('T')[0]

  const QUICK_DATES = [
    { label: '+7 days',  sub: fmtDisplay(plus7),  value: fmtDisplay(plus7) },
    { label: '+14 days', sub: fmtDisplay(plus14), value: fmtDisplay(plus14) },
  ]

  const handleFinalAssign = (skipDueDate = false) => {
    const finalDate = skipDueDate ? null : (dueDate ?? (customDate ? new Date(customDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null))
    onConfirm(survey.id, selected, finalDate)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <UserCheck size={16} className="text-accent" />
            <h2 className="text-text-primary font-semibold text-sm">
              {isReassign ? 'Reassign Survey' : 'Assign Survey'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Stepper dots */}
            <div className="flex items-center gap-1.5">
              <div className={['w-2 h-2 rounded-full transition-colors', step === 'assignee' ? 'bg-accent' : 'bg-emerald-400'].join(' ')} />
              <div className="w-4 h-px bg-border" />
              <div className={['w-2 h-2 rounded-full transition-colors', step === 'due_date' ? 'bg-accent' : 'bg-border'].join(' ')} />
            </div>
            <span className="text-[10px] text-text-muted">{step === 'assignee' ? '1 of 2' : '2 of 2'}</span>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors rounded-md p-0.5">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Survey info card */}
        <div className="px-5 py-4 bg-surface/50 border-b border-border space-y-2">
          <div className="text-text-primary font-medium text-sm leading-snug">{survey.name}</div>
          <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
            <span className="font-mono">{survey.siteId}</span>
            <span>·</span>
            <span>{survey.siteName}</span>
          </div>
          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            <PriorityBadge priority={getEffectivePriority(survey)} />
            <StatusBadge status={survey.status} />
            {step === 'due_date' && selected && selected !== survey.assignee && (
              <span className="text-[10px] text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <UserCheck size={9} /> {selected}
              </span>
            )}
          </div>
          {isReassign && step === 'assignee' && (
            <div className="text-xs text-text-muted pt-0.5">
              Currently assigned to <span className="text-text-secondary font-medium">{survey.assignee}</span>
            </div>
          )}
        </div>

        {/* Step 1 — Assignee picker */}
        {step === 'assignee' && (
          <div className="px-5 py-4 max-h-72 overflow-y-auto">
            <div className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-3">
              {isReassign ? 'Reassign to' : 'Assign to'} <span className="normal-case font-normal ml-1">(recommended)</span>
            </div>
            <div className="space-y-2">
              {(cuMembers ? cuMembers.map(m => m.username) : ASSIGNABLE_USERS).map(name => {
                const member    = cuMembers?.find(m => m.username === name)
                const initials  = member?.initials ?? name.split(' ').map(n => n[0]).join('')
                const isSelf    = cuMembers ? false : name === 'Susan Smith'
                const isCurrent = name === survey.assignee
                return (
                  <button
                    key={name}
                    onClick={() => setSelected(name)}
                    className={[
                      'w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors flex items-center gap-3',
                      selected === name
                        ? 'border-accent bg-accent/10 text-text-primary'
                        : 'border-border bg-surface hover:border-accent/40 text-text-secondary',
                    ].join(' ')}
                  >
                    <div className={[
                      'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                      selected === name ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted',
                    ].join(' ')}>
                      {initials}
                    </div>
                    <span className="flex-1">{name}</span>
                    {isSelf && <span className="text-[9px] text-text-muted bg-surface border border-border px-1.5 py-0.5 rounded">You</span>}
                    {isCurrent && <span className="text-[9px] text-text-muted">Current</span>}
                    {selected === name && <CheckCircle2 size={14} className="text-accent shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2 — Due date */}
        {step === 'due_date' && (
          <div className="px-5 py-4">
            <div className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-3">
              Set Due Date <span className="normal-case font-normal ml-1">(recommended)</span>
            </div>
            <div className="space-y-2">
              {QUICK_DATES.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setDueDate(opt.value); setCustomDate('') }}
                  className={[
                    'w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors flex items-center justify-between',
                    dueDate === opt.value
                      ? 'border-accent bg-accent/10 text-text-primary'
                      : 'border-border bg-surface hover:border-accent/40 text-text-secondary',
                  ].join(' ')}
                >
                  <span className="font-medium">{opt.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted text-xs">{opt.sub}</span>
                    {dueDate === opt.value && <CheckCircle2 size={13} className="text-accent" />}
                  </div>
                </button>
              ))}
              {/* Custom date input */}
              <div className={[
                'rounded-xl border px-3 py-2.5 transition-colors',
                customDate ? 'border-accent' : 'border-border',
              ].join(' ')}>
                <div className="text-[10px] text-text-muted mb-1.5">Custom date</div>
                <input
                  type="date"
                  value={customDate}
                  min={fmtInput(today)}
                  onChange={e => { setCustomDate(e.target.value); setDueDate(null) }}
                  className="w-full bg-transparent text-text-primary text-xs outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
          {step === 'due_date' ? (
            <>
              <button
                onClick={() => setStep('assignee')}
                className="px-4 py-2 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:border-accent/40 transition-colors"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFinalAssign(true)}
                  className="px-4 py-2 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:border-accent/40 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => handleFinalAssign(false)}
                  disabled={!dueDate && !customDate}
                  className="px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <UserCheck size={13} />
                  {isReassign ? 'Reassign' : 'Assign'}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:border-accent/40 transition-colors"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep('due_date')}
                  className="px-4 py-2 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:border-accent/40 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => setStep('due_date')}
                  disabled={!selected || selected === survey.assignee}
                  className="px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Toast Stack ─────────────────────────────────────────────────────────────

interface Toast { id: string; message: string }

function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-5 right-5 z-[300] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="bg-card border border-emerald-400/30 rounded-xl px-4 py-3 shadow-2xl text-xs text-text-primary flex items-center gap-3 min-w-[280px] max-w-sm"
        >
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Survey Detail Types & Helpers ──────────────────────────────────────────

interface SurveyField {
  id: string
  label: string
  type: 'check' | 'photo' | 'measurement'
  completed: boolean
}
interface SurveySection {
  id: string
  title: string
  hasLock?: boolean
  fields: SurveyField[]
}

function buildSurveySections(survey: Survey): SurveySection[] {
  const seed = survey.progress ?? 0
  function mkFields(items: Array<{ id: string; label: string; type?: SurveyField['type'] }>): SurveyField[] {
    return items.map((item, i) => ({
      id: item.id, label: item.label,
      type: item.type ?? 'check',
      completed: Math.round((i / items.length) * 100) < seed,
    }))
  }
  switch (survey.scope) {
    case 'facilities': return [
      { id: 'compounds', title: 'Guy Compounds', fields: mkFields([
        { id: 'gc1', label: 'Anchor inspection — NW' },
        { id: 'gc2', label: 'Anchor inspection — NE' },
        { id: 'gc3', label: 'Anchor inspection — S' },
        { id: 'gc4', label: 'Guy wire tension check' },
        { id: 'gc5', label: 'Turnbuckle condition' },
        { id: 'gc6', label: 'Grounding continuity' },
      ]) },
      { id: 'photos', title: 'Guy Photos', hasLock: true, fields: mkFields([
        { id: 'ph1', label: 'Overall tower photo', type: 'photo' },
        { id: 'ph2', label: 'NW anchor photo', type: 'photo' },
        { id: 'ph3', label: 'NE anchor photo', type: 'photo' },
        { id: 'ph4', label: 'S anchor photo', type: 'photo' },
        { id: 'ph5', label: 'Guy wire close-up', type: 'photo' },
      ]) },
      { id: 'deficiencies', title: 'Deficiencies', fields: mkFields([
        { id: 'd1', label: 'Deficiency #1 — Corrosion on NW anchor' },
        { id: 'd2', label: 'Deficiency #2 — Guy wire tension out of spec' },
        { id: 'd3', label: 'Deficiency #3 — Turnbuckle cotter pin missing' },
      ]) },
      { id: 'catch_all', title: 'Catch All', fields: mkFields([
        { id: 'ca1', label: 'Additional field observations' },
        { id: 'ca2', label: 'Corrective action recommended' },
      ]) },
      { id: 'flags', title: 'Flags', fields: mkFields([
        { id: 'fl1', label: 'Safety concern flagged' },
        { id: 'fl2', label: 'Re-inspection required' },
      ]) },
    ]
    case 'inspection': return [
      { id: 'tower', title: 'Tower Details', fields: mkFields([
        { id: 't1', label: 'Tower type confirmed' },
        { id: 't2', label: 'Total height measured', type: 'measurement' },
        { id: 't3', label: 'Structural loading assessed' },
        { id: 't4', label: 'Foundation condition' },
        { id: 't5', label: 'Corrosion assessment' },
      ]) },
      { id: 'climb', title: 'Climbing Protocol', fields: mkFields([
        { id: 'cp1', label: 'Pre-climb inspection complete' },
        { id: 'cp2', label: 'Equipment check — harness & lanyard' },
        { id: 'cp3', label: 'RF awareness zones marked' },
        { id: 'cp4', label: 'Fall arrest system verified' },
      ]) },
      { id: 'photos', title: 'Site Photos', hasLock: true, fields: mkFields([
        { id: 'ph1', label: 'Overall site photo', type: 'photo' },
        { id: 'ph2', label: 'Tower base photo', type: 'photo' },
        { id: 'ph3', label: 'Equipment close-ups', type: 'photo' },
        { id: 'ph4', label: 'Deficiency photos', type: 'photo' },
      ]) },
      { id: 'deficiencies', title: 'Deficiencies', fields: mkFields([
        { id: 'd1', label: 'Deficiency documented and photographed' },
        { id: 'd2', label: 'Severity rating assigned' },
        { id: 'd3', label: 'Corrective action noted' },
      ]) },
      { id: 'flags', title: 'Flags', fields: mkFields([
        { id: 'fl1', label: 'Immediate safety concern' },
        { id: 'fl2', label: 'FAA lighting issue' },
      ]) },
    ]
    case 'cop': return [
      { id: 'checklist', title: 'COP Checklist', fields: mkFields([
        { id: 'c1', label: 'Lighting system operational' },
        { id: 'c2', label: 'Flash sequence correct' },
        { id: 'c3', label: 'Obstruction lighting — all levels' },
        { id: 'c4', label: 'Controller box inspection' },
        { id: 'c5', label: 'Photo cell / dusk sensor tested' },
      ]) },
      { id: 'photos', title: 'COP Photos', hasLock: true, fields: mkFields([
        { id: 'ph1', label: 'Lighting units — all levels', type: 'photo' },
        { id: 'ph2', label: 'Controller box', type: 'photo' },
        { id: 'ph3', label: 'Sensor and wiring', type: 'photo' },
      ]) },
      { id: 'issues', title: 'Issues', fields: mkFields([
        { id: 'i1', label: 'Issue #1 — Burned out lamp unit' },
        { id: 'i2', label: 'Replacement ordered / scheduled' },
      ]) },
      { id: 'flags', title: 'Flags', fields: mkFields([
        { id: 'fl1', label: 'FAA notification required' },
      ]) },
    ]
    case 'jsa': return [
      { id: 'hazards', title: 'Hazard Identification', fields: mkFields([
        { id: 'h1', label: 'Working at heights' },
        { id: 'h2', label: 'Electrical hazards' },
        { id: 'h3', label: 'RF / EMF exposure' },
        { id: 'h4', label: 'Weather conditions assessed' },
        { id: 'h5', label: 'Traffic / site access hazards' },
      ]) },
      { id: 'controls', title: 'Control Measures', fields: mkFields([
        { id: 'cm1', label: 'PPE confirmed — all crew' },
        { id: 'cm2', label: 'Exclusion zones established' },
        { id: 'cm3', label: 'Emergency plan reviewed' },
        { id: 'cm4', label: 'Communication check complete' },
      ]) },
      { id: 'signoff', title: 'Worker Sign-off', fields: mkFields([
        { id: 's1', label: 'Technician acknowledged JSA' },
        { id: 's2', label: 'Supervisor reviewed and approved' },
      ]) },
      { id: 'flags', title: 'Flags', fields: mkFields([
        { id: 'fl1', label: 'Stop-work condition identified' },
      ]) },
    ]
    default: return [
      { id: 'assessment', title: 'General Assessment', fields: mkFields([
        { id: 'a1', label: 'Site access confirmed' },
        { id: 'a2', label: 'Equipment inventory verified' },
        { id: 'a3', label: 'Scope of work reviewed on-site' },
      ]) },
      { id: 'photos', title: 'Documentation Photos', hasLock: true, fields: mkFields([
        { id: 'ph1', label: 'Site overview', type: 'photo' },
        { id: 'ph2', label: 'Work area', type: 'photo' },
      ]) },
      { id: 'notes', title: 'Notes', fields: mkFields([
        { id: 'n1', label: 'Field observations documented' },
        { id: 'n2', label: 'Follow-up items identified' },
      ]) },
      { id: 'flags', title: 'Flags', fields: mkFields([
        { id: 'fl1', label: 'Issue requires escalation' },
      ]) },
    ]
  }
}

// ─── Unblock Modal ───────────────────────────────────────────────────────────

function UnblockModal({ survey, blockers, onClose, onConfirm }: {
  survey: Survey
  blockers: Survey[]
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <AlertCircle size={16} className="text-amber-400" />
          <h2 className="text-text-primary font-semibold text-sm">Bypass Priority Lock?</h2>
          <button onClick={onClose} className="ml-auto text-text-muted hover:text-text-primary transition-colors"><X size={14} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-text-secondary text-sm">
            <span className="text-text-primary font-medium">"{survey.name}"</span> is locked because the following high-priority survey(s) are still outstanding:
          </p>
          <div className="space-y-1.5">
            {blockers.map(b => (
              <div key={b.id} className="flex items-center gap-2 text-xs bg-red-400/5 border border-red-400/20 rounded-lg px-3 py-2">
                <AlertCircle size={11} className="text-red-400 shrink-0" />
                <span className="text-text-secondary font-medium flex-1">{b.name}</span>
                <span className="text-text-muted">{b.siteName}</span>
              </div>
            ))}
          </div>
          <p className="text-text-muted text-xs leading-relaxed">
            Field conditions sometimes require working out of sequence. Unblocking lets you proceed, but the high-priority surveys will remain outstanding and should be completed as soon as possible.
          </p>
        </div>
        <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:border-accent/40 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-white rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Lock size={12} />
            Unblock Anyway
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Survey Detail Page ───────────────────────────────────────────────────────

function SurveyDetailPage({ survey, onClose, onMarkComplete, onUpdate }: {
  survey: Survey
  onClose: () => void
  onMarkComplete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Survey>) => void
}) {
  type SectionState = SurveySection & { open: boolean }
  const [sections, setSections] = React.useState<SectionState[]>(() =>
    buildSurveySections(survey).map(s => ({ ...s, open: false }))
  )
  const [aiOpen, setAiOpen] = React.useState(false)
  const [confirmComplete, setConfirmComplete] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [editData, setEditData] = React.useState({
    siteName: survey.siteName,
    siteId: survey.siteId,
    organization: survey.organization,
    scope: survey.scope,
    status: survey.status,
    dueDate: survey.dueDate ?? '',
  })

  const allFields = sections.flatMap(s => s.fields)
  const completedCount = allFields.filter(f => f.completed).length
  const progress = allFields.length > 0 ? Math.round((completedCount / allFields.length) * 100) : 0
  const isAlreadyComplete = survey.status === 'completed'

  const toggleField = (sectionId: string, fieldId: string) =>
    setSections(prev => prev.map(s =>
      s.id !== sectionId ? s : { ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, completed: !f.completed } : f) }
    ))

  const toggleSection = (id: string) =>
    setSections(prev => prev.map(s => s.id === id ? { ...s, open: !s.open } : s))

  return (
    <div className="fixed inset-0 z-[150] bg-surface flex flex-col overflow-hidden">

      {/* Confirm complete modal */}
      {confirmComplete && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmComplete(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <h2 className="text-text-primary font-semibold">Mark Survey as Complete?</h2>
            </div>
            <p className="text-text-secondary text-sm mb-2">
              This will mark <span className="text-text-primary font-medium">"{survey.name}"</span> as complete and update its status across the dashboard.
            </p>
            <p className="text-text-muted text-xs mb-5">Make sure all required fields and photos have been submitted before proceeding.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmComplete(false)} className="px-4 py-2 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:border-accent/40 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { onMarkComplete(survey.id); onClose() }}
                className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 size={13} />
                Mark as Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top header bar */}
      <div className="bg-card border-b border-border px-6 py-3.5 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-text-primary font-semibold text-lg truncate">{survey.name}</h1>
            <button className="text-text-muted hover:text-accent transition-colors shrink-0" title="Survey info">
              <AlertCircle size={15} />
            </button>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Marked fields progress */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-emerald-400 text-xs font-medium">Marked Fields</span>
              <div className="w-20 h-1.5 bg-surface rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-text-muted text-xs w-10 text-right">{progress.toFixed(2)}%</span>
            </div>
            <button className="px-3 py-1.5 text-xs text-text-secondary border border-border rounded-lg hover:border-accent/40 hover:text-text-primary transition-colors">
              Save ({completedCount})
            </button>
            <button
              onClick={() => !isAlreadyComplete && setConfirmComplete(true)}
              disabled={isAlreadyComplete}
              className="px-4 py-1.5 text-xs font-semibold bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <CheckCircle2 size={13} />
              {isAlreadyComplete ? 'Completed' : 'Mark as Complete'}
            </button>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-surface">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* AI Analysis toggle */}
      <div className="bg-card/80 border-b border-border px-6 py-2.5 shrink-0">
        <button onClick={() => setAiOpen(v => !v)} className="flex items-center justify-between w-full text-left group">
          <span className="text-text-secondary text-sm group-hover:text-text-primary transition-colors">
            View AI Analysis <span className="text-text-muted text-xs">(Beta)</span>
          </span>
          <ChevronDown size={14} className={`text-text-muted transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
        </button>
        {aiOpen && (
          <div className="mt-3 rounded-xl border border-border bg-surface p-4 text-sm text-text-muted italic">
            Connect to the analytics engine to generate automated deficiency summaries, risk scores, and historical comparisons for this site.
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 max-w-4xl mx-auto w-full">

        {/* Site info card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-text-primary font-semibold">{survey.name}</h2>
            <div className="flex items-center gap-2">
              {!editing && (
                <button
                  onClick={() => { setEditData({ siteName: survey.siteName, siteId: survey.siteId, organization: survey.organization, scope: survey.scope, status: survey.status, dueDate: survey.dueDate ?? '' }); setEditing(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary border border-border rounded-lg hover:border-accent/40 hover:text-text-primary transition-colors"
                >
                  <Pencil size={12} /> Edit Details
                </button>
              )}
              {editing && (
                <>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-3 py-1.5 text-xs text-text-secondary border border-border rounded-lg hover:border-accent/40 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const updates: Partial<Survey> = {
                        siteName: editData.siteName,
                        siteId: editData.siteId,
                        organization: editData.organization,
                        scope: editData.scope,
                        status: editData.status as SurveyStatus,
                        dueDate: editData.dueDate || undefined,
                      }
                      if (editData.status === 'completed' && survey.status !== 'completed') {
                        const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        updates.completedDate = today
                        updates.progress = 100
                      }
                      onUpdate(survey.id, updates)
                      setEditing(false)
                    }}
                    className="px-3 py-1.5 text-xs font-semibold bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={12} /> Save Changes
                  </button>
                </>
              )}
            </div>
          </div>

          {!editing ? (
            <div className="flex gap-6 flex-col sm:flex-row">
              <div className="flex-1 space-y-2 text-sm">
                {[
                  { label: 'Site Name',    value: survey.siteName },
                  { label: 'Site ID',      value: survey.siteId },
                  { label: 'Survey Type',  value: SCOPE_LABEL[survey.scope] },
                  { label: 'Organization', value: survey.organization },
                  { label: 'Assignee',     value: survey.assignee ?? '—' },
                  { label: 'Due Date',     value: survey.dueDate ?? '—' },
                  { label: 'Status',       value: STATUS_LABELS[survey.status] },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-2">
                    <span className="text-text-primary font-semibold min-w-[110px] shrink-0">{label}:</span>
                    <span className="text-text-secondary">{value}</span>
                  </div>
                ))}
              </div>
              <div className="w-full sm:w-52 h-40 rounded-xl border border-border bg-gradient-to-br from-surface to-card flex flex-col items-center justify-center gap-2 shrink-0 overflow-hidden">
                <div className="w-9 h-9 rounded-full bg-red-400/10 border border-red-400/30 flex items-center justify-center">
                  <MapPin size={18} className="text-red-400" />
                </div>
                <span className="text-text-secondary text-xs font-medium text-center px-3">{survey.siteName}</span>
                <span className="text-text-muted text-[11px] font-mono">{survey.siteId}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {([
                { key: 'siteName',     label: 'Site Name',    type: 'text' },
                { key: 'siteId',       label: 'Site ID',      type: 'text' },
                { key: 'organization', label: 'Organization', type: 'text' },
                { key: 'dueDate',      label: 'Due Date',     type: 'date' },
              ] as { key: keyof typeof editData; label: string; type: string }[]).map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={editData[key]}
                    onChange={e => setEditData(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
                  />
                </div>
              ))}
              <div>
                <label className="block text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1.5">Survey Type</label>
                <select
                  value={editData.scope}
                  onChange={e => setEditData(prev => ({ ...prev, scope: e.target.value as SurveyScope }))}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
                >
                  {(Object.entries(SCOPE_LABEL) as [SurveyScope, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={editData.status}
                  onChange={e => setEditData(prev => ({ ...prev, status: e.target.value as SurveyStatus }))}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
                >
                  {(Object.entries(STATUS_LABELS) as [SurveyStatus, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 text-[11px] text-text-muted">
                Assignee is managed via the Assign button.
              </div>
            </div>
          )}
        </div>

        {/* Accordion sections */}
        {sections.map(section => {
          const doneCount = section.fields.filter(f => f.completed).length
          return (
            <div key={section.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-text-primary font-medium text-sm">{section.title}</span>
                  {doneCount > 0 && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full font-medium">
                      {doneCount}/{section.fields.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-text-muted">
                  {section.hasLock && <Lock size={13} />}
                  <ChevronDown size={14} className={`transition-transform ${section.open ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {section.open && (
                <div className="border-t border-border divide-y divide-border/60">
                  {section.fields.map(field => (
                    <div
                      key={field.id}
                      onClick={() => toggleField(section.id, field.id)}
                      className={[
                        'flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors select-none',
                        field.completed ? 'bg-emerald-400/5 hover:bg-emerald-400/10' : 'hover:bg-surface/40',
                      ].join(' ')}
                    >
                      <div className={[
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                        field.completed ? 'bg-emerald-400 border-emerald-400' : 'bg-surface border-border',
                      ].join(' ')}>
                        {field.completed && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {field.type === 'photo' && (
                          <span className="text-[10px] text-blue-400 bg-blue-400/10 border border-blue-400/20 px-1.5 py-0.5 rounded shrink-0">Photo</span>
                        )}
                        {field.type === 'measurement' && (
                          <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded shrink-0">Measurement</span>
                        )}
                        <span className={`text-sm ${field.completed ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
                          {field.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── PM Surveys Content (split: Needs Assignment + Assigned) ───────────────

function PMSurveysContent({ surveys, onAssign, onSelectSurvey, onCreateSiteVisit, cuMembers }: { surveys: Survey[]; onAssign: (id: string, assignee: string, dueDate: string | null) => void; onSelectSurvey?: (id: string) => void; onCreateSiteVisit?: (surveys: Survey | Survey[]) => void; cuMembers?: CUMember[] }) {
  const [modalSurvey, setModalSurvey] = useState<Survey | null>(null)
  const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
  const unassigned = [...surveys.filter(s => s.status === 'unassigned')]
    .sort((a, b) => priorityOrder[getEffectivePriority(a)] - priorityOrder[getEffectivePriority(b)])
  const assigned = surveys.filter(s => s.status !== 'unassigned')

  const thClass = 'px-3 py-2.5 text-left text-text-primary font-semibold text-xs'

  const handleConfirm = (surveyId: string, assignee: string, dueDate: string | null) => {
    onAssign(surveyId, assignee, dueDate)
    setModalSurvey(null)
  }

  return (
    <>
      {/* Assignment Modal */}
      {modalSurvey && (
        <AssignModal
          survey={modalSurvey}
          onClose={() => setModalSurvey(null)}
          onConfirm={handleConfirm}
          cuMembers={cuMembers}
        />
      )}

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
                  <th className={thClass}>Created</th>
                  <th className={thClass}>Due Date</th>
                  <th className={thClass}>Action</th>
                </tr>
              </thead>
              <tbody>
                {unassigned.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                    <td className="px-3 py-2.5"><PriorityBadge priority={getEffectivePriority(s)} /></td>
                    <td className="px-3 py-2.5 max-w-[180px] truncate">
                      {onSelectSurvey
                        ? <button onClick={() => onSelectSurvey(s.id)} className="text-accent font-medium hover:underline text-left truncate w-full">{s.name}</button>
                        : <span className="text-accent font-medium">{s.name}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-text-muted font-mono">{s.siteId}</td>
                    <td className="px-3 py-2.5 text-text-primary">{s.siteName}</td>
                    <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">{s.createdDate}</td>
                    <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">{s.dueDate ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setModalSurvey(s)}
                          className="flex items-center gap-1.5 text-accent hover:text-accent-hover border border-accent/30 hover:border-accent/60 bg-accent/5 hover:bg-accent/10 px-2.5 py-1 rounded-lg transition-colors font-medium"
                        >
                          <UserCheck size={11} />
                          Assign
                        </button>
                        <SurveyActionMenu survey={s} onAssign={() => setModalSurvey(s)} onCreateSiteVisit={onCreateSiteVisit} onSelectSurvey={onSelectSurvey} />
                      </div>
                    </td>
                  </tr>
                ))}
                {unassigned.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-text-muted">All surveys are assigned.</td></tr>
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
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {assigned.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                    <td className="px-3 py-2.5"><PriorityBadge priority={getEffectivePriority(s)} /></td>
                    <td className="px-3 py-2.5 max-w-[160px] truncate">
                      {onSelectSurvey
                        ? <button onClick={() => onSelectSurvey(s.id)} className="text-accent font-medium hover:underline text-left truncate w-full">{s.name}</button>
                        : <span className="text-accent font-medium">{s.name}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-text-muted font-mono">{s.siteId}</td>
                    <td className="px-3 py-2.5 text-text-primary">{s.siteName}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <div className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center text-[9px] font-bold text-text-muted">
                          {s.assignee?.split(' ').map(n => n[0]).join('') ?? '?'}
                        </div>
                        {s.assignee ?? '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={s.status} /></td>
                    <td className="px-3 py-2.5 w-28">{s.progress !== undefined ? <ProgressBar value={s.progress} /> : '—'}</td>
                    <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">
                      {s.status === 'completed'
                        ? <span className="text-emerald-400">✓ {s.completedDate}</span>
                        : s.status === 'overdue'
                        ? <span className="text-red-400">⚠ {s.dueDate}</span>
                        : s.dueDate ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setModalSurvey(s)}
                          className="flex items-center gap-1 text-text-muted hover:text-accent border border-border hover:border-accent/40 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <UserCheck size={10} />
                          Reassign
                        </button>
                        <SurveyActionMenu survey={s} onAssign={() => setModalSurvey(s)} onCreateSiteVisit={onCreateSiteVisit} onSelectSurvey={onSelectSurvey} />
                      </div>
                    </td>
                  </tr>
                ))}
                {assigned.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-6 text-center text-text-muted">No assigned surveys.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Technician Surveys Content (split: Active + Completed) ─────────────────

function TechSurveysContent({ surveys, showPriorityLock, onSelectSurvey, onCreateSiteVisit }: {
  surveys: Survey[]
  showPriorityLock?: boolean
  onSelectSurvey?: (id: string) => void
  onCreateSiteVisit?: (surveys: Survey | Survey[]) => void
}) {
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())
  const [unblockTarget, setUnblockTarget] = useState<Survey | null>(null)

  const active    = surveys.filter(s => s.status !== 'completed')
  const completed = surveys.filter(s => s.status === 'completed')

  const blockers    = active.filter(s => getEffectivePriority(s) === 'high')
  const hasBlockers = showPriorityLock && blockers.length > 0
  const isLocked    = (s: Survey) => Boolean(showPriorityLock && hasBlockers && getEffectivePriority(s) !== 'high' && !unlocked.has(s.id))
  const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
  const sortedActive = showPriorityLock
    ? [...active].sort((a, b) => priorityOrder[getEffectivePriority(a)] - priorityOrder[getEffectivePriority(b)])
    : active

  return (
    <div className="p-4 space-y-6">
      {/* Unblock confirmation modal */}
      {unblockTarget && (
        <UnblockModal
          survey={unblockTarget}
          blockers={blockers}
          onClose={() => setUnblockTarget(null)}
          onConfirm={() => setUnlocked(prev => new Set([...prev, unblockTarget.id]))}
        />
      )}

      {/* Active / In Progress section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-accent"><Clock size={15} /></span>
          <h2 className="text-text-primary text-sm font-semibold">Active Surveys</h2>
          <span className="text-[10px] text-text-muted bg-surface border border-border px-2 py-0.5 rounded-full">{active.length}</span>
          {hasBlockers && (
            <span className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/30 px-2 py-0.5 rounded-full font-medium ml-1">
              {blockers.length} survey(s) blocking progress
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
                onClick={() => !locked && onSelectSurvey?.(s.id)}
                className={[
                  'rounded-xl border px-4 py-3 transition-all',
                  isHigh   ? 'border-red-400/30 bg-red-400/5' : 'border-border bg-surface/40',
                  locked   ? 'opacity-50' : '',
                  !locked && onSelectSurvey ? 'cursor-pointer hover:border-accent/40 hover:bg-surface/70' : '',
                ].join(' ')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {locked && <Lock size={12} className="text-text-muted shrink-0" />}
                    <span className={`text-sm font-medium truncate ${locked ? 'text-text-muted' : 'text-text-primary'}`}>{s.name}</span>
                    <span className="text-text-muted text-xs font-mono shrink-0">{s.siteId}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted shrink-0 ml-3">
                    {locked ? (
                      <>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border text-text-muted bg-surface border-border">Locked</span>
                        <button
                          onClick={e => { e.stopPropagation(); setUnblockTarget(s) }}
                          className="text-[10px] font-medium px-2 py-0.5 rounded border text-amber-400 bg-amber-400/10 border-amber-400/30 hover:bg-amber-400/20 transition-colors"
                        >
                          Unblock
                        </button>
                      </>
                    ) : (
                      <StatusBadge status={s.status} />
                    )}
                    {isHigh && <PriorityBadge priority="high" />}
                    <span>·</span>
                    <span>{s.siteName}</span>
                    {s.dueDate && <><span>·</span><span>Due {s.dueDate}</span></>}
                    {!locked && (
                      <span onClick={e => e.stopPropagation()}>
                        <SurveyActionMenu survey={s} onCreateSiteVisit={onCreateSiteVisit} onSelectSurvey={onSelectSurvey} />
                      </span>
                    )}
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
                <th className="px-3 py-2.5 text-left text-text-primary font-semibold">Completed</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {completed.map(s => (
                <tr
                  key={s.id}
                  onClick={() => onSelectSurvey?.(s.id)}
                  className={`border-b border-border last:border-0 hover:bg-surface/40 ${onSelectSurvey ? 'cursor-pointer' : ''}`}
                >
                  <td className="px-3 py-2.5 text-accent font-medium hover:underline">{s.name}</td>
                  <td className="px-3 py-2.5 text-text-muted font-mono">{s.siteId}</td>
                  <td className="px-3 py-2.5 text-text-primary">{s.siteName}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.completedDate ?? '—'}</td>
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <SurveyActionMenu survey={s} onCreateSiteVisit={onCreateSiteVisit} onSelectSurvey={onSelectSurvey} />
                  </td>
                </tr>
              ))}
              {completed.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-text-muted">No completed surveys yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Admin View ─────────────────────────────────────────────────────────────

function AdminView({ orgFilter, surveys: allSurveys, allSiteVisits, onAssign, onSelectSurvey, onCreateSiteVisit, onDeleteSiteVisit, onTakeOnSiteVisit }: RoleViewProps) {
  const { config, addMetric, removeMetric, resetContext } = useKpiConfig('admin')
  const [modalSurvey, setModalSurvey] = useState<Survey | null>(null)

  const applyOrg = <T extends { organization: string }>(arr: T[]) =>
    orgFilter === 'all' ? arr : arr.filter(s => s.organization === orgFilter)

  const surveys    = applyOrg(allSurveys)
  const scans      = applyOrg(SCANS)
  const siteVisits = applyOrg(allSiteVisits)
  const sites      = applyOrg(ALL_SITES)
  const data: KpiData = { surveys, scans, siteVisits, sites }

  const completed  = surveys.filter(s => s.status === 'completed').length
  const unassigned = surveys.filter(s => s.status === 'unassigned').length
  const overdue    = surveys.filter(s => s.status === 'overdue').length
  const rate       = surveys.length ? Math.round((completed / surveys.length) * 100) : 0

  const kpiSection = (ctx: KpiContext, registry: MetricDef[]) => (
    <KpiSection
      variant="tab"
      context={ctx}
      metrics={registry}
      activeIds={config[ctx]}
      data={data}
      onAdd={id => addMetric(ctx, id)}
      onRemove={id => removeMetric(ctx, id)}
      onReset={() => resetContext(ctx)}
    />
  )

  return (
    <div className="space-y-5">
      {modalSurvey && (
        <AssignModal
          survey={modalSurvey}
          onClose={() => setModalSurvey(null)}
          onConfirm={(id, assignee, dueDate) => { onAssign(id, assignee, dueDate); setModalSurvey(null) }}
        />
      )}

      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-text-muted text-xs">Overall Completion Rate</span>
          <span className="text-text-primary text-xl font-bold">{rate}%</span>
        </div>
        <ProgressBar value={rate} />
        <div className="flex justify-between text-[10px] text-text-muted mt-2">
          <span>{completed} completed of {surveys.length} total surveys</span>
          <span>{unassigned} unassigned · {overdue} overdue</span>
        </div>
      </div>

      <DashboardTabs
        surveys={surveys} scans={scans} siteVisits={siteVisits} sites={sites}
        tabKpis={{ surveys: kpiSection('surveys', SURVEY_METRICS), scans: kpiSection('scans', SCAN_METRICS), site_visits: kpiSection('site_visits', VISIT_METRICS), sites: kpiSection('sites', SITE_METRICS) }}
        showOrgColumn={orgFilter === 'all'}
        onSelectSurvey={onSelectSurvey}
        onAssign={setModalSurvey}
        onCreateSiteVisit={onCreateSiteVisit}
        onDeleteSiteVisit={onDeleteSiteVisit}
        onTakeOnVisit={onTakeOnSiteVisit}
      />
    </div>
  )
}

// ─── Org Owner View ─────────────────────────────────────────────────────────

function OrgOwnerView({ orgFilter, surveys: allSurveys, allSiteVisits, onAssign, onSelectSurvey, onCreateSiteVisit, onDeleteSiteVisit, onTakeOnSiteVisit }: RoleViewProps) {
  const { config, addMetric, removeMetric, resetContext } = useKpiConfig('org_owner', { surveys: [], scans: [], site_visits: [], sites: [] })
  const [modalSurvey, setModalSurvey] = useState<Survey | null>(null)

  const applyOrg = <T extends { organization: string }>(arr: T[]) =>
    orgFilter === 'all' ? arr : arr.filter(s => s.organization === orgFilter)

  const surveys    = applyOrg(allSurveys.filter(s => ORG_FILTER.includes(s.organization)))
  const scans      = applyOrg(ORG_SCANS)
  const siteVisits = applyOrg(allSiteVisits.filter(s => ORG_FILTER.includes(s.organization)))
  const sites      = applyOrg(ORG_SITES)
  const data: KpiData = { surveys, scans, siteVisits, sites }

  // Only show org cards for the selected org (or all if 'all')
  const visibleOrgs = orgFilter === 'all' ? ORG_FILTER : ORG_FILTER.filter(o => o === orgFilter)
  const orgStats = visibleOrgs.map(org => {
    const s = surveys.filter(x => x.organization === org)
    const completed  = s.filter(x => x.status === 'completed').length
    const inProgress = s.filter(x => x.status === 'in_progress').length
    const overdue    = s.filter(x => x.status === 'overdue').length
    const rate       = s.length ? Math.round((completed / s.length) * 100) : 0
    return { org, total: s.length, completed, inProgress, overdue, rate }
  })

  const kpiSection = (ctx: KpiContext, registry: MetricDef[]) => (
    <KpiSection
      variant="tab"
      context={ctx}
      metrics={registry}
      activeIds={config[ctx]}
      data={data}
      onAdd={id => addMetric(ctx, id)}
      onRemove={id => removeMetric(ctx, id)}
      onReset={() => resetContext(ctx)}
    />
  )

  return (
    <div className="space-y-5">
      {modalSurvey && (
        <AssignModal
          survey={modalSurvey}
          onClose={() => setModalSurvey(null)}
          onConfirm={(id, assignee, dueDate) => { onAssign(id, assignee, dueDate); setModalSurvey(null) }}
        />
      )}

      <div className="grid grid-cols-1 gap-4">
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

      <DashboardTabs
        surveys={surveys} scans={scans} siteVisits={siteVisits} sites={sites}
        tabKpis={{ surveys: kpiSection('surveys', SURVEY_METRICS), scans: kpiSection('scans', SCAN_METRICS), site_visits: kpiSection('site_visits', VISIT_METRICS), sites: kpiSection('sites', SITE_METRICS) }}
        showOrgColumn={orgFilter === 'all'}
        onSelectSurvey={onSelectSurvey}
        onAssign={setModalSurvey}
        onCreateSiteVisit={onCreateSiteVisit}
        onDeleteSiteVisit={onDeleteSiteVisit}
        onTakeOnVisit={onTakeOnSiteVisit}
      />
    </div>
  )
}

// ─── PM View ────────────────────────────────────────────────────────────────

const PM_NAME = 'Susan Smith'

function PMView({ orgFilter, surveys: allSurveys, allSiteVisits, onAssign, onSelectSurvey, onCreateSiteVisit, onDeleteSiteVisit, onTakeOnSiteVisit }: RoleViewProps) {
  const [pmMode, setPmMode] = useState<'assign' | 'my_work'>('assign')
  const { config, addMetric, removeMetric, resetContext } = useKpiConfig('pm', { surveys: [], scans: [], site_visits: [], sites: [] })
  const applyOrg = <T extends { organization: string }>(arr: T[]) =>
    orgFilter === 'all' ? arr : arr.filter(s => s.organization === orgFilter)

  const surveys    = applyOrg(allSurveys.filter(s => ORG_FILTER.includes(s.organization)))
  const myWork     = surveys.filter(s => s.assignee === PM_NAME)
  const scans      = applyOrg(ORG_SCANS)
  const siteVisits = applyOrg(allSiteVisits.filter(s => ORG_FILTER.includes(s.organization)))
  const sites      = applyOrg(ORG_SITES)

  // KPI data scopes to personal work in My Work mode
  const kpiSurveys = pmMode === 'my_work' ? myWork : surveys
  const data: KpiData = { surveys: kpiSurveys, scans, siteVisits, sites }

  const myActiveCount = myWork.filter(s => s.status !== 'completed').length

  const kpiSection = (ctx: KpiContext, registry: MetricDef[]) => (
    <KpiSection
      variant="tab"
      context={ctx}
      metrics={registry}
      activeIds={config[ctx]}
      data={data}
      onAdd={id => addMetric(ctx, id)}
      onRemove={id => removeMetric(ctx, id)}
      onReset={() => resetContext(ctx)}
    />
  )

  const surveysContent = pmMode === 'assign'
    ? <PMSurveysContent surveys={surveys} onAssign={onAssign} onSelectSurvey={onSelectSurvey} onCreateSiteVisit={onCreateSiteVisit} />
    : <TechSurveysContent surveys={myWork} onSelectSurvey={onSelectSurvey} onCreateSiteVisit={onCreateSiteVisit} />

  return (
    <div className="space-y-5">
      {/* Mode switcher */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 w-fit">
        <button
          onClick={() => setPmMode('assign')}
          className={[
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            pmMode === 'assign'
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary',
          ].join(' ')}
        >
          <Users size={14} />
          Assign Work
        </button>
        <button
          onClick={() => setPmMode('my_work')}
          className={[
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            pmMode === 'my_work'
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary',
          ].join(' ')}
        >
          <UserCheck size={14} />
          My Work
          {myActiveCount > 0 && (
            <span className={[
              'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none',
              pmMode === 'my_work' ? 'bg-white/20 text-white' : 'bg-accent/15 text-accent',
            ].join(' ')}>
              {myActiveCount}
            </span>
          )}
        </button>
      </div>

      <DashboardTabs
        surveys={pmMode === 'my_work' ? myWork : surveys}
        scans={scans}
        siteVisits={siteVisits}
        sites={sites}
        customSurveysContent={surveysContent}
        tabKpis={{ surveys: kpiSection('surveys', SURVEY_METRICS), scans: kpiSection('scans', SCAN_METRICS), site_visits: kpiSection('site_visits', VISIT_METRICS), sites: kpiSection('sites', SITE_METRICS) }}
        showOrgColumn={orgFilter === 'all'}
        onSelectSurvey={onSelectSurvey}
        onCreateSiteVisit={onCreateSiteVisit}
        onDeleteSiteVisit={onDeleteSiteVisit}
        onTakeOnVisit={onTakeOnSiteVisit}
      />
    </div>
  )
}

// ─── Technician View (Mike) ─────────────────────────────────────────────────

function TechnicianView({ orgFilter, surveys: allSurveys, allSiteVisits, onAssign: _onAssign, onSelectSurvey, onCreateSiteVisit, onDeleteSiteVisit, onTakeOnSiteVisit }: RoleViewProps) {
  const { config, addMetric, removeMetric, resetContext } = useKpiConfig('qc_technician', { surveys: [], scans: [], site_visits: [], sites: [] })
  const applyOrg = <T extends { organization: string }>(arr: T[]) =>
    orgFilter === 'all' ? arr : arr.filter(s => s.organization === orgFilter)

  const surveys    = applyOrg(allSurveys.filter(s => s.assignee === 'Mike McGuire'))
  const scans      = applyOrg(MIKE_SCANS)
  // Show own visits + any open (unassigned, scheduled) visits so technician can take them on
  const siteVisits = applyOrg(allSiteVisits.filter(v => v.assignee === 'Mike McGuire' || (!v.assignee && v.status === 'scheduled')))
  const sites      = applyOrg(MIKE_SITES)
  const data: KpiData = { surveys, scans, siteVisits, sites }

  const kpiSection = (ctx: KpiContext, registry: MetricDef[]) => (
    <KpiSection
      variant="tab"
      context={ctx}
      metrics={registry}
      activeIds={config[ctx]}
      data={data}
      onAdd={id => addMetric(ctx, id)}
      onRemove={id => removeMetric(ctx, id)}
      onReset={() => resetContext(ctx)}
    />
  )

  return (
    <div className="space-y-5">
      <DashboardTabs
        surveys={surveys}
        scans={scans}
        siteVisits={siteVisits}
        sites={sites}
        customSurveysContent={<TechSurveysContent surveys={surveys} onSelectSurvey={onSelectSurvey} onCreateSiteVisit={onCreateSiteVisit} />}
        tabKpis={{ surveys: kpiSection('surveys', SURVEY_METRICS), scans: kpiSection('scans', SCAN_METRICS), site_visits: kpiSection('site_visits', VISIT_METRICS), sites: kpiSection('sites', SITE_METRICS) }}
        showOrgColumn={orgFilter === 'all'}
        onSelectSurvey={onSelectSurvey}
        onCreateSiteVisit={onCreateSiteVisit}
        onDeleteSiteVisit={onDeleteSiteVisit}
        onTakeOnVisit={onTakeOnSiteVisit}
      />
    </div>
  )
}

// ─── QC Technician 2 View (John) ────────────────────────────────────────────

function QcTech2View({ orgFilter, surveys: allSurveys, allSiteVisits, onAssign: _onAssign, onSelectSurvey, onCreateSiteVisit, onDeleteSiteVisit, onTakeOnSiteVisit }: RoleViewProps) {
  const { config, addMetric, removeMetric, resetContext } = useKpiConfig('qc_technician_2', { surveys: [], scans: [], site_visits: [], sites: [] })
  const applyOrg = <T extends { organization: string }>(arr: T[]) =>
    orgFilter === 'all' ? arr : arr.filter(s => s.organization === orgFilter)

  const surveys    = applyOrg(allSurveys.filter(s => s.assignee === 'John Smith'))
  const scans      = applyOrg(JOHN_SCANS)
  const siteVisits = applyOrg(allSiteVisits.filter(v => v.assignee === 'John Smith' || (!v.assignee && v.status === 'scheduled')))
  const sites      = applyOrg(JOHN_SITES)
  const data: KpiData = { surveys, scans, siteVisits, sites }

  const kpiSection = (ctx: KpiContext, registry: MetricDef[]) => (
    <KpiSection
      variant="tab"
      context={ctx}
      metrics={registry}
      activeIds={config[ctx]}
      data={data}
      onAdd={id => addMetric(ctx, id)}
      onRemove={id => removeMetric(ctx, id)}
      onReset={() => resetContext(ctx)}
    />
  )

  return (
    <div className="space-y-5">
      <DashboardTabs
        surveys={surveys}
        scans={scans}
        siteVisits={siteVisits}
        sites={sites}
        customSurveysContent={<TechSurveysContent surveys={surveys} showPriorityLock={true} onSelectSurvey={onSelectSurvey} onCreateSiteVisit={onCreateSiteVisit} />}
        tabKpis={{ surveys: kpiSection('surveys', SURVEY_METRICS), scans: kpiSection('scans', SCAN_METRICS), site_visits: kpiSection('site_visits', VISIT_METRICS), sites: kpiSection('sites', SITE_METRICS) }}
        showOrgColumn={orgFilter === 'all'}
        onSelectSurvey={onSelectSurvey}
        onCreateSiteVisit={onCreateSiteVisit}
        onDeleteSiteVisit={onDeleteSiteVisit}
        onTakeOnVisit={onTakeOnSiteVisit}
      />
    </div>
  )
}

// ─── ClickUp Views ───────────────────────────────────────────────────────────

interface CUViewProps {
  onCreateSiteVisit: (surveys: Survey | Survey[]) => void
  onSurveyLinked?: (register: (surveyIds: string[], visitId: string) => void) => void
  onDeleteSiteVisit: (visitId: string) => void
  onTakeOnSiteVisit: (visitId: string) => void
}

// ─── ClickUp PM View ────────────────────────────────────────────────────────

const CU_API = 'http://localhost:3001'
const CU_SURVEYS_LIST     = import.meta.env.VITE_CLICKUP_SURVEYS_LIST_ID     || 'mock_surveys'
const CU_SITE_VISITS_LIST = import.meta.env.VITE_CLICKUP_SITE_VISITS_LIST_ID || 'mock_site_visits'
const CU_PM_NAME   = 'Lucy Kien'
const CU_TECH_NAME = 'Mike McGuire'

interface CUStatus   { status: string; color: string; type: string }
interface CUAssignee { id: number; username: string; color: string; initials: string }
interface CUPriority { id: string; priority: string; color: string }
interface CUMember   { id: number; username: string; email: string; color: string; initials: string; profilePicture: string | null }
interface CUTask {
  id: string; name: string; status: CUStatus
  assignees: CUAssignee[]; due_date: string | null
  priority: CUPriority | null; url: string
  date_created?: string
  date_closed?: string | null
}
// Parse ClickUp task name: "{Customer} #{SiteID} ({SiteName}) {SurveyType} Submitted"
const CU_SURVEY_TYPE_MAP: Array<{ keyword: RegExp; displayName: string; scope: SurveyScope }> = [
  { keyword: /\bGuy\s+Facilities\b/i,    displayName: 'Guy Facilities Inspection',   scope: 'facilities'  },
  { keyword: /\bStructure\s+Climb\b/i,   displayName: 'Structure Climb Inspection',  scope: 'inspection'  },
  { keyword: /\bP&T\b|\bPlumb\b/i,       displayName: 'Plumb & Twist Inspection',    scope: 'inspection'  },
  { keyword: /\bCompound\b/i,            displayName: 'Compound Inspection',         scope: 'inspection'  },
  { keyword: /\bCOP\b/i,                 displayName: 'COP Inspection',              scope: 'cop'         },
  { keyword: /\bJSA\b/i,                 displayName: 'Job Safety Analysis',         scope: 'jsa'         },
]

function parseCUTaskName(raw: string): { displayName: string; siteId: string; siteName: string; organization: string; scope: SurveyScope } {
  const siteIdMatch  = raw.match(/#(\S+)/)
  const siteNameMatch = raw.match(/\(([^)]+)\)/)
  const orgMatch     = raw.match(/^([^#(]+)/)

  const siteId      = siteIdMatch  ? siteIdMatch[1].trim()  : '—'
  const siteName    = siteNameMatch ? siteNameMatch[1].trim() : '—'
  const organization = orgMatch    ? orgMatch[1].trim()      : '—'

  const matched = CU_SURVEY_TYPE_MAP.find(t => t.keyword.test(raw))
  return {
    displayName:  matched?.displayName ?? raw,
    scope:        matched?.scope       ?? 'inspection',
    siteId,
    siteName,
    organization,
  }
}

// Map ClickUp task → Survey shape
function cuTaskToSurvey(task: CUTask): Survey {
  const assigneeName = task.assignees[0]?.username ?? undefined
  const s = task.status.status.toLowerCase()
  let status: SurveyStatus
  if (s.includes('complete') || s.includes('done') || task.status.type === 'closed') {
    status = 'completed'
  } else if (s.includes('progress')) {
    status = 'in_progress'
  } else if (assigneeName) {
    status = 'pending'
  } else {
    status = 'unassigned'
  }
  if (status !== 'completed' && task.due_date && new Date(parseInt(task.due_date)) < new Date()) {
    status = 'overdue'
  }
  let priority: Priority = 'medium' // default: normal
  if (task.priority) {
    const p = task.priority.priority.toLowerCase()
    if (p === 'urgent' || p === 'high') priority = 'high'
    else if (p === 'low') priority = 'low'
    else priority = 'medium' // 'normal' and anything else → medium
  }
  const fmtDate = (ms: string) => new Date(parseInt(ms)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const parsed = parseCUTaskName(task.name)
  return {
    id: task.id,
    name: parsed.displayName,
    siteId: parsed.siteId,
    siteName: parsed.siteName,
    organization: parsed.organization,
    scope: parsed.scope,
    status,
    assignee: assigneeName,
    progress: status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0,
    createdDate: task.date_created ? fmtDate(task.date_created) : '—',
    completedDate: status === 'completed' && task.date_closed ? fmtDate(task.date_closed) : undefined,
    dueDate: task.due_date ? fmtDate(task.due_date) : undefined,
    priority,
  }
}

// Map ClickUp task → SiteVisit shape
function cuTaskToSiteVisit(task: CUTask): SiteVisit {
  const assigneeName = task.assignees[0]?.username ?? 'Unassigned'
  const s = task.status.status.toLowerCase()
  let status: VisitStatus
  if (s.includes('complete') || task.status.type === 'closed') status = 'completed'
  else if (s.includes('progress')) status = 'in_progress'
  else if (s.includes('cancel')) status = 'cancelled'
  else status = 'scheduled'
  const fmtDate = (ms: string) => new Date(parseInt(ms)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return {
    id: task.id,
    name: task.name,
    siteId: '—',
    siteName: '—',
    organization: 'ClickUp',
    scope: 'inspection',
    status,
    assignee: assigneeName,
    scheduledDate: task.due_date ? fmtDate(task.due_date) : '—',
    processed: status === 'completed',
    processedBy: status === 'completed' ? assigneeName : undefined,
  }
}


function ClickUpPMView({ onCreateSiteVisit, onSurveyLinked, onDeleteSiteVisit, onTakeOnSiteVisit }: CUViewProps) {
  const [pmMode, setPmMode] = useState<'assign' | 'my_work'>('assign')
  const [surveys, setSurveys]           = useState<Survey[]>([])
  const [siteVisits, setSiteVisits]     = useState<SiteVisit[]>([])
  const [cuMembers, setCuMembers]       = useState<CUMember[]>([])
  const [cuClosedStatus, setCuClosedStatus] = useState<string>('complete') // actual ClickUp done-status name
  const [loading, setLoading]           = useState(false)
  const [source, setSource]             = useState<'clickup' | 'mock' | null>(null)
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)
  const [selectedOrg, setSelectedOrg]   = useState<string>('all')

  useEffect(() => {
    if (onSurveyLinked) {
      onSurveyLinked((surveyIds, visitId) => {
        setSurveys(prev => prev.map(s => surveyIds.includes(s.id) ? { ...s, siteVisitId: visitId } : s))
      })
    }
  }, [onSurveyLinked])

  const deleteSiteVisitLocal = useCallback((visitId: string) => {
    setSiteVisits(prev => prev.filter(v => v.id !== visitId))
    setSurveys(prev => prev.map(s =>
      s.siteVisitId === visitId ? { ...s, status: 'unassigned' as const, siteVisitId: undefined } : s
    ))
    onDeleteSiteVisit(visitId)
  }, [onDeleteSiteVisit])

  // Fetch tasks + members + list statuses in parallel on mount
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sr, vr, mr, lr] = await Promise.all([
        fetch(`${CU_API}/api/clickup/lists/${CU_SURVEYS_LIST}/tasks`),
        fetch(`${CU_API}/api/clickup/lists/${CU_SITE_VISITS_LIST}/tasks`),
        fetch(`${CU_API}/api/clickup/lists/${CU_SURVEYS_LIST}/members`),
        fetch(`${CU_API}/api/clickup/lists/${CU_SURVEYS_LIST}`),
      ])
      const sd = await sr.json() as { tasks: CUTask[]; source: 'clickup' | 'mock' }
      const vd = await vr.json() as { tasks: CUTask[]; source: 'clickup' | 'mock' }
      const md = await mr.json() as { members: CUMember[]; source: 'clickup' | 'mock' }
      const ld = await lr.json() as { statuses?: CUStatus[]; source: 'clickup' | 'mock' }
      const freshSurveys = (sd.tasks ?? []).map(cuTaskToSurvey)
      const freshVisits = (vd.tasks ?? []).map(cuTaskToSiteVisit)
      const freshVisitIds = new Set(freshVisits.map(v => v.id))
      setSurveys(prev => {
        const merged = freshSurveys.map(fs => {
          const existing = prev.find(p => p.id === fs.id)
          if (existing?.siteVisitId && !freshVisitIds.has(existing.siteVisitId)) {
            return { ...fs, status: 'unassigned' as const, siteVisitId: undefined }
          }
          return existing?.siteVisitId ? { ...fs, siteVisitId: existing.siteVisitId } : fs
        })
        return merged
      })
      setSiteVisits(freshVisits)
      setCuMembers(md.members ?? [])
      // Find the workspace's actual "done" status (type === 'closed')
      const closedStatus = (ld.statuses ?? []).find(s => s.type === 'closed')
      if (closedStatus) setCuClosedStatus(closedStatus.status)
      setSource(sd.source)
    } catch (e) { console.error('ClickUp fetch failed', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const cuOrgs = Array.from(new Set(surveys.map(s => s.organization))).filter(Boolean)
  const filteredSurveys    = selectedOrg === 'all' ? surveys    : surveys.filter(s => s.organization === selectedOrg)
  const filteredSiteVisits = selectedOrg === 'all' ? siteVisits : siteVisits.filter(v => v.organization === selectedOrg)

  // onAssign: optimistic update + real-time write to ClickUp
  const onAssign = useCallback((surveyId: string, assignee: string, dueDate: string | null) => {
    // Optimistic local update
    setSurveys(prev => prev.map(s =>
      s.id === surveyId
        ? { ...s, assignee, status: s.status === 'unassigned' ? 'pending' : s.status, ...(dueDate !== null ? { dueDate } : {}) }
        : s
    ))

    // Build ClickUp PUT body
    const body: Record<string, unknown> = {}

    // Resolve new assignee's ClickUp user ID
    const newMember = cuMembers.find(m => m.username === assignee)
    if (newMember) {
      // Find previous assignee to remove
      const prevSurvey = surveys.find(s => s.id === surveyId)
      const prevMember = prevSurvey?.assignee ? cuMembers.find(m => m.username === prevSurvey.assignee) : undefined
      body.assignees = { add: [newMember.id], ...(prevMember ? { rem: [prevMember.id] } : {}) }
    }

    // Convert due date string to Unix ms for ClickUp
    if (dueDate !== null) {
      const ms = new Date(dueDate).getTime()
      if (!isNaN(ms)) body.due_date = ms
    }

    if (Object.keys(body).length > 0) {
      fetch(`${CU_API}/api/clickup/tasks/${surveyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(e => console.error('ClickUp write-back failed', e))
    }
  }, [cuMembers, surveys])

  const onMarkCompleteCU = useCallback((id: string) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    setSurveys(prev => prev.map(s => s.id === id ? { ...s, status: 'completed', progress: 100, completedDate: today } : s))
    fetch(`${CU_API}/api/clickup/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: cuClosedStatus }),
    }).catch(e => console.error('ClickUp complete write-back failed', e))
  }, [cuClosedStatus])

  const onUpdateSurveyCU = useCallback((id: string, updates: Partial<Survey>) => {
    setSurveys(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    const body: Record<string, unknown> = {}
    if (updates.status) body.status = updates.status === 'completed' ? cuClosedStatus : updates.status.replace('_', ' ')
    if (updates.dueDate) {
      const ms = new Date(updates.dueDate).getTime()
      if (!isNaN(ms)) body.due_date = ms
    }
    if (Object.keys(body).length > 0) {
      fetch(`${CU_API}/api/clickup/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(e => console.error('ClickUp update write-back failed', e))
    }
  }, [cuClosedStatus])

  const selectedCUSurvey = selectedSurveyId ? filteredSurveys.find(s => s.id === selectedSurveyId) ?? null : null

  const myWork = filteredSurveys.filter(s => s.assignee === CU_PM_NAME)
  const myActiveCount = myWork.filter(s => s.status !== 'completed').length
  const displaySurveys = pmMode === 'my_work' ? myWork : filteredSurveys

  // Connection banner — tiny, above mode switcher
  const banner = source ? (
    <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg w-fit border mb-4 ${
      source === 'clickup'
        ? 'bg-green-500/8 border-green-500/20 text-green-400'
        : 'bg-violet-400/8 border-violet-400/20 text-violet-400'
    }`}>
      {source === 'clickup'
        ? <><CheckCircle2 size={11} /> Live from ClickUp</>
        : <><Wifi size={11} /> Demo mode — add CLICKUP_API_KEY to .env</>}
    </div>
  ) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm gap-2">
        <RefreshCw size={14} className="animate-spin" /> Loading from ClickUp…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {selectedCUSurvey && (
        <SurveyDetailPage
          survey={selectedCUSurvey}
          onClose={() => setSelectedSurveyId(null)}
          onMarkComplete={onMarkCompleteCU}
          onUpdate={onUpdateSurveyCU}
        />
      )}

      {banner}

      {/* Org switcher */}
      {cuOrgs.length > 0 && (
        <div className="flex justify-end">
          <OrgSwitcher orgs={cuOrgs} value={selectedOrg} onChange={setSelectedOrg} allowAll={true} allLabel="FieldSync" />
        </div>
      )}

      {/* Mode switcher */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 w-fit">
        <button
          onClick={() => setPmMode('assign')}
          className={['flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            pmMode === 'assign' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary',
          ].join(' ')}
        >
          <Users size={14} />
          Assign Work
        </button>
        <button
          onClick={() => setPmMode('my_work')}
          className={['flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            pmMode === 'my_work' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary',
          ].join(' ')}
        >
          <UserCheck size={14} />
          My Work
          {myActiveCount > 0 && (
            <span className={['text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none',
              pmMode === 'my_work' ? 'bg-white/20 text-white' : 'bg-accent/15 text-accent',
            ].join(' ')}>
              {myActiveCount}
            </span>
          )}
        </button>
      </div>

      <DashboardTabs
        surveys={displaySurveys}
        scans={ORG_SCANS}
        siteVisits={filteredSiteVisits}
        sites={ORG_SITES}
        customSurveysContent={
          pmMode === 'assign'
            ? <PMSurveysContent surveys={filteredSurveys} onAssign={onAssign} cuMembers={cuMembers} onSelectSurvey={setSelectedSurveyId} onCreateSiteVisit={onCreateSiteVisit} />
            : undefined
        }
        onSelectSurvey={setSelectedSurveyId}
        showOrgColumn={false}
        onCreateSiteVisit={onCreateSiteVisit}
        onDeleteSiteVisit={deleteSiteVisitLocal}
        onTakeOnVisit={onTakeOnSiteVisit}
      />
    </div>
  )
}

// ─── ClickUp Technician View (Mike McGuire) ──────────────────────────────────

function ClickUpTechView({ onCreateSiteVisit, onSurveyLinked, onDeleteSiteVisit, onTakeOnSiteVisit }: CUViewProps) {
  const [surveys, setSurveys]           = useState<Survey[]>([])
  const [siteVisits, setSiteVisits]     = useState<SiteVisit[]>([])
  const [cuClosedStatus, setCuClosedStatus] = useState<string>('complete')
  const [loading, setLoading]           = useState(false)
  const [source, setSource]             = useState<'clickup' | 'mock' | null>(null)
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)
  const [selectedOrg, setSelectedOrg]   = useState<string>('')
  const { config, addMetric, removeMetric, resetContext } = useKpiConfig('clickup_technician', { surveys: [], scans: [], site_visits: [], sites: [] })

  useEffect(() => {
    if (onSurveyLinked) {
      onSurveyLinked((surveyIds, visitId) => {
        setSurveys(prev => prev.map(s => surveyIds.includes(s.id) ? { ...s, siteVisitId: visitId } : s))
      })
    }
  }, [onSurveyLinked])

  const deleteSiteVisitLocal = useCallback((visitId: string) => {
    setSiteVisits(prev => prev.filter(v => v.id !== visitId))
    setSurveys(prev => prev.map(s =>
      s.siteVisitId === visitId ? { ...s, status: 'unassigned' as const, siteVisitId: undefined } : s
    ))
    onDeleteSiteVisit(visitId)
  }, [onDeleteSiteVisit])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sr, vr, lr] = await Promise.all([
        fetch(`${CU_API}/api/clickup/lists/${CU_SURVEYS_LIST}/tasks`),
        fetch(`${CU_API}/api/clickup/lists/${CU_SITE_VISITS_LIST}/tasks`),
        fetch(`${CU_API}/api/clickup/lists/${CU_SURVEYS_LIST}`),
      ])
      const sd = await sr.json() as { tasks: CUTask[]; source: 'clickup' | 'mock' }
      const vd = await vr.json() as { tasks: CUTask[]; source: 'clickup' | 'mock' }
      const ld = await lr.json() as { statuses?: CUStatus[]; source: 'clickup' | 'mock' }
      const freshSurveys = (sd.tasks ?? []).map(cuTaskToSurvey)
      const freshVisits = (vd.tasks ?? []).map(cuTaskToSiteVisit)
      const freshVisitIds = new Set(freshVisits.map(v => v.id))
      setSurveys(prev => {
        const merged = freshSurveys.map(fs => {
          const existing = prev.find(p => p.id === fs.id)
          if (existing?.siteVisitId && !freshVisitIds.has(existing.siteVisitId)) {
            return { ...fs, status: 'unassigned' as const, siteVisitId: undefined }
          }
          return existing?.siteVisitId ? { ...fs, siteVisitId: existing.siteVisitId } : fs
        })
        return merged
      })
      setSiteVisits(freshVisits)
      const closedStatus = (ld.statuses ?? []).find(s => s.type === 'closed')
      if (closedStatus) setCuClosedStatus(closedStatus.status)
      setSource(sd.source)
    } catch (e) { console.error('ClickUp fetch failed', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const onMarkComplete = useCallback((id: string) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    setSurveys(prev => prev.map(s => s.id === id ? { ...s, status: 'completed', progress: 100, completedDate: today } : s))
    fetch(`${CU_API}/api/clickup/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: cuClosedStatus }),
    }).catch(e => console.error('ClickUp complete write-back failed', e))
  }, [cuClosedStatus])

  const onUpdate = useCallback((id: string, updates: Partial<Survey>) => {
    setSurveys(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    const body: Record<string, unknown> = {}
    if (updates.status) body.status = updates.status === 'completed' ? cuClosedStatus : updates.status.replace('_', ' ')
    if (updates.dueDate) {
      const ms = new Date(updates.dueDate).getTime()
      if (!isNaN(ms)) body.due_date = ms
    }
    if (Object.keys(body).length > 0) {
      fetch(`${CU_API}/api/clickup/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(e => console.error('ClickUp update write-back failed', e))
    }
  }, [cuClosedStatus])

  // Auto-select first org (prefer FieldSync) once surveys load — tech is locked to one org
  useEffect(() => {
    if (surveys.length > 0 && !selectedOrg) {
      const orgs = Array.from(new Set(surveys.map(s => s.organization))).filter(Boolean)
      const pref = orgs.find(o => o.toLowerCase().includes('fieldsync')) ?? orgs[0] ?? ''
      setSelectedOrg(pref)
    }
  }, [surveys, selectedOrg])

  // Filter to Mike's tasks, scoped to selected org
  const mySurveys    = surveys.filter(s => s.assignee === CU_TECH_NAME && (!selectedOrg || s.organization === selectedOrg))
  const mySiteVisits = siteVisits.filter(v => v.assignee === CU_TECH_NAME && (!selectedOrg || v.organization === selectedOrg))
  const data: KpiData = { surveys: mySurveys, scans: MIKE_SCANS, siteVisits: mySiteVisits, sites: MIKE_SITES }

  const kpiSection = (ctx: KpiContext, registry: MetricDef[]) => (
    <KpiSection
      variant="tab"
      context={ctx}
      metrics={registry}
      activeIds={config[ctx]}
      data={data}
      onAdd={id => addMetric(ctx, id)}
      onRemove={id => removeMetric(ctx, id)}
      onReset={() => resetContext(ctx)}
    />
  )

  const selectedSurvey = selectedSurveyId ? mySurveys.find(s => s.id === selectedSurveyId) ?? null : null

  const banner = source ? (
    <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg w-fit border mb-4 ${
      source === 'clickup'
        ? 'bg-green-500/8 border-green-500/20 text-green-400'
        : 'bg-violet-400/8 border-violet-400/20 text-violet-400'
    }`}>
      {source === 'clickup'
        ? <><CheckCircle2 size={11} /> Live from ClickUp</>
        : <><Wifi size={11} /> Demo mode — add CLICKUP_API_KEY to .env</>}
    </div>
  ) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm gap-2">
        <RefreshCw size={14} className="animate-spin" /> Loading from ClickUp…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {selectedSurvey && (
        <SurveyDetailPage
          survey={selectedSurvey}
          onClose={() => setSelectedSurveyId(null)}
          onMarkComplete={onMarkComplete}
          onUpdate={onUpdate}
        />
      )}
      {banner}

      {/* Org label — tech is locked to one org */}
      {selectedOrg && (
        <div className="flex items-center gap-2">
          <Building2 size={13} className="text-accent" />
          <span className="text-text-secondary text-xs">Viewing:</span>
          <span className="text-text-primary text-xs font-medium">{selectedOrg}</span>
        </div>
      )}

      <DashboardTabs
        surveys={mySurveys}
        scans={MIKE_SCANS}
        siteVisits={mySiteVisits}
        sites={MIKE_SITES}
        customSurveysContent={<TechSurveysContent surveys={mySurveys} onSelectSurvey={setSelectedSurveyId} onCreateSiteVisit={onCreateSiteVisit} />}
        tabKpis={{ surveys: kpiSection('surveys', SURVEY_METRICS), scans: kpiSection('scans', SCAN_METRICS), site_visits: kpiSection('site_visits', VISIT_METRICS), sites: kpiSection('sites', SITE_METRICS) }}
        showOrgColumn={false}
        onSelectSurvey={setSelectedSurveyId}
        onCreateSiteVisit={onCreateSiteVisit}
        onDeleteSiteVisit={deleteSiteVisitLocal}
        onTakeOnVisit={onTakeOnSiteVisit}
      />
    </div>
  )
}

// ─── ClickUp Org Owner View (Daniel Valencia) ────────────────────────────────

function ClickUpOrgOwnerView({ onCreateSiteVisit, onSurveyLinked, onDeleteSiteVisit, onTakeOnSiteVisit }: CUViewProps) {
  const [surveys, setSurveys]           = useState<Survey[]>([])
  const [siteVisits, setSiteVisits]     = useState<SiteVisit[]>([])
  const [loading, setLoading]           = useState(false)
  const [source, setSource]             = useState<'clickup' | 'mock' | null>(null)
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)
  const [selectedOrg, setSelectedOrg]   = useState<string>('all')

  useEffect(() => {
    if (onSurveyLinked) {
      onSurveyLinked((surveyIds, visitId) => {
        setSurveys(prev => prev.map(s => surveyIds.includes(s.id) ? { ...s, siteVisitId: visitId } : s))
      })
    }
  }, [onSurveyLinked])

  const deleteSiteVisitLocal = useCallback((visitId: string) => {
    setSiteVisits(prev => prev.filter(v => v.id !== visitId))
    setSurveys(prev => prev.map(s =>
      s.siteVisitId === visitId ? { ...s, status: 'unassigned' as const, siteVisitId: undefined } : s
    ))
    onDeleteSiteVisit(visitId)
  }, [onDeleteSiteVisit])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sr, vr] = await Promise.all([
        fetch(`${CU_API}/api/clickup/lists/${CU_SURVEYS_LIST}/tasks`),
        fetch(`${CU_API}/api/clickup/lists/${CU_SITE_VISITS_LIST}/tasks`),
      ])
      const sd = await sr.json() as { tasks: CUTask[]; source: 'clickup' | 'mock' }
      const vd = await vr.json() as { tasks: CUTask[]; source: 'clickup' | 'mock' }
      const freshSurveys = (sd.tasks ?? []).map(cuTaskToSurvey)
      const freshVisits = (vd.tasks ?? []).map(cuTaskToSiteVisit)
      const freshVisitIds = new Set(freshVisits.map(v => v.id))
      setSurveys(prev => {
        const merged = freshSurveys.map(fs => {
          const existing = prev.find(p => p.id === fs.id)
          if (existing?.siteVisitId && !freshVisitIds.has(existing.siteVisitId)) {
            return { ...fs, status: 'unassigned' as const, siteVisitId: undefined }
          }
          return existing?.siteVisitId ? { ...fs, siteVisitId: existing.siteVisitId } : fs
        })
        return merged
      })
      setSiteVisits(freshVisits)
      setSource(sd.source)
    } catch (e) { console.error('ClickUp fetch failed', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const orgs = Array.from(new Set(surveys.map(s => s.organization))).filter(Boolean)
  const filteredSurveys    = selectedOrg === 'all' ? surveys    : surveys.filter(s => s.organization === selectedOrg)
  const filteredSiteVisits = selectedOrg === 'all' ? siteVisits : siteVisits.filter(v => v.organization === selectedOrg)

  const selectedSurvey = selectedSurveyId ? filteredSurveys.find(s => s.id === selectedSurveyId) ?? null : null

  // Health summary — single FieldSync aggregate card
  const fieldSyncStats = {
    label:      selectedOrg === 'all' ? 'FieldSync' : selectedOrg,
    total:      filteredSurveys.length,
    unassigned: filteredSurveys.filter(x => x.status === 'unassigned').length,
    inProgress: filteredSurveys.filter(x => x.status === 'in_progress').length,
    completed:  filteredSurveys.filter(x => x.status === 'completed').length,
    overdue:    filteredSurveys.filter(x => x.status === 'overdue').length,
  }
  const banner = source ? (
    <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg w-fit border mb-4 ${
      source === 'clickup'
        ? 'bg-green-500/8 border-green-500/20 text-green-400'
        : 'bg-violet-400/8 border-violet-400/20 text-violet-400'
    }`}>
      {source === 'clickup'
        ? <><CheckCircle2 size={11} /> Live from ClickUp</>
        : <><Wifi size={11} /> Demo mode — add CLICKUP_API_KEY to .env</>}
    </div>
  ) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm gap-2">
        <RefreshCw size={14} className="animate-spin" /> Loading from ClickUp…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {selectedSurvey && (
        <SurveyDetailPage
          survey={selectedSurvey}
          onClose={() => setSelectedSurveyId(null)}
          onMarkComplete={() => {}}
          onUpdate={() => {}}
        />
      )}
      {banner}

      {orgs.length > 0 && (
        <div className="flex justify-end">
          <OrgSwitcher orgs={orgs} value={selectedOrg} onChange={setSelectedOrg} allowAll={true} allLabel="FieldSync" />
        </div>
      )}

      {/* Org health summary card — selected org only */}
      {/* FieldSync aggregate health card */}
      {filteredSurveys.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-accent shrink-0" />
            <span className="text-text-primary text-sm font-semibold">{fieldSyncStats.label}</span>
            <span className="ml-auto text-[11px] text-text-muted font-medium">{fieldSyncStats.total} surveys</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Unassigned', value: fieldSyncStats.unassigned, color: 'text-text-muted' },
              { label: 'In Progress', value: fieldSyncStats.inProgress, color: 'text-blue-400' },
              { label: 'Completed',  value: fieldSyncStats.completed,  color: 'text-emerald-400' },
              { label: 'Overdue',    value: fieldSyncStats.overdue,    color: 'text-red-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-surface rounded-lg p-2">
                <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-text-muted leading-tight">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DashboardTabs
        surveys={filteredSurveys}
        scans={ORG_SCANS}
        siteVisits={filteredSiteVisits}
        sites={ORG_SITES}
        showOrgColumn={false}
        onSelectSurvey={setSelectedSurveyId}
        onCreateSiteVisit={onCreateSiteVisit}
        onDeleteSiteVisit={deleteSiteVisitLocal}
        onTakeOnVisit={onTakeOnSiteVisit}
      />
    </div>
  )
}

// ─── ClickUp Admin View (Pryce Valencia) ─────────────────────────────────────

function ClickUpAdminView({ onCreateSiteVisit, onSurveyLinked, onDeleteSiteVisit, onTakeOnSiteVisit }: CUViewProps) {
  const [surveys, setSurveys]           = useState<Survey[]>([])
  const [siteVisits, setSiteVisits]     = useState<SiteVisit[]>([])
  const [cuMembers, setCuMembers]       = useState<CUMember[]>([])
  const [cuClosedStatus, setCuClosedStatus] = useState<string>('complete')
  const [loading, setLoading]           = useState(false)
  const [source, setSource]             = useState<'clickup' | 'mock' | null>(null)
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)
  const [selectedOrg, setSelectedOrg]   = useState<string>('all')

  useEffect(() => {
    if (onSurveyLinked) {
      onSurveyLinked((surveyIds, visitId) => {
        setSurveys(prev => prev.map(s => surveyIds.includes(s.id) ? { ...s, siteVisitId: visitId } : s))
      })
    }
  }, [onSurveyLinked])

  const deleteSiteVisitLocal = useCallback((visitId: string) => {
    setSiteVisits(prev => prev.filter(v => v.id !== visitId))
    setSurveys(prev => prev.map(s =>
      s.siteVisitId === visitId ? { ...s, status: 'unassigned' as const, siteVisitId: undefined } : s
    ))
    onDeleteSiteVisit(visitId)
  }, [onDeleteSiteVisit])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sr, vr, mr, lr] = await Promise.all([
        fetch(`${CU_API}/api/clickup/lists/${CU_SURVEYS_LIST}/tasks`),
        fetch(`${CU_API}/api/clickup/lists/${CU_SITE_VISITS_LIST}/tasks`),
        fetch(`${CU_API}/api/clickup/lists/${CU_SURVEYS_LIST}/members`),
        fetch(`${CU_API}/api/clickup/lists/${CU_SURVEYS_LIST}`),
      ])
      const sd = await sr.json() as { tasks: CUTask[]; source: 'clickup' | 'mock' }
      const vd = await vr.json() as { tasks: CUTask[]; source: 'clickup' | 'mock' }
      const md = await mr.json() as { members: CUMember[]; source: 'clickup' | 'mock' }
      const ld = await lr.json() as { statuses?: CUStatus[]; source: 'clickup' | 'mock' }
      const freshSurveys = (sd.tasks ?? []).map(cuTaskToSurvey)
      const freshVisits = (vd.tasks ?? []).map(cuTaskToSiteVisit)
      const freshVisitIds = new Set(freshVisits.map(v => v.id))
      setSurveys(prev => {
        const merged = freshSurveys.map(fs => {
          const existing = prev.find(p => p.id === fs.id)
          if (existing?.siteVisitId && !freshVisitIds.has(existing.siteVisitId)) {
            return { ...fs, status: 'unassigned' as const, siteVisitId: undefined }
          }
          return existing?.siteVisitId ? { ...fs, siteVisitId: existing.siteVisitId } : fs
        })
        return merged
      })
      setSiteVisits(freshVisits)
      setCuMembers(md.members ?? [])
      const closedStatus = (ld.statuses ?? []).find(s => s.type === 'closed')
      if (closedStatus) setCuClosedStatus(closedStatus.status)
      setSource(sd.source)
    } catch (e) { console.error('ClickUp fetch failed', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const onAssign = useCallback((surveyId: string, assignee: string, dueDate: string | null) => {
    setSurveys(prev => prev.map(s =>
      s.id === surveyId
        ? { ...s, assignee, status: s.status === 'unassigned' ? 'pending' : s.status, ...(dueDate !== null ? { dueDate } : {}) }
        : s
    ))
    const body: Record<string, unknown> = {}
    const newMember = cuMembers.find(m => m.username === assignee)
    if (newMember) {
      const prevSurvey = surveys.find(s => s.id === surveyId)
      const prevMember = prevSurvey?.assignee ? cuMembers.find(m => m.username === prevSurvey.assignee) : undefined
      body.assignees = { add: [newMember.id], ...(prevMember ? { rem: [prevMember.id] } : {}) }
    }
    if (dueDate !== null) {
      const ms = new Date(dueDate).getTime()
      if (!isNaN(ms)) body.due_date = ms
    }
    if (Object.keys(body).length > 0) {
      fetch(`${CU_API}/api/clickup/tasks/${surveyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(e => console.error('ClickUp write-back failed', e))
    }
  }, [cuMembers, surveys])

  const onMarkComplete = useCallback((id: string) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    setSurveys(prev => prev.map(s => s.id === id ? { ...s, status: 'completed', progress: 100, completedDate: today } : s))
    fetch(`${CU_API}/api/clickup/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: cuClosedStatus }),
    }).catch(e => console.error('ClickUp complete write-back failed', e))
  }, [cuClosedStatus])

  const onUpdate = useCallback((id: string, updates: Partial<Survey>) => {
    setSurveys(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    const body: Record<string, unknown> = {}
    if (updates.status) body.status = updates.status === 'completed' ? cuClosedStatus : updates.status.replace('_', ' ')
    if (updates.dueDate) {
      const ms = new Date(updates.dueDate).getTime()
      if (!isNaN(ms)) body.due_date = ms
    }
    if (Object.keys(body).length > 0) {
      fetch(`${CU_API}/api/clickup/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(e => console.error('ClickUp update write-back failed', e))
    }
  }, [cuClosedStatus])

  const orgs = Array.from(new Set(surveys.map(s => s.organization))).filter(Boolean)
  const filteredSurveys    = !selectedOrg || selectedOrg === 'all' ? surveys    : surveys.filter(s => s.organization === selectedOrg)
  const filteredSiteVisits = !selectedOrg || selectedOrg === 'all' ? siteVisits : siteVisits.filter(v => v.organization === selectedOrg)

  const selectedSurvey = selectedSurveyId ? filteredSurveys.find(s => s.id === selectedSurveyId) ?? null : null

  // Top-level stats (filtered)
  const total      = filteredSurveys.length
  const unassigned = filteredSurveys.filter(s => s.status === 'unassigned').length
  const inProgress = filteredSurveys.filter(s => s.status === 'in_progress').length
  const completed  = filteredSurveys.filter(s => s.status === 'completed').length
  const overdue    = filteredSurveys.filter(s => s.status === 'overdue').length

  const banner = source ? (
    <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg w-fit border mb-4 ${
      source === 'clickup'
        ? 'bg-green-500/8 border-green-500/20 text-green-400'
        : 'bg-violet-400/8 border-violet-400/20 text-violet-400'
    }`}>
      {source === 'clickup'
        ? <><CheckCircle2 size={11} /> Live from ClickUp</>
        : <><Wifi size={11} /> Demo mode — add CLICKUP_API_KEY to .env</>}
    </div>
  ) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm gap-2">
        <RefreshCw size={14} className="animate-spin" /> Loading from ClickUp…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {selectedSurvey && (
        <SurveyDetailPage
          survey={selectedSurvey}
          onClose={() => setSelectedSurveyId(null)}
          onMarkComplete={onMarkComplete}
          onUpdate={onUpdate}
        />
      )}
      {banner}

      {/* Org switcher */}
      {orgs.length > 0 && (
        <div className="flex justify-end">
          <OrgSwitcher
            orgs={orgs}
            value={selectedOrg}
            onChange={setSelectedOrg}
            allowAll={true}
            allLabel="FieldSync"
          />
        </div>
      )}

      {/* Overview KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Surveys', value: total,      color: 'text-text-primary' },
          { label: 'Unassigned',    value: unassigned,  color: 'text-text-muted' },
          { label: 'In Progress',   value: inProgress,  color: 'text-blue-400' },
          { label: 'Completed',     value: completed,   color: 'text-emerald-400' },
          { label: 'Overdue',       value: overdue,     color: 'text-red-400' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-text-muted mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      <DashboardTabs
        surveys={filteredSurveys}
        scans={ORG_SCANS}
        siteVisits={filteredSiteVisits}
        sites={ORG_SITES}
        showOrgColumn={false}
        onSelectSurvey={setSelectedSurveyId}
        onCreateSiteVisit={onCreateSiteVisit}
        onDeleteSiteVisit={deleteSiteVisitLocal}
        onTakeOnVisit={onTakeOnSiteVisit}
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
  clickup_admin:       { subtitle: 'Full org-wide view of all ClickUp surveys, assignments, and status.' },
  clickup_org_owner:   { subtitle: 'Survey health and completion status across your organizations, live from ClickUp.' },
  clickup_pm:          { subtitle: 'Live task view sourced directly from ClickUp — surveys and site visits.' },
  clickup_technician:  { subtitle: 'Your assigned surveys and site visits, live from ClickUp.' },
}

const QADashboard: React.FC = () => {
  const { role } = useRole()
  const { subtitle } = ROLE_META[role] ?? ROLE_META['pm']
  const isAdmin = role === 'admin'
  const [orgFilter, setOrgFilter] = useState<string>(ROLE_ORGS[role]?.[0] ?? 'all')
  const [surveys, setSurveys] = useState<Survey[]>(ALL_SURVEYS)
  const [allSiteVisits, setAllSiteVisits] = useState<SiteVisit[]>(SITE_VISITS)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)

  // When role changes, reset to first permitted org (FieldSync Org for admin/org_owner)
  useEffect(() => {
    setOrgFilter(ROLE_ORGS[role]?.[0] ?? 'all')
  }, [role])

  const availableOrgs = ROLE_ORGS[role] ?? []

  const assignSurvey = (surveyId: string, assignee: string, dueDate: string | null) => {
    setSurveys(prev => {
      const survey = prev.find(s => s.id === surveyId)
      if (!survey) return prev
      const action  = survey.assignee ? 'reassigned to' : 'assigned to'
      const duePart = dueDate ? ` · due ${dueDate}` : ''
      const message = `"${survey.name}" ${action} ${assignee}${duePart}`
      const id = Date.now().toString()
      setToasts(t => [...t, { id, message }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
      return prev.map(s =>
        s.id === surveyId
          ? { ...s, assignee, status: s.status === 'unassigned' ? 'pending' : s.status, ...(dueDate !== null ? { dueDate } : {}) }
          : s
      )
    })
  }

  const onMarkComplete = (id: string) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    setSurveys(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'completed', progress: 100, completedDate: today } : s
    ))
  }

  const onUpdateSurvey = (id: string, updates: Partial<Survey>) => {
    setSurveys(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const [siteVisitModalSurveys, setSiteVisitModalSurveys] = useState<Survey[] | null>(null)

  const onSurveyLinkedRef = React.useRef<((surveyIds: string[], visitId: string) => void) | null>(null)

  const openSiteVisitModal = (input: Survey | Survey[]) => {
    setSiteVisitModalSurveys(Array.isArray(input) ? input : [input])
  }

  const handleSiteVisitSubmit = (opts: SiteVisitModalSubmit) => {
    const modalSurveys = siteVisitModalSurveys!
    const primary = modalSurveys[0]
    setSiteVisitModalSurveys(null)
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const surveyLabel = modalSurveys.length === 1 ? `"${primary.name}"` : `${modalSurveys.length} surveys`

    if (opts.existingVisitId) {
      // Link survey(s) to existing site visit
      const visit = allSiteVisits.find(v => v.id === opts.existingVisitId)
      const updates: Partial<SiteVisit> = {}
      if (opts.assignee) updates.assignee = opts.assignee
      if (opts.dueDate) updates.scheduledDate = opts.dueDate
      if (Object.keys(updates).length > 0) {
        setAllSiteVisits(prev => prev.map(v => v.id === opts.existingVisitId ? { ...v, ...updates } : v))
      }
      const linkedIds = modalSurveys.map(s => s.id)
      setSurveys(prev => prev.map(s => linkedIds.includes(s.id) ? { ...s, siteVisitId: opts.existingVisitId } : s))
      onSurveyLinkedRef.current?.(linkedIds, opts.existingVisitId!)
      const id = Date.now().toString()
      setToasts(t => [...t, { id, message: `${surveyLabel} added to "${visit?.name ?? 'site visit'}"` }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
    } else {
      // Create new site visit
      const visitName = opts.newVisitName ?? `${primary.siteName} Site Visit`
      const newVisit: SiteVisit = {
        id: `SV-NEW-${Date.now()}`,
        name: visitName,
        siteId: primary.siteId,
        siteName: primary.siteName,
        organization: primary.organization,
        scope: primary.scope,
        status: 'scheduled',
        assignee: opts.assignee,
        scheduledDate: opts.dueDate ?? today,
        processed: false,
      }
      setAllSiteVisits(prev => [newVisit, ...prev])
      const linkedIds = modalSurveys.map(s => s.id)
      setSurveys(prev => prev.map(s => linkedIds.includes(s.id) ? { ...s, siteVisitId: newVisit.id } : s))
      onSurveyLinkedRef.current?.(linkedIds, newVisit.id)
      const id = Date.now().toString()
      setToasts(t => [...t, { id, message: `Site visit created for ${surveyLabel} — available for anyone to take on` }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000)

      // Write back to ClickUp — fire and forget
      fetch(`${CU_API}/api/clickup/lists/${CU_SITE_VISITS_LIST}/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: visitName,
          description: `Site visit created from ${modalSurveys.length === 1 ? `survey: ${primary.name} (ID: ${primary.id})` : `${modalSurveys.length} surveys: ${modalSurveys.map(s => s.name).join(', ')}`}`,
          status: 'scheduled',
          ...(opts.dueDate ? { due_date: new Date(opts.dueDate).getTime() } : {}),
        }),
      }).catch(e => console.error('ClickUp site visit write-back failed', e))
    }
  }

  const takeOnSiteVisit = (visitId: string) => {
    const userName = ROLE_PERSONA_NAME[role] ?? 'Unknown'
    setAllSiteVisits(prev => prev.map(v =>
      v.id === visitId ? { ...v, assignee: userName, status: 'in_progress' } : v
    ))
    const visit = allSiteVisits.find(v => v.id === visitId)
    if (visit) {
      const id = Date.now().toString()
      setToasts(t => [...t, { id, message: `You've taken on "${visit.name}"` }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
    }
  }

  const deleteSiteVisit = (visitId: string) => {
    const visit = allSiteVisits.find(v => v.id === visitId)
    setAllSiteVisits(prev => prev.filter(v => v.id !== visitId))
    setSurveys(prev => prev.map(s =>
      s.siteVisitId === visitId ? { ...s, status: 'unassigned', siteVisitId: undefined } : s
    ))
    if (visit) {
      const id = Date.now().toString()
      setToasts(t => [...t, { id, message: `Site visit "${visit.name}" deleted — linked surveys unallocated` }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000)
    }
  }

  const viewProps = {
    orgFilter, surveys, allSiteVisits, onAssign: assignSurvey,
    onSelectSurvey: setSelectedSurveyId,
    onCreateSiteVisit: openSiteVisitModal,
    onDeleteSiteVisit: deleteSiteVisit,
    onTakeOnSiteVisit: takeOnSiteVisit,
  }

  const selectedSurvey = selectedSurveyId ? surveys.find(s => s.id === selectedSurveyId) ?? null : null

  return (
    <div className="max-w-7xl mx-auto w-full">
      {selectedSurvey && (
        <SurveyDetailPage
          survey={selectedSurvey}
          onClose={() => setSelectedSurveyId(null)}
          onMarkComplete={onMarkComplete}
          onUpdate={onUpdateSurvey}
        />
      )}
      <ToastStack toasts={toasts} />

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 shrink-0 mt-0.5">
            <ClipboardCheck className="text-accent" size={20} />
          </div>
          <div>
            <h1 className="text-text-primary text-2xl font-semibold leading-tight">QA Dashboard</h1>
            <p className="text-text-secondary text-sm mt-1">{subtitle}</p>
          </div>
        </div>

        {!role.startsWith('clickup_') && (
          <OrgSwitcher
            orgs={availableOrgs}
            value={orgFilter}
            onChange={setOrgFilter}
            allowAll={isAdmin}
          />
        )}
      </div>

      {role === 'admin'              && <AdminView       {...viewProps} />}
      {role === 'org_owner'          && <OrgOwnerView    {...viewProps} />}
      {role === 'pm'                 && <PMView           {...viewProps} />}
      {role === 'qc_technician'      && <TechnicianView  {...viewProps} />}
      {role === 'qc_technician_2'    && <QcTech2View     {...viewProps} />}
      {role === 'clickup_admin'      && <ClickUpAdminView      onCreateSiteVisit={openSiteVisitModal} onSurveyLinked={fn => { onSurveyLinkedRef.current = fn }} onDeleteSiteVisit={deleteSiteVisit} onTakeOnSiteVisit={takeOnSiteVisit} />}
      {role === 'clickup_org_owner'  && <ClickUpOrgOwnerView   onCreateSiteVisit={openSiteVisitModal} onSurveyLinked={fn => { onSurveyLinkedRef.current = fn }} onDeleteSiteVisit={deleteSiteVisit} onTakeOnSiteVisit={takeOnSiteVisit} />}
      {role === 'clickup_pm'         && <ClickUpPMView          onCreateSiteVisit={openSiteVisitModal} onSurveyLinked={fn => { onSurveyLinkedRef.current = fn }} onDeleteSiteVisit={deleteSiteVisit} onTakeOnSiteVisit={takeOnSiteVisit} />}
      {role === 'clickup_technician' && <ClickUpTechView         onCreateSiteVisit={openSiteVisitModal} onSurveyLinked={fn => { onSurveyLinkedRef.current = fn }} onDeleteSiteVisit={deleteSiteVisit} onTakeOnSiteVisit={takeOnSiteVisit} />}

      {siteVisitModalSurveys && (
        <AddToSiteVisitModal
          surveys={siteVisitModalSurveys}
          siteVisits={allSiteVisits}
          onClose={() => setSiteVisitModalSurveys(null)}
          onSubmit={handleSiteVisitSubmit}
        />
      )}
    </div>
  )
}

export default QADashboard
