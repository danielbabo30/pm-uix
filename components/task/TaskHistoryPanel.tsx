'use client';

import { useEffect, useState } from 'react';
import { History, X, ArrowRightLeft, User, Tag, FileText, CheckSquare, AlertCircle, Loader2 } from 'lucide-react';
import { fmtTimestamp } from '@/lib/dateUtils';
import type { TaskHistoryEntry } from '@/lib/types';

// Pick an icon based on the action text
function ActionIcon({ action }: { action: string }) {
  const cls = 'flex-shrink-0 mt-0.5';
  if (action.startsWith('העברה'))           return <ArrowRightLeft size={14} className={`${cls} text-blue-500`} />;
  if (action.startsWith('גורם מבצע') ||
      action.startsWith('מפתח'))            return <User size={14} className={`${cls} text-purple-500`} />;
  if (action.startsWith('סטטוס'))           return <Tag size={14} className={`${cls} text-green-500`} />;
  if (action.startsWith('עדיפות'))          return <AlertCircle size={14} className={`${cls} text-orange-400`} />;
  if (action.startsWith('תרחישי בדיקות'))   return <CheckSquare size={14} className={`${cls} text-teal-500`} />;
  if (action.startsWith('עדכון תיאור') ||
      action.startsWith('כותרת'))           return <FileText size={14} className={`${cls} text-gray-400`} />;
  return <History size={14} className={`${cls} text-gray-400`} />;
}

export default function TaskHistoryPanel({
  taskId,
  onClose,
}: {
  taskId: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tasks/${taskId}/history`)
      .then((r) => r.json())
      .then((data) => { setEntries(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [taskId]);

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <History size={18} className="text-gray-500" />
          <span className="font-semibold text-gray-800">היסטוריית פעולות</span>
          {!loading && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {entries.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">טוען...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
            <History size={32} className="opacity-20" />
            <span className="text-sm">אין פעולות מתועדות עדיין</span>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute right-[19px] top-0 bottom-0 w-px bg-gray-100" />

            <div className="flex flex-col gap-0">
              {entries.map((entry, i) => (
                <div key={entry.id} className="flex gap-3 pb-5 relative">
                  {/* Dot on timeline */}
                  <div className="w-10 flex-shrink-0 flex justify-center pt-0.5 relative z-10">
                    <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                      <ActionIcon action={entry.action} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`flex-1 min-w-0 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100 ${i === 0 ? 'border-blue-100 bg-blue-50/50' : ''}`}>
                    <p className="text-sm text-gray-800 font-medium leading-snug">{entry.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                        {(entry.user_name || '?')[0]}
                      </div>
                      <span className="text-xs text-gray-500">{entry.user_name}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{fmtTimestamp(entry.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
