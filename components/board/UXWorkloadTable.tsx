'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import type { Task, Project, User } from '@/lib/types';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { currentWeekStr, addWeeks, weekLabel, weekBounds } from '@/lib/weekUtils';
import { countWorkDays, countCombinedDaysOff } from '@/lib/dateUtils';
import type { Holiday, UserVacation } from '@/lib/types';

const DEFAULT_DAILY = 8;
const WORK_DAYS     = 5;
const VISIBLE       = 6; // tabs visible at once

interface MemberRow {
  assigneeId:     number;
  assigneeName:   string;
  uxEffort:       number;
  uiEffort:       number;
  total:          number;
  weeklyCapacity: number;  // available hours after holidays/vacations
  daysOff:        number;
}

function buildRows(
  tasks: Task[],
  userMap: Record<number, User>,
  holidays: Holiday[],
  vacations: Record<number, UserVacation[]>,
  weekStr: string,
): MemberRow[] {
  const map = new Map<number, MemberRow>();
  const { start, end } = weekBounds(weekStr);
  const totalWorkDays  = countWorkDays(start, end);

  const ensure = (id: number, name: string): MemberRow => {
    if (!map.has(id)) {
      const u        = userMap[id];
      const daily    = u?.daily_hours ?? DEFAULT_DAILY;
      const daysOff  = countCombinedDaysOff(
        [holidays, vacations[id] ?? []],
        start, end,
      );
      const avail    = Math.max(0, totalWorkDays - daysOff);
      map.set(id, {
        assigneeId: id, assigneeName: name,
        uxEffort: 0, uiEffort: 0, total: 0,
        weeklyCapacity: avail * daily,
        daysOff,
      });
    }
    return map.get(id)!;
  };

  for (const t of tasks) {
    if (!t.assignee_id || !t.assignee_name) continue;
    const row = ensure(t.assignee_id, t.assignee_name);
    const e = t.effort ?? 0;
    if (t.responsible_team === 'Specification') { row.uxEffort += e; row.total += e; }
    if (t.responsible_team === 'Design')        { row.uiEffort += e; row.total += e; }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.assigneeName.localeCompare(b.assigneeName, 'he'),
  );
}

