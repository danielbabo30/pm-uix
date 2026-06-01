'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Project, Task } from '@/lib/types';
import GanttView from '@/components/gantt/GanttView';

export default function ProjectsGanttPage() {
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => {
        const list: Project[] = Array.isArray(d) ? d : [];
        setProjects(list);
        if (list.length > 0) setProjectId(list[0].id);
      });
  }, []);

  const loadTasks = useCallback((pid: number) => {
    setLoading(true);
    fetch(`/api/tasks?project_id=${pid}`)
      .then(r => r.json())
      .then((d: Task[]) => {
        const filtered = Array.isArray(d) ? d.filter(t => !t.is_archived) : [];
        setTasks(filtered);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (projectId !== null) loadTasks(projectId);
  }, [projectId, loadTasks]);

  const selectedProject = projects.find(p => p.id === projectId);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b bg-white flex-shrink-0">
        <span className="text-base font-bold text-gray-800">פרויקטים</span>
        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
          נסיון בלבד
        </span>

        {projects.length === 0 ? (
          <span className="text-sm text-gray-400">אין פרויקטים</span>
        ) : (
          <select
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
            value={projectId ?? ''}
            onChange={e => setProjectId(Number(e.target.value))}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {selectedProject && !loading && (
          <span className="text-xs text-gray-400 mr-1">
            {tasks.length} משימות
          </span>
        )}
      </div>

      {/* Gantt */}
      {loading ? (
        <div className="flex items-center justify-center flex-1 text-sm text-gray-400">
          טוען...
        </div>
      ) : projectId === null ? (
        <div className="flex items-center justify-center flex-1 text-sm text-gray-400">
          בחר פרויקט
        </div>
      ) : (
        <GanttView
          tasks={tasks}
          onRefresh={() => loadTasks(projectId)}
        />
      )}
    </div>
  );
}
