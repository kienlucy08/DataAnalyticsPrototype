import React, { useState } from 'react'
import { Lightbulb, ChevronDown } from 'lucide-react'
import type { Role } from '../../context/RoleContext'

interface Suggestion {
  category: string
  questions: string[]
}

const SUGGESTIONS: Record<Role, Suggestion[]> = {
  admin: [
    {
      category: 'Organization Overview',
      questions: [
        'How many towers are there in each organization?',
        'What are the average number of deficiencies per site?',
        'List most common deficiencies by site location',
        'List all sites by location',
        'List all survey counts by organization',
        'What is the average number of scans per organization?',
        'What is the average number of files per scan?'
      ],
    },
    {
      category: 'Tower Analysis',
      questions: [
        'What is the average height of each tower type in the system?',
        'How many towers taller than 200 feet do not have a top beacon?',
        'How many towers need a TIA checkup (3 years for guyed, 5 for self-support/monopole)?',
        'What is the average distance between guy attachments on guyed towers?',
        'How many guy attachments on average are there on guyed towers?',
        'What is the typical number of guy wires anchored per anchor compound?',
        'What percentage of guy wires have a color marking on them?',
      ],
    },
    {
      category: 'Deficiencies & Safety',
      questions: [
        'What are the most common deficiencies across all organizations?',
        'How many priority 1 deficiencies are there across all surveys?',
        'What towers have safety climb deficiencies?',
        'What is the most common physical/health hazard identified in JSA surveys?',
        'What is the average height of deficiencies found on each tower type?',
        'List most common deficiencies by site location'
      ],
    },
    {
      category: 'Equipment & Carriers',
      questions: [
        'What carrier has the most coax feedlines on average per tower?',
        'How many sectors on average are captured in service close-out package surveys?',
        'What is the most common sector used in service close-out package surveys?',
        'How many flags are there total across all organizations?',
      ],
    },
    {
      category: 'Survey Performance',
      questions: [
        'What is the average time to complete each survey type?',
        'Who is the most productive inspection technician for each organization? Provide statistics.',
        'How many survey are in progress per organization?',
        'How many sites are in need of inspections per organization?'
      ],
    },
  ],

  pm: [
    {
      category: 'FieldSync Organization',
      questions: [
        'How many towers are in FieldSync Organization?',
        'What are the most common deficiencies in FieldSync Organization?',
        'How many priority 1 deficiencies are there in FieldSync Organization?',
        'What towers in FieldSync Organization have safety climb deficiencies?',
        'How many towers in FieldSync Organization need a TIA checkup?',
        'How many scans exist in FieldSync Organization?',
        'How many flags are there in FieldSync Organization?',
      ],
    },
    {
      category: 'Test Organization',
      questions: [
        'How many towers are in Test?',
        'What are the most common deficiencies in Test?',
        'How many priority 1 deficiencies are there in Test?',
        'How many towers in Test need a TIA checkup?',
        'How many scans exist in Test?',
      ],
    },
    {
      category: 'Tower & Survey Analysis',
      questions: [
        'What is the average height of each tower type in FieldSync Organization?',
        'What is the typical number of guy wires per anchor compound in FieldSync Organization?',
        'What percentage of guy wires have a color marking in FieldSync Organization?',
        'What is the average time to complete a survey in FieldSync Organization?',
        'List all inspections in FieldSync Organization sorted by geographical location',
        'What is the average height of deficiencies on each tower type in FieldSync Organization?',
      ],
    },
    {
      category: 'Equipment',
      questions: [
        'What carrier has the most coax feedlines per tower in FieldSync Organization?',
        'How many sectors on average are captured in service close-out surveys in FieldSync Organization?',
        'What is the most common sector used in FieldSync Organization surveys?',
      ],
    },
  ],

  technician: [
    {
      category: 'My Survey Activity',
      questions: [
        'How many surveys have I completed?',
        'How many surveys have I completed in the last 30 days?',
        'Show me all my surveys and their current status',
        'What is my survey completion rate for assigned surveys?',
      ],
    },
    {
      category: 'My Deficiencies',
      questions: [
        'What is my average number of deficiencies per survey?',
        'What are the most common deficiencies I have identified in my surveys?',
        'What priority 1 deficiencies have I identified?',
        'What is the average height of deficiencies I have found on guyed towers?',
        'What is the most common safety hazard I have identified in JSA surveys?',
      ],
    },
    {
      category: 'My Tower Stats',
      questions: [
        'What is the average height of towers I have inspected?',
        'How many guy wire attachments have I documented on average?',
        'What is the average time it takes me to complete a survey?',
        'What tower types have I inspected the most?',
      ],
    },
  ],
}

interface Props {
  role: Role
  onSelect: (question: string) => void
  disabled?: boolean
}

const PromptSuggestions: React.FC<Props> = ({ role, onSelect, disabled }) => {
  const [open, setOpen] = useState(false)
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const suggestions = SUGGESTIONS[role]

  return (
    <div className="w-full mt-4 rounded-xl border border-border bg-card overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-surface/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="text-accent" size={15} />
          <span className="text-text-primary text-sm font-medium">Suggested Questions</span>
          <span className="text-[10px] text-text-muted bg-surface border border-border px-2 py-0.5 rounded-full">
            {suggestions.reduce((s, c) => s + c.questions.length, 0)} prompts
          </span>
        </div>
        <ChevronDown
          size={15}
          className={`text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Prompt list */}
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {suggestions.map(section => (
            <div key={section.category}>
              {/* Category row */}
              <button
                onClick={() => setOpenCategory(openCategory === section.category ? null : section.category)}
                className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-surface/30 transition-colors"
              >
                <span className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
                  {section.category}
                </span>
                <ChevronDown
                  size={13}
                  className={`text-text-muted transition-transform duration-150 ${openCategory === section.category ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Questions */}
              {openCategory === section.category && (
                <div className="pb-2 px-4 flex flex-wrap gap-2">
                  {section.questions.map(q => (
                    <button
                      key={q}
                      disabled={disabled}
                      onClick={() => {
                        onSelect(q)
                        setOpen(false)
                      }}
                      className="text-left text-xs text-text-secondary hover:text-text-primary bg-surface hover:bg-surface/80 border border-border hover:border-border-light px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PromptSuggestions
