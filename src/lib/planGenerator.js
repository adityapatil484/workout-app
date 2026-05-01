const SPLIT_LABELS = {
  ppl:           'PPL',
  'upper-lower': 'Upper/Lower',
  'full-body':   'Full body',
  'bro-split':   'Bro split',
};

const GOAL_LABELS = {
  'fat-loss':       'Fat loss',
  'muscle-gain':    'Muscle gain',
  strength:         'Strength',
  endurance:        'Endurance',
  'general-fitness':'General fitness',
};

const SETS_REPS_REST = {
  strength:          { sets: 4, reps: '3-6',   rest: 180 },
  'muscle-gain':     { sets: 4, reps: '8-12',  rest: 90  },
  'fat-loss':        { sets: 3, reps: '12-15', rest: 60  },
  endurance:         { sets: 3, reps: '15-20', rest: 45  },
  'general-fitness': { sets: 3, reps: '8-12',  rest: 75  },
};

// Each entry: { muscle, max } — pick up to max exercises from this muscle per day.
const MUSCLE_TARGETS = {
  Push:      [{ muscle: 'chest', max: 2 }, { muscle: 'shoulders', max: 2 }, { muscle: 'triceps', max: 2 }],
  Pull:      [{ muscle: 'lats', max: 2 }, { muscle: 'middle back', max: 1 }, { muscle: 'biceps', max: 2 }, { muscle: 'traps', max: 1 }],
  Legs:      [{ muscle: 'quadriceps', max: 2 }, { muscle: 'hamstrings', max: 1 }, { muscle: 'glutes', max: 1 }, { muscle: 'calves', max: 1 }],
  Upper:     [{ muscle: 'chest', max: 2 }, { muscle: 'lats', max: 2 }, { muscle: 'shoulders', max: 1 }, { muscle: 'biceps', max: 1 }, { muscle: 'triceps', max: 1 }],
  Lower:     [{ muscle: 'quadriceps', max: 2 }, { muscle: 'hamstrings', max: 1 }, { muscle: 'glutes', max: 1 }, { muscle: 'calves', max: 1 }],
  Full:      [{ muscle: 'chest', max: 1 }, { muscle: 'lats', max: 1 }, { muscle: 'quadriceps', max: 1 }, { muscle: 'hamstrings', max: 1 }, { muscle: 'shoulders', max: 1 }, { muscle: 'triceps', max: 1 }, { muscle: 'biceps', max: 1 }],
  Chest:     [{ muscle: 'chest', max: 6 }],
  Back:      [{ muscle: 'lats', max: 3 }, { muscle: 'middle back', max: 2 }, { muscle: 'traps', max: 1 }],
  Shoulders: [{ muscle: 'shoulders', max: 6 }],
  Arms:      [{ muscle: 'biceps', max: 3 }, { muscle: 'triceps', max: 3 }],
  Abs:       [{ muscle: 'abdominals', max: 4 }],
};

function getDayLabels(splitType, frequency) {
  const f = Number(frequency) || 3;
  switch (splitType) {
    case 'ppl':
      if (f >= 6) return ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs', 'Rest'];
      if (f === 5) return ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Rest', 'Rest'];
      return            ['Push', 'Pull', 'Legs', 'Rest', 'Rest', 'Rest', 'Rest'];
    case 'upper-lower':
      if (f >= 4) return ['Upper', 'Lower', 'Rest', 'Upper', 'Lower', 'Rest', 'Rest'];
      return             ['Upper', 'Lower', 'Rest', 'Rest',  'Rest',  'Rest', 'Rest'];
    case 'full-body':
      if (f >= 4) return ['Full', 'Rest', 'Full', 'Rest', 'Full', 'Rest', 'Full'];
      return             ['Full', 'Rest', 'Full', 'Rest', 'Full', 'Rest', 'Rest'];
    case 'bro-split':
      if (f >= 6) return ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Abs',  'Rest'];
      return             ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Rest', 'Rest'];
    default:
      // Closest reasonable fallback: full body 3×/week
      return ['Full', 'Rest', 'Full', 'Rest', 'Full', 'Rest', 'Rest'];
  }
}

