'use client';

import { useState, useEffect, useCallback } from 'react';
import BoardView from './BoardView';
import { BOARD_COLUMNS, TEAM_LABELS } from '@/lib/constants';
import type { Task, Team, TaskStatus } from '@/lib/types';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import ProjectFilter from '@/components/ui/ProjectFilter';
import { exportSprintToExcel } from '@/lib/sprintExcel';
import type { Sprint } from '@/lib/types';

// Display order
const DISPLAY_TEAMS: Team[] = ['Design', 'Specification', 'Development', 'QA'];

// Header background per team — pastel, applies only to the title row
const TEAM_HEADER_BG: Record<Team, string> = {
  Specification: 'bg-violet-50  hover:bg-violet-100 border-violet-200 text-violet-800',
  Design:        'bg-pink-50    hover:bg-pink-100   border-pink-200   text-pink-800',
  Development:   'bg-teal-50    hover:bg-teal-100   border-teal-200   text-teal-800',
  QA:            'bg-amber-50   hover:bg-amber-100  border-amber-200  text-amber-800',
};

const TEAM_COUNT_BG: Record<Team, string> = {
  Specification: 'bg-violet-100 text-violet-600',
  Design:        'bg-pink-100   text-pink-600',
  Development:   'bg-teal-100   text-teal-700',
  QA:            'bg-amber-100  text-amber-700',
};

export default function MasterView() {
  const [allTasks,      setAllTasks]      = useState<Task[]>([]);
  const [sprints,       setSprints]       = useState<Sprint[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [transferError, setTransferError] = useState('');
  const [projectFilter, setProjectFilter] = useState<number | null>(null);
  // All sections expanded by default
  const [expanded, setExpanded] = useState<Record<Team, boolean>>({
    Specification: true,
    Design:        true,
    Development:   true,
    QA:            true,
  });

  const load = useCallback(async () => {
    try {
      const [tasksRes, sprintsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/sprints'),
      ]);
      if (!tasksRes.ok) throw new Error(`HTTP ${tasksRes.status}`);
      setAllTasks(await tasksRes.json());
      if (sprintsRes.ok) setSprints(await sprintsRes.json());
    } catch (e) {
      console.error('load tasks error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleTransfer = useCallback(async (taskId: string, toTeam: Team, toStatus: TaskStatus) => {
    setTransferError('');
    const res = await fetch(`/api/tasks/${taskId}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toTeam, toStatus }),
    });
    if (!res.ok) {
      const d = await res.json();
      setTransferError(d.error || 'שגיאה בהעברה');
    }
    load();
  }, [load]);

  const toggle = (team: Team) =>
    setExpanded(prev => ({ ...prev, [team]: !prev[team] }));

  const filteredTasks = projectFilter ? allTasks.filter(t => t.project_id === projectFilter) : allTasks;
  const tasksByTeam = (team: Team) => filteredTasks.filter(t => t.responsible_team === team);

  const sprintDownloads = {
    'Current Sprint':    () => exportSprintToExcel(allTasks, 'Current Sprint',    sprints.find(s => s.sprint_order === 0)?.name ?? 'ספרינט נוכחי'),
    'Next Sprint':       () => exportSprintToExcel(allTasks, 'Next Sprint',       sprints.find(s => s.sprint_order === 1)?.name ?? 'ספרינט הבא'),
    'Sprint After Next': () => exportSprintToExcel(allTasks, 'Sprint After Next', sprints.find(s => s.sprint_order === 2)?.name ?? 'ספרינט הבא הבא'),
  } as const;

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800">תצוגה כללית</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filteredTasks.length} משימות סה&quot;כ</p>
        </div>
        <div className="flex items-center gap-2">
          <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
          <button
            onClick={load}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {transferError && (
        <div className="bg-red-50 text-red-600 text-sm px-6 py-2 border-b flex-shrink-0">
          {transferError}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">טוען...</div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {DISPLAY_TEAMS.map(team => {
            const tasks   = tasksByTeam(team);
            const columns = BOARD_COLUMNS[team] as TaskStatus[];
            const isOpen  = expanded[team];

            return (
              <section
                key={team}
                className="rounded-2xl border border-gray-200 bg-white flex flex-col"
                style={isOpen ? { maxHeight: 'calc(100vh - 56px)' } : undefined}
              >
                {/* Clickable accordion header — coloured row only */}
                <button
                  onClick={() => toggle(team)}
                  className={`flex items-center gap-3 px-5 py-3 border-b w-full text-right transition-colors ${TEAM_HEADER_BG[team]} ${isOpen ? 'rounded-t-2xl' : 'rounded-2xl border-b-0'}`}
                >
                  <span className="text-sm font-bold flex-1">לוח {TEAM_LABELS[team]}</span>
                  {/* count pushed to the right */}
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full mr-auto ${TEAM_COUNT_BG[team]}`}>
                    {tasks.length} משימות
                  </span>
                  {isOpen
                    ? <ChevronUp  size={15} className="opacity-50 flex-shrink-0" />
                    : <ChevronDown size={15} className="opacity-50 flex-shrink-0" />}
                </button>

                {/* Collapsible body with internal scroll */}
                {isOpen && (
                  <div className="flex-1 overflow-y-auto py-3 min-h-0">
                    <BoardView
                      columns={columns}
                      tasks={tasks}
                      team={team}
                      onRefresh={load}
                      showTeam={false}
                      onTransfer={handleTransfer}
                      columnDownload={team === 'Development' ? sprintDownloads : undefined}
                    />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
