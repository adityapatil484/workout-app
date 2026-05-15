import { useState, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, FileText, ArrowLeftRight, Ban, SkipForward } from 'lucide-react';
import { getActivePlan } from '../lib/planStorage.js';
import { getTodayDayIndex, todayLocalISO } from '../lib/dateUtils.js';
import db from '../db/db.js';
import NoteBottomSheet from '../components/NoteBottomSheet.jsx';
import MuscleMap from '../components/MuscleMap.jsx';

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function roundToNearest(value, step) {
  return Math.round(value / step) * step;
}

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
      rpe:         cur?.rpe         ?? null,
      failed:      cur?.failed      ?? false,
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
  const [currentNote, setCurrentNote]             = useState(null);
  const [isSkipped, setIsSkipped]                 = useState(false);
  const [openRpeRow, setOpenRpeRow]               = useState(null);
  const [noteSheetOpen, setNoteSheetOpen]         = useState(false);

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
        const groups = day?.exerciseGroups ?? [];

        // Direct lookup
        let found = false;
        outer: for (const group of groups) {
          for (const e of group.exercises) {
            if (e.exerciseId === exerciseId) {
              pSets = e.targetSets  ?? 3;
              pReps = e.targetReps  ?? '8-12';
              pRest = e.restSeconds ?? 90;
              found = true;
              break outer;
            }
          }
        }

        // Fallback: exerciseId is a swap replacement — look up the original's prescription
        if (!found && sessionId !== 'new') {
          const currentSession = await db.workoutSessions.get(sessionId);
          const swappedEntry = currentSession?.loggedExercises?.find(e => e.exerciseId === exerciseId);
          const originalId   = swappedEntry?.swappedFrom;
          if (originalId) {
            outer2: for (const group of groups) {
              for (const e of group.exercises) {
                if (e.exerciseId === originalId) {
                  pSets = e.targetSets  ?? 3;
                  pReps = e.targetReps  ?? '8-12';
                  pRest = e.restSeconds ?? 90;
                  break outer2;
                }
              }
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
      setCurrentNote(currentEx?.note ?? null);
      setIsSkipped(currentEx?.skipped ?? false);
      setRows(initRows(pSets, lastEx, currentEx));
      setIsLoading(false);
    }
    load();
  }, [sessionId, exerciseId]);

  async function persistSet(updatedRows) {
    const loggedEntry = {
      exerciseId,
      note:        null,
      skipped:     false,
      swappedFrom: null,
      sets: updatedRows.map(r => ({
        setNumber:   r.setNumber,
        weight:      parseFloat(r.weight) || 0,
        reps:        parseInt(r.reps)     || 0,
        completed:   r.completed,
        completedAt: r.completedAt ?? null,
        rpe:         r.rpe    ?? null,
        failed:      r.failed ?? false,
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
        ? existing.map((e, i) => i === idx ? { ...e, sets: loggedEntry.sets, skipped: false } : e)
        : [...existing, loggedEntry];
      await db.workoutSessions.update(resolvedSessionId, { loggedExercises: updated });
      setIsSkipped(false);
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
      { setNumber: prev.length + 1, weight: '', reps: '', completed: false, completedAt: null, rpe: null, failed: false },
    ]);
  }

  async function handleSkip() {
    if (!window.confirm('Mark this exercise as skipped?')) return;

    let sid = resolvedSessionId;
    if (sid === 'new') {
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
        loggedExercises:  [{ exerciseId, note: null, skipped: true, swappedFrom: null, sets: [] }],
        swappedExercises: [],
        duration:         null,
      });
      if (profile && !profile.startDate) {
        await db.userProfile.update(1, { startDate: dateStr });
      }
      setResolvedSessionId(newId);
      navigate(`/log/${newId}`, { replace: true });
    } else {
      const current  = await db.workoutSessions.get(sid);
      if (!current) return;
      const existing = current.loggedExercises ?? [];
      const idx      = existing.findIndex(e => e.exerciseId === exerciseId);
      const updated  = idx >= 0
        ? existing.map((e, i) => i === idx ? { ...e, skipped: true } : e)
        : [...existing, { exerciseId, note: null, skipped: true, swappedFrom: null, sets: [] }];
      await db.workoutSessions.update(sid, { loggedExercises: updated });
      navigate(`/log/${sid}`);
    }
  }

  async function handleNoteSave(value) {
    const noteValue = value || null;

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
        loggedExercises:  [{ exerciseId, note: noteValue, skipped: false, swappedFrom: null, sets: [] }],
        swappedExercises: [],
        duration:         null,
      });
      if (profile && !profile.startDate) {
        await db.userProfile.update(1, { startDate: dateStr });
      }
      setResolvedSessionId(newId);
      navigate(`/log/${newId}/exercise/${exerciseId}`, { replace: true });
    } else {
      const current  = await db.workoutSessions.get(resolvedSessionId);
      if (!current) return;
      const existing = current.loggedExercises ?? [];
      const idx      = existing.findIndex(e => e.exerciseId === exerciseId);
      const updated  = idx >= 0
        ? existing.map((e, i) => i === idx ? { ...e, note: noteValue } : e)
        : [...existing, { exerciseId, note: noteValue, skipped: false, swappedFrom: null, sets: [] }];
      await db.workoutSessions.update(resolvedSessionId, { loggedExercises: updated });
    }

    setCurrentNote(noteValue);
  }

  async function persistRpe(rowIndex, value) {
    const newRows = rows.map((r, j) => j === rowIndex ? { ...r, rpe: value } : r);
    setRows(newRows);

    let sid = resolvedSessionId;
    if (sid === 'new') {
      const now     = new Date().toISOString();
      const dateStr = todayLocalISO();
      const newId   = 'session_' + Date.now();
      const sets = newRows.map(r => ({
        setNumber: r.setNumber, weight: parseFloat(r.weight) || 0,
        reps: parseInt(r.reps) || 0, completed: r.completed,
        completedAt: r.completedAt ?? null, rpe: r.rpe ?? null, failed: r.failed ?? false,
      }));
      await db.workoutSessions.put({
        id: newId, date: dateStr, startedAt: now, finishedAt: null,
        planId: plan?.id ?? null, dayIndex: getTodayDayIndex(),
        loggedExercises: [{ exerciseId, note: null, skipped: false, swappedFrom: null, sets }],
        swappedExercises: [], duration: null,
      });
      if (profile && !profile.startDate) await db.userProfile.update(1, { startDate: dateStr });
      setResolvedSessionId(newId);
      navigate(`/log/${newId}/exercise/${exerciseId}`, { replace: true });
      return;
    }

    const current = await db.workoutSessions.get(sid);
    if (!current) return;
    const existing = current.loggedExercises ?? [];
    const entryIdx = existing.findIndex(e => e.exerciseId === exerciseId);
    if (entryIdx < 0) return;

    const updatedSets = (existing[entryIdx].sets ?? []).map((s, j) =>
      j === rowIndex ? { ...s, rpe: value } : s
    );
    const updatedExercises = existing.map((e, i) =>
      i === entryIdx ? { ...e, sets: updatedSets } : e
    );
    await db.workoutSessions.update(sid, { loggedExercises: updatedExercises });
  }

  async function persistFailed(rowIndex) {
    const newValue = !rows[rowIndex].failed;
    const newRows  = rows.map((r, j) => j === rowIndex ? { ...r, failed: newValue } : r);
    setRows(newRows);

    let sid = resolvedSessionId;
    if (sid === 'new') {
      const now     = new Date().toISOString();
      const dateStr = todayLocalISO();
      const newId   = 'session_' + Date.now();
      const sets = newRows.map(r => ({
        setNumber: r.setNumber, weight: parseFloat(r.weight) || 0,
        reps: parseInt(r.reps) || 0, completed: r.completed,
        completedAt: r.completedAt ?? null, rpe: r.rpe ?? null, failed: r.failed ?? false,
      }));
      await db.workoutSessions.put({
        id: newId, date: dateStr, startedAt: now, finishedAt: null,
        planId: plan?.id ?? null, dayIndex: getTodayDayIndex(),
        loggedExercises: [{ exerciseId, note: null, skipped: false, swappedFrom: null, sets }],
        swappedExercises: [], duration: null,
      });
      if (profile && !profile.startDate) await db.userProfile.update(1, { startDate: dateStr });
      setResolvedSessionId(newId);
      navigate(`/log/${newId}/exercise/${exerciseId}`, { replace: true });
      return;
    }

    const current = await db.workoutSessions.get(sid);
    if (!current) return;
    const existing = current.loggedExercises ?? [];
    const entryIdx = existing.findIndex(e => e.exerciseId === exerciseId);
    if (entryIdx < 0) return;

    const updatedSets = (existing[entryIdx].sets ?? []).map((s, j) =>
      j === rowIndex ? { ...s, failed: newValue } : s
    );
    const updatedExercises = existing.map((e, i) =>
      i === entryIdx ? { ...e, sets: updatedSets } : e
    );
    await db.workoutSessions.update(sid, { loggedExercises: updatedExercises });
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

          {isSkipped && (
            <div className="bg-bg-elevated rounded-2xl p-4 text-text-secondary text-sm mb-4">
              This exercise is marked as skipped. Log a set to un-skip it.
            </div>
          )}

          {/* Inline header card: thumbnail left, name + prescription + muscle map right */}
          <div className="flex items-start gap-4 bg-bg-card rounded-2xl p-4">
            {(() => {
              const ytId = extractYouTubeId(exercise?.videoUrl);
              if (ytId) {
                return (
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-bg-elevated">
                    <iframe
                      width="80"
                      height="80"
                      src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&playsinline=1`}
                      frameBorder="0"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  </div>
                );
              }
              if (exercise?.imageUrl) {
                return (
                  <img
                    src={exercise.imageUrl}
                    alt={exercise.name}
                    className="w-20 h-20 rounded-xl object-contain bg-bg-elevated flex-shrink-0"
                  />
                );
              }
              return <div className="w-20 h-20 rounded-xl bg-bg-elevated flex-shrink-0" />;
            })()}
            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start sm:gap-3">
              <div className="flex-1 min-w-0">
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
              {exercise && (
                <MuscleMap
                  primaryMuscle={exercise.primaryMuscle}
                  secondaryMuscles={exercise.secondaryMuscles ?? []}
                  className="flex-shrink-0 mt-3 sm:mt-0"
                />
              )}
            </div>
          </div>

          {/* Set table */}
          <div className="bg-bg-card rounded-2xl p-4 mt-4">
            {/* Warmup suggestions */}
            {(() => {
              if (!exercise?.isCompound) return null;
              const equip = (exercise?.equipment ?? '').toLowerCase();
              if (equip === 'body only' || equip === 'bodyweight') return null;
              const workingWeight = Math.max(...rows.map(r => parseFloat(r.weight) || 0));
              if (workingWeight <= 0) return null;
              const warmupWeight = roundToNearest(0.5 * workingWeight, 2.5);
              return (
                <div className="mb-3 pb-3 border-b border-bg-elevated">
                  <p className="text-text-secondary text-xs font-medium uppercase tracking-widest mb-2">Warmups</p>
                  <p className="text-text-secondary text-sm">
                    Warmup — {warmupWeight} {weightUnits} × 5
                  </p>
                </div>
              );
            })()}

            {/* Column headers */}
            <div className="grid grid-cols-[32px_auto_auto_44px] gap-x-2 mb-2 px-2">
              <span className="text-text-tertiary text-xs uppercase tracking-widest text-center">SET</span>
              <span className="text-text-tertiary text-xs uppercase tracking-widest text-center">
                {weightUnits.toUpperCase()}
              </span>
              <span className="text-text-tertiary text-xs uppercase tracking-widest text-center">REPS</span>
              <span className="text-text-tertiary text-xs uppercase tracking-widest text-center">✓</span>
            </div>

            {/* Set rows */}
            <div>
              {rows.map((row, i) => (
                <Fragment key={i}>
                  {/* Primary row */}
                  <div
                    className={`grid grid-cols-[32px_auto_auto_44px] gap-x-2 items-center rounded-xl px-2 py-2 ${
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
                      {(() => {
                        const todayW = parseFloat(row.weight) || 0;
                        const todayR = parseInt(row.reps)    || 0;
                        if (!todayW || !todayR) return null;
                        const priorSet = lastEntry?.sets?.find(s => s.setNumber === row.setNumber && s.completed);
                        if (!priorSet || !priorSet.weight || !priorSet.reps) return null;
                        const todayVol = todayW * todayR;
                        const priorVol = priorSet.weight * priorSet.reps;
                        if (todayVol > priorVol) return <span className="text-accent text-sm font-semibold ml-1 flex-shrink-0">▲</span>;
                        if (todayVol === priorVol) return <span className="text-text-tertiary text-sm font-semibold ml-1 flex-shrink-0">=</span>;
                        return <span className="text-danger text-sm font-semibold ml-1 flex-shrink-0">▼</span>;
                      })()}
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

                  {/* Secondary controls row */}
                  <div className="pl-10 pt-1 pb-2 flex items-center gap-3">
                    {/* Failed toggle */}
                    <button onClick={() => persistFailed(i)} className="flex items-center gap-1.5">
                      {row.failed ? (
                        <>
                          <span className="bg-danger rounded-full p-1 flex items-center justify-center">
                            <X size={10} className="text-white" />
                          </span>
                          <span className="text-danger text-xs">Failed</span>
                        </>
                      ) : (
                        <>
                          <X size={14} className="text-text-tertiary" />
                          <span className="text-text-tertiary text-xs">Mark failed</span>
                        </>
                      )}
                    </button>

                    {/* RPE selector */}
                    <div className="relative">
                      <button
                        onClick={() => setOpenRpeRow(openRpeRow === i ? null : i)}
                        className="flex items-center gap-1.5"
                      >
                        <span className="text-text-tertiary text-xs">RPE</span>
                        <span className={`bg-bg-elevated rounded-full px-2 py-0.5 text-xs ${
                          row.rpe != null ? 'text-text-primary font-semibold' : 'text-text-tertiary'
                        }`}>
                          {row.rpe != null ? row.rpe : '—'}
                        </span>
                      </button>

                      {openRpeRow === i && createPortal(
                        <>
                          <div
                            className="fixed inset-0 bg-black/40 z-40"
                            onClick={() => setOpenRpeRow(null)}
                          />
                          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-bg-card rounded-3xl p-6 w-72">
                            <p className="text-text-tertiary text-xs uppercase tracking-widest mb-2">Easy</p>
                            <div className="grid grid-cols-4 gap-1.5 mb-3">
                              {[1, 2, 3, 4].map(n => (
                                <button
                                  key={n}
                                  onClick={() => { persistRpe(i, n); setOpenRpeRow(null); }}
                                  className={`rounded-2xl py-3 font-semibold text-sm ${
                                    row.rpe === n ? 'bg-accent text-bg-base' : 'bg-bg-elevated text-text-primary'
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                            <p className="text-text-tertiary text-xs uppercase tracking-widest mb-2">Moderate</p>
                            <div className="grid grid-cols-3 gap-1.5 mb-3">
                              {[5, 6, 7].map(n => (
                                <button
                                  key={n}
                                  onClick={() => { persistRpe(i, n); setOpenRpeRow(null); }}
                                  className={`rounded-2xl py-3 font-semibold text-sm ${
                                    row.rpe === n ? 'bg-accent text-bg-base' : 'bg-bg-elevated text-text-primary'
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                            <p className="text-text-tertiary text-xs uppercase tracking-widest mb-2">Hard</p>
                            <div className="grid grid-cols-3 gap-1.5 mb-3">
                              {[8, 9, 10].map(n => (
                                <button
                                  key={n}
                                  onClick={() => { persistRpe(i, n); setOpenRpeRow(null); }}
                                  className={`rounded-2xl py-3 font-semibold text-sm ${
                                    row.rpe === n ? 'bg-accent text-bg-base' : 'bg-bg-elevated text-text-primary'
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => { persistRpe(i, null); setOpenRpeRow(null); }}
                              className="w-full text-center text-text-secondary text-sm"
                            >
                              Clear
                            </button>
                          </div>
                        </>,
                        document.body
                      )}
                    </div>
                  </div>
                </Fragment>
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

          {/* Actions strip */}
          <div className="flex flex-wrap gap-2 mt-6 mb-6">
            <button
              onClick={() => setNoteSheetOpen(true)}
              className="flex items-center gap-2 bg-bg-elevated rounded-full px-4 py-2 text-sm font-medium text-text-primary"
            >
              <FileText size={16} />
              {currentNote ? 'Edit note' : 'Add note'}
            </button>
            <button
              onClick={async () => {
                let sid = resolvedSessionId;
                if (sid === 'new') {
                  // Lazily create session before navigating to swap picker
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
                    loggedExercises:  [],
                    swappedExercises: [],
                    duration:         null,
                  });
                  if (profile && !profile.startDate) {
                    await db.userProfile.update(1, { startDate: dateStr });
                  }
                  setResolvedSessionId(newId);
                  sid = newId;
                  navigate(`/log/${newId}/exercise/${exerciseId}/swap`, { replace: true });
                } else {
                  navigate(`/log/${sid}/exercise/${exerciseId}/swap`);
                }
              }}
              className="flex items-center gap-2 bg-bg-elevated rounded-full px-4 py-2 text-sm font-medium text-text-primary"
            >
              <ArrowLeftRight size={16} />
              Swap exercise
            </button>
            <button
              onClick={async () => {
                const confirmed = window.confirm(
                  "Block this exercise from all future plans? You can unblock from settings later."
                );
                if (!confirmed) return;

                // Add to blockedExercises
                const prof     = await db.userProfile.get(1);
                const blocked  = prof?.blockedExercises ?? [];
                if (!blocked.includes(exerciseId)) {
                  await db.userProfile.update(1, { blockedExercises: [...blocked, exerciseId] });
                }

                // Lazy-create session if needed
                let sid = resolvedSessionId;
                if (sid === 'new') {
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
                    loggedExercises:  [],
                    swappedExercises: [],
                    duration:         null,
                  });
                  if (prof && !prof.startDate) {
                    await db.userProfile.update(1, { startDate: dateStr });
                  }
                  setResolvedSessionId(newId);
                  sid = newId;
                  navigate(`/log/${newId}/exercise/${exerciseId}/swap`, { replace: true });
                } else {
                  navigate(`/log/${sid}/exercise/${exerciseId}/swap`);
                }
              }}
              className="flex items-center gap-2 bg-bg-elevated rounded-full px-4 py-2 text-sm font-medium text-text-primary"
            >
              <Ban size={16} />
              Don't have this
            </button>
            <button
              onClick={handleSkip}
              className="flex items-center gap-2 bg-bg-elevated rounded-full px-4 py-2 text-sm font-medium text-text-primary"
            >
              <SkipForward size={16} />
              Skip exercise
            </button>
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

      <NoteBottomSheet
        open={noteSheetOpen}
        onClose={() => setNoteSheetOpen(false)}
        exerciseName={exercise?.name ?? exerciseId}
        initialValue={currentNote ?? ''}
        onSave={handleNoteSave}
      />
    </div>
  );
}
