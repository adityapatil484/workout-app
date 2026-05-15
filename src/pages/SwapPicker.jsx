import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { CANONICAL_EXERCISE_IDS } from '../lib/planGenerator.js';
import db from '../db/db.js';

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function equipmentAllowed(ex, equipmentAccess) {
  if (equipmentAccess === 'bodyweight')     return ex.equipment === 'body only';
  if (equipmentAccess === 'home-dumbbells') return ['body only', 'dumbbell'].includes(ex.equipment);
  return true; // full-gym or anything else
}

export default function SwapPicker() {
  const { sessionId, exerciseId } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading]       = useState(true);
  const [currentEx, setCurrentEx]       = useState(null);
  const [alternatives, setAlternatives] = useState([]);

  useEffect(() => {
    async function load() {
      const [ex, library, profile] = await Promise.all([
        db.exerciseLibrary.get(exerciseId),
        db.exerciseLibrary.toArray(),
        db.userProfile.get(1),
      ]);

      setCurrentEx(ex ?? null);

      if (!ex) { setIsLoading(false); return; }

      const blocked = new Set(profile?.blockedExercises ?? []);
      const access  = profile?.equipmentAccess ?? 'full-gym';

      const filtered = library.filter(e =>
        e.primaryMuscle === ex.primaryMuscle &&
        e.id !== exerciseId                  &&
        !blocked.has(e.id)                   &&
        equipmentAllowed(e, access)
      );

      filtered.sort((a, b) => {
        const canA = CANONICAL_EXERCISE_IDS.has(a.id) ? 0 : 1;
        const canB = CANONICAL_EXERCISE_IDS.has(b.id) ? 0 : 1;
        if (canA !== canB) return canA - canB;
        return a.name.localeCompare(b.name);
      });

      setAlternatives(filtered);
      setIsLoading(false);
    }
    load();
  }, [exerciseId]);

  async function handleSelect(replacementId) {
    const session = await db.workoutSessions.get(sessionId);
    if (!session) return;

    const existing    = session.loggedExercises ?? [];
    const origIdx     = existing.findIndex(e => e.exerciseId === exerciseId);
    const origEntry   = origIdx >= 0 ? existing[origIdx] : null;
    const atSetIndex  = origEntry?.sets?.filter(s => s.completed).length ?? 0;

    const newEntry = {
      exerciseId:  replacementId,
      note:        null,
      skipped:     false,
      swappedFrom: exerciseId,
      sets:        [],
    };

    const updatedLogged = origIdx >= 0
      ? existing.map((e, i) => i === origIdx ? newEntry : e)
      : [...existing, newEntry];

    const updatedSwapped = [
      ...(session.swappedExercises ?? []),
      { originalExerciseId: exerciseId, replacementExerciseId: replacementId, atSetIndex },
    ];

    await db.workoutSessions.update(sessionId, {
      loggedExercises:  updatedLogged,
      swappedExercises: updatedSwapped,
    });

    navigate(`/log/${sessionId}/exercise/${replacementId}`, { replace: true });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <p className="text-text-secondary">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-secondary" aria-label="Back">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold text-text-primary">
          Swap {currentEx?.name ?? exerciseId}
        </h1>
      </div>

      <p className="px-5 pb-3 text-text-secondary text-sm">
        {alternatives.length} alternative{alternatives.length !== 1 ? 's' : ''}
      </p>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {alternatives.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 gap-4 text-center">
            <p className="text-text-secondary text-sm px-8">
              No alternatives available with your current equipment access.
            </p>
            <button
              onClick={() => navigate(-1)}
              className="bg-bg-elevated text-text-primary font-medium rounded-full px-6 py-3 text-sm"
            >
              Go back
            </button>
          </div>
        ) : (
          alternatives.map(alt => (
            <button
              key={alt.id}
              onClick={() => handleSelect(alt.id)}
              className="w-full bg-bg-card rounded-2xl p-4 mb-2 flex items-center gap-4 text-left"
            >
              {alt.imageUrl ? (
                <img
                  src={alt.imageUrl}
                  alt={alt.name}
                  className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 bg-bg-elevated"
                  loading="lazy"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-bg-elevated flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">{alt.name}</p>
                <p className="text-sm text-text-secondary mt-0.5">{capitalize(alt.primaryMuscle)}</p>
              </div>
              <ChevronRight size={18} className="text-text-tertiary flex-shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
