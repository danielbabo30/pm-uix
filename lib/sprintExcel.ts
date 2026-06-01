import * as XLSX from 'xlsx';
import type { Task } from './types';

const PRIORITY_LABELS: Record<string, string> = {
  Low: 'נמוך', Medium: 'בינוני', High: 'גבוה', Critical: 'קריטי',
};

export function exportSprintToExcel(tasks: Task[], sprintStatus: string, sprintName: string) {
  interface DevTask { title: string; priority: string; effort: number | null; type: 'BE' | 'FE' | 'BE+FE' }
  const devMap = new Map<number, { name: string; tasks: DevTask[] }>();

  const ensure = (id: number, name: string) => {
    if (!devMap.has(id)) devMap.set(id, { name, tasks: [] });
    return devMap.get(id)!;
  };

  for (const t of tasks) {
    if (t.status !== sprintStatus) continue;

    const samedev = t.backend_dev_id && t.frontend_dev_id && t.backend_dev_id === t.frontend_dev_id;

    if (samedev && t.backend_dev_id && t.backend_dev_name) {
      ensure(t.backend_dev_id, t.backend_dev_name).tasks.push({
        title: t.title,
        priority: t.priority ?? '',
        effort: (t.backend_effort ?? 0) + (t.frontend_effort ?? 0),
        type: 'BE+FE',
      });
    } else {
      if (t.backend_dev_id && t.backend_dev_name) {
        ensure(t.backend_dev_id, t.backend_dev_name).tasks.push({
          title: t.title,
          priority: t.priority ?? '',
          effort: t.backend_effort ?? null,
          type: 'BE',
        });
      }
      if (t.frontend_dev_id && t.frontend_dev_name) {
        ensure(t.frontend_dev_id, t.frontend_dev_name).tasks.push({
          title: t.title,
          priority: t.priority ?? '',
          effort: t.frontend_effort ?? null,
          type: 'FE',
        });
      }
    }
  }

  type Row = (string | number)[];
  const rows: Row[] = [];

  const devs = Array.from(devMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'he'),
  );

  for (const dev of devs) {
    rows.push([`👤 ${dev.name}`]);
    rows.push(['כותרת משימה', 'עדיפות', 'סוג', 'הערכת מאמץ (שע׳)']);
    for (const task of dev.tasks) {
      rows.push([
        task.title,
        PRIORITY_LABELS[task.priority] ?? task.priority,
        task.type,
        task.effort ?? '',
      ]);
    }
    rows.push([]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 48 }, { wch: 12 }, { wch: 8 }, { wch: 18 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sprintName.slice(0, 31));
  XLSX.writeFile(wb, `sprint-${sprintName.replace(/\s+/g, '-')}.xlsx`);
}
