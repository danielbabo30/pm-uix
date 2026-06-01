'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useCurrentUser } from '@/lib/userContext';
import { useNotifications } from '@/lib/notificationsContext';
import { LogOut, ShieldCheck, Bell, Archive, Download, Settings } from 'lucide-react';
import ImportExportModal from '@/components/board/ImportExportModal';
import GlobalSearch from '@/components/ui/GlobalSearch';
import SettingsModal from '@/components/ui/SettingsModal';

export default function NavBar() {
  const { user, loading } = useCurrentUser();
  const { toggle: toggleNotif, unreadCount } = useNotifications();
  const router   = useRouter();
  const pathname = usePathname();
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [settingsOpen,     setSettingsOpen]     = useState(false);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const allItems = [
    { href: '/master',   label: 'תצוגה כללית', key: 'can_see_master' },
    { href: '/design',   label: 'לוח UI',       key: 'can_see_design' },
    { href: '/spec',     label: 'לוח UX',       key: 'can_see_spec'   },
    { href: '/dev',      label: 'פיתוח',        key: 'can_see_dev'    },
    { href: '/qa',       label: 'בדיקות',       key: 'can_see_qa'     },
  ] as const;

  const adminItems = [
    { href: '/team', label: 'ניהול צוות' },
    { href: '/projects-gantt', label: 'פרויקטים' },
  ];

  const navItems = user
    ? allItems.filter(item => user.is_admin === 1 || user[item.key] === 1)
    : [];

  return (
    <>
      <nav className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-1 px-4 h-14">
          <span className="text-base font-bold text-gray-800 ml-4">PM System</span>

          {/* Board tabs */}
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                pathname === href || pathname.startsWith(href + '/')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              {label}
            </Link>
          ))}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Global search */}
          <GlobalSearch />

          {/* Archive — visible to dev users */}
          {user && (user.is_admin === 1 || user.can_see_dev === 1) && (
            <Link
              href="/archive"
              className={`p-2 rounded-lg transition-colors ${
                pathname === '/archive'
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
              }`}
              title="ארכיון"
            >
              <Archive size={18} />
            </Link>
          )}

          {/* Admin items */}
          {(user?.is_admin === 1 || user?.role === 'ראש צוות פיתוח') && (
            <>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              {adminItems.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    pathname === href
                      ? 'text-purple-600 bg-purple-50'
                      : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                >
                  {label}
                </Link>
              ))}
              <div className="w-px h-5 bg-gray-200 mx-1" />
            </>
          )}

          {/* CSV download — admin only */}
          {user?.is_admin === 1 && (
            <button
              onClick={() => setImportExportOpen(true)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="ייצוא / ייבוא משימות"
            >
              <Download size={18} />
            </button>
          )}

          {/* Settings — admin only */}
          {user?.is_admin === 1 && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="הגדרות"
            >
              <Settings size={18} />
            </button>
          )}

          {/* Bell */}
          <button
            onClick={toggleNotif}
            className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="התראות"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Current user */}
          {!loading && user && (
            <div className="flex items-center gap-2">
              {user.is_admin === 1 && (
                <span title="מנהל מערכת">
                  <ShieldCheck size={16} className="text-purple-500" />
                </span>
              )}
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                <div className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold">
                  {user.name[0]}
                </div>
                {user.name}
              </div>
              <button
                onClick={logout}
                title="התנתק"
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </nav>

      {importExportOpen && (
        <ImportExportModal
          onClose={() => setImportExportOpen(false)}
          onImported={() => { setImportExportOpen(false); router.refresh(); }}
        />
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
