'use client';

import { useEffect, useState } from 'react';
import {
  Plus, Trash2, User, ChevronDown, ChevronUp, Calendar,
  ShieldCheck, Eye, EyeOff, Pencil, X, Check, Loader2,
} from 'lucide-react';
import type { User as UserType, UserVacation, UserRole } from '@/lib/types';
import { USER_ROLES } from '@/lib/types';
import { fmtDate } from '@/lib/dateUtils';

const ROLE_COLORS: Record<UserRole, string> = {
  'מנתח מערכות':    'bg-purple-100 text-purple-700',
  'UI':              'bg-pink-100   text-pink-700',
  'UX':              'bg-rose-100   text-rose-700',
  'מפתח Be':         'bg-green-100  text-green-700',
  'מפתח Fe':         'bg-blue-100   text-blue-700',
  'Fs':              'bg-teal-100   text-teal-700',
  'ראש צוות פיתוח': 'bg-orange-100 text-orange-700',
  'QA':              'bg-amber-100  text-amber-700',
};

/** Default screen permissions per role */
const ROLE_DEFAULT_PERMS: Record<UserRole, { master: boolean; spec: boolean; design: boolean; dev: boolean; qa: boolean }> = {
  'UI':              { master: true,  spec: false, design: true,  dev: false, qa: false },
  'UX':              { master: true,  spec: false, design: true,  dev: false, qa: false },
  'מפתח Be':         { master: true,  spec: false, design: false, dev: true,  qa: false },
  'מפתח Fe':         { master: true,  spec: false, design: false, dev: true,  qa: false },
  'Fs':              { master: true,  spec: false, design: false, dev: true,  qa: false },
  'מנתח מערכות':    { master: true,  spec: true,  design: false, dev: false, qa: false },
  'ראש צוות פיתוח': { master: true,  spec: false, design: false, dev: true,  qa: true  },
  'QA':              { master: true,  spec: false, design: false, dev: false, qa: true  },
};

const SCREEN_PERMS = [
  { key: 'can_see_master', label: 'תצוגה כללית' },
  { key: 'can_see_spec',   label: 'לוח UX'  },
  { key: 'can_see_design', label: 'לוח UI'  },
  { key: 'can_see_dev',    label: 'פיתוח'   },
  { key: 'can_see_qa',     label: 'בדיקות'  },
] as const;

