'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Archive, Loader2 } from 'lucide-react';
import { useTaskModal } from '@/lib/taskModalContext';
import { TEAM_LABELS } from '@/lib/constants';
import type { SearchResultItem } from '@/app/api/search/route';

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function GlobalSearch() {
  const { openTask } = useTaskModal();
  const [open,      setOpen]    = useState(false);
  const [query,     setQuery]   = useState('');
  const [results,   setResults] = useState<SearchResultItem[]>([]);
  const [loading,   setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const inputRef    = useRef<HTMLInputElement>(null);
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const debouncedQ  = useDebounce(query, 280);

  // Fetch results
  useEffect(() => {
    if (debouncedQ.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`)
      .then(r => r.json())
      .then((data: SearchResultItem[]) => {
        setResults(Array.isArray(data) ? data : []);
        setActiveIdx(-1);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQ]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openSearch = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setActiveIdx(-1);
  }, []);

  const pickResult = useCallback((item: SearchResultItem) => {
    openTask(item.id);
    close();
  }, [openTask, close]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      pickResult(results[activeIdx]);
    } else if (e.key === 'Escape') {
      close();
    }
  };

  const activeResults  = results.filter(r => r.is_archived === 0);
  const archivedResults = results.filter(r => r.is_archived !== 0);
  const hasResults     = results.length > 0;

  return (
    <>
      <div ref={wrapperRef} className="relative">
        {/* Collapsed: icon button */}
        {!open && (
          <button
            onClick={openSearch}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="חיפוש משימות"
          >
            <Search size={18} />
          </button>
        )}

        {/* Expanded: input */}
        {open && (
          <div className="flex items-center gap-1.5 bg-white border border-blue-300 rounded-xl shadow-md px-3 py-1.5 w-72 ring-1 ring-blue-200">
            <Search size={15} className="text-blue-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); }}
              onKeyDown={onKeyDown}
              placeholder="חיפוש לפי כותרת או תיאור..."
              className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder:text-gray-400 min-w-0"
              dir="rtl"
            />
            {loading && <Loader2 size={14} className="animate-spin text-blue-400 flex-shrink-0" />}
            {!loading && query && (
              <button onClick={close} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Dropdown */}
        {open && query.length >= 2 && (
          <div
            className="absolute left-0 top-full mt-2 w-96 max-h-[480px] overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-200 z-50"
            dir="rtl"
          >
            {loading && !hasResults && (
              <div className="flex items-center justify-center gap-2 py-8 text-gray-400 text-sm">
                <Loader2 size={16} className="animate-spin" />
                <span>מחפש...</span>
              </div>
            )}

            {!loading && !hasResults && (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-1">
                <Search size={22} className="opacity-30" />
                <p className="text-sm">לא נמצאו תוצאות עבור &ldquo;{query}&rdquo;</p>
              </div>
            )}

            {hasResults && (
              <>
                {/* Active tasks section */}
                {activeResults.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      משימות פעילות
                    </div>
                    {activeResults.map((item) => {
                      const idx = results.indexOf(item);
                      return (
                        <ResultRow
                          key={item.id}
                          item={item}
                          isActive={activeIdx === idx}
                          onMouseEnter={() => setActiveIdx(idx)}
                          onClick={() => pickResult(item)}
                          query={debouncedQ}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Archived tasks section */}
                {archivedResults.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Archive size={11} />
                      ארכיון
                    </div>
                    {archivedResults.map((item) => {
                      const idx = results.indexOf(item);
                      return (
                        <ResultRow
                          key={item.id}
                          item={item}
                          isActive={activeIdx === idx}
                          onMouseEnter={() => setActiveIdx(idx)}
                          onClick={() => pickResult(item)}
                          query={debouncedQ}
                        />
                      );
                    })}
                  </div>
                )}

                <div className="h-2" />
              </>
            )}
          </div>
        )}
      </div>

    </>
  );
}

// ── Single result row ─────────────────────────────────────────────────────────
function ResultRow({
  item, isActive, onMouseEnter, onClick, query,
}: {
  item: SearchResultItem;
  isActive: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
  query: string;
}) {
  const teamLabel = TEAM_LABELS[item.responsible_team as keyof typeof TEAM_LABELS] ?? item.responsible_team;

  const TEAM_CHIP: Record<string, string> = {
    Specification: 'bg-purple-100 text-purple-700',
    Design:        'bg-pink-100 text-pink-700',
    Development:   'bg-green-100 text-green-700',
  };

  return (
    <button
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`w-full text-right px-4 py-2.5 flex items-start gap-3 transition-colors ${
        isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      {/* ID */}
      <span className="text-[11px] text-gray-400 font-mono mt-0.5 flex-shrink-0">#{item.id}</span>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate leading-snug">
          <Highlight text={item.title} query={query} />
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {item.is_archived === 0 ? (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TEAM_CHIP[item.responsible_team] ?? 'bg-gray-100 text-gray-600'}`}>
              {teamLabel}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <Archive size={9} />
              {item.sprint_name ?? 'ארכיון'}
            </span>
          )}
          <span className="text-[10px] text-gray-400">{item.status}</span>
        </div>
      </div>
    </button>
  );
}

// ── Highlight matching text ───────────────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex   = new RegExp(`(${escaped})`, 'gi');
    const parts   = text.split(regex);
    const matchRe = new RegExp(`^${escaped}$`, 'i');
    return (
      <>
        {parts.map((part, i) =>
          matchRe.test(part)
            ? <mark key={i} className="bg-yellow-100 text-yellow-900 rounded-sm px-0.5">{part}</mark>
            : <span key={i}>{part}</span>
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}
