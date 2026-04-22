import { NextRequest, NextResponse } from 'next/server';
import {
  connectDB, TaskModel, UserModel, getNextTaskId,
  getUserBySession, recordHistory,
} from '@/db/mongodb';

// ── Simple but robust CSV parser ──────────────────────────────────────────
function parseCSV(text: string): string[][] {
  // Remove BOM if present
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"')              inQuotes = false;
      else                              field += ch;
    } else {
      if      (ch === '"')  inQuotes = true;
      else if (ch === ',')  { row.push(field.trim()); field = ''; }
      else if (ch === '\n') {
        row.push(field.trim());
        field = '';
        if (row.some(f => f !== '')) rows.push(row);
        row = [];
      } else field += ch;
    }
  }
  if (field || row.length) { row.push(field.trim()); if (row.some(f => f !== '')) rows.push(row); }
  return rows;
}

const VALID_TEAMS   = new Set(['Specification', 'Design', 'Development']);
const VALID_PRIORITIES = new Set(['Low', 'Medium', 'High', 'Urgent']);

const DEFAULT_STATUS: Record<string, string> = {
  Specification: 'Awaiting Spec',
  Design:        'Awaiting UX',
  Development:   'Awaiting Dev',
};

// Map Hebrew column headers to internal keys
const HEADER_MAP: Record<string, string> = {
  'כותרת':        'title',
  'תיאור':        'description',
  'צוות':         'responsible_team',
  'סטטוס':        'status',
  'עדיפות':       'priority',
  'גורם מבצע':    'assignee_name',
  'מפתח be':      'backend_dev_name',
  'מפתח fe':      'frontend_dev_name',
  "מאמץ be (שע׳)":'backend_effort',
  "מאמץ fe (שע׳)":'frontend_effort',
  // English fallbacks
  'title':         'title',
  'description':   'description',
  'responsible_team': 'responsible_team',
  'status':        'status',
  'priority':      'priority',
  'assignee_name': 'assignee_name',
  'backend_dev_name':  'backend_dev_name',
  'frontend_dev_name': 'frontend_dev_name',
  'backend_effort':    'backend_effort',
  'frontend_effort':   'frontend_effort',
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const csvText: string = body.csv;
    if (!csvText?.trim()) {
      return NextResponse.json({ error: 'CSV ריק' }, { status: 400 });
    }

    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV חייב להכיל שורת כותרת ולפחות שורה אחת' }, { status: 400 });
    }

    // Map headers
    const headerRow = rows[0].map(h => h.toLowerCase().trim());
    const colIndex: Record<string, number> = {};
    for (let i = 0; i < headerRow.length; i++) {
      const key = HEADER_MAP[headerRow[i]];
      if (key) colIndex[key] = i;
    }

    if (colIndex['title'] === undefined) {
      return NextResponse.json({ error: 'לא נמצאה עמודת "כותרת" (title) בקובץ' }, { status: 400 });
    }

    // Build user name → id map
    const allUsers = await UserModel.find({}, { id: 1, name: 1 });
    const nameToId: Record<string, number> = {};
    for (const u of allUsers) nameToId[u.name] = u.id;

    // Session user for history
    const token = req.cookies.get('pm-session')?.value;
    const sessionUser = token ? await getUserBySession(token) : null;
    const actorId   = sessionUser?.id   ?? null;
    const actorName = sessionUser?.name ?? 'ייבוא';

    const dataRows = rows.slice(1);
    let created = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      const get = (key: string) => (colIndex[key] !== undefined ? r[colIndex[key]] ?? '' : '');

      const title = get('title').trim();
      if (!title) { errors.push(`שורה ${i + 2}: כותרת ריקה — דולגה`); continue; }

      const rawTeam = get('responsible_team').trim();
      const team = VALID_TEAMS.has(rawTeam) ? rawTeam : 'Specification';

      const rawPriority = get('priority').trim();
      const priority = VALID_PRIORITIES.has(rawPriority) ? rawPriority : 'Medium';

      const status = get('status').trim() || DEFAULT_STATUS[team];

      const assigneeName     = get('assignee_name').trim();
      const backendDevName   = get('backend_dev_name').trim();
      const frontendDevName  = get('frontend_dev_name').trim();

      const assignee_id    = assigneeName    ? (nameToId[assigneeName]    ?? null) : null;
      const backend_dev_id  = backendDevName  ? (nameToId[backendDevName]  ?? null) : null;
      const frontend_dev_id = frontendDevName ? (nameToId[frontendDevName] ?? null) : null;

      const backend_effort  = get('backend_effort')  ? Number(get('backend_effort'))  : null;
      const frontend_effort = get('frontend_effort') ? Number(get('frontend_effort')) : null;

      const description = get('description').trim() || null;

      // Get next task id
      const maxOrderDoc = await TaskModel.findOne(
        { responsible_team: team, status },
      ).sort({ sort_order: -1 });
      const maxOrder = maxOrderDoc?.sort_order ?? -1;

      const { id, sequence } = await getNextTaskId();

      await TaskModel.create({
        _id: id,
        sequence,
        title,
        description,
        responsible_team: team,
        status,
        priority,
        assignee_id,
        backend_dev_id,
        frontend_dev_id,
        backend_effort: isNaN(backend_effort as number) ? null : backend_effort,
        frontend_effort: isNaN(frontend_effort as number) ? null : frontend_effort,
        tests_passed: 0,
        flag: 0,
        sort_order: maxOrder + 1,
        is_archived: 0,
      });

      await recordHistory(id, actorId, actorName, `יובא מקובץ CSV`);
      created++;
    }

    return NextResponse.json({ created, errors, total: dataRows.length });
  } catch (err) {
    console.error('[POST /api/tasks/import]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
