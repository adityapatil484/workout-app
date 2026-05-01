import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getActivePlan } from '../lib/planStorage.js';
import db from '../db/db.js';

export default function PlanDay() {
  const { dayIndex } = useParams();
  const navigate     = useNavigate();

  const [day, setDay]       = useState(undefined);
  const [libMap, setLibMap] = useState(new Map());

  useEffect(() => {
    Promise.all([
      getActivePlan(),
      db.exerciseLibrary.toArray(),
    ]).then(([plan, lib]) => {
      if (!plan) { navigate('/plan', { replace: true }); return; }

      const idx = Number(dayIndex);
      const d   = plan.days.find(d => d.dayIndex === idx);
      if (!d)   { navigate('/plan', { replace: true }); return; }

      setDay(d);
      setLibMap(new Map(lib.map(ex => [ex.id, ex])));
    });
  }, [dayIndex, navigate]);

  if (day === undefined) return null;

  /* ── REST DAY ────────────────────────────────────────────── */
  if (day.isRestDay) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col">
        <header className="flex items-center gap-3 px-4 pt-10 pb-4">
          <button onClick={() => navigate('/plan')} className="p-2 -ml-2 text-text-secondary">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-text-primary">Day {day.dayIndex + 1}</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6">
          <p className="text-2xl font-bold text-text-primary">Rest day</p>
          <p className="text-text-secondary text-sm">Nothing to log — recover well.</p>
        </div>
      </div>
    );
  }

  /* ── TRAINING DAY ────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-bg-base pb-24">
      <header className="flex items-center gap-3 px-4 pt-10 pb-4">
        <button onClick={() => navigate('/plan')} className="p-2 -ml-2 text-text-secondary">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-text-primary">
          Day {day.dayIndex + 1} — {day.label}
        </h1>
      </header>

      <div className="px-4 flex flex-col gap-4">
        {day.exerciseGroups.map((group, gi) => {
          if (group.isSuperset) {
            return (
              <div key={gi} className="border-2 border-accent rounded-3xl overflow-hidden">
                <p className="text-xs font-semibold text-accent uppercase tracking-widest px-5 pt-4 pb-2">
                  Superset
                </p>
                {group.exercises.map((ex, ei) => (
                  <ExerciseRow key={ei} ex={ex} libMap={libMap} last={ei === group.exercises.length - 1} />
                ))}
              </div>
            );
          }

          return group.exercises.map((ex, ei) => (
            <div key={`${gi}-${ei}`} className="bg-bg-card rounded-3xl overflow-hidden">
              <ExerciseRow ex={ex} libMap={libMap} last />
            </div>
          ));
        })}
      </div>
    </div>
  );
}

function ExerciseRow({ ex, libMap, last }) {
  const lib = libMap.get(ex.exerciseId);

  return (
    <Link
      to={`/exercises/${ex.exerciseId}`}
      className={`flex items-center gap-4 px-5 py-4 ${!last ? 'border-b border-bg-elevated' : ''}`}
    >
      {lib?.imageUrl ? (
        <img
          src={lib.imageUrl}
          alt={lib.name}
          className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 bg-bg-elevated"
          loading="lazy"
        />
      ) : (
        <div className="w-16 h-16 rounded-2xl bg-bg-elevated flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-text-primary truncate">
          {lib?.name ?? ex.exerciseId}
        </p>
        <p className="text-sm text-text-secondary mt-0.5">
          {ex.targetSets} × {ex.targetReps} · {ex.restSeconds}s rest
        </p>
      </div>

      <ChevronRight size={18} className="text-text-tertiary flex-shrink-0" />
    </Link>
  );
}
