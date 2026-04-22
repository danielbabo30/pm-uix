'use client';

import { useRouter } from 'next/navigation';
import { X, Bell, Trash2, CheckCheck, Check } from 'lucide-react';
import { useNotifications } from '@/lib/notificationsContext';
import type { Notification } from '@/lib/types';
import { fmtTimestamp } from '@/lib/dateUtils';

function formatTs(raw: string): string {
  // show only DD/MM · HH:MM (drop the year)
  const full = fmtTimestamp(raw);
  // full is "DD/MM/YYYY · HH:MM" — strip the year part
  return full.replace(/\/\d{4}/, '');
}

function NotifIcon({ type }: { type: string }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
      type === 'mention' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
    }`}>
      {type === 'mention' ? '@' : '→'}
    </span>
  );
}

export default function NotificationsSidebar() {
  const { open, toggle, notifications, refresh } = useNotifications();
  const router = useRouter();

  const markRead = async (id: number) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    refresh();
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' });
    refresh();
  };

  const clearAll = async () => {
    if (!confirm('לנקות את כל ההתראות?')) return;
    await fetch('/api/notifications', { method: 'DELETE' });
    refresh();
  };

  const navigate = async (n: Notification) => {
    await markRead(n.id);
    if (n.link) router.push(n.link);
  };

  const unread = notifications.filter(n => !n.is_read).length;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={toggle} />

      {/* Panel */}
      <div className="fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col border-r border-gray-200" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-gray-600" />
            <span className="font-semibold text-gray-800 text-sm">התראות</span>
            {unread > 0 && (
              <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {unread}
              </span>
            )}
          </div>
          <button onClick={toggle} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X size={16} />
          </button>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50">
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50"
            >
              <CheckCheck size={12} /> קראתי הכל
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 mr-auto"
            >
              <Trash2 size={12} /> נקה הכל
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <Bell size={32} className="opacity-20" />
              <p className="text-sm">אין התראות</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => navigate(n)}
                  className={`px-4 py-3 flex gap-3 transition-colors group ${
                    n.link ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50'
                  } ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                >
                  <NotifIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatTs(n.created_at)}</p>
                  </div>
                  {/* Mark-as-read icon — stop propagation so it doesn't navigate */}
                  {!n.is_read && (
                    <button
                      onClick={e => { e.stopPropagation(); markRead(n.id); }}
                      title="סמן כנקרא"
                      className="flex-shrink-0 self-start mt-0.5 p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Check size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
