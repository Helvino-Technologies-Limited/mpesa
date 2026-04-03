'use client';

import { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { getSettings } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function NavigationWrapper() {
  const [businessName, setBusinessName] = useState('');
  const { authenticated, logout } = useAuth();

  useEffect(() => {
    getSettings()
      .then((s) => setBusinessName(s.business_name))
      .catch(() => {});
  }, []);

  return <Navigation businessName={businessName} authenticated={authenticated} onLogout={logout} />;
}
