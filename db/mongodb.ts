import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error('MONGODB_URI is not defined');

// ── Connection singleton ───────────────────────────────────────────────────
let isConnected = false;
export async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(MONGODB_URI, { dbName: 'pmdb' });
  isConnected = true;
  await seedDefaults();
}

// ── Counter (auto-increment IDs) ──────────────────────────────────────────
const CounterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

export async function getNextId(name: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return doc.seq;
}

// ── User ──────────────────────────────────────────────────────────────────
const UserSchema = new Schema({
  id:             { type: Number, unique: true },
  name:           { type: String, required: true },
  email:          { type: String, unique: true, sparse: true },
  password_hash:  String,
  role:           String,
  is_admin:       { type: Number, default: 0 },
  can_see_master: { type: Number, default: 1 },
  can_see_spec:   { type: Number, default: 1 },
  can_see_design: { type: Number, default: 1 },
  can_see_dev:    { type: Number, default: 1 },
  can_see_qa:     { type: Number, default: 1 },
  daily_hours:    Number,
  created_at:     { type: String, default: () => new Date().toISOString() },
});
export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

// ── Session ───────────────────────────────────────────────────────────────
const SessionSchema = new Schema({
  token:      { type: String, required: true, unique: true },
  user_id:    { type: Number, required: true },
  expires_at: { type: String, required: true },
  created_at: { type: String, default: () => new Date().toISOString() },
});
export const SessionModel = mongoose.models.Session || mongoose.model('Session', SessionSchema);

// ── Sprint ────────────────────────────────────────────────────────────────
const SprintSchema = new Schema({
  id:                  { type: Number, unique: true },
  sprint_order:        { type: Number, unique: true },
  name:                { type: String, required: true },
  start_date:          String,
  code_freeze_date:    String,
  preprod_date:        String,
  prod_date:           String,
  testing_start_date:  String,
  testing_end_date:    String,
  qa_date:             String,
  status:              { type: String, default: 'active' },
  completed_at:        String,
  sprint_number:       Number,
  updated_at:          { type: String, default: () => new Date().toISOString() },
});
export const SprintModel = mongoose.models.Sprint || mongoose.model('Sprint', SprintSchema);

// ── Task ──────────────────────────────────────────────────────────────────
const TaskSchema = new Schema({
  _id:                String,   // custom ID like "1", "2.5"
  parent_id:          String,
  sequence:           Number,
  title:              { type: String, required: true },
  description:        String,
  responsible_team:   String,
  status:             String,
  priority:           { type: String, default: 'Medium' },
  assignee_id:        Number,
  backend_dev_id:     Number,
  frontend_dev_id:    Number,
  backend_effort:     Number,
  frontend_effort:    Number,
  effort:             Number,
  project_id:         Number,
  work_week:          String,   // "YYYY-WW" e.g. "2026-24"
  tests_passed:       { type: Number, default: 0 },
  flag:               { type: Number, default: 0 },  // 0=none 1=one flag 2=two flags
  sort_order:         { type: Number, default: 0 },
  is_archived:        { type: Number, default: 0 },
  archived_sprint_id: Number,
  wip_from_sprint_id: Number,
  created_at:         { type: String, default: () => new Date().toISOString() },
  updated_at:         { type: String, default: () => new Date().toISOString() },
}, { _id: false });
export const TaskModel = mongoose.models.Task || mongoose.model('Task', TaskSchema);

// ── Project ───────────────────────────────────────────────────────────────
const ProjectSchema = new Schema({
  id:         { type: Number, unique: true },
  name:       { type: String, required: true },
  created_at: { type: String, default: () => new Date().toISOString() },
});
export const ProjectModel = mongoose.models.Project || mongoose.model('Project', ProjectSchema);

