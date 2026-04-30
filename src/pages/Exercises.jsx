import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FixedSizeList } from 'react-window';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, ChevronRight } from 'lucide-react';
import db from '../db/db.js';

const CHIPS = [
  { label: 'All',        value: null },
  { label: 'Barbell',    value: 'barbell' },
  { label: 'Dumbbell',   value: 'dumbbell' },
  { label: 'Bodyweight', value: 'body only' },
  { label: 'Machine',    value: 'machine' },
  { label: 'Cable',      value: 'cable' },
  { label: 'Kettlebells',value: 'kettlebells' },
  { label: 'Other',      value: '__other__' },
];

const EXPLICIT = new Set(['barbell', 'dumbbell', 'body only', 'machine', 'cable', 'kettlebells']);

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const ITEM_HEIGHT = 80;

function ExerciseRow({ index, style, data }) {
  const ex = data[index];
  return (
    <div style={style} className="px-4 py-1">
      <Link
        to={`/exercises/${ex.id}`}
        className="flex items-center gap-3 bg-bg-card rounded-2xl p-3 h-full"
      >
        <img
          src={ex.imageUrl}
          alt={ex.name}
          loading="lazy"
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-bg-elevated"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary truncate">{ex.name}</p>
          <p className="text-sm text-text-secondary truncate">{capitalize(ex.primaryMuscle)}</p>
        </div>
        <ChevronRight size={18} className="text-text-tertiary flex-shrink-0" />
      </Link>
    </div>
  );
}

export default function Exercises() {
  const [search, setSearch]   = useState('');
  const [chip, setChip]       = useState(null);
  const listRef               = useRef(null);
  const containerRef          = useRef(null);
  const [listHeight, setListHeight] = useState(500);

  const allExercises = useLiveQuery(() => db.exerciseLibrary.toArray(), []);

  const filtered = useMemo(() => {
    if (!allExercises) return [];
    const q = search.trim().toLowerCase();
    return allExercises.filter((ex) => {
      const matchSearch = !q || ex.name.toLowerCase().includes(q);
      const matchChip =
        chip === null ? true :
        chip === '__other__' ? !EXPLICIT.has(ex.equipment) :
        ex.equipment === chip;
      return matchSearch && matchChip;
    });
  }, [allExercises, search, chip]);

  // reset list scroll when filters change
  useEffect(() => {
    listRef.current?.scrollToItem(0);
  }, [search, chip]);

  // measure available height for the virtualized list
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      setListHeight(containerRef.current.clientHeight);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (allExercises === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen text-text-secondary">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg-base">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-base px-4 pt-6 pb-2">
        <h1 className="text-2xl font-semibold text-text-primary mb-0.5">Exercises</h1>
        <p className="text-sm text-text-secondary mb-3">
          {filtered.length} exercise{filtered.length !== 1 ? 's' : ''}
        </p>

        {/* Search */}
        <div className="flex items-center gap-2 bg-bg-elevated rounded-2xl px-4 h-12 mb-3">
          <Search size={18} className="text-text-secondary flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises"
            className="flex-1 bg-transparent text-text-primary placeholder-text-secondary text-sm outline-none"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CHIPS.map(({ label, value }) => {
            const active = chip === value;
            return (
              <button
                key={label}
                onClick={() => setChip(value)}
                className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-accent text-bg-base'
                    : 'bg-bg-card text-text-secondary'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-text-secondary">No exercises match your search</p>
            <p className="text-sm text-text-tertiary">Try a different search or filter</p>
          </div>
        ) : (
          <FixedSizeList
            ref={listRef}
            height={listHeight}
            itemCount={filtered.length}
            itemSize={ITEM_HEIGHT}
            itemData={filtered}
            width="100%"
          >
            {ExerciseRow}
          </FixedSizeList>
        )}
      </div>
    </div>
  );
}
