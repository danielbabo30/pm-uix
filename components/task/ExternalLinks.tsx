'use client';

import { useState } from 'react';
import { Plus, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import type { TaskLink } from '@/lib/types';

interface ExternalLinksProps {
  taskId: string;
  links: TaskLink[];
  onRefresh: () => void;
}

export default function ExternalLinks({ taskId, links, onRefresh }: ExternalLinksProps) {
  const [url,      setUrl]      = useState('');
  const [label,    setLabel]    = useState('');
  const [adding,   setAdding]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);

  const add = async () => {
    if (!url.trim()) return;
    setSaving(true);
    await fetch(`/api/tasks/${taskId}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, label }),
    });
    setSaving(false);
    setUrl('');
    setLabel('');
    setAdding(false);
    onRefresh();
  };

  const remove = async (linkId: number) => {
    setRemoving(linkId);
    await fetch(`/api/tasks/${taskId}/links?linkId=${linkId}`, { method: 'DELETE' });
    setRemoving(null);
    onRefresh();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">קישורים חיצוניים</span>
        <button
          onClick={() => setAdding(!adding)}
          className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1"
        >
          <Plus size={14} /> הוסף קישור
        </button>
      </div>

      {adding && (
        <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg">
          <input
            placeholder="URL (https://...)"
            className="border rounded px-2 py-1 text-sm"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            autoFocus
          />
          <input
            placeholder="תווית (אופציונלי)"
            className="border rounded px-2 py-1 text-sm"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <div className="flex gap-2">
            <button
              onClick={add}
              disabled={saving || !url.trim()}
              className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {saving ? <><Loader2 size={11} className="animate-spin" /> מוסיף...</> : 'הוסף'}
            </button>
            <button
              onClick={() => { setAdding(false); setUrl(''); setLabel(''); }}
              disabled={saving}
              className="text-gray-500 text-xs px-3 py-1 rounded hover:bg-gray-200 disabled:opacity-40"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {links.map(link => (
          <div key={link.id} className="flex items-center gap-2 group">
            <ExternalLink size={14} className="text-gray-400 flex-shrink-0" />
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline truncate flex-1"
            >
              {link.label || link.url}
            </a>
            <button
              onClick={() => remove(link.id)}
              disabled={removing === link.id}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 disabled:opacity-50"
            >
              {removing === link.id
                ? <Loader2 size={13} className="animate-spin" />
                : <Trash2 size={14} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
