'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Calendar, Package, Layers, Loader2 } from 'lucide-react';
import type { Sprint, Task } from '@/lib/types';
import { fmtDate } from '@/lib/dateUtils';
import TaskModal from '@/components/task/TaskModal';

interface ArchivedSprint extends Sprint {
  task_count: number;
}

// ── Inline date editor ────────────────────────────────────────────────────────
function DateCell({
  value, label, sprintId, field, onChange,
}: {
  value: string | null;
  label: string;
  sprintId: number;
  field: 'preprod_date' | 'prod_date';
  onChange: (id: number, field: string, val: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);

  const save = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value || null;
    await fetch(`/api/sprints/${sprintId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: val }),
    });
    onChange(sprintId, field, val);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="date"
        defaultValue={value ?? ''}
        autoFocus
        onBlur={() => setEditing(false)}
        onChange={save}
        className="border rounded px-2 py-1 text-xs w-36"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
        value
          ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
          : 'border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500'
      }`}
      title={`ערוך ${label}`}
    >
      {value ? fmtDate(value) : `+ ${label}`}
    </button>
  );
}

// ── Sprint row (expandable) ───────────────────────────────────────────────────
function SprintRow({
  sprint, onChange, onTaskClick,
}: {
  sprint: ArchivedSprint;
  onChange: (id: number, field: string, val: string | null) => void;
  onTaskClick: (taskId: string) => void;
}) {
  const [expanded,     setExpanded]     = useState(false);
  const [tasks,        setTasks]        = useState<Task[]>([]);
  const [loaded,       setLoaded]       = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const loadTasks = useCallback(async () => {
    if (loaded) return;
    setLoadingTasks(true);
    const res = await fetch(`/api/archive/sprints/${sprint.id}/tasks`);
    setTasks(await res.json());
    setLoaded(true);
    setLoadingTasks(false);
  }, [sprint.id, loaded]);

  const toggle = () => {
    if (!expanded) loadTasks();
    setExpanded(v => !v);
  };

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors border-b">
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="text-gray-400 hover:text-gray-600">
              {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
            <div>
              <span className="font-semibold text-gray-800 text-sm">{sprint.name}</span>
              {sprint.sprint_number && (
                <span className="text-xs text-gray-400 mr-2">#{sprint.sprint_number}</span>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-center text-xs text-gray-500">
          {sprint.completed_at ? fmtDate(sprint.completed_at.slice(0, 10)) : '—'}
        </td>
        <td className="px-4 py-3 text-center">
          <DateCell
            value={sprint.preprod_date}
            label="Preprod"
            sprintId={sprint.id}
            field="preprod_date"
            onChange={onChange}
          />
        </td>
        <td className="px-4 py-3 text-center">
          <DateCell
            value={sprint.prod_date}
            label="Prod"
            sprintId={sprint.id}
            field="prod_date"
            onChange={onChange}
          />
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
            {sprint.task_count}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="px-0 py-0 bg-gray-50">
            {loadingTasks ? (
              <div className="flex items-center gap-2 px-12 py-4 text-gray-400 text-xs">
                <Loader2 size={14} className="animate-spin" />
                <span>טוען משימות...</span>
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-xs text-gray-400 px-12 py-3">אין משימות</p>
            ) : (
              <table className="w-full text-xs">
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id} className="border-t border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="pl-12 pr-5 py-2 w-16">
                        <span className="text-gray-400 font-mono">#{t.id}</span>
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => onTaskClick(t.id)}
                          className="font-medium text-gray-700 hover:text-blue-600 hover:underline text-right"
                        >
                          {t.title}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-right">
                        {t.backend_dev_name && <span className="ml-3">BE: {t.backend_dev_name}</span>}
                        {t.frontend_dev_name && <span>FE: {t.frontend_dev_name}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Shared empty state ────────────────────────────────────────────────────────
function EmptyVersions() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
      <Layers size={28} className="opacity-20" />
      <p className="text-sm">No releases defined yet</p>
      <p className="text-xs">Set dates in the &quot;Sprint Log&quot; tab</p>
    </div>
  );
}

// ── Single release table (Preprod or Prod) ────────────────────────────────────
function ReleaseTable({
  title, color, rows,
}: {
  title: string;
  color: 'blue' | 'green';
  rows: { date: string; sprint: ArchivedSprint }[];
}) {
  const headerBg    = color === 'blue'  ? 'bg-blue-500'  : 'bg-green-500';
  const badgeBg     = color === 'blue'  ? 'bg-blue-100 text-blue-700'  : 'bg-green-100 text-green-700';

  return (
    <div className="flex-1 rounded-xl border border-gray-200 overflow-hidden">
      {/* Table header strip */}
      <div className={`${headerBg} px-5 py-3 flex items-center gap-2`}>
        <span className="text-white font-bold text-sm tracking-wide">{title}</span>
        <span className="ml-auto text-white/70 text-xs font-medium">{rows.length} releases</span>
      </div>

      {rows.length === 0 ? (
        <EmptyVersions />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs font-semibold border-b">
              <th className="text-right px-5 py-2.5">Sprint</th>
              <th className="text-center px-4 py-2.5">Version</th>
              <th className="text-center px-4 py-2.5">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-800">{row.sprint.name}</td>
                <td className="px-4 py-3 text-center">
                  {row.sprint.sprint_number
                    ? <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeBg}`}>v{row.sprint.sprint_number}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{fmtDate(row.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Version Management ────────────────────────────────────────────────────────
function VersionMatrix({ sprints }: { sprints: ArchivedSprint[] }) {
  const preprodRows = sprints
    .filter(s => s.preprod_date)
    .sort((a, b) => a.preprod_date!.localeCompare(b.preprod_date!))
    .map(s => ({ date: s.preprod_date!, sprint: s }));

  const prodRows = sprints
    .filter(s => s.prod_date)
    .sort((a, b) => a.prod_date!.localeCompare(b.prod_date!))
    .map(s => ({ date: s.prod_date!, sprint: s }));

  return (
    <div className="p-5 flex gap-5">
      <ReleaseTable title="Preprod" color="blue"  rows={preprodRows} />
      <ReleaseTable title="Prod"    color="green" rows={prodRows}    />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ArchivePage() {
  const [tab,            setTab]            = useState<'log' | 'matrix'>('log');
  const [sprints,        setSprints]        = useState<ArchivedSprint[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/archive/sprints')
      .then(r => r.json())
      .then((data: ArchivedSprint[]) => { setSprints(data); setLoading(false); });
  }, []);

  const handleDateChange = (id: number, field: string, val: string | null) => {
    setSprints(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6" dir="rtl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">תיעוד ספרינטים</h1>
        <p className="text-sm text-gray-500 mt-1">ארכיון ספרינטים שהסתיימו ומטריצת גרסאות</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setTab('log')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'log'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar size={15} /> יומן ספרינטים
        </button>
        <button
          onClick={() => setTab('matrix')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'matrix'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package size={15} /> ניהול גרסאות
        </button>
      </div>

      {/* Task detail popup */}
      {selectedTaskId && (
        <TaskModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={() => {}}
        />
      )}

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">טוען...</div>
        ) : tab === 'log' ? (
          sprints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <Calendar size={32} className="opacity-20" />
              <p className="text-sm">אין ספרינטים מסוכמים עדיין</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wide border-b">
                  <th className="text-right px-5 py-3">ספרינט</th>
                  <th className="text-center px-4 py-3">הושלם</th>
                  <th className="text-center px-4 py-3">Preprod</th>
                  <th className="text-center px-4 py-3">Prod</th>
                  <th className="text-center px-4 py-3">משימות</th>
                </tr>
              </thead>
              <tbody>
                {sprints.map(s => (
                  <SprintRow
                    key={s.id}
                    sprint={s}
                    onChange={handleDateChange}
                    onTaskClick={setSelectedTaskId}
                  />
                ))}
              </tbody>
            </table>
          )
        ) : (
          <VersionMatrix sprints={sprints} />
        )}
      </div>
    </div>
  );
}
