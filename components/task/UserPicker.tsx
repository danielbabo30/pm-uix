'use client';

import { useEffect, useRef, useState } from 'react';
import type { User, UserRole } from '@/lib/types';

interface UserPickerProps {
  label: string;
  value: number | null;
  onChange: (id: number | null) => void;
  /** Only users whose role is in this list are shown in the dropdown */
  roles?: UserRole[];
  /** When true and exactly one user matches the role filter, auto-select them */
  autoAssign?: boolean;
  /**
   * Auto-assign specifically to a user with this role (exactly one must exist).
   * Takes precedence over autoAssign.
   * Use when the dropdown shows a broad role list but the default should be a specific role.
   * e.g. Design shows UI+UX, but defaults to UX.
   */
  preferRole?: UserRole;
}

export default function UserPicker({
  label, value, onChange, roles, autoAssign, preferRole,
}: UserPickerProps) {
  const [users, setUsers] = useState<User[]>([]);

  // Stable ref so effects don't re-fire just because the parent re-renders
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers);
  }, []);

  const filtered = roles
    ? users.filter(u => u.role && (roles as string[]).includes(u.role))
    : users;

  // Users matching the preferred role (used for targeted auto-assign)
  const preferred = preferRole
    ? users.filter(u => u.role === preferRole)
    : [];

  // Auto-assign by preferRole — fires first
  useEffect(() => {
    if (preferRole && value === null && preferred.length === 1) {
      onChangeRef.current(preferred[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferred, preferRole, value]);

  // Auto-assign by general roles — fires when no preferRole or preferRole returned 0/2+ matches
  useEffect(() => {
    if (!preferRole && autoAssign && value === null && filtered.length === 1) {
      onChangeRef.current(filtered[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, autoAssign, preferRole, value]);

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
