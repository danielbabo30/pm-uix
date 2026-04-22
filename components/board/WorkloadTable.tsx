'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Task, Holiday, UserVacation, Sprint } from '@/lib/types';
import { countWorkDays, countCombinedDaysOff, fmtDate } from '@/lib/dateUtils';
import { Settings, X } from 'lucide-react';

const SPRINT_STATUSES = ['Current Sprint', 'Next Sprint', 'Sprint After Next'] as const;

const DEFAULT_DAILY_HOURS = 8;

interface DevRow {
  devId: number;
  devName: string;
  beEffort: number;
  feEffort: number;
  availableHours: number | null;
  dailyHours: number;
}

interface AllVacations { [userId: number]: UserVacation[] }
interface UserHours    { [userId: number]: number }

function buildWorkload(
  tasks: Task[],
  sprintStatus: string,
  sprintRange: { start: string; end: string } | null,
  holidays: Holiday[],
  allVacations: AllVacations,
  userDailyHours: UserHours,
): DevRow[] {
  const map = new Map<number, DevRow>();

  const ensure = (id: number, name: string): DevRow => {
    if (!map.has(id)) {
      const dailyHours = userDailyHours[id] ?? DEFAULT_DAILY_HOURS;
      let availableHours: number | null = null;
      if (sprintRange) {
        const totalDays = countWorkDays(sprintRange.start, sprintRange.end);
        const daysOff   = countCombinedDaysOff(
          [holidays, allVacations[id] ?? []],
          sprintRange.start,
          sprintRange.end,
        );
        const availableDays = Math.max(0, totalDays - daysOff);
        availableHours = availableDays * dailyHours;
      }
      map.set(id, { devId: id, devName: name, beEffort: 0, feEffort: 0, availableHours, dailyHours });
    }
    return map.get(id)!;
  };

  for (const t of tasks) {
    if (t.status !== sprintStatus) continue;
    if (t.backend_dev_id  && t.backend_dev_name)  ensure(t.backend_dev_id,  t.backend_dev_name).beEffort  += t.backend_effort  ?? 0;
    if (t.frontend_dev_id && t.frontend_dev_name) ensure(t.frontend_dev_id, t.frontend_dev_name).feEffort += t.frontend_effort ?? 0;
  }
  return Array.from(map.values()).sort((a, b) => a.devName.localeCompare(b.devName, 'he'));
}

