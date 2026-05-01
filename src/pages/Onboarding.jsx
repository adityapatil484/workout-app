import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../db/db.js';

const STEPS = [
  { id: 'basics',             title: 'Basics' },
  { id: 'body-goal',          title: 'Body & goal' },
  { id: 'schedule-equipment', title: 'Schedule & equipment' },
  { id: 'injuries',           title: 'Injuries' },
  { id: 'split',              title: 'Split preference' },
  { id: 'review',             title: 'Review' },
];

const SEX_OPTIONS = [
  { label: 'Male',              value: 'male' },
  { label: 'Female',            value: 'female' },
  { label: 'Other',             value: 'other' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
];

function FieldLabel({ children }) {
  return (
    <p className="text-xs text-text-secondary uppercase tracking-widest mb-1">
      {children}
    </p>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-xs mt-1" style={{ color: '#FF453A' }}>{msg}</p>;
}

function PillButton({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        selected ? 'bg-accent text-bg-base' : 'bg-bg-elevated text-text-primary'
      }`}
    >
      {label}
    </button>
  );
}

function cmToFtIn(cm) {
  const totalIn = cm / 2.54;
  return { ft: Math.floor(totalIn / 12), inches: Math.round(totalIn % 12) };
}
function ftInToTotalIn(ft, inches) {
  return (parseInt(ft) || 0) * 12 + (parseInt(inches) || 0);
}
function kgToLbs(kg) {
  return Math.round(kg * 2.20462 * 10) / 10;
}
function lbsToKg(lbs) {
  return Math.round((lbs / 2.20462) * 10) / 10;
}

function BasicsStep({ profileDraft, setField }) {
  const [errors, setErrors]   = useState({});
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');

  useEffect(() => {
    if (!profileDraft.weightUnits) setField('weightUnits', 'kg');
    if (!profileDraft.heightUnits) setField('heightUnits', 'cm');
    if (profileDraft.heightUnits === 'ft' && profileDraft.height) {
      const total = parseFloat(profileDraft.height) || 0;
      setHeightFt(String(Math.floor(total / 12)));
      setHeightIn(String(Math.round(total % 12)));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const weightUnits = profileDraft.weightUnits || 'kg';
  const heightUnits = profileDraft.heightUnits || 'cm';

  function handleWeightUnitsChange(newUnits) {
    if (newUnits === weightUnits) return;
    const w = parseFloat(profileDraft.weight);
    if (!isNaN(w) && w > 0) {
      setField('weight', String(
        weightUnits === 'kg' ? kgToLbs(w) : lbsToKg(w)
      ));
    }
    setField('weightUnits', newUnits);
  }

  function handleHeightUnitsChange(newUnits) {
    if (newUnits === heightUnits) return;
    if (heightUnits === 'cm' && newUnits === 'ft') {
      const cm = parseFloat(profileDraft.height) || 0;
      if (cm) {
        const { ft, inches } = cmToFtIn(cm);
        setHeightFt(String(ft));
        setHeightIn(String(inches));
        setField('height', String(ftInToTotalIn(ft, inches)));
      } else {
        setHeightFt('');
        setHeightIn('');
        setField('height', '');
      }
    } else {
      const totalIn = parseFloat(profileDraft.height) || 0;
      setField('height', totalIn ? String(Math.round(totalIn * 2.54)) : '');
      setHeightFt('');
      setHeightIn('');
    }
    setField('heightUnits', newUnits);
  }

  function handleFtChange(val) {
    setHeightFt(val);
    setField('height', String(ftInToTotalIn(val, heightIn)));
  }
  function handleInChange(val) {
    setHeightIn(val);
    setField('height', String(ftInToTotalIn(heightFt, val)));
  }

  function validate() {
    const e = {};

    if (!profileDraft.name?.trim()) e.name = 'Required';

    const age = parseInt(profileDraft.age);
    if (profileDraft.age === '' || profileDraft.age == null) {
      e.age = 'Required';
    } else if (isNaN(age) || age < 13 || age > 100) {
      e.age = 'Must be between 13 and 100';
    }

    if (!profileDraft.sex) e.sex = 'Required';

    if (heightUnits === 'ft') {
      if (heightFt === '' || heightFt == null) {
        e.height = 'Required';
      } else if (heightIn === '' || heightIn == null) {
        e.height = 'Enter inches (use 0 if none)';
      } else if (ftInToTotalIn(heightFt, heightIn) <= 0) {
        e.height = 'Must be greater than 0';
      }
    } else {
      const h = parseFloat(profileDraft.height);
      if (profileDraft.height === '' || profileDraft.height == null) {
        e.height = 'Required';
      } else if (isNaN(h) || h <= 0) {
        e.height = 'Must be greater than 0';
      }
    }

    const w = parseFloat(profileDraft.weight);
    if (profileDraft.weight === '' || profileDraft.weight == null) {
      e.weight = 'Required';
    } else if (isNaN(w) || w <= 0) {
      e.weight = 'Must be greater than 0';
    }

    return e;
  }

  BasicsStep._validate = () => {
    const e = validate();
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const inputClass =
    'w-full bg-bg-elevated text-text-primary rounded-2xl p-4 min-h-[48px] outline-none placeholder-text-tertiary text-sm';

  return (
    <div className="w-full max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary mb-1">
        Tell us about yourself
      </h1>
      <p className="text-text-secondary text-sm mb-6">
        Just the basics to get started.
      </p>

      <div className="flex flex-col gap-4">
        {/* Name */}
        <div>
          <FieldLabel>Name</FieldLabel>
          <input
            type="text"
            className={inputClass}
            placeholder="Your name"
            value={profileDraft.name || ''}
            onChange={(e) => setField('name', e.target.value)}
          />
          <FieldError msg={errors.name} />
        </div>

        {/* Age */}
        <div>
          <FieldLabel>Age</FieldLabel>
          <input
            type="number"
            className={inputClass}
            placeholder="e.g. 28"
            value={profileDraft.age ?? ''}
            onChange={(e) => setField('age', e.target.value)}
          />
          <FieldError msg={errors.age} />
        </div>

        {/* Sex */}
        <div>
          <FieldLabel>Sex</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {SEX_OPTIONS.map(({ label, value }) => (
              <PillButton
                key={value}
                label={label}
                selected={profileDraft.sex === value}
                onClick={() => setField('sex', value)}
              />
            ))}
          </div>
          <FieldError msg={errors.sex} />
        </div>

        {/* Height units + Weight units side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Height units</FieldLabel>
            <div className="flex gap-2">
              <PillButton
                label="cm"
                selected={heightUnits === 'cm'}
                onClick={() => handleHeightUnitsChange('cm')}
              />
              <PillButton
                label="ft + in"
                selected={heightUnits === 'ft'}
                onClick={() => handleHeightUnitsChange('ft')}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Weight units</FieldLabel>
            <div className="flex gap-2">
              {['kg', 'lbs'].map((u) => (
                <PillButton
                  key={u}
                  label={u}
                  selected={weightUnits === u}
                  onClick={() => handleWeightUnitsChange(u)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Height + Weight inputs */}
        <div className="grid grid-cols-2 gap-4">
          {/* Height */}
          <div>
            {heightUnits === 'cm' ? (
              <>
                <FieldLabel>Height (cm)</FieldLabel>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="e.g. 175"
                  value={profileDraft.height ?? ''}
                  onChange={(e) => setField('height', e.target.value)}
                />
              </>
            ) : (
              <>
                <FieldLabel>Height</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <FieldLabel>ft</FieldLabel>
                    <input
                      type="number"
                      className={inputClass}
                      placeholder="5"
                      value={heightFt}
                      onChange={(e) => handleFtChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel>in</FieldLabel>
                    <input
                      type="number"
                      className={inputClass}
                      placeholder="9"
                      value={heightIn}
                      onChange={(e) => handleInChange(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
            <FieldError msg={errors.height} />
          </div>

          {/* Weight */}
          <div>
            <FieldLabel>Weight ({weightUnits})</FieldLabel>
            <input
              type="number"
              className={inputClass}
              placeholder={weightUnits === 'kg' ? 'e.g. 75' : 'e.g. 165'}
              value={profileDraft.weight ?? ''}
              onChange={(e) => setField('weight', e.target.value)}
            />
            <FieldError msg={errors.weight} />
          </div>
        </div>
      </div>
    </div>
  );
}

const BODY_TYPES = [
  { label: 'Fat',        value: 'fat' },
  { label: 'Obese',      value: 'obese' },
  { label: 'Skinny fat', value: 'skinny-fat' },
  { label: 'Skinny',     value: 'skinny' },
  { label: 'Lean',       value: 'lean' },
  { label: 'Bulky',      value: 'bulky' },
];

const GOALS = [
  { label: 'Fat loss',       value: 'fat-loss',       sub: 'Lose fat, keep muscle' },
  { label: 'Muscle gain',    value: 'muscle-gain',    sub: 'Build size and mass' },
  { label: 'Strength',       value: 'strength',       sub: 'Get stronger on big lifts' },
  { label: 'General fitness',value: 'general-fitness',sub: 'Stay healthy and active' },
  { label: 'Endurance',      value: 'endurance',      sub: 'Build stamina and conditioning' },
];

const EXPERIENCE_LEVELS = [
  { label: 'Beginner',     value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced',     value: 'advanced' },
];

function BodyGoalStep({ profileDraft, setField }) {
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!profileDraft.bodyType)       e.bodyType = 'Pick one';
    if (!profileDraft.goal)           e.goal = 'Pick one';
    if (!profileDraft.experienceLevel) e.experienceLevel = 'Pick one';
    return e;
  }

  BodyGoalStep._validate = () => {
    const e = validate();
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary mb-1">
        Your body and goal
      </h1>
      <p className="text-text-secondary text-sm mb-6">
        Helps us tailor your plan.
      </p>

      <div className="flex flex-col gap-8">
        {/* Body type */}
        <div>
          <FieldLabel>Body type</FieldLabel>
          <div className="grid grid-cols-2 gap-3 mt-1">
            {BODY_TYPES.map(({ label, value }) => {
              const selected = profileDraft.bodyType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setField('bodyType', value)}
                  className={`rounded-2xl p-4 min-h-[56px] text-sm font-medium text-center transition-colors ${
                    selected
                      ? 'bg-accent text-bg-base'
                      : 'bg-bg-elevated text-text-primary'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <FieldError msg={errors.bodyType} />
        </div>

        {/* Goal */}
        <div>
          <FieldLabel>Goal</FieldLabel>
          <div className="flex flex-col gap-3 mt-1">
            {GOALS.map(({ label, value, sub }) => {
              const selected = profileDraft.goal === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setField('goal', value)}
                  className={`rounded-2xl p-4 text-left transition-colors ${
                    selected ? 'bg-accent' : 'bg-bg-elevated'
                  }`}
                >
                  <p className={`text-sm font-semibold ${selected ? 'text-bg-base' : 'text-text-primary'}`}>
                    {label}
                  </p>
                  <p className={`text-xs mt-0.5 ${selected ? 'text-bg-base opacity-75' : 'text-text-secondary'}`}>
                    {sub}
                  </p>
                </button>
              );
            })}
          </div>
          <FieldError msg={errors.goal} />
        </div>

        {/* Experience level */}
        <div>
          <FieldLabel>Experience level</FieldLabel>
          <div className="flex gap-2 mt-1">
            {EXPERIENCE_LEVELS.map(({ label, value }) => (
              <PillButton
                key={value}
                label={label}
                selected={profileDraft.experienceLevel === value}
                onClick={() => setField('experienceLevel', value)}
              />
            ))}
          </div>
          <FieldError msg={errors.experienceLevel} />
        </div>
      </div>
    </div>
  );
}