// ── Vacation sub-panel ────────────────────────────────────────────────────────
function UserVacations({ userId }: { userId: number }) {
  const [vacations, setVacations]     = useState<UserVacation[]>([]);
  const [open, setOpen]               = useState(false);
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [note, setNote]               = useState('');
  const [adding, setAdding]           = useState(false);
  const [saving, setSaving]           = useState(false);
  const [removingId, setRemovingId]   = useState<number | null>(null);

  const load = async () => {
    const res = await fetch(`/api/users/${userId}/vacations`);
    setVacations(await res.json());
  };
  useEffect(() => { load(); }, [userId]);

  const add = async () => {
    if (!startDate || saving) return;
    setSaving(true);
    await fetch(`/api/users/${userId}/vacations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: startDate, end_date: endDate || startDate, note }),
    });
    setSaving(false);
    setStartDate(''); setEndDate(''); setNote(''); setAdding(false);
    load();
  };

  const remove = async (id: number) => {
    setRemovingId(id);
    await fetch(`/api/users/${userId}/vacations/${id}`, { method: 'DELETE' });
    setRemovingId(null);
    load();
  };

  const today    = new Date().toISOString().slice(0, 10);
  const upcoming = vacations.filter(v => v.end_date >= today);
  const past     = vacations.filter(v => v.end_date < today);

  return (
    <div className="mt-2">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
        <Calendar size={13} />
        <span>חופשות אישיות</span>
        <span className="bg-gray-100 rounded-full px-1.5">{vacations.length}</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div className="mt-2 mr-2 border-r-2 border-gray-100 pr-3 flex flex-col gap-1.5">
          {upcoming.map(v => (
            <div key={v.id} className="flex items-center gap-2 group">
              <span className="text-xs text-gray-600">{v.start_date === v.end_date ? fmtDate(v.start_date) : `${fmtDate(v.start_date)} – ${fmtDate(v.end_date)}`}</span>
              {v.note && <span className="text-xs text-gray-400">· {v.note}</span>}
              <button
                onClick={() => remove(v.id)}
                disabled={removingId === v.id}
                className="opacity-0 group-hover:opacity-100 text-red-400 mr-auto disabled:opacity-40"
              >
                {removingId === v.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </button>
            </div>
          ))}
          {past.length > 0 && (
            <details><summary className="text-xs text-gray-400 cursor-pointer list-none">עברו ({past.length})</summary>
              <div className="opacity-50 flex flex-col gap-1 mt-1">
                {past.map(v => (
                  <div key={v.id} className="flex items-center gap-2 group">
                    <span className="text-xs">{fmtDate(v.start_date)}</span>
                    <button
                      onClick={() => remove(v.id)}
                      disabled={removingId === v.id}
                      className="opacity-0 group-hover:opacity-100 text-red-400 mr-auto disabled:opacity-40"
                    >
                      {removingId === v.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
          {adding ? (
            <div className="flex flex-col gap-1.5 bg-gray-50 p-2 rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="border rounded px-2 py-1 text-xs" value={startDate} onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value); }} />
                <input type="date" className="border rounded px-2 py-1 text-xs" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <input className="border rounded px-2 py-1 text-xs" placeholder="הערה" value={note} onChange={e => setNote(e.target.value)} />
              <div className="flex gap-2">
                <button
                  onClick={add}
                  disabled={saving || !startDate}
                  className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {saving ? <><Loader2 size={10} className="animate-spin" /> מוסיף...</> : 'הוסף'}
                </button>
                <button onClick={() => setAdding(false)} disabled={saving} className="text-xs text-gray-400 disabled:opacity-40">ביטול</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="text-xs text-blue-500 flex items-center gap-1"><Plus size={12} /> הוסף חופש</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Permissions panel ─────────────────────────────────────────────────────────
function PermissionsPanel({ user, onUpdate }: { user: UserType; onUpdate: () => void }) {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdmin = (user as unknown as Record<string, unknown>).is_admin === 1;

  const toggle = async (key: string, current: number) => {
    if (isAdmin) return;
    setSaving(true);
    await fetch(`/api/users/${user.id}/permissions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: current ? 0 : 1 }),
    });
    setSaving(false);
    onUpdate();
  };

  return (
    <div className="mt-1.5">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
        <Eye size={13} />
        <span>הרשאות מסכים</span>
        {isAdmin && <span className="text-xs text-purple-500 font-medium">(גישה מלאה - אדמין)</span>}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div className="mt-2 mr-2 border-r-2 border-gray-100 pr-3 flex flex-wrap gap-2">
          {SCREEN_PERMS.map(({ key, label }) => {
            const val = isAdmin ? 1 : (user as unknown as Record<string, unknown>)[key] as number;
            return (
              <button
                key={key}
                onClick={() => toggle(key, val)}
                disabled={saving || isAdmin}
                title={isAdmin ? 'אדמין תמיד רואה את כל המסכים' : undefined}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  val
                    ? isAdmin
                      ? 'bg-purple-100 text-purple-700 border-purple-200 cursor-default'
                      : 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}
              >
                ✓ {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── User edit panel ───────────────────────────────────────────────────────────
function UserEditPanel({ user, onSaved, onCancel }: {
  user: UserType;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName]         = useState(user.name);
  const [email, setEmail]       = useState(user.email ?? '');
  const [role, setRole]         = useState<UserRole | ''>(user.role ?? '');
  const [dailyHours, setDailyHours] = useState<string>(user.daily_hours != null ? String(user.daily_hours) : '');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const save = async () => {
    if (!name.trim()) { setError('שם שדה חובה'); return; }
    setError('');
    setSaving(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim() || null,
        role: role || null,
        daily_hours: dailyHours !== '' ? parseFloat(dailyHours) : null,
        ...(password.trim() ? { password: password.trim() } : {}),
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || 'שגיאה'); return; }
    onSaved();
  };

  return (
    <div className="mt-2 flex flex-col gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
      {error && <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{error}</div>}
      <div className="grid grid-cols-2 gap-2">
        <input className="border rounded-lg px-2 py-1.5 text-sm col-span-2" placeholder="שם *" value={name} onChange={e => setName(e.target.value)} />
        <input type="email" className="border rounded-lg px-2 py-1.5 text-sm" placeholder="אימייל" value={email} onChange={e => setEmail(e.target.value)} />
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            className="border rounded-lg px-2 py-1.5 text-sm w-full pl-8"
            placeholder="סיסמה חדשה (ריק = ללא שינוי)"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button type="button" onClick={() => setShowPw(v => !v)} className="absolute left-2 top-2 text-gray-400">
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <select className="border rounded-lg px-2 py-1.5 text-sm col-span-2" value={role} onChange={e => setRole(e.target.value as UserRole | '')}>
          <option value="">-- תפקיד --</option>
          {USER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-xs font-medium text-gray-500">שעות עבודה יומי</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            className="border rounded-lg px-2 py-1.5 text-sm"
            placeholder="למשל: 8 או 6.5"
            value={dailyHours}
            onChange={e => setDailyHours(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="flex items-center gap-1 text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-50">
          <Check size={12} /> {saving ? 'שומר...' : 'שמור'}
        </button>
        <button onClick={onCancel} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5">
          <X size={12} /> ביטול
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function UserManager() {
  const [users, setUsers]     = useState<UserType[]>([]);
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [role, setRole]       = useState<UserRole | ''>('');
  const [perms, setPerms]     = useState({ master: true, spec: true, design: true, dev: true, qa: true });
  const [newDailyHours, setNewDailyHours] = useState('');
  const [error, setError]           = useState('');
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [adding, setAdding]         = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = async () => {
    const res = await fetch('/api/users');
    setUsers(await res.json());
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim())     { setError('שם שדה חובה');    return; }
    if (!password.trim()) { setError('סיסמה שדה חובה'); return; }
    if (!email.trim())    { setError('אימייל שדה חובה'); return; }
    setError('');
    setAdding(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, email, password, role: role || null,
        daily_hours: newDailyHours !== '' ? parseFloat(newDailyHours) : null,
        can_see_master: perms.master,
        can_see_spec:   perms.spec,
        can_see_design: perms.design,
        can_see_dev:    perms.dev,
        can_see_qa:     perms.qa,
      }),
    });
    setAdding(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || 'שגיאה'); return; }
    setName(''); setEmail(''); setPassword(''); setRole(''); setNewDailyHours('');
    setPerms({ master: true, spec: true, design: true, dev: true, qa: true });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('למחוק משתמש?')) return;
    setRemovingId(id);
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    setRemovingId(null);
    load();
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6 p-6" dir="rtl">
      <h2 className="text-xl font-bold text-gray-800">ניהול משתמשים</h2>

      {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

      {/* Add form */}
      <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border">
        <span className="text-sm font-semibold text-gray-700">הוסף משתמש</span>
        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded-lg px-3 py-2 text-sm col-span-2" placeholder="שם *" value={name} onChange={e => setName(e.target.value)} />
          <input type="email" className="border rounded-lg px-3 py-2 text-sm" placeholder="אימייל *" value={email} onChange={e => setEmail(e.target.value)} />
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="border rounded-lg px-3 py-2 text-sm w-full pl-9"
              placeholder="סיסמה *"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute left-2 top-2.5 text-gray-400">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <select
            className="border rounded-lg px-3 py-2 text-sm col-span-2"
            value={role}
            onChange={e => {
              const r = e.target.value as UserRole | '';
              setRole(r);
              if (r && ROLE_DEFAULT_PERMS[r]) setPerms(ROLE_DEFAULT_PERMS[r]);
            }}
          >
            <option value="">-- תפקיד --</option>
            {USER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs font-medium text-gray-500">שעות עבודה יומי</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="למשל: 8 או 6.5"
              value={newDailyHours}
              onChange={e => setNewDailyHours(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-600">גישה למסכים</span>
          <div className="flex flex-wrap gap-2">
            {([['master','תצוגה כללית'],['spec','לוח UX'],['design','לוח UI'],['dev','פיתוח'],['qa','בדיקות']] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setPerms(p => ({ ...p, [k]: !p[k] }))}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  perms[k] ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}>
                {perms[k] ? '✓' : '✗'} {label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={add} disabled={adding} className="bg-blue-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-fit">
          {adding ? <><Loader2 size={15} className="animate-spin" /> מוסיף...</> : <><Plus size={16} /> הוסף</>}
        </button>
      </div>

      {/* User list */}
      <div className="flex flex-col gap-2">
        {users.map(u => (
          <div key={u.id} className="bg-white border rounded-xl px-4 py-3 group hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">{u.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-800">{u.name}</p>
                  {(u as unknown as { is_admin: number }).is_admin === 1 && (
                    <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={11} /> אדמין
                    </span>
                  )}
                  {u.role && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role as UserRole] ?? 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  )}
                  {(u as unknown as { daily_hours: number | null }).daily_hours != null && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {(u as unknown as { daily_hours: number }).daily_hours}ש׳/יום
                    </span>
                  )}
                </div>
                {u.email && <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>}
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity flex-shrink-0">
                <button onClick={() => setEditingId(editingId === u.id ? null : u.id)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
                  <Pencil size={14} />
                </button>
                <button onClick={() => remove(u.id)} disabled={removingId === u.id} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-40">
                  {removingId === u.id ? <Loader2 size={14} className="animate-spin text-red-400" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>

            {editingId === u.id && (
              <UserEditPanel user={u} onSaved={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
            )}

            <PermissionsPanel user={u} onUpdate={load} />
            <UserVacations userId={u.id} />
          </div>
        ))}
        {users.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-10">
            <User size={36} className="mx-auto mb-2 opacity-30" />אין משתמשים עדיין
          </div>
        )}
      </div>
    </div>
  );
}
