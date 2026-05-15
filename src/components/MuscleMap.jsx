import Model from 'react-body-highlighter';

// Maps Free Exercise DB muscle names → react-body-highlighter muscle names.
// One-to-many: 'shoulders' highlights both front and back deltoids.
const MUSCLE_MAP = {
  'chest':       ['chest'],
  'shoulders':   ['front-deltoids', 'back-deltoids'],
  'biceps':      ['biceps'],
  'triceps':     ['triceps'],
  'forearms':    ['forearm'],
  'abdominals':  ['abs'],
  'quadriceps':  ['quadriceps'],
  'hamstrings':  ['hamstring'],
  'calves':      ['calves'],
  'glutes':      ['gluteal'],
  'lats':        ['upper-back'],
  'middle back': ['upper-back'],
  'lower back':  ['lower-back'],
  'traps':       ['trapezius'],
  'neck':        ['neck'],
  'abductors':   ['abductors'],
  'adductors':   ['adductor'],
};

// frequency 1 → index 0 → secondary (dim), frequency 2 → index 1 → primary (full)
const COLORS = ['rgba(0,217,163,0.35)', '#00D9A3'];

const MODEL_STYLE = { width: '52px' };

export default function MuscleMap({ primaryMuscle, secondaryMuscles = [], className = '' }) {
  const primaryMapped = MUSCLE_MAP[primaryMuscle] ?? [];
  const secondaryMapped = [
    ...new Set(secondaryMuscles.flatMap(m => MUSCLE_MAP[m] ?? [])),
  ].filter(m => !primaryMapped.includes(m));

  const data = [];
  if (primaryMapped.length > 0)   data.push({ name: 'primary',   muscles: primaryMapped,   frequency: 2 });
  if (secondaryMapped.length > 0) data.push({ name: 'secondary', muscles: secondaryMapped, frequency: 1 });

  return (
    <div className={`flex gap-1 ${className}`}>
      <Model data={data} type="anterior"  highlightedColors={COLORS} style={MODEL_STYLE} />
      <Model data={data} type="posterior" highlightedColors={COLORS} style={MODEL_STYLE} />
    </div>
  );
}