const DURATIONS = [30, 45, 60, 75, 90, 120];

const EQUIPMENT_OPTIONS = [
  { label: 'Full gym',        value: 'full-gym',        sub: 'Barbells, machines, cables, the works' },
  { label: 'Home dumbbells',  value: 'home-dumbbells',  sub: 'Adjustable or fixed dumbbells, maybe a bench' },
  { label: 'Bodyweight only', value: 'bodyweight',      sub: 'No equipment, just you' },
  { label: 'Custom set',      value: 'custom',          sub: 'Pick what I have later' },
];

function ScheduleEquipmentStep({ profileDraft, setField }) {
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!profileDraft.workoutFrequency) e.workoutFrequency = 'Pick one';
    if (!profileDraft.sessionDuration)  e.sessionDuration  = 'Pick one';
    if (!profileDraft.equipmentAccess)  e.equipmentAccess  = 'Pick one';
    return e;
  }

  ScheduleEquipmentStep._validate = () => {
    const e = validate();
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary mb-1">
        Your schedule
      </h1>
      <p className="text-text-secondary text-sm mb-6">
        How often, how long, and what you've got.
      </p>

      <div className="flex flex-col gap-8">
        {/* Frequency */}
        <div>
          <FieldLabel>Days per week</FieldLabel>
          <div className="flex flex-wrap gap-2 mt-1">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setField('workoutFrequency', n)}
                className={`rounded-full min-w-[44px] py-2 px-3 text-sm font-medium transition-colors ${
                  profileDraft.workoutFrequency === n
                    ? 'bg-accent text-bg-base'
                    : 'bg-bg-elevated text-text-primary'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <FieldError msg={errors.workoutFrequency} />
        </div>

        {/* Duration */}
        <div>
          <FieldLabel>Session duration</FieldLabel>
          <div className="flex flex-wrap gap-2 mt-1">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setField('sessionDuration', d)}
                className={`rounded-full py-2 px-4 text-sm font-medium transition-colors ${
                  profileDraft.sessionDuration === d
                    ? 'bg-accent text-bg-base'
                    : 'bg-bg-elevated text-text-primary'
                }`}
              >
                {d} min
              </button>
            ))}
          </div>
          <FieldError msg={errors.sessionDuration} />
        </div>

        {/* Equipment */}
        <div>
          <FieldLabel>Equipment</FieldLabel>
          <div className="flex flex-col gap-3 mt-1">
            {EQUIPMENT_OPTIONS.map(({ label, value, sub }) => {
              const selected = profileDraft.equipmentAccess === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setField('equipmentAccess', value)}
                  className={`rounded-2xl p-4 text-left transition-colors ${
                    selected ? 'bg-accent' : 'bg-bg-elevated'
                  }`}
                >
                  <p className={`text-sm font-semibold ${selected ? 'text-bg-base' : 'text-text-primary'}`}>
                    {label}
                  </p>
                  <p className={`text-xs mt-0.5 ${selected ? 'text-bg-base opacity-75' : 'text-text-secondary'}`}>
                    {sub}
                  </p>
                </button>
              );
            })}
          </div>
          <FieldError msg={errors.equipmentAccess} />
        </div>
      </div>
    </div>
  );
}

const SPLITS = [
  { label: 'Full body',          value: 'full-body',    sub: 'Train all major muscles each session. Great for 2–3 days/week.' },
  { label: 'Upper / lower',      value: 'upper-lower',  sub: 'Alternate upper-body and lower-body days. Great for 4 days/week.' },
  { label: 'Push / pull / legs', value: 'ppl',          sub: 'Split by movement pattern across 3 or 6 days. Great for 5–6 days/week.' },
  { label: 'Bro split',          value: 'bro-split',    sub: 'One muscle group per day. Higher frequency, more isolation.' },
  { label: 'Custom',             value: 'custom',       sub: 'I\'ll build my own split.' },
];

function getRecommendedSplit(frequency, experience) {
  if (!frequency || !experience) return null;
  if (frequency <= 3) return 'full-body';
  if (frequency === 4) return 'upper-lower';
  if (frequency === 5) return 'ppl';
  if (frequency === 6) return 'ppl';
  if (frequency === 7) return 'ppl';
  return 'full-body';
}

function SplitStep({ profileDraft, setField }) {
  const [errors, setErrors] = useState({});

  const recommended = getRecommendedSplit(
    profileDraft.workoutFrequency,
    profileDraft.experienceLevel,
  );

  function validate() {
    const e = {};
    if (!profileDraft.splitType) e.splitType = 'Pick one';
    return e;
  }

  SplitStep._validate = () => {
    const e = validate();
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary mb-1">
        Pick a split
      </h1>
      <p className="text-text-secondary text-sm mb-6">
        How your training week is structured. We've recommended one based on your schedule.
      </p>

      <div className="flex flex-col gap-3">
        {SPLITS.map(({ label, value, sub }) => {
          const selected    = profileDraft.splitType === value;
          const isRecommended = recommended === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setField('splitType', value)}
              className={`relative rounded-2xl p-4 text-left transition-colors ${
                selected ? 'bg-accent' : 'bg-bg-elevated'
              }`}
            >
              {isRecommended && (
                <span className={`absolute top-3 right-3 rounded-full px-2 py-0.5 text-xs font-medium ${
                  selected ? 'bg-bg-base text-accent' : 'bg-accent text-bg-base'
                }`}>
                  Recommended
                </span>
              )}
              <p className={`text-sm font-semibold pr-24 ${selected ? 'text-bg-base' : 'text-text-primary'}`}>
                {label}
              </p>
              <p className={`text-xs mt-0.5 ${selected ? 'text-bg-base opacity-75' : 'text-text-secondary'}`}>
                {sub}
              </p>
            </button>
          );
        })}
      </div>
      <FieldError msg={errors.splitType} />
    </div>
  );
}

function InjuriesStep({ profileDraft, setField }) {
  return (
    <div className="w-full max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary mb-1">
        Any injuries?
      </h1>
      <p className="text-text-secondary text-sm mb-6">
        We'll avoid exercises that aggravate them. Skip if none.
      </p>

      <div>
        <FieldLabel>Injuries or limitations</FieldLabel>
        <textarea
          className="w-full bg-bg-elevated text-text-primary rounded-2xl p-4 min-h-[120px] outline-none placeholder-text-tertiary text-sm resize-none"
          placeholder="e.g. Lower back pain on heavy squats, left shoulder tweaks on overhead press"
          value={profileDraft.injuries || ''}
          onChange={(e) => setField('injuries', e.target.value)}
        />
        <p className="text-xs text-text-tertiary mt-2">
          Optional. Plain English is fine — we'll match keywords against exercises.
        </p>
      </div>
    </div>
  );
}

const SEX_LABELS        = { male: 'Male', female: 'Female', other: 'Other', 'prefer-not-to-say': 'Prefer not to say' };
const BODY_TYPE_LABELS  = { fat: 'Fat', obese: 'Obese', 'skinny-fat': 'Skinny fat', skinny: 'Skinny', lean: 'Lean', bulky: 'Bulky' };
const GOAL_LABELS       = { 'fat-loss': 'Fat loss', 'muscle-gain': 'Muscle gain', strength: 'Strength', 'general-fitness': 'General fitness', endurance: 'Endurance' };
const EXPERIENCE_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const EQUIPMENT_LABELS  = { 'full-gym': 'Full gym', 'home-dumbbells': 'Home dumbbells', bodyweight: 'Bodyweight only', custom: 'Custom set' };
const SPLIT_LABELS      = { 'full-body': 'Full body', 'upper-lower': 'Upper / lower', ppl: 'Push / pull / legs', 'bro-split': 'Bro split', custom: 'Custom' };

function formatHeight(profileDraft) {
  const { heightUnits, height } = profileDraft;
  if (!height && height !== 0) return '—';
  if (heightUnits === 'ft') {
    const total = parseInt(height) || 0;
    const ft = Math.floor(total / 12);
    const inches = total % 12;
    return `${ft}' ${inches}"`;
  }
  return `${height} cm`;
}

