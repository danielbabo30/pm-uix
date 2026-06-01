'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import BoardView from './BoardView';
import CreateTaskModal from '@/components/task/CreateTaskModal';
import { BOARD_COLUMNS, TEAM_LABELS } from '@/lib/constants';
import type { Task, Team, TaskStatus } from '@/lib/types';
import { Plus, RefreshCw } from 'lucide-react';
import ProjectFilter from '@/components/ui/ProjectFilter';

interface BoardPageProps {
  team: Team | 'Master';
}

function BoardPageInner({ team }: BoardPageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<number | null>(null);

  const load = useCallback(async () => {
    const url = team === 'Master' ? '/api/tasks' : `/api/tasks?team=${team}`;
    const res = await fetch(url);
    const data = await res.json();
    setTasks(data);
    setLoading(false);
  }, [team]);

  useEffect(() => { load(); }, [load]);

  const columns = BOARD_COLUMNS[team] as TaskStatus[];
  const visibleTasks = projectFilter ? tasks.filter(t => t.project_id === projectFilter) : tasks;

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {team === 'Master' ? 'תצוגה כללית' : `לוח ${TEAM_LABELS[team as Team]}`}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {visibleTasks.length} משימות
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
          <button
            onClick={load}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw size={16} />
          </button>
          {team !== 'Master' && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 bg-blue-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              <Plus size={16} />
              משימה חדשה
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          טוען...
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col pt-4">
          <BoardView
            columns={columns}
            tasks={visibleTasks}
            team={team === 'Master' ? undefined : (team as Team)}
            onRefresh={load}
            showTeam={team === 'Master'}
          />
        </div>
      )}

      {team !== 'Master' && (
        <CreateTaskModal
          open={createOpen}
          defaultTeam={team as Team}
          onClose={() => setCreateOpen(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}

export default function BoardPage({ team }: BoardPageProps) {
  return (
    <Suspense fallback={null}>
      <BoardPageInner team={team} />
    </Suspense>
  );
}
