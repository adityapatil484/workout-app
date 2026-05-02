import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { getActivePlan } from '../lib/planStorage.js';
import { getTodayDayIndex, todayLocalISO } from '../lib/dateUtils.js';
import db from '../db/db.js';

function initRows(count, lastEntry, currentEntry) {
  return Array.from({ length: count }, (_, i) => {
    const cur  = currentEntry?.sets?.[i];
    const prev = lastEntry?.sets?.[i];
    return {
      setNumber:   i + 1,
      weight:      cur != null ? String(cur.weight  ?? '') : (prev != null ? String(prev.weight  ?? '') : ''),
      reps:        cur != null ? String(cur.reps    ?? '') : (prev != null ? String(prev.reps    ?? '') : ''),
      completed:   cur?.completed   ?? false,
      completedAt: cur?.completedAt ?? null,
    };
  });
}

export default function LogExercise() {
  const { sessionId, exerciseId } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading]                 = useState(true);
  const [exercise, setExercise]                   = useState(null);
  const [plan, setPlan]                           = useState(null);
  const [profile, setProfile]                     = useState(null);
  const [prescribedSets, setPrescribedSets]       = useState(3);
  const [prescribedReps, setPrescribedReps]       = useState('8-12');
  const [prescribedRest, setPrescribedRest]       = useState(90);
  const [weightUnits, setWeightUnits]             = useState('kg');
  const [lastEntry, setLastEntry]                 = useState(null);
  const [rows, setRows]                           = useState([]);
  const [resolvedSessionId, setResolvedSessionId] = useState(sessionId);

  useEffect(() => {
    async function load() {
      const [ex, activePlan, prof] = await Promise.all([
        db.exerciseLibrary.get(exerciseId),
        getActivePlan(),
        db.userProfile.get(1),
      ]);

      // Find prescription from today's plan day
      let pSets = 3, pReps = '8-12', pRest = 90;
      if (activePlan) {
        const day = activePlan.days.find(d => d.dayIndex === getTodayDayIndex());
        outer: for (const group of (day?.exerciseGroups ?? [])) {
          for (const e of group.exercises) {
            if (e.exerciseId === exerciseId) {
              pSets = e.targetSets  ?? 3;
              pReps = e.targetReps  ?? '8-12';
              pRest = e.restSeconds ?? 90;
              break outer;
            }
          }
        }
      }

      // Most recent finished session that includes this exercise
      const allSessions = await db.workoutSessions.toArray();
      const lastSession  = allSessions
        .filter(s => s.finishedAt != null && s.loggedExercises?.some(e => e.exerciseId === exerciseId))
        .sort((a, b) => (String(b.id) > String(a.id) ? 1 : -1))[0] ?? null;
      const lastEx = lastSession?.loggedExercises?.find(e => e.exerciseId === exerciseId) ?? null;

      // Current in-progress session — restore already-logged sets
      let currentEx = null;
      if (sessionId !== 'new') {
        const currentSession = await db.workoutSessions.get(sessionId);
        currentEx = currentSession?.loggedExercises?.find(e => e.exerciseId === exerciseId) ?? null;
      }

      setExercise(ex ?? null);
      setPlan(activePlan);
      setProfile(prof ?? null);
      setPrescribedSets(pSets);
      setPrescribedReps(pReps);
      setPrescribedRest(pRest);
      setWeightUnits(prof?.weightUnits ?? 'kg');
      setLastEntry(lastEx);
      setRows(initRows(pSets, lastEx, currentEx));
      setIsLoading(false);
    }
    load();
  }, [sessionId, exerciseId]);

  async function persistSet(updatedRows) {
    const loggedEntry = {
      exerciseId,
      sets: updatedRows.map(r => ({
        setNumber:   r.setNumber,
        weight:      parseFloat(r.weight) || 0,
        reps:        parseInt(r.reps)     || 0,
        completed:   r.completed,
        completedAt: r.completedAt ?? null,
      })),
    };

    if (resolvedSessionId === 'new') {
      const now     = new Date().toISOString();
      const dateStr = todayLocalISO();
      const newId   = 'session_' + Date.now();
      await db.workoutSessions.put({
        id:               newId,
        date:             dateStr,
        startedAt:        now,
        finishedAt:       null,
        planId:           plan?.id ?? null,
        dayIndex:         getTodayDayIndex(),
        loggedExercises:  [loggedEntry],
        swappedExercises: [],
        duration:         null,
      });

      if (profile && !profile.startDate) {
        await db.userProfile.update(1, { startDate: dateStr });
      }

      setResolvedSessionId(newId);
      navigate(`/log/${newId}/exercise/${exerciseId}`, { replace: true });
    } else {
      const current = await db.workoutSessions.get(resolvedSessionId);
      if (!current) return;
      const existing = current.loggedExercises ?? [];
      const idx      = existing.findIndex(e => e.exerciseId === exerciseId);
      const updated  = idx >= 0
        ? existing.map((e, i) => i === idx ? loggedEntry : e)
        : [...existing, loggedEntry];
      await db.workoutSessions.update(resolvedSessionId, { loggedExercises: updated });
    }
  }

  function updateRow(i, field, value) {
    setRows(prev => prev.map((r, j) => j === i ? { ...r, [field]: value } : r));
  }

  function stepWeight(i, delta) {
    setRows(prev => prev.map((r, j) => {
      if (j !== i) return r;
      return { ...r, weight: String(Math.max(0, (parseFloat(r.weight) || 0) + delta)) };
    }));
  }

  function stepReps(i, delta) {
    setRows(prev => prev.map((r, j) => {
      if (j !== i) return r;
      return { ...r, reps: String(Math.max(0, (parseInt(r.reps) || 0) + delta)) };
    }));
  }

  async function toggleComplete(i) {
    const updated = rows.map((r, j) => {
      if (j !== i) return r;
      const done = !r.completed;
      return { ...r, completed: done, completedAt: done ? new Date().toISOString() : null };
    });
    setRows(updated);
    await persistSet(updated);
  }

  function addSet() {
    setRows(prev => [
      ...prev,
      { setNumber: prev.length + 1, weight: '', reps: '', completed: false, completedAt: null },
    ]);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <p className="text-text-secondary">Loading…</p>
      </div>
    );
  }

  // "60 kg × 8, 8, 7" — weight from set 1, all reps joined
  let lastTimeLine = null;
  if (lastEntry?.sets?.length) {
    const w       = lastEntry.sets[0]?.weight;
    const repsStr = lastEntry.sets.map(s => s.reps).join(', ');
    lastTimeLine  = w ? `${w} ${weightUnits} × ${repsStr}` : repsStr;
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Back arrow — full width, outside max-w container */}
      <div className="px-4 pt-10 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-text-secondary"
          aria-label="Back"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      {/* Scrollable body — max-w-lg centered */}
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="max-w-lg mx-auto w-full px-4">

          {/* Inline header card: thumbnail left, name + prescription right */}
          <div className="flex items-center gap-4 bg-bg-card rounded-2xl p-4">
            {exercise?.imageUrl ? (
              <img
                src={exercise.imageUrl}
                alt={exercise.name}
                className="w-20 h-20 rounded-xl object-contain bg-bg-elevated flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-bg-elevated flex-shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-[18px] font-bold text-text-primary leading-snug">
                {exercise?.name ?? exerciseId}
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                {prescribedSets} sets × {prescribedReps} reps · {prescribedRest}s rest
              </p>
              {lastTimeLine && (
                <p className="text-sm text-text-secondary mt-3">
                  Last time: {lastTimeLine}
                </p>
              )}
            </div>
          </div>

          {/* Set table */}
          <div className="bg-bg-card rounded-2xl p-4 mt-4">
            {/* Column headers */}
            <div className="grid grid-cols-[32px_auto_auto_44px] gap-x-2 mb-2">
              <span className="text-text-tertiary text-xs uppercase tracking-widest text-center">SET</span>
              <span className="text-text-tertiary text-xs uppercase tracking-widest text-center">
                {weightUnits.toUpperCase()}
              </span>
              <span className="text-text-tertiary text-xs uppercase tracking-widest text-center">REPS</span>
              <span className="text-text-tertiary text-xs uppercase tracking-widest text-center">✓</span>
            </div>

            {/* Set rows */}
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-[32px_auto_auto_44px] gap-x-2 items-center rounded-xl px-1 py-2 ${
                    row.completed ? 'bg-[#00D9A3]/10' : ''
                  }`}
                >
                  {/* Set number */}
                  <span className="text-text-secondary font-medium text-sm text-center">{row.setNumber}</span>

                  {/* Weight stepper */}
                  <div className="flex items-center gap-0.5 justify-center">
                    <button
                      onClick={() => stepWeight(i, -2.5)}
                      disabled={row.completed}
                      className="w-6 h-6 rounded-full bg-bg-elevated flex-shrink-0 flex items-center justify-center text-text-primary text-xs font-bold disabled:opacity-40"
                    >−</button>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={row.weight}
                      onChange={e => updateRow(i, 'weight', e.target.value)}
                      disabled={row.completed}
                      className="w-12 h-10 bg-bg-elevated rounded-xl text-center text-text-primary font-semibold text-sm disabled:opacity-40"
                    />
                    <button
                      onClick={() => stepWeight(i, 2.5)}
                      disabled={row.completed}
                      className="w-6 h-6 rounded-full bg-bg-elevated flex-shrink-0 flex items-center justify-center text-text-primary text-xs font-bold disabled:opacity-40"
                    >+</button>
                  </div>

                  {/* Reps stepper */}
                  <div className="flex items-center gap-0.5 justify-center">
                    <button
                      onClick={() => stepReps(i, -1)}
                      disabled={row.completed}
                      className="w-6 h-6 rounded-full bg-bg-elevated flex-shrink-0 flex items-center justify-center text-text-primary text-xs font-bold disabled:opacity-40"
                    >−</button>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={row.reps}
                      onChange={e => updateRow(i, 'reps', e.target.value)}
                      disabled={row.completed}
                      className="w-12 h-10 bg-bg-elevated rounded-xl text-center text-text-primary font-semibold text-sm disabled:opacity-40"
                    />
                    <button
                      onClick={() => stepReps(i, 1)}
                      disabled={row.completed}
                      className="w-6 h-6 rounded-full bg-bg-elevated flex-shrink-0 flex items-center justify-center text-text-primary text-xs font-bold disabled:opacity-40"
                    >+</button>
                  </div>

                  {/* Checkmark */}
                  <button
                    onClick={() => toggleComplete(i)}
                    className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mx-auto ${
                      row.completed ? 'bg-accent' : 'border-2 border-[#5A5A62]'
                    }`}
                  >
                    {row.completed && <Check size={16} className="text-white" />}
                  </button>
                </div>
              ))}
            </div>

            {/* Add set + rest */}
            <button onClick={addSet} className="mt-4 text-accent text-sm font-medium">
              + Add set
            </button>
            {prescribedRest > 0 && (
              <p className="text-text-tertiary text-xs mt-2">Rest: {prescribedRest}s</p>
            )}
          </div>

        </div>
      </div>

      {/* Fixed Done button */}
      <div className="bg-bg-base px-4 pt-3 pb-8">
        <div className="max-w-lg mx-auto w-full">
          <button
            onClick={() => navigate(`/log/${resolvedSessionId}`)}
            className="w-full bg-bg-elevated text-text-primary font-medium rounded-full py-4"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
