'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import BoardView from './BoardView';
import UXWorkloadTable from './UXWorkloadTable';
import CreateTaskModal from '@/components/task/CreateTaskModal';
import { BOARD_COLUMNS } from '@/lib/constants';
import type { Task, Team, TaskStatus } from '@/lib/types';
import { Plus, RefreshCw, Users } from 'lucide-react';
import { useCurrentUser } from '@/lib/userContext';
import ProjectFilter from '@/components/ui/ProjectFilter';

type TabKey = Team | 'all';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',           label: 'כל הצוותים' },
  { key: 'Specification', label: 'לוח UX' },
  { key: 'Design',        label: 'לוח UI' },
];

function applyFilters(tasks: Task[], projectFilter: number | null): Task[] {
  return projectFilter ? tasks.filter(t => t.project_id === projectFilter) : tasks;
}

function TeamBoardInner() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [activeTab, setActiveTab]         = useState<TabKey>('Specification');
  const [uxTasks, setUxTasks]             = useState<Task[]>([]);
  const [uiTasks, setUiTasks]             = useState<Task[]>([]);
  const [loading, setLoading]             = useState(true);
  const [createOpen, setCreateOpen]       = useState(false);
  const [projectFilter, setProjectFilter] = useState<number | null>(null);

  useEffect(() => {
    if (!userLoading && user && user.is_admin !== 1) router.replace('/master');
  }, [user, userLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    const [uxRes, uiRes] = await Promise.all([
      fetch('/api/tasks?team=Specification'),
      fetch('/api/tasks?team=Design'),
    ]);
    const [uxData, uiData] = await Promise.all([uxRes.json(), uiRes.json()]);
    setUxTasks(Array.isArray(uxData) ? uxData : []);
    setUiTasks(Array.isArray(uiData) ? uiData : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (userLoading || (!userLoading && user && user.is_admin !== 1)) return null;

  const allTasks = [...uxTasks, ...uiTasks];

  // Tasks for the board (filtered by tab + project)
  const rawBoard =
    activeTab === 'all'           ? allTasks :
    activeTab === 'Specification' ? uxTasks  : uiTasks;
  const boardTasks = applyFilters(rawBoard, projectFilter);

  // Columns — for "all" show both teams' columns merged (deduplicated)
  const columns: TaskStatus[] =
    activeTab === 'all'
      ? Array.from(new Set([
          ...(BOARD_COLUMNS['Specification'] as TaskStatus[]),
          ...(BOARD_COLUMNS['Design'] as TaskStatus[]),
        ]))
      : BOARD_COLUMNS[activeTab as Team] as TaskStatus[];

  // Counts (unfiltered by project, like before)
  const uxCount  = uxTasks.filter(t => (BOARD_COLUMNS['Specification'] as string[]).includes(t.status)).length;
  const uiCount  = uiTasks.filter(t => (BOARD_COLUMNS['Design'] as string[]).includes(t.status)).length;
  const allCount = uxCount + uiCount;

  const tabCount = (key: TabKey) =>
    key === 'all' ? allCount : key === 'Specification' ? uxCount : uiCount;

  return (
    <div className="flex flex-col h-full overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800">ניהול צוות UI/UX</h1>
          <p className="text-sm text-gray-500 mt-0.5">{boardTasks.length} משימות</p>
        </div>
        <div className="flex gap-2 items-center">
          <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="רענן">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-pink-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors"
          >
            <Plus size={16} /> משימה חדשה
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white px-4 flex-shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.key === 'all' && <Users size={13} />}
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {tabCount(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">טוען...</div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="pt-4 overflow-x-auto">
            <BoardView
              columns={columns}
              tasks={boardTasks}
              team={activeTab === 'all' ? undefined : activeTab as Team}
              onRefresh={load}
              showTeam={activeTab === 'all'}
            />
          </div>
          <UXWorkloadTable tasks={allTasks} />
        </div>
      )}

      <CreateTaskModal
        open={createOpen}
        defaultTeam={activeTab === 'all' ? 'Specification' : activeTab as Team}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
    </div>
  );
}

export default function TeamBoardPage() {
  return (
    <Suspense fallback={null}>
      <TeamBoardInner />
    </Suspense>
  );
}
