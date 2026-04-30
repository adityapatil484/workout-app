import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft } from 'lucide-react';
import db from '../db/db.js';

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function ExerciseDetail() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();

  const exercise = useLiveQuery(
    () => db.exerciseLibrary.get(exerciseId),
    [exerciseId]
  );

  if (exercise === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen text-text-secondary">
        Loading...
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-text-secondary">
        <p>Exercise not found</p>
        <button
          onClick={() => navigate('/exercises')}
          className="text-accent text-sm underline"
        >
          Back to exercises
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-bg-base h-14 px-4 flex items-center">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="h-10 w-10 rounded-full bg-bg-elevated flex items-center justify-center"
        >
          <ChevronLeft size={28} className="text-text-primary" />
        </button>
      </div>

      {/* Title row: thumbnail + name/primary muscle */}
      <div className="flex items-center gap-4 px-6 pt-2">
        <img
          src={exercise.imageUrl}
          alt={exercise.name}
          className="h-20 w-20 rounded-2xl object-cover flex-shrink-0"
        />
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <h1 className="text-[22px] font-bold text-text-primary leading-tight">
            {exercise.name}
          </h1>
          {exercise.primaryMuscle && (
            <p className="text-sm text-text-secondary capitalize">
              {capitalize(exercise.primaryMuscle)}
            </p>
          )}
        </div>
      </div>

      {/* Pills */}
      <div className="px-6 pt-4">
        {exercise.secondaryMuscles?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {exercise.secondaryMuscles.map((m) => (
              <span
                key={m}
                className="bg-bg-elevated text-text-secondary rounded-full px-3 py-1 text-sm capitalize"
              >
                {capitalize(m)}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-2">
          {exercise.equipment && (
            <span className="bg-bg-card text-text-secondary rounded-full px-3 py-1 text-xs capitalize">
              {capitalize(exercise.equipment)}
            </span>
          )}
          {exercise.difficulty && (
            <span className="bg-bg-card text-text-secondary rounded-full px-3 py-1 text-xs capitalize">
              {capitalize(exercise.difficulty)}
            </span>
          )}
          {exercise.mechanic && (
            <span className="bg-bg-card text-text-secondary rounded-full px-3 py-1 text-xs capitalize">
              {capitalize(exercise.mechanic)}
            </span>
          )}
        </div>
      </div>

      {/* Instructions */}
      {exercise.instructions?.length > 0 && (
        <div className="px-6 pt-6 pb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Instructions
          </h2>
          <ol className="space-y-4">
            {exercise.instructions.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="h-7 w-7 rounded-full bg-bg-elevated text-accent text-sm font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-text-primary leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
