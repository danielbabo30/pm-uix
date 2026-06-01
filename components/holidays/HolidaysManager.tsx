'use client';

import { useEffect, useState } from 'react';
import {
  Plus, Trash2, Calendar, Pencil, X, Check, Loader2,
  Download, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';
import { fmtDate } from '@/lib/dateUtils';
import type { Holiday } from '@/lib/types';

// ── Category definitions for import ──────────────────────────────────────────
const IMPORT_CATEGORIES = [
  { key: 'major',       label: 'חגים עיקריים',   desc: 'ראש השנה, יום כיפור, פסח, שבועות, סוכות, שמיני עצרת' },
  { key: 'modern',      label: 'ימים לאומיים',   desc: 'יום השואה, יום הזיכרון, יום העצמאות, יום ירושלים' },
  { key: 'chanukah',    label: 'חנוכה',          desc: '8 ימים כטווח אחד' },
  { key: 'purim',       label: 'פורים',           desc: 'פורים (לא שושן פורים)' },
  { key: 'cholhamoed',  label: 'חול המועד',       desc: 'ימי חול המועד פסח וסוכות' },
  { key: 'fasts',       label: 'צומות',           desc: 'יז׳ בתמוז, תשעה באב, צום גדליה, עשרה בטבת, תענית אסתר' },
] as const;

type CategoryKey = typeof IMPORT_CATEGORIES[number]['key'];

// ── Hebrew holidays import panel ──────────────────────────────────────────────
function ImportPanel({ onImported }: { onImported: () => void }) {
  const currentYear = new Date().getFullYear();
  const [open,       setOpen]       = useState(false);
  const [year,       setYear]       = useState(currentYear);
  const [cats,       setCats]       = useState<Set<CategoryKey>>(
    new Set(['major', 'modern', 'chanukah', 'purim'])
  );
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState<{ added: number; skipped: number } | null>(null);
  const [error,      setError]      = useState('');

  const toggleCat = (key: CategoryKey) =>
    setCats(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });

  const doImport = async () => {
    if (!cats.size) { setError('בחר לפחות קטגוריה אחת'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/holidays/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, categories: Array.from(cats) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'שגיאה'); return; }
      setResult({ added: data.added, skipped: data.skipped });
      onImported();
    } catch {
      setError('שגיאת רשת');
    } finally {
      setLoading(false);
    }
  };

  const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - 1 + i);

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => { setOpen(o => !o); setResult(null); setError(''); }}
        className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors text-right"
      >
        <Sparkles size={16} className="text-blue-500 flex-shrink-0" />
        <div className="flex-1 text-right">
          <span className="text-sm font-semibold text-blue-700">ייבוא חגי ישראל אוטומטי</span>
          <span className="text-xs text-blue-500 mr-2">(@hebcal)</span>
        </div>
        {open ? <ChevronUp size={15} className="text-blue-400" /> : <ChevronDown size={15} className="text-blue-400" />}
      </button>

      {open && (
        <div className="px-4 py-4 flex flex-col gap-4 bg-white border-t border-blue-100">
          {/* Year selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">שנה:</span>
            <div className="flex gap-1.5 flex-wrap">
              {yearOptions.map(y => (
                <button
                  key={y}
                  onClick={() => { setYear(y); setResult(null); }}
                  className={`text-sm px-3 py-1 rounded-lg border transition-colors font-medium ${
                    year === y
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Category checkboxes */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-600">קטגוריות:</span>
            <div className="grid grid-cols-1 gap-1.5">
              {IMPORT_CATEGORIES.map(({ key, label, desc }) => (
                <label
                  key={key}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    cats.has(key)
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={cats.has(key)}
                    onChange={() => toggleCat(key)}
                    className="mt-0.5 accent-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800">{label}</span>
                    <span className="text-xs text-gray-400 mr-1.5">{desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Result / error */}
          {result && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
              <Check size={15} />
              נוספו {result.added} חופשות לשנת {year}
              {result.skipped > 0 && (
                <span className="text-green-500 text-xs">(דולגו {result.skipped} שכבר קיימות)</span>
              )}
            </div>
          )}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}

          {/* Import button */}
          <button
            onClick={doImport}
            disabled={loading || !cats.size}
            className="flex items-center gap-2 bg-blue-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed w-fit font-medium"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> מייבא...</>
              : <><Download size={15} /> ייבא חגי {year}</>
            }
          </button>
        </div>
      )}
    </div>
  );
}

