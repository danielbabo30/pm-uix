'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Notification } from '@/lib/types';

interface NotificationsCtx {
  open: boolean;
  toggle: () => void;
  notifications: Notification[];
  unreadCount: number;
  refresh: () => void;
}

const Ctx = createContext<NotificationsCtx>({
  open: false,
  toggle: () => {},
  notifications: [],
  unreadCount: 0,
  refresh: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) setNotifications(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Ctx.Provider value={{ open, toggle: () => setOpen(o => !o), notifications, unreadCount, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useNotifications = () => useContext(Ctx);
