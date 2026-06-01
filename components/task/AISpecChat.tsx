'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Download, Loader2, Bot, User } from 'lucide-react';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface AISpecChatProps {
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  onClose: () => void;
}

const FIRST_MESSAGE: Message = {
  role: 'assistant',
  content: 'שלום! אני כאן לעזור לך לכתוב אפיון מקצועי. ספר לי — מה המשימה שצריך לפתח?',
};

const DONE_SIGNAL = '✅ מצוין! יש לי את כל המידע הנדרש לכתיבת האפיון.';

export default function AISpecChat({ taskId, taskTitle, taskDescription, onClose }: AISpecChatProps) {
  const [messages,    setMessages]    = useState<Message[]>([FIRST_MESSAGE]);
  const [input,       setInput]       = useState('');
  const [streaming,   setStreaming]   = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [isDone,      setIsDone]      = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setStreaming(true);

    // Placeholder assistant message that we'll fill by streaming
    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      abortRef.current = new AbortController();
      const res = await fetch('/api/ai/spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          taskTitle,
          taskDescription,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error('Network error');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });

        // Update the last assistant message in place
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: fullText };
          return copy;
        });
      }

      // Check if Claude signalled it's done
      if (fullText.includes(DONE_SIGNAL)) {
        setIsDone(true);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: '⚠️ שגיאת תקשורת. אנא נסה שוב.' };
          return copy;
        });
      }
    } finally {
      setStreaming(false);
    }
  }, [input, messages, streaming, taskTitle, taskDescription]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exportDoc = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/ai/spec/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, taskTitle, taskDescription }),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;

      // Try to get filename from Content-Disposition header
      const cd   = res.headers.get('Content-Disposition') ?? '';
      const match = cd.match(/filename\*=UTF-8''(.+)/);
      a.download  = match ? decodeURIComponent(match[1]) : `אפיון-${taskTitle}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Close chat after successful export
      onClose();
    } catch {
      setExporting(false);
    }
  };

  return (
    /* Overlay */
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
           style={{ height: 'min(680px, 90vh)' }}>

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-3.5 bg-violet-600 text-white flex-shrink-0">
          <Bot size={20} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">עוזר אפיון AI</p>
            <p className="text-xs text-violet-200 truncate">{taskTitle}</p>
          </div>
          <button
            onClick={() => { abortRef.current?.abort(); onClose(); }}
            className="p-1.5 rounded-lg hover:bg-violet-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-gray-50">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2.5 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                ${msg.role === 'assistant' ? 'bg-violet-500' : 'bg-blue-500'}`}>
                {msg.role === 'assistant' ? <Bot size={15} /> : <User size={15} />}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm
                  ${msg.role === 'assistant'
                    ? 'bg-white text-gray-800 rounded-tr-2xl rounded-tl-sm border border-gray-100'
                    : 'bg-blue-500 text-white rounded-tl-2xl rounded-tr-sm'
                  }`}
              >
                {msg.content}
                {/* Streaming cursor */}
                {streaming && i === messages.length - 1 && msg.role === 'assistant' && msg.content && (
                  <span className="inline-block w-1.5 h-3.5 bg-violet-400 rounded-sm ml-0.5 mr-0.5 animate-pulse align-text-bottom" />
                )}
                {/* Typing indicator (empty assistant bubble) */}
                {streaming && i === messages.length - 1 && msg.role === 'assistant' && !msg.content && (
                  <span className="flex gap-1 items-center py-0.5">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* ── Export banner ── */}
        {isDone && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-green-50 border-t border-green-200 flex-shrink-0">
            <p className="text-sm text-green-700 font-medium">האפיון מוכן לייצוא!</p>
            <button
              onClick={exportDoc}
              disabled={exporting}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow"
            >
              {exporting
                ? <><Loader2 size={15} className="animate-spin" /> מייצא...</>
                : <><Download size={15} /> ייצא ל-Word</>
              }
            </button>
          </div>
        )}

        {/* ── Input ── */}
        <div className="flex gap-2 px-4 py-3 border-t bg-white flex-shrink-0">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming || exporting}
            placeholder="כתוב כאן..."
            className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 disabled:bg-gray-50 disabled:text-gray-400 leading-relaxed"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || streaming || exporting}
            className="flex-shrink-0 w-10 h-10 self-end bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors shadow"
          >
            {streaming
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
