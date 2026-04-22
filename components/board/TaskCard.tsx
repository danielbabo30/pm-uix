'use client';

import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TeamBadge } from '@/components/ui/Badge';
import { ALL_TRANSFER_RULES, TEAM_LABELS } from '@/lib/constants';
import type { Task, Team, TaskStatus } from '@/lib/types';
import { CheckSquare, User, ArrowRightLeft, Code2, Layers } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  showTeam?: boolean;
  onTransfer?: (taskId: string, toTeam: Team, toStatus: TaskStatus) => void;
}

// Left-border accent per priority — the only "colour" on the card
const PRIORITY_BORDER: Record<string, string> = {
  Low:    'border-l-gray-200',
  Medium: 'border-l-blue-200',
  High:   'border-l-orange-300',
  Urgent: 'border-l-red-400',
};

const PRIORITY_LABEL: Record<string, string> = {
  Low: 'נמוך', Medium: 'בינוני', High: 'גבוה', Urgent: 'דחוף',
};

const PRIORITY_TEXT: Record<string, string> = {
  Low:    'text-gray-400',
  Medium: 'text-blue-400',
  High:   'text-orange-400',
  Urgent: 'text-red-500',
};

export default function TaskCard({ task, onClick, showTeam, onTransfer }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const transferOptions = onTransfer
    ? ALL_TRANSFER_RULES.filter(r => r.fromTeam === task.responsible_team)
    : [];

  const isDevTask = task.responsible_team === 'Development';
  const hasDevInfo = isDevTask && (task.backend_dev_id || task.frontend_dev_id || task.backend_effort || task.frontend_effort);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        bg-white rounded-lg border border-gray-100 border-l-[3px]
        ${PRIORITY_BORDER[task.priority] ?? 'border-l-gray-200'}
        shadow-sm hover:shadow-md hover:-translate-y-px
        transition-all duration-150 select-none group cursor-grab active:cursor-grabbing
      `}
    >
      <div className="flex items-start gap-1 px-3 py-2.5">
        {/* Main content */}
        <div className="flex-1 min-w-0">

          {/* Top meta row: ID · priority · checkmark  ····  flags (physical left) */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[11px] text-gray-300 font-mono">#{task.id}</span>
            <span className={`text-[11px] font-medium ${PRIORITY_TEXT[task.priority] ?? 'text-gray-400'}`}>
              {PRIORITY_LABEL[task.priority]}
            </span>
            {/* tests_passed: only show checkmark when truthy — 0 renders nothing */}
            {!!task.tests_passed && (
              <CheckSquare size={11} className="text-emerald-400" />
            )}
            {/* flags pushed to the physical left edge */}
            {task.flag > 0 && (
              <span className="mr-auto text-xs leading-none" title={task.flag === 1 ? 'ספרינט קרוב' : 'דחיפות גבוהה'}>
                {task.flag === 1 ? '🚩' : '🚩🚩'}
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">
            {task.title}
          </p>

          {/* Team badge (master view) */}
          {showTeam && (
            <div className="flex flex-wrap gap-1 mt-2">
              <TeamBadge team={task.responsible_team} />
            </div>
          )}

          {/* Dev assignees */}
          {hasDevInfo && (
            <div className="mt-2 flex flex-col gap-0.5">
              {task.backend_dev_name && (
                <div className="flex items-center gap-1 text-[11px] text-gray-500">
                  <Code2 size={10} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">
                    {task.backend_dev_name}
                    {task.backend_effort ? <span className="text-gray-400 ml-1">· {task.backend_effort}h</span> : null}
                  </span>
                </div>
              )}
              {task.frontend_dev_name && (
                <div className="flex items-center gap-1 text-[11px] text-gray-500">
                  <Layers size={10} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">
                    {task.frontend_dev_name}
                    {task.frontend_effort ? <span className="text-gray-400 ml-1">· {task.frontend_effort}h</span> : null}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Assignee (non-dev) */}
          {!hasDevInfo && task.assignee_name && (
            <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-400">
              <User size={10} className="flex-shrink-0" />
              {task.assignee_name}
            </div>
          )}
        </div>

        {/* Transfer button */}
        {transferOptions.length > 0 && (
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
              className={`p-1.5 rounded-md transition-colors ${
                menuOpen
                  ? 'bg-slate-100 text-slate-600'
                  : 'text-gray-200 hover:text-slate-500 hover:bg-slate-50 opacity-0 group-hover:opacity-100'
              }`}
              title="העבר לצוות אחר"
            >
              <ArrowRightLeft size={13} />
            </button>

            {menuOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[130px]">
                <p className="text-[11px] font-semibold text-gray-400 px-3 py-1.5 border-b">העבר ל...</p>
                {transferOptions.map(rule => (
                  <button
                    key={rule.toTeam}
                    onClick={e => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onTransfer!(task.id, rule.toTeam, rule.toStatus);
                    }}
                    className="w-full text-right px-3 py-2 text-sm text-gray-700 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                  >
                    <span className="flex-1">{TEAM_LABELS[rule.toTeam]}</span>
                    <ArrowRightLeft size={11} className="text-gray-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
