'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Mail, Copy, Check, Loader2 } from 'lucide-react';
import type { Sprint, Task } from '@/lib/types';
import { fmtDate } from '@/lib/dateUtils';

interface ReportData {
  completedSprint: Sprint | null;
  currentSprint:   Sprint | null;
  doneTasks:       Task[];
  wipTasks:        Task[];
  nextSprintTasks: Task[];
  backlogTasks:    Task[];
}

// ── HTML email generator ──────────────────────────────────────────────────────
function generateEmailHtml(data: ReportData): string {
  const { completedSprint: cs, currentSprint: ns } = data;
  const sprintLabel     = cs?.sprint_number ? `ספרינט ${cs.sprint_number}` : (cs?.name ?? 'הספרינט');
  const nextLabel       = ns?.sprint_number ? `ספרינט ${ns.sprint_number}` : (ns?.name ?? 'ספרינט הבא');

  const th = (text: string) =>
    `<th style="border:1px solid #d1d5db;padding:8px 12px;background:#f3f4f6;text-align:right;font-weight:600;color:#374151;">${text}</th>`;

  const td = (text: string, color = '#374151') =>
    `<td style="border:1px solid #e5e7eb;padding:8px 12px;color:${color};">${text}</td>`;

  const tableWrap = (title: string, accentColor: string, rows: string, colHeaders: string[]) => `
    <h3 style="color:${accentColor};font-size:15px;margin:24px 0 6px;border-bottom:2px solid ${accentColor}33;padding-bottom:6px;">${title}</h3>
    <table style="border-collapse:collapse;width:100%;margin-bottom:8px;">
      <thead><tr>${colHeaders.map(th).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  const taskRows = (tasks: Task[], statusFn: (t: Task) => string) =>
    tasks.length === 0
      ? `<tr>${td('—', '#9ca3af')}${td('אין משימות', '#9ca3af')}${td('—', '#9ca3af')}</tr>`
      : tasks.map(t =>
          `<tr>${td(`#${t.id}`)}${td(t.title)}${td(statusFn(t))}</tr>`
        ).join('');

  // ── Schedule table ────────────────────────────────────────────────────────
  const scheduleRows = [
    ['תחילת בדיקות', cs?.testing_start_date ? fmtDate(cs.testing_start_date) : '—'],
    ['סיום בדיקות',  cs?.testing_end_date   ? fmtDate(cs.testing_end_date)   : '—'],
    ['עלייה ל-QA / Preprod', cs?.qa_date    ? fmtDate(cs.qa_date)            : '—'],
  ].map(([label, val]) => `<tr>${td(label, '#374151')}${td(`<strong>${val}</strong>`)}</tr>`).join('');

  const scheduleTable = `
    <h3 style="color:#1d4ed8;font-size:15px;margin:24px 0 6px;border-bottom:2px solid #bfdbfe;padding-bottom:6px;">לוח זמנים</h3>
    <table style="border-collapse:collapse;width:100%;margin-bottom:8px;">
      <thead><tr>${th('מועד')}${th('תאריך')}</tr></thead>
      <tbody>${scheduleRows}</tbody>
    </table>`;

  return `
<div dir="rtl" style="font-family:Arial,sans-serif;font-size:14px;color:#111827;max-width:720px;line-height:1.6;">

  <p style="color:#6b7280;margin-bottom:20px;">שלום,<br>מצ&quot;ב סיכום ${sprintLabel}.</p>

  ${scheduleTable}

  ${tableWrap(
    `משימות שהסתיימו ב${sprintLabel}`,
    '#16a34a',
    taskRows(data.doneTasks, () => 'הסתיים ✓'),
    ['מס׳', 'כותרת', 'סטטוס'],
  )}

  ${tableWrap(
    `משימות בביצוע — עברו מ${sprintLabel} ל${nextLabel}`,
    '#d97706',
    taskRows(data.wipTasks, () => `לא סיימנו ב${sprintLabel}, עבר ל${nextLabel}`),
    ['מס׳', 'כותרת', 'סטטוס'],
  )}

  ${tableWrap(
    `תכנון ${nextLabel}`,
    '#2563eb',
    taskRows(data.nextSprintTasks, () => `מתוכנן ל${nextLabel}`),
    ['מס׳', 'כותרת', 'סטטוס'],
  )}

  ${tableWrap(
    'משימות שמוכנות לפיתוח וטרם נכנסו לספרינט',
    '#6b7280',
    taskRows(data.backlogTasks, () => 'ממתין לפיתוח'),
    ['מס׳', 'כותרת', 'סטטוס'],
  )}

  <p style="color:#9ca3af;font-size:12px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px;">
    סיכום אוטומטי · ${new Date().toLocaleDateString('he-IL')}
  </p>
</div>`.trim();
}

// ── Plain-text fallback (for mailto: body) ────────────────────────────────────
function generatePlainText(data: ReportData): string {
  const { completedSprint: cs, currentSprint: ns } = data;
  const sprintLabel = cs?.sprint_number ? `ספרינט ${cs.sprint_number}` : (cs?.name ?? 'הספרינט');
  const nextLabel   = ns?.sprint_number ? `ספרינט ${ns.sprint_number}` : (ns?.name ?? 'ספרינט הבא');

  const taskList = (tasks: Task[], statusFn: (t: Task) => string) =>
    tasks.length === 0
      ? '  — אין משימות\n'
      : tasks.map(t => `  • #${t.id} — ${t.title} [${statusFn(t)}]`).join('\n') + '\n';

  return [
    `סיכום ${sprintLabel}`,
    '═'.repeat(40),
    '',
    '📅 לוח זמנים',
    `  תחילת בדיקות:      ${cs?.testing_start_date ? fmtDate(cs.testing_start_date) : '—'}`,
    `  סיום בדיקות:       ${cs?.testing_end_date   ? fmtDate(cs.testing_end_date)   : '—'}`,
    `  עלייה ל-QA/Preprod: ${cs?.qa_date           ? fmtDate(cs.qa_date)            : '—'}`,
    '',
    `✅ משימות שהסתיימו ב${sprintLabel}`,
    taskList(data.doneTasks, () => 'הסתיים'),
    `🔄 משימות בביצוע — עברו מ${sprintLabel} ל${nextLabel}`,
    taskList(data.wipTasks, () => `עבר ל${nextLabel}`),
    `📋 תכנון ${nextLabel}`,
    taskList(data.nextSprintTasks, () => `מתוכנן ל${nextLabel}`),
    '📦 משימות שמוכנות לפיתוח וטרם נכנסו לספרינט',
    taskList(data.backlogTasks, () => 'ממתין'),
  ].join('\n');
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function ClientReportModal({ onClose }: { onClose: () => void }) {
  const [data,    setData]    = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/report/sprint')
      .then(r => r.json())
      .then((d: ReportData) => { setData(d); setLoading(false); });
  }, []);

  const copyHtml = async () => {
    if (!data) return;
    const html = generateEmailHtml(data);
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html':  new Blob([html],                                  { type: 'text/html'  }),
          'text/plain': new Blob([generatePlainText(data)],               { type: 'text/plain' }),
        }),
      ]);
    } catch {
      // Fallback — copy plain text
      await navigator.clipboard.writeText(generatePlainText(data));
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const openMailto = () => {
    if (!data) return;
    const body    = generatePlainText(data);
    const subject = data.completedSprint?.sprint_number
      ? `סיכום ספרינט ${data.completedSprint.sprint_number}`
      : 'סיכום ספרינט';
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const cs = data?.completedSprint;
  const sprintLabel = cs?.sprint_number ? `ספרינט ${cs.sprint_number}` : (cs?.name ?? '');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">סיכום ללקוח</h2>
            {sprintLabel && <p className="text-sm text-gray-400 mt-0.5">{sprintLabel}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 size={20} className="animate-spin" /> טוען נתונים...
            </div>
          ) : !data?.completedSprint ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <Mail size={32} className="opacity-20" />
              <p className="text-sm">אין ספרינטים מסוכמים עדיין</p>
              <p className="text-xs">סגור ספרינט כדי להפיק דוח</p>
            </div>
          ) : (
            <div
              ref={previewRef}
              className="border border-gray-200 rounded-xl p-5 bg-gray-50 text-sm"
              dangerouslySetInnerHTML={{ __html: generateEmailHtml(data) }}
            />
          )}
        </div>

        {/* Footer */}
        {data?.completedSprint && (
          <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex items-center gap-3 flex-wrap flex-shrink-0">
            <p className="text-xs text-gray-400 flex-1">
              העתק את ה-HTML ולאחר מכן הדבק ישירות בגוף המייל ב-Outlook / Gmail
            </p>
            <button
              onClick={openMailto}
              className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <Mail size={15} />
              פתח מייל
            </button>
            <button
              onClick={copyHtml}
              className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {copied ? <><Check size={15} /> הועתק!</> : <><Copy size={15} /> העתק HTML</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
