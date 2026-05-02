import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getActivePlan } from '../lib/planStorage.js';
import db from '../db/db.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function todayDayIndex() {
  // JS: 0=Sun,1=Mon,...,6=Sat  →  app: Mon=0,...,Sat=5,Sun=6
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function formatDate(d) {
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function Today() {
  const [plan, setPlan]     = useState(undefined);
  const [libMap, setLibMap] = useState(new Map());
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getActivePlan(),
      db.exerciseLibrary.toArray(),
    ]).then(([p, lib]) => {
      setPlan(p ?? null);
      setLibMap(new Map(lib.map(ex => [ex.id, ex])));
    });
  }, []);

  if (plan === undefined) return null;

  const dateStr = formatDate(new Date());

  /* ── STATE 1 — No active plan ────────────────────────────── */
  if (!plan) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center px-6 gap-3">
        <h1 className="text-[28px] font-bold text-text-primary">No plan yet</h1>
        <p className="text-text-secondary text-sm mb-4">Generate one to get started</p>
        <Link
          to="/plan"
          className="w-full max-w-xs bg-accent text-bg-base font-semibold rounded-full py-4 text-center block"
        >
          Generate plan
        </Link>
      </div>
    );
  }

  const idx = todayDayIndex();
  const day = plan.days.find(d => d.dayIndex === idx);

  /* ── STATE 2 — Rest day ──────────────────────────────────── */
  if (!day || day.isRestDay) {
    return (
      <div className="min-h-screen bg-bg-base px-6 pt-12">
        <h2 className="text-xl font-semibold text-text-primary">Today</h2>
        <p className="text-text-secondary text-sm mt-1">{dateStr}</p>

        <div className="mt-8 bg-bg-card rounded-3xl p-8 flex flex-col items-center text-center gap-3">
          <p className="text-[28px] font-bold text-text-primary">Rest day</p>
          <p className="text-text-secondary text-sm leading-relaxed">
            Recovery is part of the program. See you tomorrow.
          </p>
        </div>
      </div>
    );
  }

  /* ── STATE 3 — Training day ──────────────────────────────── */
  return (
    <div className="min-h-screen bg-bg-base pb-28">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <h2 className="text-xl font-semibold text-text-primary">Today</h2>
        <p className="text-text-secondary text-sm mt-1">{dateStr}</p>
      </div>

      {/* Day label */}
      <div className="px-6 mb-5">
        <h1 className="text-[28px] font-bold text-text-primary">{day.label}</h1>
      </div>

      {/* Exercise list */}
      <div className="px-4 flex flex-col gap-3">
        {day.exerciseGroups.map((group, gi) =>
          group.exercises.map((ex, ei) => {
            const lib = libMap.get(ex.exerciseId);
            return (
              <Link
                key={`${gi}-${ei}`}
                to={`/exercises/${ex.exerciseId}`}
                className="bg-bg-card rounded-2xl p-4 flex items-center gap-4"
              >
                {lib?.imageUrl ? (
                  <img
                    src={lib.imageUrl}
                    alt={lib.name}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-bg-elevated"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-bg-elevated flex-shrink-0" />
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
          })
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-20 left-0 right-0 px-4">
        <button
          onClick={async () => {
            const activePlan = await getActivePlan();
            const dayIndex   = todayDayIndex();
            const dateStr    = todayISODate();

            const inProgress = await db.workoutSessions
              .filter(s =>
                s.planId    === activePlan.id &&
                s.dayIndex  === dayIndex      &&
                s.date      === dateStr       &&
                (s.finishedAt === null || s.finishedAt === undefined)
              )
              .first();

            if (inProgress) {
              const age = Date.now() - new Date(inProgress.startedAt).getTime();
              if (age < 24 * 60 * 60 * 1000) {
                navigate(`/log/${inProgress.id}`);
                return;
              }
              // Stale session — close it out
              const fakeFinish = new Date(new Date(inProgress.startedAt).getTime() + 60 * 60 * 1000).toISOString();
              await db.workoutSessions.update(inProgress.id, { finishedAt: fakeFinish, duration: 3600 });
            }

            navigate('/log/new');
          }}
          className="w-full bg-accent text-bg-base font-semibold rounded-full py-4"
        >
          Start workout
        </button>
      </div>
    </div>
  );
}
