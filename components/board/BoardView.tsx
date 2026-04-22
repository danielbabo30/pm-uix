'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import Column from './Column';
import TaskCard from './TaskCard';
import TaskModal from '@/components/task/TaskModal';
import CreateTaskModal from '@/components/task/CreateTaskModal';
import type { Task, Team, TaskStatus } from '@/lib/types';

// All columns share the same subtle top accent — uniform, no rainbow
const COLUMN_ACCENT: Partial<Record<TaskStatus, string>> = {}; // all fall back to default in Column

interface BoardViewProps {
  columns: TaskStatus[];
  tasks: Task[];
  team?: Team;
  onRefresh: () => void;
  showTeam?: boolean;
  onTransfer?: (taskId: string, toTeam: Team, toStatus: TaskStatus) => void;
  initialOpenTaskId?: string | null;
}

export default function BoardView({ columns, tasks, team, onRefresh, showTeam, onTransfer, initialOpenTaskId }: BoardViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(initialOpenTaskId ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus | undefined>();
  const [error, setError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const tasksByColumn = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks],
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    // over.id can be a column status or another task id
    let targetStatus: TaskStatus;
    const overIsTask = tasks.some((t) => t.id === over.id);
    if (overIsTask) {
      const overTask = tasks.find((t) => t.id === over.id)!;
      targetStatus = overTask.status;
    } else {
      targetStatus = over.id as TaskStatus;
    }

    if (draggedTask.status === targetStatus) return;

    setError('');
    const res = await fetch(`/api/tasks/${draggedTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'שגיאה בהזזת משימה');
    }
    onRefresh();
  };

  return (
    <>
      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mx-4 mb-2">
          {error}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveTask(tasks.find((t) => t.id === e.active.id) || null)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 px-4 min-h-0 flex-1">
          {columns.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={tasksByColumn(status)}
              onTaskClick={setOpenTaskId}
              showTeam={showTeam}
              accentClass={COLUMN_ACCENT[status]}
              onTransfer={onTransfer}
              onAddTask={() => {
                setCreateStatus(status);
                setCreateOpen(true);
              }}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rotate-2 scale-105">
              <TaskCard task={activeTask} onClick={() => {}} showTeam={showTeam} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {openTaskId && (
        <TaskModal
          taskId={openTaskId}
          onClose={() => setOpenTaskId(null)}
          onUpdate={onRefresh}
        />
      )}

      <CreateTaskModal
        open={createOpen}
        defaultTeam={team}
        defaultStatus={createStatus}
        onClose={() => setCreateOpen(false)}
        onCreated={onRefresh}
      />
    </>
  );
}
