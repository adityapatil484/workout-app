import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const MAX = 500;

export default function NoteBottomSheet({ open, onClose, exerciseName, initialValue, onSave }) {
  const [text, setText] = useState(initialValue ?? '');

  // Reset text to saved value each time the sheet opens
  useEffect(() => {
    if (open) setText(initialValue ?? '');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function tryClose() {
    if (text === (initialValue ?? '')) {
      onClose();
      return;
    }
    if (window.confirm('Discard unsaved note?')) {
      setText(initialValue ?? '');
      onClose();
    }
  }

  function handleSave() {
    onSave(text);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={tryClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-bg-card rounded-t-3xl h-[50vh] transition-transform duration-200 ${
          open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <p className="font-semibold text-text-primary">Note for {exerciseName}</p>
          <button onClick={tryClose} className="p-1 -mr-1 text-text-secondary" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Textarea + counter */}
        <div className="flex-1 px-5 flex flex-col min-h-0">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={MAX}
            placeholder="How did it feel? Any cues to remember?"
            className="flex-1 w-full bg-bg-elevated rounded-2xl p-4 text-text-primary text-base resize-none placeholder:text-text-tertiary"
          />
          <p className="text-text-secondary text-xs text-right mt-2 flex-shrink-0">
            {text.length} / {MAX}
          </p>
        </div>

        {/* Save button */}
        <div className="px-5 pt-3 pb-8 flex-shrink-0">
          <button
            onClick={handleSave}
            className="w-full bg-accent text-bg-base rounded-full py-3 font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}
