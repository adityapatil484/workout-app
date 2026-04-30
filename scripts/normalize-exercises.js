import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const SRC = '/tmp/free-exercise-db/dist/exercises.json';
const DEST = new URL('../src/data/exercises.json', import.meta.url).pathname;
const IMG_BASE = '/tmp/free-exercise-db/exercises';

const upstream = JSON.parse(readFileSync(SRC, 'utf8'));

const missingPrimary = [];
const missingImage = [];
const normalized = [];

for (const ex of upstream) {
  const primaryMuscle = ex.primaryMuscles?.[0] ?? null;
  if (!primaryMuscle) {
    missingPrimary.push(ex.id);
    console.warn(`WARN: no primaryMuscle for ${ex.id}`);
  }

  const imgPath = join(IMG_BASE, ex.id, '0.jpg');
  if (!existsSync(imgPath)) {
    missingImage.push(ex.id);
  }

  normalized.push({
    id:                 ex.id,
    name:               ex.name,
    primaryMuscle:      primaryMuscle,
    secondaryMuscles:   ex.secondaryMuscles ?? [],
    equipment:          ex.equipment ?? 'other',
    difficulty:         ex.level,
    category:           ex.category,
    mechanic:           ex.mechanic ?? null,
    force:              ex.force ?? null,
    isCompound:         ex.mechanic === 'compound',
    imageUrl:           `/exercise-images/${ex.id}/0.jpg`,
    videoUrl:           null,
    instructions:       ex.instructions ?? [],
    muscleMapHighlights: {
      primary:   primaryMuscle ? [primaryMuscle] : [],
      secondary: ex.secondaryMuscles ?? [],
    },
  });
}

writeFileSync(DEST, JSON.stringify(normalized, null, 2), 'utf8');

// --- summary report ---
const count = (arr, key) =>
  arr.reduce((acc, e) => {
    const v = e[key] ?? '(null)';
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});

const topN = (obj, n) =>
  Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => `  ${String(v).padStart(4)}  ${k}`)
    .join('\n');

console.log('\n========== NORMALIZATION REPORT ==========');
console.log(`Total entries written : ${normalized.length}`);

console.log('\n--- by category ---');
console.log(topN(count(normalized, 'category'), 20));

console.log('\n--- by equipment (top 10) ---');
console.log(topN(count(normalized, 'equipment'), 10));

console.log('\n--- by difficulty ---');
console.log(topN(count(normalized, 'difficulty'), 10));

const compound  = normalized.filter(e => e.isCompound).length;
const isolation = normalized.filter(e => e.mechanic === 'isolation').length;
const noMechanic = normalized.filter(e => !e.mechanic).length;
console.log('\n--- compound vs isolation ---');
console.log(`  ${String(compound).padStart(4)}  compound`);
console.log(`  ${String(isolation).padStart(4)}  isolation`);
console.log(`  ${String(noMechanic).padStart(4)}  no mechanic / null`);

console.log('\n--- missing primaryMuscle ---');
console.log(`  count : ${missingPrimary.length}`);
if (missingPrimary.length) console.log(`  first 5: ${missingPrimary.slice(0, 5).join(', ')}`);

console.log('\n--- missing 0.jpg on disk ---');
console.log(`  count : ${missingImage.length}`);
if (missingImage.length) console.log(`  first 5: ${missingImage.slice(0, 5).join(', ')}`);

console.log('==========================================\n');
