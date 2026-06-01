'use client';

import { useState, useEffect, useCallback } from 'react';
import BoardView from './BoardView';
import CreateTaskModal from '@/components/task/CreateTaskModal';
import { BOARD_COLUMNS } from '@/lib/constants';
import type { Task, TaskStatus } from '@/lib/types';
import { Plus, RefreshCw } from 'lucide-react';
import ProjectFilter from '@/components/ui/ProjectFilter';

const QA_COLUMNS = BOARD_COLUMNS['QA'] as TaskStatus[];

// Column accent colors per QA status
const QA_ACCENT: Partial<Record<TaskStatus, string>> = {
  'Ready for QA':  'border-t-amber-300',
  'In QA':         'border-t-blue-400',
  'Return to Dev': 'border-t-red-400',
  'QA Done':       'border-t-green-400',
};

export default function QABoardPage() {
  const [tasks,         setTasks]         = useState<Task[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [createOpen,    setCreateOpen]    = useState(false);
  const [projectFilter, setProjectFilter] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res  = await fetch('/api/tasks?team=QA');
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800">לוח בדיקות</h1>
          <p className="text-sm text-gray-500 mt-0.5">{(projectFilter ? tasks.filter(t => t.project_id === projectFilter) : tasks).length} משימות</p>
        </div>
        <div className="flex gap-2 items-center">
          <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
          <button
            onClick={load}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-amber-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-600"
          >
            <Plus size={16} />
            משימה חדשה
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-2 bg-gray-50 border-b text-xs text-gray-500 flex-shrink-0">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-300 inline-block" />מוכן לבדיקות</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />בבדיקות</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" />להחזיר לפיתוח</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" />תקין</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">טוען...</div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col pt-4">
          <BoardView
            columns={QA_COLUMNS}
            tasks={projectFilter ? tasks.filter(t => t.project_id === projectFilter) : tasks}
            team="QA"
            onRefresh={load}
            showTeam={false}
            columnAccentOverride={QA_ACCENT}
          />
        </div>
      )}

      <CreateTaskModal
        open={createOpen}
        defaultTeam="QA"
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
    </div>
  );
}
