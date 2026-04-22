'use client';

import { useRef, useState } from 'react';
import { Download, Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Info } from 'lucide-react';

interface ImportResult {
  created: number;
  errors: string[];
  total: number;
}

export default function ImportExportModal({ onClose, onImported }: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [tab, setTab] = useState<'export' | 'import'>('export');

  // Export state
  const [includeArchived, setIncludeArchived] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Import state
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText]       = useState('');
  const [fileName, setFileName]     = useState('');
  const [preview, setPreview]       = useState<string[][]>([]);
  const [importing, setImporting]   = useState(false);
  const [result, setResult]         = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState('');

  // ── Export ─────────────────────────────────────────────────────────────
  const doExport = async () => {
    setExporting(true);
    const url = `/api/tasks/export${includeArchived ? '?archived=1' : ''}`;
    const res = await fetch(url);
    setExporting(false);
    if (!res.ok) { alert('שגיאה בייצוא'); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tasks-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Import: file pick ─────────────────────────────────────────────────
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setImportError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      // Build preview (first 6 rows)
      const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
      const rows = lines.slice(0, 6).map(l =>
        l.split(',').map(f => f.replace(/^"|"$/g, '').slice(0, 40))
      );
      setPreview(rows);
    };
    reader.readAsText(file, 'utf-8');
  };

  // ── Import: submit ────────────────────────────────────────────────────
  const doImport = async () => {
    if (!csvText) return;
    setImporting(true);
    setImportError('');
    setResult(null);
    const res = await fetch('/api/tasks/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: csvText }),
    });
    setImporting(false);
    const data = await res.json();
    if (!res.ok) { setImportError(data.error || 'שגיאה בייבוא'); return; }
    setResult(data);
    if (data.created > 0) onImported();
  };

  const resetImport = () => {
    setCsvText(''); setFileName(''); setPreview([]); setResult(null); setImportError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-[580px] max-h-[85vh] flex flex-col mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-blue-500" />
            <h2 className="text-lg font-bold text-gray-800">ייצוא / ייבוא משימות</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          {([['export', 'ייצוא CSV', Download], ['import', 'ייבוא CSV', Upload]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── EXPORT TAB ── */}
          {tab === 'export' && (
            <div className="flex flex-col gap-5">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 leading-relaxed">
                  הקובץ ייוצא בפורמט CSV עם BOM לתמיכה מלאה בעברית ב-Excel.<br />
                  כולל: מזהה, כותרת, תיאור, צוות, סטטוס, עדיפות, שמות משתמשים, מאמץ, דגלים.
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setIncludeArchived(v => !v)}
                  className={`w-10 h-5 rounded-full transition-colors ${includeArchived ? 'bg-blue-500' : 'bg-gray-200'} relative`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${includeArchived ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-gray-700">כלול גם משימות מארכיון</span>
              </label>

              <button
                onClick={doExport}
                disabled={exporting}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed w-fit"
              >
                {exporting
                  ? <><Loader2 size={16} className="animate-spin" /> מייצא...</>
                  : <><Download size={16} /> הורד קובץ CSV</>
                }
              </button>
            </div>
          )}

          {/* ── IMPORT TAB ── */}
          {tab === 'import' && (
            <div className="flex flex-col gap-5">

              {/* Format info */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                <Info size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700 leading-relaxed">
                  <strong>פורמט נדרש:</strong> קובץ CSV עם שורת כותרת.<br />
                  עמודות נדרשות: <code className="bg-amber-100 px-1 rounded">כותרת</code><br />
                  עמודות אופציונליות: צוות, סטטוס, עדיפות, תיאור, גורם מבצע, מפתח BE/FE, מאמץ<br />
                  <span className="text-xs mt-1 block">טיפ: ייצא קודם כדי לראות את הפורמט המדויק</span>
                </div>
              </div>

              {/* File picker */}
              {!csvText && (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                >
                  <Upload size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">לחץ לבחירת קובץ CSV</p>
                  <p className="text-xs text-gray-400 mt-1">קבצי .csv בלבד</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={onFile}
                  />
                </div>
              )}

              {/* Preview */}
              {csvText && !result && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText size={15} />
                      <span className="font-medium">{fileName}</span>
                    </div>
                    <button onClick={resetImport} className="text-xs text-gray-400 hover:text-red-500">החלף קובץ</button>
                  </div>

                  {/* Table preview */}
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="text-xs w-full">
                      <thead>
                        {preview[0] && (
                          <tr className="bg-gray-50">
                            {preview[0].map((h, i) => (
                              <th key={i} className="px-3 py-2 text-right font-semibold text-gray-600 border-b whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {preview.slice(1).map((row, ri) => (
                          <tr key={ri} className="border-b last:border-0 hover:bg-gray-50">
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-3 py-2 text-gray-700 max-w-[120px] truncate">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.length > 5 && (
                      <p className="text-xs text-gray-400 text-center py-2">מוצגות 5 שורות ראשונות בלבד</p>
                    )}
                  </div>

                  {importError && (
                    <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
                      <AlertCircle size={14} /> {importError}
                    </div>
                  )}

                  <button
                    onClick={doImport}
                    disabled={importing}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed w-fit"
                  >
                    {importing
                      ? <><Loader2 size={16} className="animate-spin" /> מייבא...</>
                      : <><Upload size={16} /> ייבא משימות</>
                    }
                  </button>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="flex flex-col gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-700">הייבוא הסתיים!</p>
                      <p className="text-sm text-green-600 mt-0.5">
                        נוצרו <strong>{result.created}</strong> משימות מתוך {result.total} שורות
                      </p>
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                        <AlertCircle size={14} /> {result.errors.length} שורות דולגו:
                      </p>
                      <ul className="text-xs text-amber-700 flex flex-col gap-1">
                        {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={resetImport}
                    className="text-sm text-blue-600 hover:text-blue-700 w-fit"
                  >
                    ייבא קובץ נוסף
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50">
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
