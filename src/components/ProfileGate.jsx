import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import db from '../db/db.js';

export default function ProfileGate() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'found' | 'missing'
  const { pathname } = useLocation();

  useEffect(() => {
    db.userProfile.count().then((count) => {
      setStatus(count > 0 ? 'found' : 'missing');
    });
  }, []);

  if (status === 'loading') return null;

  if (status === 'missing' && pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (status === 'found' && pathname === '/onboarding') {
    return <Navigate to="/today" replace />;
  }

  return <Outlet />;
}
