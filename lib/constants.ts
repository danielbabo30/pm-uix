import type { Team, TaskStatus } from './types';

export const TEAMS: Team[] = ['Specification', 'Design', 'Development', 'QA'];

export const TEAM_LABELS: Record<Team, string> = {
  Specification: 'UX',
  Design:        'UI',
  Development:   'פיתוח',
  QA:            'בדיקות',
};

export const BOARD_COLUMNS: Record<Team | 'Master', TaskStatus[]> = {
  Specification: ['Awaiting Spec', 'In Spec', 'Awaiting Client', 'Done'],
  Design:        ['Awaiting UI', 'In UI', 'Awaiting Client Approval', 'Done'],
  Development:   ['Awaiting Dev', 'Current Sprint', 'Next Sprint', 'Sprint After Next'],
  QA:            ['Ready for QA', 'In QA', 'Return to Dev', 'QA Done'],
  Master: [
    'Awaiting Spec', 'In Spec', 'Awaiting Client',
    'Awaiting UX', 'In UX', 'Awaiting UI', 'In UI', 'Awaiting Client Approval',
    'Awaiting Dev', 'Current Sprint', 'Next Sprint', 'Sprint After Next',
    'Ready for QA', 'In QA', 'Return to Dev', 'QA Done',
    'Done',
  ],
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  'Awaiting Spec':           'ממתין ל-UX',
  'In Spec':                 'ב-UX',
  'Awaiting Client':         'ממתין ללקוח',
  'Awaiting UX':             'ממתין ל-UX',
  'In UX':                   'ב-UX',
  'Awaiting UI':             'ממתין ל-UI',
  'In UI':                   'ב-UI',
  'Awaiting Client Approval':'ממתין לאישור לקוח',
  'Awaiting Dev':            'ממתין לפיתוח',
  'Current Sprint':          'ספרינט נוכחי',
  'Next Sprint':             'ספרינט הבא',
  'Sprint After Next':       'ספרינט הבא הבא',
  'Ready for QA':            'מוכן לבדיקות',
  'In QA':                   'בבדיקות',
  'Return to Dev':           'להחזיר לפיתוח',
  'QA Done':                 'תקין',
  Done:                      'הסתיים',
};

export const PRIORITY_LABELS: Record<string, string> = {
  Low: 'נמוך',
  Medium: 'בינוני',
  High: 'גבוה',
  Urgent: 'דחוף',
};

export const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-orange-100 text-orange-700',
  Urgent: 'bg-red-100 text-red-700',
};

export const TEAM_COLORS: Record<Team, string> = {
  Specification: 'bg-purple-100 text-purple-700',
  Design:        'bg-pink-100   text-pink-700',
  Development:   'bg-green-100  text-green-700',
  QA:            'bg-amber-100  text-amber-700',
};

export interface TransferRule {
  label: string;
  fromTeam: Team;
  toTeam: Team;
  toStatus: TaskStatus;
}

// Rules shown inside the task modal
export const TRANSFER_RULES: TransferRule[] = [
  { label: 'שלח ל-UI',       fromTeam: 'Specification', toTeam: 'Design',       toStatus: 'Awaiting UX'   },
  { label: 'שלח לפיתוח',    fromTeam: 'Specification', toTeam: 'Development',  toStatus: 'Awaiting Dev'  },
  { label: 'שלח לפיתוח',    fromTeam: 'Design',        toTeam: 'Development',  toStatus: 'Awaiting Dev'  },
  { label: 'החזר ל-UX',     fromTeam: 'Design',        toTeam: 'Specification',toStatus: 'Awaiting Spec' },
  { label: 'שלח לבדיקות',   fromTeam: 'Development',   toTeam: 'QA',           toStatus: 'Ready for QA'  },
  { label: 'החזר לפיתוח',   fromTeam: 'QA',            toTeam: 'Development',  toStatus: 'Awaiting Dev'  },
];

// All cross-team transfers — used in Master view
export const ALL_TRANSFER_RULES: TransferRule[] = [
  ...TRANSFER_RULES,
  { label: 'שלח ל-UX',      fromTeam: 'Development',  toTeam: 'Specification', toStatus: 'Awaiting Spec' },
  { label: 'שלח ל-UI',      fromTeam: 'Development',  toTeam: 'Design',        toStatus: 'Awaiting UX'   },
];

export const DEFAULT_STATUS: Record<Team, TaskStatus> = {
  Specification: 'Awaiting Spec',
  Design:        'Awaiting UX',
  Development:   'Awaiting Dev',
  QA:            'Ready for QA',
};