// ── Holiday ───────────────────────────────────────────────────────────────
const HolidaySchema = new Schema({
  id:         { type: Number, unique: true },
  title:      { type: String, required: true },
  start_date: String,
  end_date:   String,
  created_at: { type: String, default: () => new Date().toISOString() },
});
export const HolidayModel = mongoose.models.Holiday || mongoose.model('Holiday', HolidaySchema);

// ── UserVacation ──────────────────────────────────────────────────────────
const VacationSchema = new Schema({
  id:         { type: Number, unique: true },
  user_id:    Number,
  start_date: String,
  end_date:   String,
  note:       String,
  created_at: { type: String, default: () => new Date().toISOString() },
});
export const VacationModel = mongoose.models.Vacation || mongoose.model('Vacation', VacationSchema);

// ── Comment ───────────────────────────────────────────────────────────────
const CommentSchema = new Schema({
  id:                { type: Number, unique: true },
  task_id:           String,
  parent_comment_id: Number,
  author_id:         Number,
  author_name:       String,
  body:              String,
  created_at:        { type: String, default: () => new Date().toISOString() },
});
export const CommentModel = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);

// ── TaskLink ──────────────────────────────────────────────────────────────
const TaskLinkSchema = new Schema({
  id:         { type: Number, unique: true },
  task_id:    String,
  url:        String,
  label:      String,
  sort_order: { type: Number, default: 0 },
});
export const TaskLinkModel = mongoose.models.TaskLink || mongoose.model('TaskLink', TaskLinkSchema);

// ── TaskHistory ───────────────────────────────────────────────────────────
const TaskHistorySchema = new Schema({
  id:         { type: Number, unique: true },
  task_id:    { type: String, required: true },
  user_id:    Number,
  user_name:  { type: String, default: 'מערכת' },
  action:     { type: String, required: true },
  created_at: { type: String, default: () => new Date().toISOString() },
});
export const TaskHistoryModel =
  mongoose.models.TaskHistory || mongoose.model('TaskHistory', TaskHistorySchema);

export async function recordHistory(
  taskId: string,
  userId: number | null,
  userName: string,
  action: string,
): Promise<void> {
  const id = await getNextId('task_history');
  await TaskHistoryModel.create({
    id, task_id: taskId, user_id: userId,
    user_name: userName || 'מערכת', action,
  });
}

// ── Notification ──────────────────────────────────────────────────────────
const NotificationSchema = new Schema({
  id:         { type: Number, unique: true },
  user_id:    Number,
  type:       String,
  message:    String,
  link:       String,
  is_read:    { type: Number, default: 0 },
  created_at: { type: String, default: () => new Date().toISOString() },
});
export const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

// ── Auth helpers ──────────────────────────────────────────────────────────
export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await SessionModel.create({ token, user_id: userId, expires_at: expires });
  return token;
}

export async function getUserBySession(token: string) {
  const session = await SessionModel.findOne({ token });
  if (!session || session.expires_at < new Date().toISOString()) return undefined;
  const user = await UserModel.findOne({ id: session.user_id });
  if (!user) return undefined;
  return {
    id: user.id, name: user.name, email: user.email, role: user.role,
    is_admin: user.is_admin,
    can_see_master: user.can_see_master, can_see_spec: user.can_see_spec,
    can_see_design: user.can_see_design, can_see_dev: user.can_see_dev,
    can_see_qa: user.can_see_qa ?? 1,
  };
}

export async function deleteSession(token: string): Promise<void> {
  await SessionModel.deleteOne({ token });
}

