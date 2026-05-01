import db from './db.js';

export async function runMigrations() {
  const profile = await db.userProfile.get(1);
  if (!profile) return;

  const updated = { ...profile };
  let dirty = false;

  if (updated.equipmentAccess === 'custom') {
    console.warn('Migration: equipmentAccess "custom" → "full-gym"');
    updated.equipmentAccess = 'full-gym';
    dirty = true;
  }

  // Fix stale 'full gym' (space) written by a previous migration run
  if (updated.equipmentAccess === 'full gym') {
    console.warn('Migration: equipmentAccess "full gym" → "full-gym"');
    updated.equipmentAccess = 'full-gym';
    dirty = true;
  }

  if (updated.blockedExercises === undefined) {
    updated.blockedExercises = [];
    dirty = true;
  }

  if (dirty) await db.userProfile.put(updated);
}
