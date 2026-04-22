'use client';

import { useRef, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}

/**
 * Convert stored value to editor HTML.
 * Handles two legacy formats:
 *  1. Plain text with \n newlines  →  replace \n with <br>
 *  2. Old markdown images ![alt](url)  →  <img src="url" alt="alt">
 * If the string already contains HTML tags, it passes through as-is
 * (just in case there are leftover markdown images in an HTML string).
 */
function toEditorHtml(text: string): string {
  if (!text) return '';
  const isHtml = /<[a-zA-Z]/.test(text);
  if (isHtml) {
    // Already HTML — just convert any stray markdown images
    return text.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" />',
    );
  }
  // Plain text path
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\n/g, '<br>');
}

export default function DescriptionEditor({ value, onChange, onBlur, placeholder }: Props) {
  const editorRef   = useRef<HTMLDivElement>(null);
  const isFocused   = useRef(false);
  const lastHtml    = useRef<string>('');   // tracks the last HTML we emitted
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Sync external value → editor DOM (only when not focused, i.e. loaded from server)
  useEffect(() => {
    if (!editorRef.current) return;
    if (isFocused.current) return;          // user is typing — don't clobber their cursor

    const html = toEditorHtml(value ?? '');
    if (html === lastHtml.current) return;  // nothing actually changed

    editorRef.current.innerHTML = html;
    lastHtml.current = html;
  }, [value]);

  // ── helpers ────────────────────────────────────────────────────────────────

  const emitChange = () => {
    if (!editorRef.current) return;
    let html = editorRef.current.innerHTML;
    // contenteditable leaves a lone <br> when empty — normalise to ''
    if (html === '<br>') html = '';
    lastHtml.current = html;
    onChange(html);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) return null;
    const { url } = await res.json();
    return url;
  };

  const insertImageAtCursor = (url: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'תמונה';

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      // Move cursor to after the image
      range.setStartAfter(img);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editorRef.current.appendChild(img);
    }

    emitChange();
  };

  // ── event handlers ─────────────────────────────────────────────────────────

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imgItem = items.find(i => i.type.startsWith('image/'));
    if (!imgItem) return; // regular text paste — let the browser handle it

    e.preventDefault();
    setUploadError('');
    const file = imgItem.getAsFile();
    if (!file) return;

    setUploading(true);
    const url = await uploadFile(file);
    setUploading(false);

    if (url) insertImageAtCursor(url);
    else setUploadError('העלאת התמונה נכשלה');
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    setUploadError('');
    setUploading(true);
    const url = await uploadFile(file);
    setUploading(false);
    if (url) insertImageAtCursor(url);
    else setUploadError('העלאת התמונה נכשלה');
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          dir="rtl"
          className="description-editor relative border rounded-lg px-3 py-2 text-sm min-h-[120px] max-h-[400px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-300 w-full cursor-text leading-relaxed"
          data-placeholder={placeholder}
          onInput={emitChange}
          onFocus={() => { isFocused.current = true; }}
          onBlur={() => { isFocused.current = false; onBlur?.(); }}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        />
        {uploading && (
          <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center gap-2 text-blue-600 text-sm font-medium">
            <Loader2 size={16} className="animate-spin" />
            מעלה תמונה...
          </div>
        )}
      </div>

      {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

      <p className="text-xs text-gray-400">
        ניתן להדביק תמונות (Ctrl+V) או לגרור לתוך שדה התיאור
      </p>
    </div>
  );
}