// ── Task ID helpers ───────────────────────────────────────────────────────
export async function getNextTaskId(): Promise<{ id: string; sequence: number }> {
  const doc = await Counter.findByIdAndUpdate(
    'task_sequence',
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return { id: String(doc.seq), sequence: doc.seq };
}

export async function getDuplicateTaskId(parentSequence: number): Promise<string> {
  let decimal = 5;
  while (decimal < 100) {
    const candidateId = `${parentSequence}.${decimal}`;
    const existing = await TaskModel.findById(candidateId);
    if (!existing) return candidateId;
    decimal++;
  }
  return `${parentSequence}.${Date.now()}`;
}

// ── Format task with user names ───────────────────────────────────────────
export async function formatTask(task: any) {
  const userIds = [task.assignee_id, task.backend_dev_id, task.frontend_dev_id].filter(Boolean);
  const users = userIds.length ? await UserModel.find({ id: { $in: userIds } }) : [];
  const umap: Record<number, string> = {};
  for (const u of users) umap[u.id] = u.name;

  let project_name: string | null = null;
  if (task.project_id) {
    const proj = await ProjectModel.findOne({ id: task.project_id });
    project_name = proj?.name ?? null;
  }

  return {
    id: task._id,
    parent_id: task.parent_id ?? null,
    sequence: task.sequence,
    title: task.title,
    description: task.description ?? null,
    responsible_team: task.responsible_team,
    status: task.status,
    priority: task.priority,
    assignee_id: task.assignee_id ?? null,
    assignee_name: task.assignee_id ? (umap[task.assignee_id] ?? null) : null,
    backend_dev_id: task.backend_dev_id ?? null,
    backend_dev_name: task.backend_dev_id ? (umap[task.backend_dev_id] ?? null) : null,
    frontend_dev_id: task.frontend_dev_id ?? null,
    frontend_dev_name: task.frontend_dev_id ? (umap[task.frontend_dev_id] ?? null) : null,
    backend_effort: task.backend_effort ?? null,
    frontend_effort: task.frontend_effort ?? null,
    effort: task.effort ?? null,
    project_id: task.project_id ?? null,
    project_name,
    work_week: task.work_week ?? null,
    tests_passed: task.tests_passed ?? 0,
    flag: task.flag ?? 0,
    sort_order: task.sort_order ?? 0,
    is_archived: task.is_archived ?? 0,
    archived_sprint_id: task.archived_sprint_id ?? null,
    wip_from_sprint_id: task.wip_from_sprint_id ?? null,
    created_at: task.created_at,
    updated_at: task.updated_at,
  };
}

// ── Seed defaults ─────────────────────────────────────────────────────────
let seeded = false;
async function seedDefaults() {
  if (seeded) return;
  seeded = true;

  // Admin user
  const adminEmail = 'danielba@elad.co.il';
  const existing = await UserModel.findOne({ email: adminEmail });
  if (!existing) {
    const hash = bcrypt.hashSync('6474546', 10);
    const id = await getNextId('users');
    await UserModel.create({
      id, name: 'דניאל באבו', email: adminEmail, password_hash: hash,
      is_admin: 1, can_see_master: 1, can_see_spec: 1, can_see_design: 1, can_see_dev: 1, can_see_qa: 1,
    });
  } else {
    await UserModel.updateOne({ email: adminEmail }, { $set: { name: 'דניאל באבו' } });
  }

  // Default sprints
  const sprintNames = ['ספרינט נוכחי', 'ספרינט הבא', 'ספרינט הבא הבא'];
  for (let i = 0; i < sprintNames.length; i++) {
    const ex = await SprintModel.findOne({ sprint_order: i });
    if (!ex) {
      const id = await getNextId('sprints');
      await SprintModel.create({ id, sprint_order: i, name: sprintNames[i] });
    }
  }

  // Sync task counter
  const maxTask = await TaskModel.findOne({}, {}, { sort: { sequence: -1 } });
  if (maxTask?.sequence) {
    await Counter.findByIdAndUpdate('task_sequence', { $max: { seq: maxTask.sequence } }, { upsert: true });
  }
}

export default connectDB;

// ── SessionUser type (used by userContext) ────────────────────────────────
export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string | null;
  is_admin: number;
  can_see_master: number;
  can_see_spec: number;
  can_see_design: number;
  can_see_dev: number;
  can_see_qa: number;
}
