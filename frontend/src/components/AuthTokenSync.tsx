'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setGetToken } from '@/lib/apiClient';

// Injects Clerk's getToken into apiClient as soon as the session is ready.
// Must be rendered inside ClerkProvider (which it is, via root layout).
export default function AuthTokenSync() {
  const { getToken } = useAuth();

  useEffect(() => {
    setGetToken(getToken);
  }, [getToken]);

  return null;
}
