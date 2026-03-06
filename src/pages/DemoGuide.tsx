import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Minimize2,
  Maximize2,
  X,
  MousePointerClick,
  MessageSquare,
  Zap,
  SkipForward,
} from 'lucide-react'
import { useDemo, DEMO_STEPS } from '../context/DemoContext'
import type { DemoStep } from '../context/DemoContext'

// ─── Act metadata ────────────────────────────────────────────────────────────

const ACTS = [
  { act: 1, label: 'The Problem',      color: 'text-text-muted',   bg: 'bg-surface',          border: 'border-border' },
  { act: 2, label: 'Analytics',        color: 'text-accent',       bg: 'bg-accent/10',        border: 'border-accent/30' },
  { act: 3, label: 'The Bridge',       color: 'text-purple-400',   bg: 'bg-purple-400/10',    border: 'border-purple-400/30' },
  { act: 4, label: 'QA Dashboard',    color: 'text-emerald-400',  bg: 'bg-emerald-400/10',   border: 'border-emerald-400/30' },
  { act: 5, label: 'Closing',          color: 'text-amber-400',    bg: 'bg-amber-400/10',     border: 'border-amber-400/30' },
]

const groupedSteps = ACTS.map(a => ({
  ...a,
  steps: DEMO_STEPS.filter(s => s.act === a.act),
}))

// ─── DemoGuide landing page ──────────────────────────────────────────────────

