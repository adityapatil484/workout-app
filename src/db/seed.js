import db from './db.js';
import exercises from '../data/exercises.json';

export async function seedExerciseLibrary() {
  try {
    const count = await db.exerciseLibrary.count();
    if (count === 0) {
      console.log('Seeding exercise library...');
      await db.exerciseLibrary.bulkAdd(exercises);
      console.log(`✅ Seeded ${exercises.length} exercises`);
    } else {
      console.log(`Exercise library already seeded (${count} entries), skipping.`);
    }
  } catch (err) {
    console.error('Failed to seed exercise library:', err);
  }
}