function getExerciseCount(sessionDuration) {
  const d = Number(sessionDuration) || 60;
  if (d <= 30) return 4;
  if (d <= 45) return 5;
  if (d <= 60) return 6;
  if (d <= 75) return 7;
  return 8;
}

function filterLibrary(library, userProfile) {
  const {
    equipmentAccess = 'full-gym',
    goal            = 'general-fitness',
    injuries        = '',
    blockedExercises = [],
  } = userProfile;

  const inj     = (injuries || '').toLowerCase();
  const blocked = new Set(blockedExercises);

  return library.filter(ex => {
    if (blocked.has(ex.id)) return false;

    // Equipment
    if (equipmentAccess === 'bodyweight' && ex.equipment !== 'body only') return false;
    if (equipmentAccess === 'home-dumbbells' && !['body only', 'dumbbell'].includes(ex.equipment)) return false;
    // 'full-gym', 'full gym' (post-migration), or anything else → no restriction

    // Category: exclude low-intensity categories for physique/strength goals
    if (['fat-loss', 'muscle-gain', 'strength'].includes(goal)) {
      if (['stretching', 'plyometrics'].includes(ex.category)) return false;
    }

    // Crude injury filters
    const name = ex.name.toLowerCase();
    if (inj.includes('knee')) {
      if (ex.primaryMuscle === 'quadriceps') return false;
      if (/squat|lunge|leap/.test(name))    return false;
    }
    if (inj.includes('shoulder')) {
      if (ex.primaryMuscle === 'shoulders') return false;
      if (/press|overhead/.test(name))      return false;
    }
    if (inj.includes('back')) {
      if (['lower back', 'middle back', 'lats'].includes(ex.primaryMuscle)) return false;
      if (/deadlift|row/.test(name))        return false;
    }
    if (inj.includes('wrist')) {
      if (/curl|press/.test(name))          return false;
    }

    return true;
  });
}

const CANONICAL_EXERCISE_IDS = new Set([
  // Chest — press
  'Barbell_Bench_Press_-_Medium_Grip',
  'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'Decline_Barbell_Bench_Press',
  'Close-Grip_Barbell_Bench_Press',
  'Dumbbell_Bench_Press',
  'Dumbbell_Incline_Press',
  'Dumbbell_Flyes',
  'Cable_Crossover',
  'Dips_-_Chest_Version',
  'Pushups',
  // Shoulders
  'Barbell_Shoulder_Press',
  'Dumbbell_Shoulder_Press',
  'Side_Lateral_Raise',
  'Seated_Side_Lateral_Raise',
  'Front_Dumbbell_Raise',
  'Face_Pull',
  'Bent_Over_Reverse_Fly',
  'Barbell_Shrug',
  'Dumbbell_Shrug',
  // Triceps
  'Triceps_Pushdown',
  'Triceps_Pushdown_-_Rope_Attachment',
  'Dips_-_Triceps_Version',
  'Bench_Dips',
  'Lying_Triceps_Press',
  'Cable_Rope_Overhead_Triceps_Extension',
  'Skullcrusher',
  // Back — pull
  'Pullups',
  'Chin-Up',
  'Wide-Grip_Lat_Pulldown',
  'Close-Grip_Front_Lat_Pulldown',
  'Bent_Over_Barbell_Row',
  'Bent_Over_Two-Dumbbell_Row',
  'Seated_Cable_Rows',
  'T-Bar_Row',
  'Barbell_Deadlift',
  // Biceps
  'Barbell_Curl',
  'Dumbbell_Bicep_Curl',
  'Hammer_Curls',
  'Cable_Preacher_Curl',
  'Dumbbell_Alternate_Bicep_Curl',
  // Legs — quads/glutes
  'Barbell_Squat',
  'Barbell_Full_Squat',
  'Bodyweight_Squat',
  'Leg_Press',
  'Dumbbell_Lunges',
  'Barbell_Lunge',
  'Leg_Extensions',
  // Legs — hamstrings/glutes
  'Romanian_Deadlift',
  'Lying_Leg_Curls',
  'Seated_Leg_Curl',
  'Barbell_Hip_Thrust',
  // Calves
  'Standing_Calf_Raises',
  'Seated_Calf_Raise',
  'Donkey_Calf_Raises',
  // Abs/core
  'Plank',
  'Hanging_Leg_Raise',
  'Cable_Crunch',
  'Crunches',
]);