const DemoGuide: React.FC = () => {
  const { startDemo } = useDemo()
  const navigate = useNavigate()
  const [activeAct, setActiveAct] = useState<number | null>(null)

  const handleStart = (stepIndex = 0) => {
    const step = DEMO_STEPS[stepIndex]
    startDemo(stepIndex)
    navigate(step.route)
  }

  return (
    <div className="max-w-5xl mx-auto w-full pb-16">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
            <Zap size={18} className="text-accent" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Demo Guide
          </span>
        </div>
        <h1 className="text-3xl font-bold text-text-primary mb-2 leading-tight">
          FieldSync Analytics &amp; QA<br />
          <span className="text-accent">Presenter Walkthrough</span>
        </h1>
        <p className="text-text-secondary text-base max-w-2xl mb-6">
          A structured, talking-point-driven demo for showing how Custom Data Analytics and the
          QA Operations Dashboard work together — designed for a critical audience.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => handleStart(0)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-semibold text-sm transition-colors"
          >
            <Play size={15} />
            Start Full Demo
          </button>
          <span className="text-text-muted text-sm">
            {DEMO_STEPS.length} steps · {ACTS.length} acts · ~20 min
          </span>
        </div>
      </div>

      {/* ── Act filter tabs ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap mb-8">
        <button
          onClick={() => setActiveAct(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            activeAct === null
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'bg-card border-border text-text-muted hover:text-text-secondary'
          }`}
        >
          All Acts
        </button>
        {ACTS.map(a => (
          <button
            key={a.act}
            onClick={() => setActiveAct(activeAct === a.act ? null : a.act)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeAct === a.act
                ? `${a.bg} ${a.border} ${a.color}`
                : 'bg-card border-border text-text-muted hover:text-text-secondary'
            }`}
          >
            Act {a.act}: {a.label}
          </button>
        ))}
      </div>

      {/* ── Act sections ─────────────────────────────────────────────── */}
      <div className="space-y-10">
        {groupedSteps
          .filter(g => activeAct === null || g.act === activeAct)
          .map(group => (
            <div key={group.act}>
              {/* Act header */}
              <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-border`}>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${group.bg} ${group.border} ${group.color}`}>
                  Act {group.act}
                </span>
                <h2 className="text-base font-semibold text-text-primary">{group.label}</h2>
                <span className="text-text-muted text-xs ml-auto">
                  {group.steps.length} step{group.steps.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Step cards */}
              <div className="space-y-3">
                {group.steps.map((step, idx) => {
                  const globalIdx = DEMO_STEPS.findIndex(s => s.id === step.id)
                  return (
                    <StepCard
                      key={step.id}
                      step={step}
                      globalIdx={globalIdx}
                      localIdx={idx}
                      actMeta={group}
                      onStart={() => handleStart(globalIdx)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

// ─── Individual step card ────────────────────────────────────────────────────

interface StepCardProps {
  step: DemoStep
  globalIdx: number
  localIdx: number
  actMeta: (typeof groupedSteps)[0]
  onStart: () => void
}

const StepCard: React.FC<StepCardProps> = ({ step, globalIdx, actMeta, onStart }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-border-light transition-colors">
      {/* Card header — always visible */}
      <div
        className="flex items-start gap-4 px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Step number */}
        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${actMeta.bg} ${actMeta.color} border ${actMeta.border}`}>
          {globalIdx + 1}
        </div>

        {/* Title block */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-text-primary font-semibold text-sm">{step.title}</span>
            {step.tag && (
              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${actMeta.bg} ${actMeta.border} ${actMeta.color}`}>
                {step.tag}
              </span>
            )}
          </div>
          <p className="text-text-muted text-xs">{step.subtitle}</p>
        </div>

        {/* Role badge + expand indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <RoleBadge role={step.role} />
          <ChevronRight
            size={14}
            className={`text-text-muted transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
          {/* Description */}
          <p className="text-text-secondary text-sm leading-relaxed">{step.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Do This */}
            <div className="bg-surface rounded-lg p-3.5 border border-border">
              <div className="flex items-center gap-1.5 mb-2">
                <MousePointerClick size={13} className="text-accent" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Do This</span>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed">{step.action}</p>
            </div>

            {/* Say This */}
            <div className="bg-surface rounded-lg p-3.5 border border-border">
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare size={13} className="text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Say This</span>
              </div>
              <p className="text-text-muted text-sm leading-relaxed italic">{step.keyMessage}</p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-end pt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onStart() }}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-semibold text-xs transition-colors"
            >
              <SkipForward size={13} />
              Start Demo from Step {globalIdx + 1}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Role badge ──────────────────────────────────────────────────────────────

const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
  admin:           { label: 'Admin',        color: 'text-accent bg-accent/10 border-accent/20' },
  org_owner:       { label: 'Org Owner',    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  pm:              { label: 'PM',           color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  qc_technician:   { label: 'Tech (Matt)',  color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  qc_technician_2: { label: 'Tech 2 (John)', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
}

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const meta = ROLE_DISPLAY[role] ?? { label: role, color: 'text-text-muted bg-surface border-border' }
  return (
    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${meta.color}`}>
      {meta.label}
    </span>
  )
}

// ─── DemoStepOverlay (exported, mounted in Layout) ───────────────────────────

export const DemoStepOverlay: React.FC = () => {
  const { isActive, isMinimized, currentStep, totalSteps, step, endDemo, nextStep, prevStep, toggleMinimize } = useDemo()

  if (!isActive) return null

  const actMeta = ACTS.find(a => a.act === step.act) ?? ACTS[0]
  const progress = Math.round(((currentStep + 1) / totalSteps) * 100)

  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-[200] flex items-center gap-2 bg-card border border-border rounded-xl shadow-2xl px-4 py-2.5">
        <div className={`w-2 h-2 rounded-full ${actMeta.bg.replace('bg-', 'bg-').replace('/10', '')} shrink-0`} style={{ background: actColors[step.act] }} />
        <span className="text-text-primary text-xs font-semibold">
          Step {currentStep + 1}/{totalSteps}
        </span>
        <div className="w-20 h-1.5 bg-surface rounded-full overflow-hidden mx-1">
          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <button onClick={prevStep} disabled={currentStep === 0} className="text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors">
          <ChevronLeft size={14} />
        </button>
        <button onClick={nextStep} disabled={currentStep === totalSteps - 1} className="text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors">
          <ChevronRight size={14} />
        </button>
        <button onClick={toggleMinimize} className="text-text-muted hover:text-text-primary transition-colors ml-1">
          <Maximize2 size={13} />
        </button>
        <button onClick={endDemo} className="text-text-muted hover:text-rose-400 transition-colors ml-0.5">
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-[200] w-[340px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${actMeta.bg} ${actMeta.border} ${actMeta.color}`}>
          Act {step.act}: {step.actTitle}
        </span>
        <span className="text-text-muted text-xs ml-auto">
          {currentStep + 1} / {totalSteps}
        </span>
        <button onClick={toggleMinimize} className="text-text-muted hover:text-text-primary transition-colors ml-1" title="Minimize">
          <Minimize2 size={13} />
        </button>
        <button onClick={endDemo} className="text-text-muted hover:text-rose-400 transition-colors" title="End demo">
          <X size={13} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-surface">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
        {/* Step title */}
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-text-primary font-bold text-sm leading-tight">{step.title}</span>
            {step.tag && (
              <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${actMeta.bg} ${actMeta.border} ${actMeta.color}`}>
                {step.tag}
              </span>
            )}
          </div>
          <p className="text-text-muted text-xs">{step.subtitle}</p>
        </div>

        {/* Role indicator */}
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-[10px] uppercase tracking-wider">Role:</span>
          <RoleBadge role={step.role} />
        </div>

        {/* Do This */}
        <div className="bg-surface rounded-lg p-3 border border-border">
          <div className="flex items-center gap-1.5 mb-1.5">
            <MousePointerClick size={12} className="text-accent" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Do This</span>
          </div>
          <p className="text-text-secondary text-xs leading-relaxed">{step.action}</p>
        </div>

        {/* Say This */}
        <div className="bg-surface rounded-lg p-3 border border-border">
          <div className="flex items-center gap-1.5 mb-1.5">
            <MessageSquare size={12} className="text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Say This</span>
          </div>
          <p className="text-text-muted text-xs leading-relaxed italic">{step.keyMessage}</p>
        </div>
      </div>

      {/* Navigation footer */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text-secondary hover:text-text-primary hover:border-border-light disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={13} />
          Prev
        </button>

        {/* Step dots */}
        <div className="flex items-center gap-1 flex-1 justify-center overflow-hidden">
          {DEMO_STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i === currentStep
                  ? 'w-4 h-1.5 bg-accent'
                  : i < currentStep
                  ? 'w-1.5 h-1.5 bg-accent/40'
                  : 'w-1.5 h-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        <button
          onClick={nextStep}
          disabled={currentStep === totalSteps - 1}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent hover:bg-accent-hover text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Next
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

// Simple act color lookup for minimized dot
const actColors: Record<number, string> = {
  1: '#5a6882',
  2: '#4f8ef7',
  3: '#c084fc',
  4: '#34d399',
  5: '#fbbf24',
}

export default DemoGuide
