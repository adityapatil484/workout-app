import { Outlet, NavLink } from 'react-router-dom';
import { Calendar, ClipboardList, TrendingUp, User } from 'lucide-react';

const tabs = [
  { to: '/today',    icon: Calendar,      label: 'Today'    },
  { to: '/plan',     icon: ClipboardList, label: 'Plan'     },
  { to: '/progress', icon: TrendingUp,    label: 'Progress' },
  { to: '/profile',  icon: User,          label: 'Profile'  },
];

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-bg-card border-t border-bg-elevated h-20 pb-safe">
        <div className="flex h-full">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center gap-1 ${
                  isActive ? 'text-accent' : 'text-text-secondary'
                }`
              }
            >
              <Icon size={22} strokeWidth={1.75} />
              <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
