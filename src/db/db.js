import Dexie from 'dexie';

const db = new Dexie('WorkoutAppDB');

db.version(1).stores({
  userProfile:      'id',
  exerciseLibrary:  'id, name, primaryMuscle, equipment',
  plans:            '++id, isActive',
  workoutSessions:  '++id, date, planId',
  bodyWeightLog:    '++id, date',
  personalRecords:  'exerciseId',
  streakData:       'id',
});

export default db;
