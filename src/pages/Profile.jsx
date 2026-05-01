import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Settings, Flame, Calendar, Dumbbell, TrendingUp, ChevronRight, Camera } from 'lucide-react';
import db from '../db/db.js';
import { getActivePlan } from '../lib/planStorage.js';
import { SPLIT_LABELS, GOAL_LABELS } from '../lib/planLabels.js';

const EXPERIENCE_LABELS = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

function daysSince(dateStr) {
  const start = new Date(dateStr);
  const now   = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
}

function resizeToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 256;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const w = Math.round(img.width  * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="bg-bg-card rounded-3xl p-5 flex flex-col justify-between min-h-[110px]">
      <Icon size={20} className="text-accent" />
      <div>
        <p className="text-3xl font-bold text-text-primary leading-none mt-2">{value}</p>
        <p className="text-xs text-text-secondary uppercase tracking-widest mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function Profile() {
  const [profile, setProfile]       = useState(null);
  const [activePlan, setActivePlan] = useState(undefined);
  const [loading, setLoading]       = useState(true);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      db.userProfile.get(1),
      getActivePlan(),
    ]).then(([p, plan]) => {
      setProfile(p ?? null);
      setActivePlan(plan ?? null);
      setLoading(false);
    });
  }, []);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // reset so the same file can be re-selected
    e.target.value = '';
    try {
      const base64 = await resizeToBase64(file);
      await db.userProfile.update(1, { avatar: base64 });
      setProfile((prev) => ({ ...prev, avatar: base64 }));
    } catch (err) {
      console.error('Avatar upload failed:', err);
    }
  }

  if (loading || !profile || activePlan === undefined) return null;

  const initial     = profile.name?.charAt(0).toUpperCase() || '?';
  const weightUnits = profile.weightUnits || 'kg';
  const experience  = EXPERIENCE_LABELS[profile.experienceLevel] || '';
  const dayCount    = profile.startDate ? daysSince(profile.startDate) : null;

  return (
    <div className="min-h-screen bg-bg-base pb-4">
      {/* Top bar */}
      <div className="flex justify-end px-6 pt-6">
        <button onClick={() => navigate('/settings')} aria-label="Settings">
          <Settings size={24} className="text-text-primary" />
        </button>
      </div>

      {/* Avatar */}
      <div className="flex justify-center mt-4 mb-6">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="relative w-32 h-32 rounded-full cursor-pointer group"
          aria-label="Change avatar"
        >
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-32 h-32 rounded-full object-cover"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-accent to-emerald-700 flex items-center justify-center">
              <span className="text-5xl font-bold text-bg-base">{initial}</span>
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={28} className="text-white" />
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Name + experience + day counter */}
      <div className="text-center px-6">
        <h1 className="text-2xl font-bold text-text-primary">{profile.name}</h1>
        {experience && (
          <p className="text-sm text-text-secondary mt-1">{experience}</p>
        )}
        {dayCount !== null && (
          <p className="text-sm text-text-secondary mt-1">Day {dayCount}</p>
        )}
      </div>

      {/* Stat grid */}
      <div className="max-w-md mx-auto px-6 mt-8 grid grid-cols-2 gap-4">
        <StatCard icon={Flame}      value="0"                  label="Streak" />
        <StatCard icon={Calendar}   value="0"                  label="Days trained" />
        <StatCard icon={Dumbbell}   value={`0 ${weightUnits}`} label="Total volume" />
        <StatCard icon={TrendingUp} value="—"                  label="Est. 1RM" />
      </div>

      {/* Active plan card */}
      <div className="max-w-md mx-auto px-6 mt-6 mb-12">
        {activePlan ? (
          <Link
            to="/plan"
            className="block bg-bg-card rounded-3xl p-6 flex items-center justify-between"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Active plan
              </p>
              <p className="text-[22px] font-bold text-text-primary mt-1 leading-tight">
                {activePlan.name}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {SPLIT_LABELS[activePlan.splitType] || activePlan.splitType}
                {' · '}
                {activePlan.daysPerWeek} days/week
                {activePlan.goal ? ` · ${GOAL_LABELS[activePlan.goal] || activePlan.goal}` : ''}
              </p>
            </div>
            <ChevronRight size={20} className="text-text-secondary flex-shrink-0 ml-4" />
          </Link>
        ) : (
          <button
            onClick={() => navigate('/plan')}
            className="w-full bg-bg-card rounded-3xl p-6 flex items-center justify-between"
          >
            <div className="text-left">
              <p className="text-lg font-semibold text-text-primary">No active plan</p>
              <p className="text-sm text-text-secondary mt-1">Generate one to get started</p>
            </div>
            <ChevronRight size={20} className="text-text-secondary flex-shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
}
