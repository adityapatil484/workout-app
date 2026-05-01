import db from '../db/db.js';
import generatePlan from './planGenerator.js';

export async function setActivePlan(planId) {
  const all = await db.plans.toArray();
  await db.transaction('rw', db.plans, async () => {
    for (const plan of all) {
      const shouldBeActive = plan.id === planId;
      if (plan.isActive !== shouldBeActive) {
        await db.plans.update(plan.id, { isActive: shouldBeActive });
      }
    }
  });
}

export async function generateAndSaveActivePlan() {
  const [profile, library] = await Promise.all([
    db.userProfile.get(1),
    db.exerciseLibrary.toArray(),
  ]);
  const plan = generatePlan(profile, library);
  await db.plans.put(plan);
  await setActivePlan(plan.id);
  return plan;
}

export async function getActivePlan() {
  return await db.plans.filter(p => p.isActive === true).first() || null;
}
