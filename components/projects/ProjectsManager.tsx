'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, X, FolderOpen } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  created_at: string;
}

export default function ProjectsManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [adding,   setAdding]   = useState(false);
  const [name,     setName]     = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/projects');
    if (res.ok) setProjects(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setName(''); setError(''); setAdding(true); };
  const closeAdd = () => { setAdding(false); setError(''); };

  const submit = async () => {
    if (!name.trim()) { setError('נא להזין שם פרויקט'); return; }
    setSaving(true);
    setError('');
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'שגיאה בשמירה');
      return;
    }
    closeAdd();
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('למחוק את הפרויקט?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="px-6" dir="rtl">
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm text-gray-500">{projects.length} פרויקטים</span>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
          הוסף פרויקט
        </button>
      </div>

      {loading ? (
        <div className="text-center text-sm text-gray-400 py-10">טוען...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-14">
          <FolderOpen size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">אין פרויקטים עדיין</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {projects.map(p => (
            <li key={p.id} className="flex items-center justify-between py-3 group">
              <div className="flex items-center gap-2.5">
                <FolderOpen size={16} className="text-blue-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800">{p.name}</span>
              </div>
              <button
                onClick={() => remove(p.id)}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="מחק"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add project dialog */}
      {adding && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={closeAdd}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-bold text-gray-800">פרויקט חדש</span>
              <button onClick={closeAdd} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs font-semibold text-gray-500 mb-1.5">שם הפרויקט</p>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="הזן שם פרויקט..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 mt-5">
              <button
                onClick={submit}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'שומר...' : 'צור פרויקט'}
              </button>
              <button
                onClick={closeAdd}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
