'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import UserPicker from './UserPicker';
import { TEAM_LABELS, DEFAULT_STATUS } from '@/lib/constants';
import type { Team, Priority, UserRole } from '@/lib/types';

interface CreateTaskModalProps {
  open: boolean;
  defaultTeam?: Team;
  defaultStatus?: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTaskModal({
  open, defaultTeam = 'Specification', defaultStatus, onClose, onCreated,
}: CreateTaskModalProps) {
  const [title,          setTitle]          = useState('');
  const [description,    setDescription]    = useState('');
  const [team,           setTeam]           = useState<Team>(defaultTeam);
  const [priority,       setPriority]       = useState<Priority>('Medium');
  const [assigneeId,     setAssigneeId]     = useState<number | null>(null);
  const [backendDevId,   setBackendDevId]   = useState<number | null>(null);
  const [frontendDevId,  setFrontendDevId]  = useState<number | null>(null);
  const [backendEffort,  setBackendEffort]  = useState('');
  const [frontendEffort, setFrontendEffort] = useState('');
  const [error,          setError]          = useState('');
  const [saving,         setSaving]         = useState(false);

  // Sync team when defaultTeam changes (e.g. clicking + in a specific board)
  useEffect(() => { setTeam(defaultTeam); }, [defaultTeam]);

  // Reset assignee when team changes so auto-assign can re-fire
  useEffect(() => { setAssigneeId(null); }, [team]);

  const isDevTeam = team === 'Development';

  // Role filter for "גורם מבצע" per team
  const assigneeRoles: UserRole[] | undefined =
    team === 'Design'        ? ['UI', 'UX'] :
    team === 'Specification' ? ['מנתח מערכות'] :
    undefined;
  const autoAssignAssignee = team === 'Specification';

  const reset = () => {
    setTitle(''); setDescription(''); setPriority('Medium');
    setAssigneeId(null); setBackendDevId(null); setFrontendDevId(null);
    setBackendEffort(''); setFrontendEffort(''); setError('');
  };

  const submit = async () => {
    if (!title.trim()) { setError('כותרת שדה חובה'); return; }
    if (isDevTeam && !description.trim()) { setError('תיאור שדה חובה עבור פיתוח'); return; }
    setSaving(true);
    setError('');
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        responsible_team: team,
        status: defaultStatus || DEFAULT_STATUS[team],
        priority,
        assignee_id: assigneeId,
        backend_dev_id:   isDevTeam ? backendDevId   : null,
        frontend_dev_id:  isDevTeam ? frontendDevId  : null,
        backend_effort:   isDevTeam && backendEffort  ? Number(backendEffort)  : null,
        frontend_effort:  isDevTeam && frontendEffort ? Number(frontendEffort) : null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'שגיאה');
      return;
    }
    reset();
    onCreated();
    onClose();
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="משימה חדשה" wide={isDevTeam}>
      <div className="flex flex-col gap-4" dir="rtl">
        {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

        {/* Title */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">כותרת *</label>
          <input
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isDevTeam && submit()}
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">
            תיאור {isDevTeam && <span className="text-red-500">*</span>}
          </label>
          <textarea
            className="border rounded-lg px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* Team + Priority + Assignee */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">צוות</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={team}
              onChange={e => setTeam(e.target.value as Team)}
            >
              {(['Specification', 'Design', 'Development'] as Team[]).map(t => (
                <option key={t} value={t}>{TEAM_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">עדיפות</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
            >
              {[['Low','נמוך'],['Medium','בינוני'],['High','גבוה'],['Urgent','דחוף']].map(([v,l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <UserPicker
            label="גורם מבצע"
            value={assigneeId}
            onChange={setAssigneeId}
            roles={assigneeRoles}
            autoAssign={autoAssignAssignee}
          />
        </div>

        {/* Dev-specific fields */}
        {isDevTeam && (
          <div className="border border-green-200 rounded-xl p-4 flex flex-col gap-3 bg-green-50">
            <span className="text-sm font-semibold text-green-700">שדות פיתוח</span>
            <div className="grid grid-cols-2 gap-3">
              <UserPicker
                label="מפתח Back-end"
                value={backendDevId}
                onChange={setBackendDevId}
                roles={['מפתח Be', 'Fs']}
              />
              <UserPicker
                label="מפתח Front-end"
                value={frontendDevId}
                onChange={setFrontendDevId}
                roles={['מפתח Fe', 'Fs']}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600">מאמץ Back-end</label>
                <input type="number" min="0" className="border rounded-lg px-3 py-2 text-sm"
                  value={backendEffort} onChange={e => setBackendEffort(e.target.value)}
                  placeholder="נקודות / שעות" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600">מאמץ Front-end</label>
                <input type="number" min="0" className="border rounded-lg px-3 py-2 text-sm"
                  value={frontendEffort} onChange={e => setFrontendEffort(e.target.value)}
                  placeholder="נקודות / שעות" />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            ביטול
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'יוצר...' : 'צור משימה'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
