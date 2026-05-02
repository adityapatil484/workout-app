import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getActivePlan } from '../lib/planStorage.js';
import { getTodayDayIndex } from '../lib/dateUtils.js';
import db from '../db/db.js';

function formatElapsed(startedAt) {
  const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function LogSession() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  const [isLoading, setIsLoading]     = useState(true);
  const [plan, setPlan]               = useState(null);
  const [dayIndex, setDayIndex]       = useState(null);
  const [dayExercises, setDayExercises] = useState([]);
  const [session, setSession]         = useState(null);
  const [weightUnits, setWeightUnits] = useState('kg');
  const [elapsed, setElapsed]         = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    async function load() {
      const [activePlan, profile] = await Promise.all([
        getActivePlan(),
        db.userProfile.get(1),
      ]);

      if (!activePlan) { navigate('/today', { replace: true }); return; }

      const idx = getTodayDayIndex();
      const day = activePlan.days.find(d => d.dayIndex === idx);

      const flatExercises = (day?.exerciseGroups ?? []).map(g => g.exercises[0]).filter(Boolean);
      const ids = flatExercises.map(e => e.exerciseId);
      const libRecords = await db.exerciseLibrary.bulkGet(ids);
      const libMap = new Map(libRecords.filter(Boolean).map(r => [r.id, r]));

      const enriched = flatExercises.map(ex => ({
        ...ex,
        ...libMap.get(ex.exerciseId),
        planEx: ex,
      }));

      let sess = null;
      if (sessionId !== 'new') {
        sess = await db.workoutSessions.get(sessionId);
      }

      setPlan(activePlan);
      setDayIndex(idx);
      setDayExercises(enriched);
      setSession(sess ?? null);
      setWeightUnits(profile?.weightUnits ?? 'kg');
      setIsLoading(false);
    }
    load();
  }, [sessionId, navigate]);

  // Elapsed timer
  useEffect(() => {
    if (!session?.startedAt) return;
    setElapsed(formatElapsed(session.startedAt));
    intervalRef.current = setInterval(() => {
      setElapsed(formatElapsed(session.startedAt));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [session?.startedAt]);

  async function finishWorkout() {
    if (!hasAnyCompletedSet) return;
    if (!window.confirm('Finish this workout?')) return;
    const finishedAt = new Date().toISOString();
    const duration   = Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000);
    await db.workoutSessions.update(session.id, { finishedAt, duration });
    navigate(`/log/${session.id}/summary`);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <p className="text-text-secondary">Loading…</p>
      </div>
    );
  }

  const day = plan.days.find(d => d.dayIndex === dayIndex);
  const dayLabel = day?.label ?? day?.dayLabel ?? '';

  // Build a quick lookup: exerciseId → prescribed set count
  const prescribedSets = {};
  for (const group of (day?.exerciseGroups ?? [])) {
    for (const ex of group.exercises) {
      prescribedSets[ex.exerciseId] = ex.targetSets;
    }
  }

  const hasAnyCompletedSet = session?.loggedExercises?.some(e => e.sets?.some(s => s.completed)) ?? false;

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-10 pb-4">
        <button
          onClick={() => navigate('/today')}
          className="p-2 -ml-2 text-text-secondary"
          aria-label="Back"
        >
          <ArrowLeft size={24} />
        </button>

        <p className="font-semibold text-text-primary text-base">
          {dayLabel}
          {day ? ` · Day ${day.dayIndex + 1}` : ''}
        </p>

        <p className="font-mono text-text-secondary text-sm w-14 text-right">
          {session?.startedAt ? (elapsed ?? '--:--') : '--:--'}
        </p>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
        {dayExercises.map((ex) => {
          const loggedEx   = session?.loggedExercises?.find(e => e.exerciseId === ex.exerciseId);
          const doneSets   = loggedEx?.sets?.filter(s => s.completed).length ?? 0;
          const totalSets  = prescribedSets[ex.exerciseId] ?? ex.planEx?.targetSets ?? 3;
          const allDone    = doneSets >= totalSets && totalSets > 0;
          const anyDone    = doneSets > 0;

          const destId = sessionId === 'new' ? 'new' : session?.id ?? 'new';

          return (
            <button
              key={ex.exerciseId}
              onClick={() => navigate(`/log/${destId}/exercise/${ex.exerciseId}`)}
              className={[
                'bg-bg-card rounded-2xl p-4 flex items-center gap-4 text-left w-full',
                allDone ? 'border-l-[3px] border-accent' : '',
              ].join(' ')}
            >
              {ex.imageUrl ? (
                <img
                  src={ex.imageUrl}
                  alt={ex.name}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-bg-elevated"
                  loading="lazy"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-bg-elevated flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary truncate">{ex.name ?? ex.exerciseId}</p>
                <p className="text-sm text-text-secondary mt-0.5">
                  {ex.planEx?.targetSets} × {ex.planEx?.targetReps} · {ex.planEx?.restSeconds}s rest
                </p>
                <p className={[
                  'text-sm mt-1',
                  allDone  ? 'text-accent font-medium'  :
                  anyDone  ? 'text-text-secondary'       :
                             'text-text-tertiary',
                ].join(' ')}>
                  {allDone  ? '✓ Complete'                      :
                   anyDone  ? `${doneSets} / ${totalSets} sets done` :
                              'Not started'}
                </p>
              </div>

              <ChevronRight size={20} className="text-text-secondary flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Sticky bottom CTA */}
      <div className="bg-bg-base px-4 pt-3 pb-8">
        <button
          onClick={finishWorkout}
          disabled={!hasAnyCompletedSet}
          className={`w-full rounded-full py-4 font-semibold transition-opacity ${
            hasAnyCompletedSet
              ? 'bg-accent text-bg-base'
              : 'bg-accent text-bg-base opacity-40 pointer-events-none'
          }`}
        >
          Finish workout
        </button>
      </div>
    </div>
  );
}