function sortCandidates(candidates, experienceLevel) {
  return [...candidates].sort((a, b) => {
    // 1. Compounds before isolation
    const compDiff = (a.isCompound ? 0 : 1) - (b.isCompound ? 0 : 1);
    if (compDiff !== 0) return compDiff;
    // 2. Canonical before non-canonical
    const canDiff = (CANONICAL_EXERCISE_IDS.has(a.id) ? 0 : 1) - (CANONICAL_EXERCISE_IDS.has(b.id) ? 0 : 1);
    if (canDiff !== 0) return canDiff;
    // 3. Prefer matching difficulty
    return (a.difficulty === experienceLevel ? 0 : 1) - (b.difficulty === experienceLevel ? 0 : 1);
  });
}

function buildExerciseGroups(dayLabel, filteredLibrary, userProfile) {
  const targets    = MUSCLE_TARGETS[dayLabel] || [];
  const totalCount = getExerciseCount(userProfile.sessionDuration);
  const params     = SETS_REPS_REST[userProfile.goal] || SETS_REPS_REST['general-fitness'];

  const usedIds = new Set();
  const picked  = [];

  for (const { muscle, max } of targets) {
    if (picked.length >= totalCount) break;

    const candidates = filteredLibrary.filter(
      ex => ex.primaryMuscle === muscle && !usedIds.has(ex.id)
    );

    if (candidates.length === 0) {
      console.warn(`planGenerator: no candidates for muscle "${muscle}" on "${dayLabel}" day`);
      continue;
    }

    const sorted = sortCandidates(candidates, userProfile.experienceLevel);
    const n = Math.min(max, sorted.length, totalCount - picked.length);

    for (let i = 0; i < n; i++) {
      usedIds.add(sorted[i].id);
      picked.push(sorted[i]);
    }
  }

  return picked.map(ex => ({
    isSuperset: false,
    exercises: [{
      exerciseId:  ex.id,
      targetSets:  params.sets,
      targetReps:  params.reps,
      restSeconds: params.rest,
    }],
  }));
}

export default function generatePlan(userProfile, exerciseLibrary) {
  const splitType = userProfile.splitType || 'full-body';
  const frequency = Number(userProfile.workoutFrequency) || 3;

  const dayLabels      = getDayLabels(splitType, frequency);
  const filteredLibrary = filterLibrary(exerciseLibrary || [], userProfile);

  const days = dayLabels.map((label, index) => {
    if (label === 'Rest') {
      return { dayIndex: index, label: 'Rest', isRestDay: true, exerciseGroups: [] };
    }
    return {
      dayIndex: index,
      label,
      isRestDay: false,
      exerciseGroups: buildExerciseGroups(label, filteredLibrary, userProfile),
    };
  });

  const splitLabel = SPLIT_LABELS[splitType] || splitType;
  const goalLabel  = GOAL_LABELS[userProfile.goal] || userProfile.goal || 'General fitness';

  return {
    id:         `plan_${Date.now()}`,
    name:       `${splitLabel} — ${goalLabel}`,
    splitType,
    daysPerWeek: frequency,
    phases:     [],
    days,
    isActive:   true,
    createdAt:  new Date().toISOString(),
  };
}