// ── Week tabs bar ──────────────────────────────────────────────────────────
function WeekTabs({ active, onChange }: { active: string; onChange: (w: string) => void }) {
  // Center offset around active week (0 = active is first visible)
  const [offset, setOffset] = useState(0);
  const cur = currentWeekStr();

  // Build visible window: active week + offset neighbours
  const tabs = Array.from({ length: VISIBLE }, (_, i) => addWeeks(active, offset + i));

  return (
    <div className="flex items-center border-b bg-white px-3 flex-shrink-0" dir="rtl">
      {/* back to current */}
      {active !== cur && (
        <button
          onClick={() => { onChange(cur); setOffset(0); }}
          className="ml-1 text-xs text-purple-600 hover:underline flex-shrink-0 px-1"
        >
          היום
        </button>
      )}

      <button
        onClick={() => setOffset(o => o - VISIBLE)}
        className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
      >
        <ChevronRight size={15} />
      </button>

      {tabs.map(w => {
        const isCur = w === cur;
        return (
          <button
            key={w}
            onClick={() => onChange(w)}
            className={`flex-shrink-0 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              active === w
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {(() => { const [y, wk] = w.split('-'); return `שבוע ${Number(wk)}${isCur ? ' ●' : ''}`; })()}
            <span className="block text-[10px] text-gray-300">{w.split('-')[0]}</span>
          </button>
        );
      })}

      <button
        onClick={() => setOffset(o => o + VISIBLE)}
        className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
      >
        <ChevronLeft size={15} />
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function UXWorkloadTable({ tasks }: { tasks: Task[] }) {
  const [projects,      setProjects]      = useState<Project[]>([]);
  const [userMap,       setUserMap]       = useState<Record<number, User>>({});
  const [holidays,      setHolidays]      = useState<Holiday[]>([]);
  const [vacations,     setVacations]     = useState<Record<number, UserVacation[]>>({});
  const [projectFilter, setProjectFilter] = useState<number | null>(null);
  const [teamFilter,    setTeamFilter]    = useState<'Specification' | 'Design' | null>(null);
  const [activeWeek,    setActiveWeek]    = useState<string>(currentWeekStr());

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : []));
    fetch('/api/holidays').then(r => r.json()).then(d => setHolidays(Array.isArray(d) ? d : []));
    fetch('/api/users').then(r => r.json()).then(async (users: User[]) => {
      const m: Record<number, User> = {};
      for (const u of users) m[u.id] = u;
      setUserMap(m);
      const entries = await Promise.all(
        users.map(u =>
          fetch(`/api/users/${u.id}/vacations`).then(r => r.json()).then(v => [u.id, v] as const)
        )
      );
      setVacations(Object.fromEntries(entries));
    });
  }, []);

  // Apply filters: week (AND) project (AND) team
  const filtered = useMemo(() => {
    let t = tasks.filter(t => t.work_week === activeWeek);
    if (projectFilter) t = t.filter(t => t.project_id === projectFilter);
    if (teamFilter)    t = t.filter(t => t.responsible_team === teamFilter);
    return t;
  }, [tasks, activeWeek, projectFilter, teamFilter]);

  const rows        = useMemo(() => buildRows(filtered, userMap, holidays, vacations, activeWeek), [filtered, userMap, holidays, vacations, activeWeek]);
  const totalEffortH = filtered.reduce((s, t) => s + (t.effort ?? 0), 0);
  const fmt         = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);
  const totalUX     = rows.reduce((s, r) => s + r.uxEffort, 0);
  const totalUI     = rows.reduce((s, r) => s + r.uiEffort, 0);
  const totalAll    = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="mx-4 mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden" dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b flex-wrap">
        <span className="text-base font-bold text-gray-800">טבלת עומסים</span>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
          {filtered.length} משימות
        </span>
        {totalEffortH > 0 && (
          <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
            {fmt(totalEffortH)} שע׳
          </span>
        )}

        <div className="flex items-center gap-2 mr-auto">
          {/* Team filter */}
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-xs">
            {([null, 'Specification', 'Design'] as const).map(v => (
              <button
                key={String(v)}
                onClick={() => setTeamFilter(v)}
                className={`px-2.5 py-1 transition-colors border-l last:border-l-0 border-gray-200 ${
                  teamFilter === v
                    ? v === 'Specification' ? 'bg-violet-100 text-violet-700 font-medium'
                    : v === 'Design'        ? 'bg-pink-100 text-pink-700 font-medium'
                    : 'bg-gray-100 text-gray-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {v === null ? 'הכל' : v === 'Specification' ? 'UX' : 'UI'}
              </button>
            ))}
          </div>

          {/* Project filter */}
          {projects.length > 0 && (
            <select
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
              value={projectFilter ?? ''}
              onChange={e => setProjectFilter(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">כל הפרויקטים</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Week tabs */}
      <WeekTabs active={activeWeek} onChange={setActiveWeek} />

      {/* Table */}
      {rows.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-10">
          אין משימות ל{weekLabel(activeWeek)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wide">
                <th className="text-right px-5 py-3">חבר צוות</th>
                <th className="text-center px-4 py-3">UX (שע׳)</th>
                <th className="text-center px-4 py-3">UI (שע׳)</th>
                <th className="text-center px-4 py-3">סה״כ (שע׳)</th>
                <th className="text-center px-4 py-3">קיבולת שבועית</th>
                <th className="text-right px-4 py-3">עומס</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(row => {
                const loadPct  = row.weeklyCapacity > 0 ? Math.round((row.total / row.weeklyCapacity) * 100) : 0;
                const barPct   = Math.min(loadPct, 100);
                const overload = loadPct > 100;
                const barColor =
                  overload        ? 'bg-red-500'
                  : loadPct >= 90 ? 'bg-red-500'
                  : loadPct >= 70 ? 'bg-orange-400'
                  : 'bg-green-400';

                return (
                  <tr key={row.assigneeId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {row.assigneeName[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{row.assigneeName}</span>
                          {overload && <span className="text-xs font-semibold text-red-600">עומס יתר</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.uxEffort > 0
                        ? <span className="font-semibold text-purple-700">{fmt(row.uxEffort)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.uiEffort > 0
                        ? <span className="font-semibold text-pink-700">{fmt(row.uiEffort)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.total > 0
                        ? <span className="font-bold text-gray-900">{fmt(row.total)}</span>
                        : <span className="text-gray-400 text-xs">אין הערכה</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                      {row.weeklyCapacity} שע׳
                      {row.daysOff > 0 && (
                        <span className="block text-[10px] text-orange-400">
                          -{row.daysOff} ימי חופש
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${barPct}%` }} />
                        </div>
                        <span className={`text-xs w-10 text-left ${overload ? 'font-bold text-red-600' : 'text-gray-500'}`}>
                          {loadPct}%
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
                <td className="px-4 py-3 text-center text-purple-700">{totalUX ? fmt(totalUX) : '—'}</td>
                <td className="px-4 py-3 text-center text-pink-700">{totalUI ? fmt(totalUI) : '—'}</td>
                <td className="px-4 py-3 text-center text-gray-900">{totalAll ? fmt(totalAll) : '—'}</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