function fmtHours(h: number): string {
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

// ── Sprint Config Modal ───────────────────────────────────────────────────────
function SprintConfigModal({
  sprint, onSave, onClose,
}: {
  sprint: Sprint;
  onSave: (id: number, data: Partial<Sprint>) => Promise<void>;
  onClose: () => void;
}) {
  const [name,         setName]        = useState(sprint.name);
  const [start,        setStart]       = useState(sprint.start_date ?? '');
  const [freeze,       setFreeze]      = useState(sprint.code_freeze_date ?? '');
  const [testStart,    setTestStart]   = useState(sprint.testing_start_date ?? '');
  const [testEnd,      setTestEnd]     = useState(sprint.testing_end_date ?? '');
  const [qaDate,       setQaDate]      = useState(sprint.qa_date ?? '');
  const [saving,       setSaving]      = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave(sprint.id, {
      name:                name.trim() || sprint.name,
      start_date:          start     || null,
      code_freeze_date:    freeze    || null,
      testing_start_date:  testStart || null,
      testing_end_date:    testEnd   || null,
      qa_date:             qaDate    || null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-[26rem] shadow-xl flex flex-col gap-4" dir="rtl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-base">הגדרות ספרינט</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        {/* Sprint name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">שם הספרינט</label>
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Development dates */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">פיתוח</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">תאריך התחלה</label>
              <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={start} onChange={e => setStart(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">קוד פריז</label>
              <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={freeze} min={start} onChange={e => setFreeze(e.target.value)} />
            </div>
          </div>
          {start && freeze && (
            <p className="text-xs text-gray-400 mt-1">
              {fmtDate(start)} – {fmtDate(freeze)} · {countWorkDays(start, freeze)} ימי עבודה
            </p>
          )}
        </div>

        {/* QA / Testing dates */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">בדיקות ועלייה לסביבות</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">תחילת בדיקות</label>
              <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={testStart} onChange={e => setTestStart(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">סיום בדיקות</label>
              <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={testEnd} min={testStart} onChange={e => setTestEnd(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-3">
            <label className="text-xs font-medium text-gray-600">עלייה ל-QA / Preprod</label>
            <input type="date" className="border rounded-lg px-3 py-2 text-sm w-full" value={qaDate} onChange={e => setQaDate(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={saving} className="bg-blue-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50">
            {saving ? 'שומר...' : 'שמור'}
          </button>
          <button onClick={onClose} className="text-sm text-gray-400 px-4 py-2 hover:text-gray-600">ביטול</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WorkloadTable({ tasks }: { tasks: Task[] }) {
  const [activeTab, setActiveTab]           = useState(0);
  const [holidays, setHolidays]             = useState<Holiday[]>([]);
  const [allVacations, setAllVacations]     = useState<AllVacations>({});
  const [userDailyHours, setUserDailyHours] = useState<UserHours>({});
  const [sprints, setSprints]               = useState<Sprint[]>([]);
  const [editingSprint, setEditingSprint]   = useState<Sprint | null>(null);

  useEffect(() => {
    fetch('/api/holidays').then(r => r.json()).then(setHolidays);
    fetch('/api/sprints').then(r => r.json()).then(setSprints);
    fetch('/api/users').then(r => r.json()).then(async (users: Array<{ id: number; daily_hours: number | null }>) => {
      // Build daily_hours map
      const hoursMap: UserHours = {};
      for (const u of users) {
        if (u.daily_hours != null) hoursMap[u.id] = u.daily_hours;
      }
      setUserDailyHours(hoursMap);

      // Fetch vacations per user
      const entries = await Promise.all(
        users.map(u =>
          fetch(`/api/users/${u.id}/vacations`).then(r => r.json()).then(vacs => [u.id, vacs] as const)
        )
      );
      setAllVacations(Object.fromEntries(entries));
    });
  }, []);

  const saveSprint = async (id: number, data: Partial<Sprint>) => {
    const res = await fetch(`/api/sprints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated: Sprint = await res.json();
      setSprints(prev => prev.map(s => s.id === updated.id ? updated : s));
    }
  };

  const activeSprint = sprints[activeTab] ?? null;
  const sprintStatus = SPRINT_STATUSES[activeTab];
  const sprintRange  = activeSprint?.start_date && activeSprint?.code_freeze_date
    ? { start: activeSprint.start_date, end: activeSprint.code_freeze_date }
    : null;

  const rows = useMemo(
    () => buildWorkload(tasks, sprintStatus, sprintRange, holidays, allVacations, userDailyHours),
    [tasks, sprintStatus, sprintRange, holidays, allVacations, userDailyHours],
  );

  const sprintTaskCount = tasks.filter(t => t.status === sprintStatus).length;
  const totalBe  = rows.reduce((s, r) => s + r.beEffort,  0);
  const totalFe  = rows.reduce((s, r) => s + r.feEffort,  0);
  const totalAll = totalBe + totalFe;
  const hasDates = !!sprintRange;

  const sprintWorkDays = sprintRange ? countWorkDays(sprintRange.start, sprintRange.end) : null;
  const holidayDaysOff = sprintRange
    ? countCombinedDaysOff([holidays], sprintRange.start, sprintRange.end)
    : null;

  return (
    <div className="mx-4 mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-bold text-gray-800">טבלת עומסים</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
            {sprintTaskCount} משימות
          </span>
          {sprintRange && (
            <span className="text-xs text-gray-400">
              {fmtDate(sprintRange.start)} – {fmtDate(sprintRange.end)}
              {sprintWorkDays !== null && (
                <> · <strong>{sprintWorkDays}</strong> ימי עבודה</>
              )}
              {holidayDaysOff ? ` · ${holidayDaysOff} חגי ציבור` : ''}
              <span className="text-gray-300"> · חישוב עומסים בשעות</span>
            </span>
          )}
        </div>
      </div>

      {/* Tabs — tab text switches sprint, gear icon opens config */}
      <div className="flex border-b">
        {(sprints.length ? sprints : SPRINT_STATUSES.map((s, i) => ({ id: i, sprint_order: i, name: s, start_date: null, code_freeze_date: null, updated_at: '' } as Sprint))).map((sprint, i) => (
          <div
            key={sprint.id}
            className={`flex items-center gap-1 border-b-2 -mb-px ${
              activeTab === i ? 'border-blue-500' : 'border-transparent'
            }`}
          >
            <button
              onClick={() => setActiveTab(i)}
              className={`px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === i ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {sprint.name}
            </button>
            <button
              onClick={() => { setActiveTab(i); setEditingSprint(sprint); }}
              title="הגדרות ספרינט"
              className="p-1.5 ml-0.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
            >
              <Settings size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* No dates hint */}
      {!hasDates && (
        <div className="text-xs text-amber-600 bg-amber-50 px-5 py-2 flex items-center gap-2">
          לחץ על שם הספרינט להגדרת תאריכים
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-8">
          אין מפתחים עם הערכת מאמץ בספרינט זה
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wide">
                <th className="text-right px-5 py-3">מפתח</th>
                <th className="text-center px-4 py-3">שע׳ BE</th>
                <th className="text-center px-4 py-3">שע׳ FE</th>
                <th className="text-center px-4 py-3">סה״כ שע׳</th>
                {hasDates && <th className="text-center px-4 py-3">שעות פנויות</th>}
                <th className="text-right px-4 py-3">עומס</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(row => {
                const total     = row.beEffort + row.feEffort;
                const avail     = row.availableHours;
                const freeHours = avail !== null ? avail - total : null;
                const loadPct   = avail && avail > 0 ? Math.round((total / avail) * 100) : null;
                const barPct    = loadPct !== null ? Math.min(loadPct, 100) : 0;
                const overload  = loadPct !== null && loadPct > 100;
                const barColor  =
                  loadPct === null ? 'bg-blue-400'
                  : loadPct > 100  ? 'bg-red-500'
                  : loadPct >= 90  ? 'bg-red-500'
                  : loadPct >= 70  ? 'bg-orange-400'
                  : 'bg-green-400';

                return (
                  <tr key={row.devId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {row.devName[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{row.devName}</span>
                          <span className="text-xs text-gray-400">{fmtHours(row.dailyHours)} שע׳/יום</span>
                        </div>
                        {overload && (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            עומס יתר
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.beEffort > 0
                        ? <span className="font-semibold text-green-700">{fmtHours(row.beEffort)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.feEffort > 0
                        ? <span className="font-semibold text-blue-700">{fmtHours(row.feEffort)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-gray-900">{fmtHours(total)}</span>
                    </td>
                    {hasDates && (
                      <td className="px-4 py-3 text-center">
                        {freeHours !== null
                          ? <span className={`font-semibold ${freeHours < 0 ? 'text-red-600' : freeHours === 0 ? 'text-orange-500' : 'text-gray-700'}`}>
                              {fmtHours(freeHours)}
                            </span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${barPct}%` }} />
                        </div>
                        <span className={`text-xs w-10 text-left ${overload ? 'font-bold text-red-600' : 'text-gray-500'}`}>
                          {loadPct !== null ? `${loadPct}%` : '—'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold text-gray-700 border-t-2 border-gray-200">
                <td className="px-5 py-3 text-sm">סה״כ</td>
                <td className="px-4 py-3 text-center text-green-700">{fmtHours(totalBe)}</td>
                <td className="px-4 py-3 text-center text-blue-700">{fmtHours(totalFe)}</td>
                <td className="px-4 py-3 text-center text-gray-900">{fmtHours(totalAll)}</td>
                {hasDates && <td className="px-4 py-3" />}
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {editingSprint && (
        <SprintConfigModal
          sprint={editingSprint}
          onSave={saveSprint}
          onClose={() => setEditingSprint(null)}
        />
      )}
    </div>
  );
}
