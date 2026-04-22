'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import BoardView from './BoardView';
import WorkloadTable from './WorkloadTable';
import CreateTaskModal from '@/components/task/CreateTaskModal';
import SprintCloseWizard from './SprintCloseWizard';
import { BOARD_COLUMNS } from '@/lib/constants';
import type { Task, TaskStatus, Sprint } from '@/lib/types';
import { Plus, RefreshCw, Flag } from 'lucide-react';
import { useCurrentUser } from '@/lib/userContext';

const DEV_COLUMNS = BOARD_COLUMNS['Development'] as TaskStatus[];

function DevBoardInner() {
  const { user } = useCurrentUser();
  const [tasks,          setTasks]          = useState<Task[]>([]);
  const [sprints,        setSprints]        = useState<Sprint[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [createOpen,     setCreateOpen]     = useState(false);
  const [wizardOpen,     setWizardOpen]     = useState(false);
  const searchParams = useSearchParams();
  const initialOpen = searchParams.get('open');

  const load = useCallback(async () => {
    const [tasksRes, sprintsRes] = await Promise.all([
      fetch('/api/tasks?team=Development'),
      fetch('/api/sprints'),
    ]);
    const tasksData = await tasksRes.json();
    const sprintsData = await sprintsRes.json();
    setTasks(Array.isArray(tasksData) ? tasksData : []);
    setSprints(Array.isArray(sprintsData) ? sprintsData : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentSprint  = sprints.find(s => s.sprint_order === 0) ?? null;
  const currentTasks   = tasks.filter(t => t.status === 'Current Sprint');

  const handleWizardComplete = () => {
    setWizardOpen(false);
    load();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800">לוח פיתוח</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tasks.length} משימות</p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <RefreshCw size={16} />
          </button>

          {/* End Sprint button — admin or ראש צוות פיתוח only */}
          {currentSprint && (user?.is_admin === 1 || user?.role === 'ראש צוות פיתוח') && (
            <button
              onClick={() => setWizardOpen(true)}
              className="flex items-center gap-2 border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Flag size={15} />
              סיום ספרינט
            </button>
          )}

          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-blue-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            <Plus size={16} /> משימה חדשה
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">טוען...</div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="pt-4 overflow-x-auto">
            <BoardView
              columns={DEV_COLUMNS}
              tasks={tasks}
              team="Development"
              onRefresh={load}
              showTeam={false}
              initialOpenTaskId={initialOpen}
            />
          </div>

          <WorkloadTable tasks={tasks} />
        </div>
      )}

      <CreateTaskModal
        open={createOpen}
        defaultTeam="Development"
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />

      {wizardOpen && currentSprint && (
        <SprintCloseWizard
          sprint={currentSprint}
          tasks={currentTasks}
          onClose={() => setWizardOpen(false)}
          onComplete={handleWizardComplete}
        />
      )}

    </div>
  );
}

export default function DevBoardPage() {
  return (
    <Suspense fallback={null}>
      <DevBoardInner />
    </Suspense>
  );
}
