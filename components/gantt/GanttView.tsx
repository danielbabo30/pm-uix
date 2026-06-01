'use client';

import { useMemo, useRef, useEffect } from 'react';
import type { Task } from '@/lib/types';
import { useTaskModal } from '@/lib/taskModalContext';
import { currentWeekStr, addWeeks, weekBounds } from '@/lib/weekUtils';

const CELL_W = 80;   // px per week column
const ROW_H  = 40;   // px per task row
const WEEKS  = 26;   // number of week columns to render

interface Props {
  tasks: Task[];
  onRefresh: () => void;
}

export default function GanttView({ tasks, onRefresh }: Props) {
  const { openTask } = useTaskModal();
  const scrollRef    = useRef<HTMLDivElement>(null);

  // Build week columns starting from 4 weeks before today
  const weekCols = useMemo(() => {
    const start = addWeeks(currentWeekStr(), -4);
    return Array.from({ length: WEEKS }, (_, i) => addWeeks(start, i));
  }, []);

  const curWeek = currentWeekStr();

  // Scroll to show current week (index 4 from start) on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 4 * CELL_W - 20;
    }
  }, []);

  const colIndex = useMemo(() => {
    const m: Record<string, number> = {};
    weekCols.forEach((w, i) => { m[w] = i; });
    return m;
  }, [weekCols]);

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        אין משימות לפרויקט זה
      </div>
    );
  }

  return (
    <div className="flex overflow-hidden flex-1 min-h-0" dir="rtl">
      {/* Task list (right side in RTL) */}
      <div className="w-56 flex-shrink-0 border-l border-gray-200 bg-white z-10">
        {/* header */}
        <div className="h-10 flex items-center px-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          משימה
        </div>
        {tasks.map(task => (
          <div
            key={task.id}
            className="h-10 flex items-center px-3 border-b border-gray-100 cursor-pointer hover:bg-purple-50 group"
            style={{ height: ROW_H }}
            onClick={() => openTask(task.id, onRefresh)}
          >
            <span className="text-sm text-gray-800 truncate group-hover:text-purple-700 leading-tight">
              {task.title}
            </span>
          </div>
        ))}
      </div>

      {/* Gantt chart (left side in RTL) — scrollable */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
        <div style={{ width: weekCols.length * CELL_W, minWidth: '100%' }}>
          {/* Column headers */}
          <div className="flex h-10 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            {weekCols.map(w => {
              const [y, wk] = w.split('-');
              const isCur = w === curWeek;
              return (
                <div
                  key={w}
                  style={{ width: CELL_W, minWidth: CELL_W }}
                  className={`flex-shrink-0 flex flex-col items-center justify-center border-l border-gray-200 text-[10px] leading-tight ${
                    isCur ? 'bg-purple-50' : ''
                  }`}
                >
                  <span className={`font-semibold ${isCur ? 'text-purple-600' : 'text-gray-600'}`}>
                    ש׳{Number(wk)}{isCur ? ' ●' : ''}
                  </span>
                  <span className="text-gray-400">{y}</span>
                </div>
              );
            })}
          </div>

          {/* Rows */}
          {tasks.map(task => {
            const idx    = task.work_week ? colIndex[task.work_week] : -1;
            const inView = idx >= 0;

            return (
              <div
                key={task.id}
                className="relative flex border-b border-gray-100"
                style={{ height: ROW_H }}
              >
                {/* Grid lines */}
                {weekCols.map(w => (
                  <div
                    key={w}
                    style={{ width: CELL_W, minWidth: CELL_W }}
                    className={`flex-shrink-0 h-full border-l border-gray-100 ${
                      w === curWeek ? 'bg-purple-50/40' : ''
                    }`}
                  />
                ))}

                {/* Bar */}
                {inView && (
                  <div
                    className="absolute top-2 bottom-2 rounded-md bg-purple-500 cursor-pointer hover:bg-purple-600 transition-colors flex items-center px-2 overflow-hidden"
                    style={{ right: idx * CELL_W + 4, width: CELL_W - 8 }}
                    onClick={() => openTask(task.id, onRefresh)}
                    title={task.title}
                  >
                    <span className="text-white text-[11px] font-medium truncate select-none">
                      {task.title}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
