export type Team = 'Specification' | 'Design' | 'Development' | 'QA';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type SpecStatus = 'Awaiting Spec' | 'In Spec' | 'Awaiting Client' | 'Done';
export type DesignStatus =
  | 'Awaiting UX'
  | 'In UX'
  | 'Awaiting UI'
  | 'In UI'
  | 'Awaiting Client Approval'
  | 'Done';
export type DevStatus =
  | 'Awaiting Dev'
  | 'Current Sprint'
  | 'Next Sprint'
  | 'Sprint After Next';
export type QAStatus =
  | 'Ready for QA'
  | 'In QA'
  | 'Return to Dev'
  | 'QA Done';

export type TaskStatus = SpecStatus | DesignStatus | DevStatus | QAStatus;

export type UserRole = 'מנתח מערכות' | 'UI' | 'UX' | 'מפתח Be' | 'מפתח Fe' | 'Fs' | 'ראש צוות פיתוח' | 'QA';

export const USER_ROLES: UserRole[] = ['מנתח מערכות', 'UI', 'UX', 'מפתח Be', 'מפתח Fe', 'Fs', 'ראש צוות פיתוח', 'QA'];

export interface User {
  id: number;
  name: string;
  email: string | null;
  role: UserRole | null;
  is_admin: number;
  daily_hours: number | null;
  created_at: string;
}

export interface TaskLink {
  id: number;
  task_id: string;
  url: string;
  label: string | null;
  sort_order: number;
}

export interface Comment {
  id: number;
  task_id: string;
  parent_comment_id: number | null;
  author_id: number | null;
  author_name: string | null;
  body: string;
  created_at: string;
  replies?: Comment[];
}

export interface Task {
  id: string;
  parent_id: string | null;
  sequence: number;
  title: string;
  description: string | null;
  responsible_team: Team;
  status: TaskStatus;
  priority: Priority;
  assignee_id: number | null;
  assignee_name?: string | null;
  backend_dev_id: number | null;
  backend_dev_name?: string | null;
  frontend_dev_id: number | null;
  frontend_dev_name?: string | null;
  backend_effort: number | null;
  frontend_effort: number | null;
  effort: number | null;
  project_id: number | null;
  project_name?: string | null;
  work_week: string | null;  // "YYYY-WW"
  dev_start_date: string | null;
  dev_end_date: string | null;
  test_start_date: string | null;
  test_end_date: string | null;
  tests_passed: boolean;
  flag: number;   // 0 = none, 1 = one flag, 2 = two flags
  sort_order: number;
  is_archived: number;
  archived_sprint_id: number | null;
  wip_from_sprint_id: number | null;
  created_at: string;
  updated_at: string;
  links?: TaskLink[];
  comments?: Comment[];
}

export interface Project {
  id: number;
  name: string;
  created_at: string;
}

export interface Holiday {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
}

export interface UserVacation {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  note: string | null;
}

export interface Sprint {
  id: number;
  sprint_order: number;
  name: string;
  start_date: string | null;
  code_freeze_date: string | null;
  status: 'active' | 'completed';
  completed_at: string | null;
  preprod_date: string | null;
  prod_date: string | null;
  sprint_number: number | null;
  testing_start_date: string | null;
  testing_end_date: string | null;
  qa_date: string | null;
  updated_at: string;
}

export interface TaskHistoryEntry {
  id: number;
  task_id: string;
  user_id: number | null;
  user_name: string;
  action: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: 'mention' | 'assignment';
  message: string;
  link: string | null;
  is_read: number;
  created_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  responsible_team: Team;
  status: TaskStatus;
  priority?: Priority;
  assignee_id?: number | null;
  backend_dev_id?: number | null;
  frontend_dev_id?: number | null;
  backend_effort?: number | null;
  frontend_effort?: number | null;
  tests_passed?: boolean;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  sort_order?: number;
}

export interface TransferInput {
  toTeam: Team;
  toStatus: TaskStatus;
}
