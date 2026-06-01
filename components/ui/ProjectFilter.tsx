'use client';

import { useState, useEffect } from 'react';
import type { Project } from '@/lib/types';
import { FolderOpen } from 'lucide-react';

interface Props {
  value: number | null;
  onChange: (id: number | null) => void;
}

export default function ProjectFilter({ value, onChange }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : []));
  }, []);

  if (projects.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <FolderOpen size={14} className="text-gray-400 flex-shrink-0" />
      <select
        className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">כל הפרויקטים</option>
        {projects.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}
