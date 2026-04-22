'use client';

import { useState } from 'react';
import { X, CheckCircle2, ArrowRight, Inbox, AlertTriangle } from 'lucide-react';
import type { Task, Sprint } from '@/lib/types';

type Decision = 'done' | 'next' | 'backlog';

interface Props {
  sprint: Sprint;
  tasks: Task[];      // only Current Sprint tasks
  onClose: () => void;
  onComplete: () => void;
}

const DECISION_LABELS: Record<Decision, string> = {
  done:    'הושלמה',
  next:    'ספרינט הבא',
  backlog: 'בקלוג',
};

const DECISION_COLORS: Record<Decision, string> = {
  done:    'bg-green-100 text-green-700 border-green-300 ring-green-200',
  next:    'bg-blue-100  text-blue-700  border-blue-300  ring-blue-200',
  backlog: 'bg-gray-100  text-gray-600  border-gray-300  ring-gray-200',
};

const DECISION_ICONS: Record<Decision, React.ReactNode> = {
  done:    <CheckCircle2 size={13} />,
  next:    <ArrowRight   size={13} />,
  backlog: <Inbox        size={13} />,
};

export default function SprintCloseWizard({ sprint, tasks, onClose, onComplete }: Props) {
  // Default all tasks to 'done'
  const [decisions, setDecisions] = useState<Record<string, Decision>>(
    () => Object.fromEntries(tasks.map(t => [t.id, 'done']))
  );
  const [step, setStep]       = useState<'decide' | 'confirm'>('decide');
  const [saving, setSaving]   = useState(false);

  const set = (taskId: string, d: Decision) =>
    setDecisions(prev => ({ ...prev, [taskId]: d }));

  const doneTasks    = tasks.filter(t => decisions[t.id] === 'done');
  const nextTasks    = tasks.filter(t => decisions[t.id] === 'next');
  const backlogTasks = tasks.filter(t => decisions[t.id] === 'backlog');

  const handleComplete = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/sprints/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions }),
      });
      if (res.ok) {
        onComplete();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">סיום ספרינט</h2>
            <p className="text-sm text-gray-500 mt-0.5">{sprint.name} · {tasks.length} משימות</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {step === 'decide' ? (
          <>
            {/* Task list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {tasks.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">אין משימות בספרינט הנוכחי</p>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400 font-mono">#{task.id}</span>
                        <span className="text-sm font-medium text-gray-800 truncate">{task.title}</span>
                      </div>
                      {(task.backend_dev_name || task.frontend_dev_name) && (
                        <div className="text-xs text-gray-400 mt-0.5 flex gap-2">
                          {task.backend_dev_name  && <span>BE: {task.backend_dev_name}</span>}
                          {task.frontend_dev_name && <span>FE: {task.frontend_dev_name}</span>}
                        </div>
                      )}
                    </div>
                    {/* Decision buttons */}
                    <div className="flex gap-1.5 flex-shrink-0">
                      {(['done', 'next', 'backlog'] as Decision[]).map(d => (
                        <button
                          key={d}
                          onClick={() => set(task.id, d)}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                            decisions[task.id] === d
                              ? `${DECISION_COLORS[d]} ring-2`
                              : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                          }`}
                        >
                          {DECISION_ICONS[d]}
                          {DECISION_LABELS[d]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between">
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="text-green-600 font-medium">{doneTasks.length} הושלמו</span>
                <span className="text-blue-600 font-medium">{nextTasks.length} לספרינט הבא</span>
                <span className="text-gray-500 font-medium">{backlogTasks.length} לבקלוג</span>
              </div>
              <button
                onClick={() => setStep('confirm')}
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-lg"
              >
                המשך לאישור
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Confirmation */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  פעולה זו אינה הפיכה. כל המשימות שסומנו כ&quot;הושלמו&quot; יועברו לארכיון,
                  ושאר הספרינטים יתקדמו קדימה.
                </p>
              </div>

              {doneTasks.length > 0 && (
                <Section
                  icon={<CheckCircle2 size={15} className="text-green-600" />}
                  title={`יועברו לארכיון (${doneTasks.length})`}
                  color="green"
                  tasks={doneTasks}
                />
              )}
              {nextTasks.length > 0 && (
                <Section
                  icon={<ArrowRight size={15} className="text-blue-600" />}
                  title={`יעברו לספרינט הבא (${nextTasks.length})`}
                  color="blue"
                  tasks={nextTasks}
                />
              )}
              {backlogTasks.length > 0 && (
                <Section
                  icon={<Inbox size={15} className="text-gray-500" />}
                  title={`יחזרו לבקלוג (${backlogTasks.length})`}
                  color="gray"
                  tasks={backlogTasks}
                />
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                <strong>לאחר הסיום:</strong> ספרינט הבא הבא → ספרינט הבא, ספרינט הבא → ספרינט נוכחי,
                וייפתח ספרינט חדש ריק.
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between">
              <button
                onClick={() => setStep('decide')}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
              >
                ← חזור
              </button>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold px-6 py-2 rounded-lg"
              >
                {saving ? 'מסיים ספרינט...' : 'סיים ספרינט'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  icon, title, color, tasks,
}: {
  icon: React.ReactNode;
  title: string;
  color: 'green' | 'blue' | 'gray';
  tasks: Task[];
}) {
  const bg = color === 'green' ? 'bg-green-50' : color === 'blue' ? 'bg-blue-50' : 'bg-gray-50';
  const border = color === 'green' ? 'border-green-200' : color === 'blue' ? 'border-blue-200' : 'border-gray-200';
  return (
    <div className={`rounded-xl border ${border} ${bg} overflow-hidden`}>
      <div className="flex items-center gap-2 px-4 py-2.5 font-semibold text-sm text-gray-700 border-b border-inherit bg-white/60">
        {icon} {title}
      </div>
      <ul className="divide-y divide-white/80">
        {tasks.map(t => (
          <li key={t.id} className="flex items-center gap-2 px-4 py-2 text-sm">
            <span className="text-xs text-gray-400 font-mono">#{t.id}</span>
            <span className="text-gray-700">{t.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
