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

  // ── workoutSessions: backfill 5b fields ─────────────────────────────────
  const sessions = await db.workoutSessions.toArray();
  let sessionsUpdated = 0;

  for (const session of sessions) {
    let changed = false;
    const s = { ...session };

    if (!Array.isArray(s.swappedExercises)) {
      s.swappedExercises = [];
      changed = true;
    }

    if (Array.isArray(s.loggedExercises)) {
      s.loggedExercises = s.loggedExercises.map(entry => {
        let eDirty = false;
        const e = { ...entry };

        if (e.note       === undefined) { e.note       = null;  eDirty = true; }
        if (e.skipped    === undefined) { e.skipped    = false; eDirty = true; }
        if (e.swappedFrom === undefined){ e.swappedFrom = null;  eDirty = true; }

        if (Array.isArray(e.sets)) {
          e.sets = e.sets.map(set => {
            let sDirty = false;
            const st = { ...set };
            if (st.rpe    === undefined) { st.rpe    = null;  sDirty = true; }
            if (st.failed === undefined) { st.failed = false; sDirty = true; }
            if (sDirty) eDirty = true;
            return sDirty ? st : set;
          });
        }

        if (eDirty) changed = true;
        return eDirty ? e : entry;
      });
    }

    if (changed) {
      await db.workoutSessions.put(s);
      sessionsUpdated++;
    }
  }

  if (sessions.length === 0) {
    console.log('Migration 5b: no workoutSessions records yet');
  } else if (sessionsUpdated === 0) {
    console.log('Migration 5b: workoutSessions — no changes needed');
  } else {
    console.warn(`Migration 5b: backfilled 5b fields on ${sessionsUpdated} workoutSession(s)`);
  }
}
