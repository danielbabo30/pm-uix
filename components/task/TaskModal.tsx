'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import UserPicker from './UserPicker';
import DescriptionEditor from './DescriptionEditor';
import ExternalLinks from './ExternalLinks';
import CommentThread from './CommentThread';
import TaskHistoryPanel from './TaskHistoryPanel';
import { TRANSFER_RULES, STATUS_LABELS, BOARD_COLUMNS, TEAM_LABELS } from '@/lib/constants';
import type { Task, Team, Priority, TaskStatus } from '@/lib/types';
import { Copy, Trash2, ArrowRightLeft, CheckSquare, Square, History } from 'lucide-react';

interface TaskModalProps {
  taskId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TaskModal({ taskId, onClose, onUpdate }: TaskModalProps) {
  const [task,         setTask]        = useState<Task | null>(null);
  const [editing,      setEditing]     = useState<Partial<Task>>({});
  const [saving,       setSaving]      = useState(false);
  const [deleting,     setDeleting]    = useState(false);
  const [transferring, setTransferring]= useState<string | null>(null);
  const [error,        setError]       = useState('');
  const [showHistory,  setShowHistory] = useState(false);

  const load = useCallback(async () => {
    if (!taskId) return;
    const res = await fetch(`/api/tasks/${taskId}`);
    const data = await res.json();
    setTask(data);
    setEditing({});
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  if (!task) return null;

  const merged = { ...task, ...editing };

  const save = async () => {
    if (!Object.keys(editing).length) return;
    setSaving(true);
    setError('');
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'שגיאה בשמירה');
      return;
    }
    await load();
    onUpdate();
  };

  const transfer = async (rule: typeof TRANSFER_RULES[0]) => {
    const key = `${rule.toTeam}-${rule.toStatus}`;
    setError('');
    setTransferring(key);
    const res = await fetch(`/api/tasks/${task.id}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toTeam: rule.toTeam, toStatus: rule.toStatus }),
    });
    setTransferring(null);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'שגיאה בהעברה');
      return;
    }
    await load();
    onUpdate();
  };

  const duplicate = async () => {
    await fetch(`/api/tasks/${task.id}/duplicate`, { method: 'POST' });
    onUpdate();
  };

  const deleteTask = async () => {
    if (!confirm('האם למחוק את המשימה?')) return;
    setDeleting(true);
    await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    setDeleting(false);
    onUpdate();
    onClose();
  };

  const applicableTransfers = TRANSFER_RULES.filter((r) => r.fromTeam === task.responsible_team);
  const isDevTeam  = merged.responsible_team === 'Development';
  const statusOptions: TaskStatus[] = BOARD_COLUMNS[merged.responsible_team] as TaskStatus[];

  // Role filters per team for the "גורם מבצע" picker
  const assigneeRoles =
    merged.responsible_team === 'Design'        ? (['UI', 'UX'] as const) :
    merged.responsible_team === 'Specification' ? (['מנתח מערכות'] as const) :
    undefined;
  const autoAssignAssignee = merged.responsible_team === 'Specification';

  return (
    <Modal open onClose={() => { save(); onClose(); }} wide>
      <div className="flex gap-0 -mx-6 -my-4 min-h-0" dir="rtl">
      {/* ── History panel (side) ── */}
      {showHistory && task && (
        <div className="w-80 flex-shrink-0 border-l border-gray-200 overflow-y-auto">
          <TaskHistoryPanel taskId={task.id} onClose={() => setShowHistory(false)} />
        </div>
      )}
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 overflow-y-auto px-6 py-4">
      <div className="flex flex-col gap-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="flex flex-col flex-1 gap-1">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>#{task.id}</span>
              {task.parent_id && <span>← #{task.parent_id}</span>}
            </div>
            <input
              className="text-xl font-bold text-gray-900 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none w-full py-1"
              value={merged.title ?? ''}
              onChange={(e) => setEditing((p) => ({ ...p, title: e.target.value }))}
              onBlur={save}
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Flag toggle */}
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              {([0, 1, 2] as const).map((val) => (
                <button
                  key={val}
                  title={val === 0 ? 'ללא דגל' : val === 1 ? 'ספרינט קרוב' : 'דחיפות גבוהה'}
                  onClick={() => {
                    const newFlag = merged.flag === val ? 0 : val;
                    setEditing(p => ({ ...p, flag: newFlag }));
                    fetch(`/api/tasks/${task.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ flag: newFlag }),
                    }).then(() => { load(); onUpdate(); });
                  }}
                  className={`px-2 py-1.5 text-sm transition-colors border-r last:border-r-0 border-gray-200 ${
                    merged.flag === val && val > 0
                      ? 'bg-red-50 text-red-600'
                      : val === 0
                        ? 'text-gray-400 hover:bg-gray-50'
                        : 'text-gray-400 hover:bg-red-50 hover:text-red-500'
                  }`}
                >
                  {val === 0 ? <span className="text-xs">—</span> : val === 1 ? '🚩' : '🚩🚩'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowHistory(h => !h)}
              title="היסטוריית פעולות"
              className={`p-2 rounded-lg transition-colors ${showHistory ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}
            >
              <History size={18} />
            </button>
            <button onClick={duplicate} title="שכפל" className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
              <Copy size={18} />
            </button>
            <button onClick={deleteTask} disabled={deleting} title="מחק" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-40">
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">צוות אחראי</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={merged.responsible_team}
              onChange={(e) => setEditing((p) => ({ ...p, responsible_team: e.target.value as Team }))}
              onBlur={save}
            >
              {(['Specification', 'Design', 'Development'] as Team[]).map((t) => (
                <option key={t} value={t}>{TEAM_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">סטטוס</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={merged.status}
              onChange={(e) => setEditing((p) => ({ ...p, status: e.target.value as TaskStatus }))}
              onBlur={save}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">עדיפות</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={merged.priority}
              onChange={(e) => setEditing((p) => ({ ...p, priority: e.target.value as Priority }))}
              onBlur={save}
            >
              {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                <option key={p} value={p}>{p === 'Low' ? 'נמוך' : p === 'Medium' ? 'בינוני' : p === 'High' ? 'גבוה' : 'דחוף'}</option>
              ))}
            </select>
          </div>
          <UserPicker
            label="גורם מבצע"
            value={merged.assignee_id ?? null}
            onChange={id => setEditing(p => ({ ...p, assignee_id: id }))}
            roles={assigneeRoles as import('@/lib/types').UserRole[] | undefined}
            autoAssign={autoAssignAssignee}
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">תיאור</label>
          <DescriptionEditor
            value={merged.description ?? ''}
            onChange={v => setEditing(p => ({ ...p, description: v }))}
            onBlur={save}
            placeholder="תיאור המשימה..."
          />
        </div>

        {/* Tests checkbox */}
        <button
          onClick={() => {
            const newVal = !merged.tests_passed;
            setEditing((p) => ({ ...p, tests_passed: newVal }));
            fetch(`/api/tasks/${task.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tests_passed: newVal }),
            }).then(() => onUpdate());
          }}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-green-600 w-fit"
        >
          {merged.tests_passed
            ? <CheckSquare size={18} className="text-green-500" />
            : <Square size={18} className="text-gray-400" />
          }
          בוצעו תרחישי בדיקות
        </button>

        {/* Dev-specific fields */}
        {isDevTeam && (
          <div className="border rounded-xl p-4 flex flex-col gap-3 bg-green-50">
            <span className="text-sm font-semibold text-green-700">שדות פיתוח</span>
            <div className="grid grid-cols-2 gap-3">
              <UserPicker label="מפתח Back-end" value={merged.backend_dev_id ?? null}
                onChange={id => setEditing(p => ({ ...p, backend_dev_id: id }))}
                roles={['מפתח Be', 'Fs']} />
              <UserPicker label="מפתח Front-end" value={merged.frontend_dev_id ?? null}
                onChange={id => setEditing(p => ({ ...p, frontend_dev_id: id }))}
                roles={['מפתח Fe', 'Fs']} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600">מאמץ Back-end</label>
                <input type="number" className="border rounded-lg px-3 py-2 text-sm"
                  value={merged.backend_effort ?? ''}
                  onChange={(e) => setEditing((p) => ({ ...p, backend_effort: e.target.value ? Number(e.target.value) : null }))}
                  onBlur={save} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600">מאמץ Front-end</label>
                <input type="number" className="border rounded-lg px-3 py-2 text-sm"
                  value={merged.frontend_effort ?? ''}
                  onChange={(e) => setEditing((p) => ({ ...p, frontend_effort: e.target.value ? Number(e.target.value) : null }))}
                  onBlur={save} />
              </div>
            </div>

            <button onClick={save} disabled={saving} className="bg-green-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-600 w-fit">
              {saving ? 'שומר...' : 'שמור שדות פיתוח'}
            </button>
          </div>
        )}

        {/* Transfer buttons */}
        {applicableTransfers.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <ArrowRightLeft size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">העבר משימה</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {applicableTransfers.map((rule) => {
                const key = `${rule.toTeam}-${rule.toStatus}`;
                const busy = transferring === key;
                return (
                  <button
                    key={key}
                    onClick={() => transfer(rule)}
                    disabled={!!transferring}
                    className="text-sm px-4 py-2 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {busy && <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
                    {rule.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <hr />

        {/* External links */}
        <ExternalLinks taskId={task.id} links={task.links ?? []} onRefresh={load} />

        <hr />

        {/* Comments */}
        <CommentThread taskId={task.id} comments={task.comments ?? []} onRefresh={load} />
      </div>
      </div>
      </div>
    </Modal>
  );
}