// ── Holiday row (view + inline edit) ─────────────────────────────────────────
function HolidayRow({ holiday: h, editing, deleting, onEdit, onCancelEdit, onSaved, onDelete }: {
  holiday: Holiday;
  editing: boolean;
  deleting: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [title,  setTitle]  = useState(h.title);
  const [start,  setStart]  = useState(h.start_date);
  const [end,    setEnd]    = useState(h.end_date);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) { setTitle(h.title); setStart(h.start_date); setEnd(h.end_date); }
  }, [editing, h]);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await fetch(`/api/holidays/${h.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), start_date: start, end_date: end || start }),
    });
    setSaving(false);
    onSaved();
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <input
          className="border rounded-lg px-2 py-1.5 text-sm"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="שם החופשה"
        />
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">התחלה</label>
            <input type="date" className="border rounded-lg px-2 py-1.5 text-sm" value={start}
              onChange={e => { setStart(e.target.value); if (!end) setEnd(e.target.value); }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">סיום</label>
            <input type="date" className="border rounded-lg px-2 py-1.5 text-sm" value={end} min={start}
              onChange={e => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1 text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            <Check size={12} /> {saving ? 'שומר...' : 'שמור'}
          </button>
          <button
            onClick={onCancelEdit}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
          >
            <X size={12} /> ביטול
          </button>
        </div>
      </div>
    );
  }

  const isSingleDay = h.start_date === h.end_date;
  return (
    <div className="flex items-center gap-3 bg-white border rounded-xl px-4 py-3 group hover:shadow-sm transition-shadow">
      <Calendar size={16} className="text-orange-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{h.title}</p>
        <p className="text-xs text-gray-400">
          {isSingleDay
            ? fmtDate(h.start_date)
            : `${fmtDate(h.start_date)} – ${fmtDate(h.end_date)}`}
        </p>
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
          title="ערוך"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-40"
          title="מחק"
        >
          {deleting
            ? <Loader2 size={14} className="animate-spin text-red-400" />
            : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HolidaysManager() {
  const [holidays,   setHolidays]   = useState<Holiday[]>([]);
  const [title,      setTitle]      = useState('');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [error,      setError]      = useState('');
  const [adding,     setAdding]     = useState(false);
  const [removing,   setRemoving]   = useState<number | null>(null);
  const [editingId,  setEditingId]  = useState<number | null>(null);

  const load = async () => {
    const res = await fetch('/api/holidays');
    setHolidays(await res.json());
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!title.trim() || !startDate) { setError('כותרת ותאריך התחלה שדות חובה'); return; }
    setError('');
    setAdding(true);
    const res = await fetch('/api/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, start_date: startDate, end_date: endDate || startDate }),
    });
    setAdding(false);
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    setTitle(''); setStartDate(''); setEndDate('');
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('למחוק חופשה?')) return;
    setRemoving(id);
    await fetch(`/api/holidays/${id}`, { method: 'DELETE' });
    setRemoving(null);
    load();
  };

  const today    = new Date().toISOString().slice(0, 10);
  const upcoming = holidays.filter(h => h.end_date >= today);
  const past     = holidays.filter(h => h.end_date < today);

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6 p-6" dir="rtl">
      <div>
        <h2 className="text-xl font-bold text-gray-800">חופשות כלליות</h2>
        <p className="text-sm text-gray-500 mt-1">חופשות כלליות מנוכות מכלל המפתחים בחישוב העומסים.</p>
      </div>

      {/* ── Hebrew calendar auto-import ── */}
      <ImportPanel onImported={load} />

      {/* ── Manual add form ── */}
      <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border">
        <span className="text-sm font-semibold text-gray-700">הוסף חופשה ידנית</span>
        {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="שם החופשה"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">תאריך התחלה *</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value); }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">תאריך סיום</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={add}
          disabled={adding}
          className="bg-blue-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-fit"
        >
          {adding ? <><Loader2 size={15} className="animate-spin" /> מוסיף...</> : <><Plus size={16} /> הוסף</>}
        </button>
      </div>

      {/* ── Upcoming ── */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-gray-700">
          קרובות ועתידיות
          <span className="text-gray-400 font-normal mr-1">({upcoming.length})</span>
        </span>
        {upcoming.length === 0 && (
          <div className="text-sm text-gray-400 text-center py-6">
            <Calendar size={28} className="mx-auto mb-1 opacity-30" />
            אין חופשות עתידיות — ייבא מלוח עברי או הוסף ידנית
          </div>
        )}
        {upcoming.map(h => (
          <HolidayRow
            key={h.id}
            holiday={h}
            editing={editingId === h.id}
            deleting={removing === h.id}
            onEdit={() => setEditingId(h.id)}
            onCancelEdit={() => setEditingId(null)}
            onSaved={() => { setEditingId(null); load(); }}
            onDelete={() => remove(h.id)}
          />
        ))}
      </div>

      {/* ── Past (collapsible) ── */}
      {past.length > 0 && (
        <details className="group">
          <summary className="text-sm font-semibold text-gray-400 cursor-pointer select-none list-none flex items-center gap-1">
            <span className="group-open:rotate-90 inline-block transition-transform">▶</span>
            חופשות שעברו ({past.length})
          </summary>
          <div className="flex flex-col gap-2 mt-2 opacity-60">
            {past.map(h => (
              <HolidayRow
                key={h.id}
                holiday={h}
                editing={editingId === h.id}
                deleting={removing === h.id}
                onEdit={() => setEditingId(h.id)}
                onCancelEdit={() => setEditingId(null)}
                onSaved={() => { setEditingId(null); load(); }}
                onDelete={() => remove(h.id)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
