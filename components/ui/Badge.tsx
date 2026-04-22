'use client';

import { PRIORITY_COLORS, PRIORITY_LABELS, TEAM_COLORS, TEAM_LABELS } from '@/lib/constants';
import type { Priority, Team } from '@/lib/types';

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

// Muted single-hue per team — soft enough to not compete with card content
const TEAM_BADGE: Record<Team, string> = {
  Specification: 'bg-violet-50 text-violet-500 border border-violet-100',
  Design:        'bg-pink-50  text-pink-500  border border-pink-100',
  Development:   'bg-teal-50  text-teal-600  border border-teal-100',
};

export function TeamBadge({ team }: { team: Team }) {
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${TEAM_BADGE[team]}`}>
      {TEAM_LABELS[team]}
    </span>
  );
}
