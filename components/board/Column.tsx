'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { STATUS_LABELS } from '@/lib/constants';
import type { Task, Team, TaskStatus } from '@/lib/types';
import { Plus } from 'lucide-react';

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (id: string) => void;
  onAddTask?: () => void;
  showTeam?: boolean;
  accentClass?: string;
  onTransfer?: (taskId: string, toTeam: Team, toStatus: TaskStatus) => void;
}

export default function Column({ status, tasks, onTaskClick, onAddTask, showTeam, accentClass, onTransfer }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col min-w-[240px] w-64 flex-shrink-0">
      {/* Column header — white, thin coloured top border */}
      <div className={`flex items-center justify-between px-3 py-2.5 bg-white rounded-t-xl border border-b-0 border-gray-200 border-t-2 ${accentClass ?? 'border-t-slate-300'}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{STATUS_LABELS[status]}</span>
          {tasks.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium tabular-nums">
              {tasks.length}
            </span>
          )}
        </div>
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="p-0.5 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded transition-colors"
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] flex flex-col gap-2 p-2 rounded-b-xl border border-t-0 border-gray-200 transition-colors ${
          isOver ? 'bg-blue-50 border-blue-300 border-t-0' : 'bg-white'
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
              showTeam={showTeam}
              onTransfer={onTransfer}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-300 py-6 select-none">
            ריק
          </div>
        )}
      </div>
    </div>
  );
}
