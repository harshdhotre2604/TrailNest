'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getOwner } from '@/lib/auth';

export function useRequireAuth() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState(null);
  const [owner, setOwner] = useState(null);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace('/login');
      return;
    }
    setToken(t);
    setOwner(getOwner());
    setReady(true);
  }, [router]);

  return { ready, token, owner };
}
