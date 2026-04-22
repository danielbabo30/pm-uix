'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Reply } from 'lucide-react';
import { useCurrentUser } from '@/lib/userContext';
import { fmtTimestamp } from '@/lib/dateUtils';
import type { Comment } from '@/lib/types';

// ── @Mention helpers ─────────────────────────────────────────────────────────
interface MentionUser { id: number; name: string }

function getMentionQuery(text: string, cursor: number): string | null {
  const before = text.slice(0, cursor);
  const m = before.match(/@([^\s@]*)$/);
  return m ? m[1] : null;
}

function replaceMention(text: string, cursor: number, name: string): { text: string; cursor: number } {
  const before = text.slice(0, cursor);
  const after  = text.slice(cursor);
  const replaced = before.replace(/@([^\s@]*)$/, `@${name} `);
  return { text: replaced + after, cursor: replaced.length };
}

function renderBody(body: string): React.ReactNode {
  const parts = body.split(/(@[^\s@]+)/g);
  return parts.map((p, i) =>
    p.startsWith('@')
      ? <span key={i} className="text-blue-600 font-medium">{p}</span>
      : <span key={i}>{p}</span>
  );
}

// ── MentionTextarea ─────────────────────────────────────────────────────────
function MentionTextarea({
  value, onChange, onSubmit, placeholder, rows = 2, users, autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  rows?: number;
  users: MentionUser[];
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState(0);

  const filtered = query !== null
    ? users.filter(u => u.name.includes(query)).slice(0, 6)
    : [];

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    const pos = e.target.selectionStart ?? v.length;
    onChange(v);
    setCursorPos(pos);
    setQuery(getMentionQuery(v, pos));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') { setQuery(null); return; }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (filtered.length > 0 && query !== null) {
        e.preventDefault();
        pick(filtered[0]);
        return;
      }
      e.preventDefault();
      onSubmit();
    }
  };

  const pick = (u: MentionUser) => {
    const pos = ref.current?.selectionStart ?? cursorPos;
    const { text, cursor } = replaceMention(value, pos, u.name);
    onChange(text);
    setQuery(null);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        autoFocus={autoFocus}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none bg-white"
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
      />
      {filtered.length > 0 && (
        <div className="absolute bottom-full mb-1 right-0 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 min-w-[160px]">
          {filtered.map(u => (
            <button
              key={u.id}
              onMouseDown={e => { e.preventDefault(); pick(u); }}
              className="w-full text-right px-3 py-1.5 text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
            >
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {u.name[0]}
              </span>
              {u.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single comment ───────────────────────────────────────────────────────────
function CommentItem({
  comment, taskId, onRefresh, depth = 0, currentAuthor, users,
}: {
  comment: Comment;
  taskId: string;
  onRefresh: () => void;
  depth?: number;
  currentAuthor: { id: number | null; name: string };
  users: MentionUser[];
}) {
  const [replyOpen,    setReplyOpen]    = useState(false);
  const [replyText,    setReplyText]    = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const submitReply = async () => {
    if (!replyText.trim() || replyLoading) return;
    setReplyLoading(true);
    await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: replyText,
        parent_comment_id: comment.id,
        author_id: currentAuthor.id,
        author_name: currentAuthor.name || 'משתמש',
      }),
    });
    setReplyLoading(false);
    setReplyText('');
    setReplyOpen(false);
    onRefresh();
  };

  return (
    <div className={`flex flex-col gap-1 ${depth > 0 ? 'mr-6 border-r-2 border-blue-100 pr-3' : ''}`}>
      <div className={`rounded-xl p-3 ${depth === 0 ? 'bg-gray-50 border border-gray-100' : 'bg-white border border-gray-100'}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {(comment.author_name || '?')[0]}
          </div>
          <span className="text-xs font-semibold text-gray-800">{comment.author_name || 'משתמש'}</span>
          <span className="text-xs text-gray-400 mr-auto">{fmtTimestamp(comment.created_at)}</span>
        </div>
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{renderBody(comment.body)}</p>
        {depth === 0 && (
          <button
            onClick={() => setReplyOpen(!replyOpen)}
            className="mt-2 text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1"
          >
            <Reply size={12} /> השב
          </button>
        )}
      </div>

      {replyOpen && (
        <div className="flex gap-2 mr-6 items-start">
          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1.5">
            {(currentAuthor.name || '?')[0]}
          </div>
          <div className="flex-1">
            <MentionTextarea
              value={replyText}
              onChange={setReplyText}
              onSubmit={submitReply}
              placeholder="כתוב תשובה... (@ לתיוג)"
              rows={1}
              users={users}
              autoFocus
            />
          </div>
          <button
            onClick={submitReply}
            disabled={replyLoading || !replyText.trim()}
            className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-600 flex-shrink-0 mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {replyLoading && <span className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />}
            שלח
          </button>
          <button onClick={() => setReplyOpen(false)} disabled={replyLoading} className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1.5 disabled:opacity-40">ביטול</button>
        </div>
      )}

      {comment.replies?.map(r => (
        <CommentItem key={r.id} comment={r} taskId={taskId} onRefresh={onRefresh} depth={depth + 1} currentAuthor={currentAuthor} users={users} />
      ))}
    </div>
  );
}

// ── Main CommentThread ────────────────────────────────────────────────────────
export default function CommentThread({ taskId, comments, onRefresh }: {
  taskId: string;
  comments: Comment[];
  onRefresh: () => void;
}) {
  const { user } = useCurrentUser();
  const [newComment,     setNewComment]     = useState('');
  const [submitLoading,  setSubmitLoading]  = useState(false);
  const [users,          setUsers]          = useState<MentionUser[]>([]);

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then((data: Array<{ id: number; name: string }>) =>
        setUsers(data.map(u => ({ id: u.id, name: u.name })))
      );
  }, []);

  const author = { id: user?.id ?? null, name: user?.name ?? 'משתמש' };

  const submit = async () => {
    if (!newComment.trim() || submitLoading) return;
    setSubmitLoading(true);
    await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: newComment, author_id: author.id, author_name: author.name }),
    });
    setSubmitLoading(false);
    setNewComment('');
    onRefresh();
  };

  const totalCount = comments.length + comments.reduce((s, c) => s + (c.replies?.length ?? 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-gray-400" />
        <span className="text-sm font-semibold text-gray-700">תגובות</span>
        {totalCount > 0 && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{totalCount}</span>
        )}
      </div>

      <div className="flex flex-col gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {author.name[0]}
          </div>
          <span className="text-xs font-medium text-gray-600">{author.name}</span>
        </div>
        <MentionTextarea
          value={newComment}
          onChange={setNewComment}
          onSubmit={submit}
          placeholder="כתוב תגובה... (@ לתיוג, Enter לשליחה, Shift+Enter לשורה חדשה)"
          rows={2}
          users={users}
        />
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={!newComment.trim() || submitLoading}
            className="bg-blue-500 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {submitLoading && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            שלח
          </button>
        </div>
      </div>

      {comments.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">אין תגובות עדיין</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map(c => (
            <CommentItem key={c.id} comment={c} taskId={taskId} onRefresh={onRefresh} currentAuthor={author} users={users} />
          ))}
        </div>
      )}
    </div>
  );
}
