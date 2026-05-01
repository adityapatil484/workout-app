import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getActivePlan, generateAndSaveActivePlan } from '../lib/planStorage.js';
import { SPLIT_LABELS, GOAL_LABELS } from '../lib/planLabels.js';
import db from '../db/db.js';

function estimateDayMinutes(day) {
  let total = 0;
  for (const group of day.exerciseGroups) {
    for (const ex of group.exercises) {
      total += ex.targetSets + (ex.restSeconds * ex.targetSets) / 60;
    }
  }
  return Math.max(5, Math.round(total / 5) * 5);
}

function getMuscles(day, libMap) {
  const seen = new Set();
  for (const group of day.exerciseGroups) {
    for (const ex of group.exercises) {
      const m = libMap.get(ex.exerciseId)?.primaryMuscle;
      if (m) seen.add(m);
    }
  }
  return [...seen];
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function Plan() {
  const [plan, setPlan]       = useState(undefined);
  const [libMap, setLibMap]   = useState(new Map());
  const [working, setWorking] = useState(false);

  useEffect(() => {
    Promise.all([
      getActivePlan(),
      db.exerciseLibrary.toArray(),
    ]).then(([p, lib]) => {
      setPlan(p ?? null);
      setLibMap(new Map(lib.map(ex => [ex.id, ex])));
    });
  }, []);

  async function handleGenerate(isRegen) {
    if (isRegen && !window.confirm('Regenerating will replace your current plan. Continue?')) return;
    setWorking(true);
    try {
      const p = await generateAndSaveActivePlan();
      setPlan(p);
    } finally {
      setWorking(false);
    }
  }

  if (plan === undefined) return null;

  /* ── EMPTY STATE ─────────────────────────────────────────── */
  if (!plan) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center px-6 gap-3">
        <h1 className="text-[28px] font-bold text-text-primary">No active plan</h1>
        <p className="text-text-secondary text-sm mb-4">Generate one to get started</p>
        <button
          onClick={() => handleGenerate(false)}
          disabled={working}
          className="w-full max-w-xs bg-accent text-bg-base font-semibold rounded-full py-4 disabled:opacity-60"
        >
          {working ? 'Generating…' : 'Generate plan'}
        </button>
      </div>
    );
  }

  /* ── PLAN VIEW ───────────────────────────────────────────── */
  const splitLabel = SPLIT_LABELS[plan.splitType] || plan.splitType;
  const goalLabel  = GOAL_LABELS[plan.splitType]  // fallback chain
    ?? GOAL_LABELS[Object.keys(GOAL_LABELS).find(k => plan.name.toLowerCase().includes(GOAL_LABELS[k].toLowerCase()))]
    ?? '';

  // Derive goal from stored plan name if not directly available
  const subtitleGoal = Object.values(GOAL_LABELS).find(g =>
    plan.name.includes(g)
  ) ?? '';

  return (
    <div className="min-h-screen bg-bg-base pb-24">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-[28px] font-bold text-text-primary leading-tight">{plan.name}</h1>
        <p className="text-text-secondary text-sm mt-1">
          {splitLabel} · {plan.daysPerWeek} days/week{subtitleGoal ? ` · ${subtitleGoal}` : ''}
        </p>
      </div>

      {/* Day cards */}
      <div className="px-4 flex flex-col gap-4 mb-8">
        {plan.days.map((day) => {
          const muscles  = day.isRestDay ? [] : getMuscles(day, libMap);
          const estMins  = day.isRestDay ? 0 : estimateDayMinutes(day);
          const count    = day.exerciseGroups.length;

          if (day.isRestDay) {
            return (
              <div key={day.dayIndex} className="bg-bg-card rounded-3xl p-6 opacity-50">
                <p className="font-semibold text-text-tertiary">
                  Day {day.dayIndex + 1} — Rest
                </p>
                <p className="text-sm text-text-tertiary mt-1">Rest day</p>
              </div>
            );
          }

          return (
            <Link
              key={day.dayIndex}
              to={`/plan/day/${day.dayIndex}`}
              className="bg-bg-card rounded-3xl p-6 block"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-text-primary">
                  Day {day.dayIndex + 1} — {day.label}
                </p>
                <ChevronRight size={18} className="text-text-tertiary flex-shrink-0" />
              </div>

              <p className="text-sm text-text-secondary mt-1">
                {count} exercise{count !== 1 ? 's' : ''} · ~{estMins} min
              </p>

              {muscles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {muscles.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-bg-elevated text-text-secondary px-3 py-1 text-xs uppercase tracking-wide"
                    >
                      {capitalize(m)}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Regenerate */}
      <div className="px-4">
        <button
          onClick={() => handleGenerate(true)}
          disabled={working}
          className="w-full bg-bg-elevated text-text-primary font-semibold rounded-full py-4 disabled:opacity-60"
        >
          {working ? 'Regenerating…' : 'Regenerate plan'}
        </button>
      </div>
    </div>
  );
}
