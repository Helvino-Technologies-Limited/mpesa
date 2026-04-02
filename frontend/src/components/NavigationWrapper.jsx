'use client';

import { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { getSettings } from '@/lib/api';

export default function NavigationWrapper() {
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    getSettings()
      .then((s) => setBusinessName(s.business_name))
      .catch(() => {});
  }, []);

  return <Navigation businessName={businessName} />;
}
