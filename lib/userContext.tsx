'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { SessionUser } from '@/db/mongodb';

interface UserContextValue {
  user: SessionUser | null;
  loading: boolean;
  reload: () => void;
}

const UserContext = createContext<UserContextValue>({ user: null, loading: true, reload: () => {} });

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { setUser(data); setLoading(false); })
      .catch(() => { setUser(null); setLoading(false); });
  };

  useEffect(() => { reload(); }, []);

  return (
    <UserContext.Provider value={{ user, loading, reload }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}
