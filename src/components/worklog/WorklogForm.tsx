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
import { normalizeStatus, STATUSES } from "@/constants";
import { normalizeClockTimeTo12Hour, todayISO } from "@/utils";
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

function formatTimeSpentForSheets(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  return /^\d+:\d{2}$/.test(trimmed) ? `'${trimmed}` : trimmed;
}

function formatClockTimeForSheets(value: string): string {
  const normalized = normalizeClockTimeTo12Hour(value);
  return normalized ? `'${normalized}` : "";
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
        formatClockTimeForSheets(task.startTime),
        formatClockTimeForSheets(task.endTime),
        formatTimeSpentForSheets(task.timeSpent),
        normalizeStatus(task.status),
      ]
        .map(sanitizeCell)
        .join("\t"),
    )
    .join("\n");
}

type PreviewDraft = Pick<
  Task,
  "date" | "task" | "startTime" | "endTime" | "timeSpent" | "status"
>;

function createPreviewDraft(task?: Task): PreviewDraft {
  return {
    date: task?.date || "",
    task: task?.task || "",
    startTime: normalizeClockTimeTo12Hour(task?.startTime || ""),
    endTime: normalizeClockTimeTo12Hour(task?.endTime || ""),
    timeSpent: task?.timeSpent || "",
    status: task?.status || "Not Done",
  };
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
  const [previewDraft, setPreviewDraft] = useState<PreviewDraft>(
    createPreviewDraft(),
  );

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
    setPreviewDraft(createPreviewDraft(task));
  };

  const handleClosePreview = () => {
    setPreviewTask(null);
    setPreviewDraft(createPreviewDraft());
  };

  const handleSavePreview = () => {
    if (!previewTask) return;

    updateTask(previewTask.id, "date", previewDraft.date);
    updateTask(previewTask.id, "task", previewDraft.task);
    updateTask(
      previewTask.id,
      "startTime",
      normalizeClockTimeTo12Hour(previewDraft.startTime),
    );
    updateTask(
      previewTask.id,
      "endTime",
      normalizeClockTimeTo12Hour(previewDraft.endTime),
    );
    updateTask(previewTask.id, "timeSpent", previewDraft.timeSpent);
    updateTask(previewTask.id, "status", normalizeStatus(previewDraft.status));
    handleClosePreview();
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
      <div className="loading-state" role="status" aria-label="Loading worklog">
        <div className="ledger-spinner" />
      </div>
    );
  }

  const hasCopyableTasks = getCopyableTasks(tasks).length > 0;
  const splitPaneStyle = {
    "--left-pane-width": `${leftPanePct}%`,
  } as CSSProperties;

  return (
    <div className="workbench">
      <header className="workbench-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            WL
          </div>
          <div>
            <h1 className="brand-title">Worklog Ledger</h1>
            <p className="brand-subtitle">sheet-ready daily rows</p>
          </div>
        </div>

        <div className="header-actions">
          <input
            type="date"
            value={globalDate}
            onChange={(event) => setGlobalDate(event.target.value)}
            className="field header-date-field"
            aria-label="Default date for generated tasks"
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!hasCopyableTasks}
            className="btn-primary"
          >
            {copyState === "copied" ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <ClipboardCopy className="h-4 w-4" />
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
            className="btn-secondary danger-button"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        </div>
      </header>

      <div ref={splitPaneRef} className="split-pane" style={splitPaneStyle}>
        <section className="pane" aria-label="Worklog input">
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
          className="split-divider"
          title="Drag to resize panes. Double-click to reset."
        />

        <section className="pane output-pane" aria-label="Generated worklog rows">
          <div className="pane-head">
            <div className="pane-title">
              <span>Output</span>
              <span className="count-stamp" aria-label={`${tasks.length} tasks`}>
                {tasks.length}
              </span>
            </div>

            <div className="pane-tools">
              <button
                type="button"
                onClick={handleExpandAll}
                disabled={tasks.length === 0}
                className="icon-button"
                title="Expand all"
                aria-label="Expand all tasks"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                disabled={tasks.length === 0}
                className="icon-button"
                title="Collapse all"
                aria-label="Collapse all tasks"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="task-list-wrap">
            {tasks.length === 0 ? (
              <div className="empty-ledger">No rows stamped yet.</div>
            ) : (
              <div className="task-list">
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
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-preview-title"
          onClick={handleClosePreview}
        >
          <div
            className="modal-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2 id="task-preview-title" className="modal-title">
                  Task Details
                </h2>
                <p className="modal-summary">
                  {previewDraft.date} | {previewDraft.startTime || "--:--"}-
                  {previewDraft.endTime || "--:--"} |{" "}
                  {previewDraft.timeSpent || "No time"} |{" "}
                  {normalizeStatus(previewDraft.status)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClosePreview}
                className="icon-button"
                title="Close"
                aria-label="Close task details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-grid-two">
                <div>
                  <label className="label-text">Date</label>
                  <input
                    type="date"
                    value={previewDraft.date}
                    onChange={(event) =>
                      setPreviewDraft((draft) => ({
                        ...draft,
                        date: event.target.value,
                      }))
                    }
                    className="field"
                  />
                </div>
                <div>
                  <label className="label-text">Task Status</label>
                  <select
                    value={previewDraft.status}
                    onChange={(event) =>
                      setPreviewDraft((draft) => ({
                        ...draft,
                        status: event.target.value,
                      }))
                    }
                    className="field"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label-text">Tasks</label>
                <textarea
                  value={previewDraft.task}
                  onChange={(event) =>
                    setPreviewDraft((draft) => ({
                      ...draft,
                      task: event.target.value,
                    }))
                  }
                  rows={7}
                  className="field textarea-field"
                  autoFocus
                />
              </div>

              <div className="modal-grid-three">
                <div>
                  <label className="label-text">Start Time</label>
                  <input
                    type="text"
                    placeholder="8:30 AM"
                    value={previewDraft.startTime}
                    onChange={(event) =>
                      setPreviewDraft((draft) => ({
                        ...draft,
                        startTime: event.target.value,
                      }))
                    }
                    className="field"
                  />
                </div>
                <div>
                  <label className="label-text">End Time</label>
                  <input
                    type="text"
                    placeholder="9:30 AM"
                    value={previewDraft.endTime}
                    onChange={(event) =>
                      setPreviewDraft((draft) => ({
                        ...draft,
                        endTime: event.target.value,
                      }))
                    }
                    className="field"
                  />
                </div>
                <div>
                  <label className="label-text">Time Spent</label>
                  <input
                    type="text"
                    value={previewDraft.timeSpent}
                    onChange={(event) =>
                      setPreviewDraft((draft) => ({
                        ...draft,
                        timeSpent: event.target.value,
                      }))
                    }
                    className="field"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={handleClosePreview}
                  className="plain-button"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePreview}
                  className="btn-primary"
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
