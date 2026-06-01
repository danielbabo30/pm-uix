'use client';

import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, Suspense,
} from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import TaskModal from '@/components/task/TaskModal';

// ── Public API ────────────────────────────────────────────────────────────────
interface TaskModalContextValue {
  /** Open a task popup. Pass an onUpdate callback to refresh the caller's list when the task is saved. */
  openTask: (id: string, onUpdate?: () => void) => void;
}

const TaskModalContext = createContext<TaskModalContextValue>({ openTask: () => {} });

export function useTaskModal() {
  return useContext(TaskModalContext);
}

// ── Inner provider (needs useSearchParams → must be inside Suspense) ──────────
function TaskModalProviderInner({ children }: { children: React.ReactNode }) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [openId, setOpenId]       = useState<string | null>(null);
  const updateRef = useRef<(() => void) | null>(null);
  // Prevent reacting to URL changes that WE triggered
  const ownChange = useRef(false);

  // ── Deep-link: open from URL on initial mount or external navigation ──────
  useEffect(() => {
    if (ownChange.current) { ownChange.current = false; return; }
    const taskParam = searchParams.get('task');
    if (taskParam && taskParam !== openId) {
      setOpenId(taskParam);
      updateRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Open ─────────────────────────────────────────────────────────────────
  const openTask = useCallback((id: string, onUpdate?: () => void) => {
    updateRef.current = onUpdate ?? null;
    setOpenId(id);

    ownChange.current = true;
    const params = new URLSearchParams(searchParams.toString());
    params.set('task', id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  // ── Close ─────────────────────────────────────────────────────────────────
  const closeTask = useCallback(() => {
    setOpenId(null);
    updateRef.current = null;

    ownChange.current = true;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('task');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  return (
    <TaskModalContext.Provider value={{ openTask }}>
      {children}
      {openId && (
        <TaskModal
          taskId={openId}
          onClose={closeTask}
          onUpdate={() => { updateRef.current?.(); }}
        />
      )}
    </TaskModalContext.Provider>
  );
}

// ── Public provider ───────────────────────────────────────────────────────────
export function TaskModalProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <TaskModalProviderInner>{children}</TaskModalProviderInner>
    </Suspense>
  );
}