function ReviewRow({ label, value, dim }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className={`text-sm text-right ${dim ? 'text-text-tertiary' : 'text-text-primary'}`}>
        {value}
      </span>
    </div>
  );
}

function ReviewCard({ title, children }) {
  return (
    <div className="bg-bg-card rounded-2xl p-5">
      <p className="text-xs text-text-secondary uppercase tracking-widest mb-3">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function ReviewStep({ profileDraft }) {
  const d = profileDraft;
  const noInjuries = !d.injuries?.trim();

  return (
    <div className="w-full max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary mb-1">
        Looks good?
      </h1>
      <p className="text-text-secondary text-sm mb-6">
        Review your details. You can go back to edit anything.
      </p>

      <div className="flex flex-col gap-4">
        <ReviewCard title="Basics">
          <ReviewRow label="Name"   value={d.name || '—'} />
          <ReviewRow label="Age"    value={d.age  || '—'} />
          <ReviewRow label="Sex"    value={SEX_LABELS[d.sex] || '—'} />
          <ReviewRow label="Height" value={formatHeight(d)} />
          <ReviewRow label="Weight" value={d.weight ? `${d.weight} ${d.weightUnits || 'kg'}` : '—'} />
        </ReviewCard>

        <ReviewCard title="Body & goal">
          <ReviewRow label="Body type"   value={BODY_TYPE_LABELS[d.bodyType]       || '—'} />
          <ReviewRow label="Goal"        value={GOAL_LABELS[d.goal]               || '—'} />
          <ReviewRow label="Experience"  value={EXPERIENCE_LABELS[d.experienceLevel] || '—'} />
        </ReviewCard>

        <ReviewCard title="Schedule & equipment">
          <ReviewRow label="Days per week"      value={d.workoutFrequency ? `${d.workoutFrequency}` : '—'} />
          <ReviewRow label="Session duration"   value={d.sessionDuration  ? `${d.sessionDuration} min` : '—'} />
          <ReviewRow label="Equipment"          value={EQUIPMENT_LABELS[d.equipmentAccess] || '—'} />
        </ReviewCard>

        <ReviewCard title="Injuries & split">
          <ReviewRow label="Injuries" value={noInjuries ? 'None' : d.injuries} dim={noInjuries} />
          <ReviewRow label="Split"    value={SPLIT_LABELS[d.splitType] || '—'} />
        </ReviewCard>
      </div>
    </div>
  );
}

function StepContent({ step, profileDraft, setField }) {
  if (step.id === 'basics') {
    return <BasicsStep profileDraft={profileDraft} setField={setField} />;
  }
  if (step.id === 'body-goal') {
    return <BodyGoalStep profileDraft={profileDraft} setField={setField} />;
  }
  if (step.id === 'schedule-equipment') {
    return <ScheduleEquipmentStep profileDraft={profileDraft} setField={setField} />;
  }
  if (step.id === 'injuries') {
    return <InjuriesStep profileDraft={profileDraft} setField={setField} />;
  }
  if (step.id === 'split') {
    return <SplitStep profileDraft={profileDraft} setField={setField} />;
  }
  if (step.id === 'review') {
    return <ReviewStep profileDraft={profileDraft} />;
  }
  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold text-text-primary mb-3">
        {step.title}
      </h1>
      <p className="text-text-secondary">Step content goes here.</p>
    </div>
  );
}

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [profileDraft, setProfileDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const navigate = useNavigate();

  const setField = (key, value) =>
    setProfileDraft((prev) => ({ ...prev, [key]: value }));

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  async function handleNext() {
    if (step.id === 'basics' && !BasicsStep._validate?.()) return;
    if (step.id === 'body-goal' && !BodyGoalStep._validate?.()) return;
    if (step.id === 'schedule-equipment' && !ScheduleEquipmentStep._validate?.()) return;
    if (step.id === 'split' && !SplitStep._validate?.()) return;
    if (isLast) {
      setSaving(true);
      setSaveError(null);
      try {
        const record = { ...profileDraft, id: 1, avatar: null, startDate: null };
        await db.userProfile.put(record);
        navigate('/today', { replace: true });
      } catch (err) {
        console.error('Failed to save profile:', err);
        setSaveError("Couldn't save. Try again.");
        setSaving(false);
      }
    } else {
      setCurrentStep((s) => s + 1);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg-base">
      {/* Progress bar */}
      <div className="px-6 pt-6 pb-2">
        <div className="w-full h-1 rounded-full bg-bg-elevated overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-text-secondary uppercase tracking-widest">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col items-center">
        <StepContent step={step} profileDraft={profileDraft} setField={setField} />
      </div>

      {/* Navigation */}
      <div className="px-6 pb-10">
        {saveError && (
          <p className="text-xs text-center mb-3" style={{ color: '#FF453A' }}>{saveError}</p>
        )}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={saving}
              className="flex-shrink-0 text-text-secondary px-5 py-3 text-sm font-medium disabled:opacity-50"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={saving}
            className={`flex-1 bg-accent text-bg-base font-semibold rounded-full py-3 text-sm transition-opacity ${saving ? 'opacity-70' : ''}`}
          >
            {isLast ? (saving ? 'Saving...' : 'Confirm') : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
