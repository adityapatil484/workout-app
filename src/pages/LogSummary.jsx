import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

export default function LogSummary() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center px-4">
      <CheckCircle2 size={64} className="text-accent" />
      <h1 className="text-[28px] font-bold text-text-primary text-center mt-6">
        Workout complete!
      </h1>
      <p className="text-text-secondary text-base text-center mt-2">Nice work.</p>
      <button
        onClick={() => navigate('/today')}
        className="mt-12 w-full max-w-xs bg-accent text-bg-base font-semibold rounded-full py-4"
      >
        Done
      </button>
    </div>
  );
}
