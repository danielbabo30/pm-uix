'use client';

import { useEffect, useRef, useState } from 'react';
import type { User, UserRole } from '@/lib/types';

interface UserPickerProps {
  label: string;
  value: number | null;
  onChange: (id: number | null) => void;
  /** When provided, only users whose role is in this list are shown */
  roles?: UserRole[];
  /** When true and exactly one user matches the role filter, auto-select them */
  autoAssign?: boolean;
}

export default function UserPicker({
  label, value, onChange, roles, autoAssign,
}: UserPickerProps) {
  const [users, setUsers] = useState<User[]>([]);

  // Keep a stable ref to onChange so auto-assign effect isn't re-triggered
  // purely because an inline arrow function changed identity on parent re-render
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers);
  }, []);

  const filtered = roles
    ? users.filter(u => u.role && (roles as string[]).includes(u.role))
    : users;

  // Auto-assign: if there's exactly one candidate and nothing is selected yet
  useEffect(() => {
    if (autoAssign && value === null && filtered.length === 1) {
      onChangeRef.current(filtered[0].id);
    }
  }, [filtered, autoAssign, value]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-600">{label}</label>
      <select
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">-- ללא --</option>
        {filtered.map(u => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
    </div>
  );
}
