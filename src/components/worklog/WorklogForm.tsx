import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  ClipboardCopy,
  Check,
  Trash2,
  Minimize2,
  Maximize2,
  X,
} from "lucide-react";
import type { Task } from "@/types";
import { useLocalTasks } from "@/hooks/useLocalTasks";
import { normalizeStatus } from "@/constants";
import { todayISO } from "@/utils";
import TaskCard from "./TaskCard";
import AIQuickLog from "./AIQuickLog";

function sanitizeCell(value: string): string {
  return value.replace(/[\t\r\n]+/g, " ").trim();
}

function formatDateForSheets(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;

  const [, year, month, day] = match;
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthIndex = Number(month) - 1;
  const dayNumber = Number(day);

  if (!monthNames[monthIndex] || !dayNumber) return value;

  return `${dayNumber}-${monthNames[monthIndex]}-${year}`;
}

function getCopyableTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.task.trim());
}

function buildTSV(tasks: Task[]): string {
  return getCopyableTasks(tasks)
    .map((task) =>
      [
        formatDateForSheets(task.date),
        task.task,
        task.timeSpent,
        normalizeStatus(task.status),
      ]
        .map(sanitizeCell)
        .join("\t"),
    )
    .join("\n");
}

export default function WorklogForm() {
  const {
    tasks,
    hydrated,
    addMultipleTasks,
    updateTask,
    removeTask,
    clearAll,
  } = useLocalTasks();
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const knownTaskIdsRef = useRef<Set<string>>(new Set());
  const splitPaneRef = useRef<HTMLDivElement>(null);
  const isDraggingDividerRef = useRef(false);
  const [globalDate, setGlobalDate] = useState(todayISO());
  const [leftPanePct, setLeftPanePct] = useState(50);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [previewDraft, setPreviewDraft] = useState("");

  useEffect(() => {
    const currentIds = new Set(tasks.map((task) => task.id));

    setCollapsedIds((prev) => {
      const next = new Set([...prev].filter((id) => currentIds.has(id)));

      for (const task of tasks) {
        if (!knownTaskIdsRef.current.has(task.id)) {
          next.add(task.id);
        }
      }

      return next;
    });

    knownTaskIdsRef.current = currentIds;
  }, [tasks]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  const handleDividerPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    isDraggingDividerRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleDividerPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingDividerRef.current || !splitPaneRef.current) return;

    const rect = splitPaneRef.current.getBoundingClientRect();
    const nextPct = ((event.clientX - rect.left) / rect.width) * 100;
    setLeftPanePct(Math.min(72, Math.max(24, nextPct)));
  };

  const handleDividerPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingDividerRef.current) return;

    isDraggingDividerRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  const handleDividerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setLeftPanePct((value) => Math.max(24, value - 4));
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setLeftPanePct((value) => Math.min(72, value + 4));
    }
  };

  const handleAIGenerate = (overrides: Partial<Task>[]) => {
    const newTasks = addMultipleTasks(overrides);
    setCollapsedIds(
      new Set([
        ...tasks.map((task) => task.id),
        ...newTasks.map((task) => task.id),
      ]),
    );
  };

  const handleOpenPreview = (task: Task) => {
    setPreviewTask(task);
    setPreviewDraft(task.task);
  };

  const handleSavePreview = () => {
    if (!previewTask) return;

    updateTask(previewTask.id, "task", previewDraft);
    setPreviewTask(null);
    setPreviewDraft("");
  };

  const handleCollapseAll = () => {
    setCollapsedIds(new Set(tasks.map((t) => t.id)));
  };

  const handleExpandAll = () => {
    setCollapsedIds(new Set());
  };

  const handleToggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopy = async () => {
    const copyableTasks = getCopyableTasks(tasks);
    if (copyableTasks.length === 0) return;

    const tsv = buildTSV(tasks);
    try {
      await navigator.clipboard.writeText(tsv);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = tsv;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2500);
    }
  };

  if (!hydrated) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasCopyableTasks = getCopyableTasks(tasks).length > 0;
  const splitPaneStyle = {
    "--left-pane-width": `${leftPanePct}%`,
  } as CSSProperties;

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-white text-[#1f2537]">
      <header className="h-13.5 shrink-0 border-b border-[#d8deea] bg-white flex items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-sm font-black text-white">
            W
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-[#2d3558]">
              Worklog Creator
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="date"
            value={globalDate}
            onChange={(e) => setGlobalDate(e.target.value)}
            className="field h-9! w-40"
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!hasCopyableTasks}
            className="h-9 inline-flex items-center gap-2 rounded border border-blue-600 px-4 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {copyState === "copied" ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <ClipboardCopy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              if (tasks.length === 0) return;
              if (window.confirm("Are you sure you want to clear all tasks?")) {
                clearAll();
              }
            }}
            disabled={tasks.length === 0}
            className="h-9 inline-flex items-center gap-2 rounded border border-[#d8deea] px-4 text-sm font-medium text-[#5d668b] hover:bg-[#f6f8fc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </header>

      <div
        ref={splitPaneRef}
        className="min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-[minmax(320px,var(--left-pane-width))_8px_minmax(420px,1fr)]"
        style={splitPaneStyle}
      >
        <section className="min-h-0">
          <AIQuickLog globalDate={globalDate} onGenerate={handleAIGenerate} />
        </section>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize input and output panes"
          tabIndex={0}
          onPointerDown={handleDividerPointerDown}
          onPointerMove={handleDividerPointerMove}
          onPointerUp={handleDividerPointerUp}
          onPointerCancel={handleDividerPointerUp}
          onDoubleClick={() => setLeftPanePct(50)}
          onKeyDown={handleDividerKeyDown}
          className="hidden lg:block cursor-col-resize bg-[#d8deea] hover:bg-blue-500 focus:bg-blue-500 focus:outline-none transition-colors"
          title="Drag to resize panes. Double-click to reset."
        />

        <section className="min-h-0 flex flex-col bg-[#fbfcff]">
          <div className="h-12 shrink-0 border-b border-[#d8deea] bg-white flex items-center justify-between gap-3 px-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-semibold text-[#4b5579]">
                Output
              </span>
              <span className="rounded bg-[#eef2ff] px-2 py-0.5 text-xs font-semibold text-blue-700">
                {tasks.length}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExpandAll}
                disabled={tasks.length === 0}
                className="h-9 w-9 inline-flex items-center justify-center rounded border border-[#d8deea] text-[#7b83a6] hover:bg-[#f3f6ff] hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Expand all"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                disabled={tasks.length === 0}
                className="h-9 w-9 inline-flex items-center justify-center rounded border border-[#d8deea] text-[#7b83a6] hover:bg-[#f3f6ff] hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Collapse all"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tasks.length === 0 ? (
              <div className="h-full min-h-90 flex items-center justify-center border border-dashed border-[#d8deea] bg-white text-sm text-[#8d95b3]">
                Output will appear here after Run.
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={idx}
                    collapsed={
                      collapsedIds.has(task.id) ||
                      !knownTaskIdsRef.current.has(task.id)
                    }
                    suggestions={[]}
                    onToggle={() => handleToggleCollapse(task.id)}
                    onPreview={() => handleOpenPreview(task)}
                    onUpdate={(field, value) =>
                      updateTask(task.id, field, value)
                    }
                    onRemove={() => removeTask(task.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {previewTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-preview-title"
          onClick={() => setPreviewTask(null)}
        >
          <div
            className="w-full max-w-2xl rounded-lg bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-[#d8deea] px-5 py-4">
              <div>
                <h2
                  id="task-preview-title"
                  className="text-base font-semibold text-[#2d3558]"
                >
                  Task Details
                </h2>
                <p className="mt-1 text-xs font-medium text-[#7b83a6]">
                  {previewTask.date} · {previewTask.timeSpent || "No time"} ·{" "}
                  {normalizeStatus(previewTask.status)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewTask(null);
                  setPreviewDraft("");
                }}
                className="h-9 w-9 inline-flex items-center justify-center rounded border border-[#d8deea] text-[#7b83a6] hover:bg-[#f6f8fc] hover:text-[#2d3558] transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <label className="label-text">Tasks</label>
              <textarea
                value={previewDraft}
                onChange={(event) => setPreviewDraft(event.target.value)}
                rows={7}
                className="field h-auto! resize-y py-3 text-base leading-7"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewTask(null);
                    setPreviewDraft("");
                  }}
                  className="h-10 rounded border border-[#d8deea] px-4 text-sm font-medium text-[#5d668b] hover:bg-[#f6f8fc] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePreview}
                  className="h-10 rounded bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Update Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
