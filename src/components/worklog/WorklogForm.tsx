import { useState } from "react";
import { Plus, ClipboardCopy, Check, Trash2, Zap } from "lucide-react";
import type { Task } from "@/types";
import { useLocalTasks } from "@/hooks/useLocalTasks";
import { useTaskHistory } from "@/hooks/useTaskHistory";
import { todayISO } from "@/utils";
import TaskCard from "./TaskCard";
import AIQuickLog from "./AIQuickLog";
import AIReviewButton from "./AIReviewButton";

function buildTSV(tasks: Task[]): string {
  return tasks
    .map((task) =>
      [
        task.date || "",
        task.task || "",
        task.category || "NIAT",
        task.outcome || "",
        task.priority || "",
        task.status || "",
        task.totalPlannedTime || "",
        task.startTime || "",
        task.endTime || "",
        task.actualTime || "",
        task.remarks || "",
        task.dependencies || "",
        task.deviations || "",
      ].join("\t"),
    )
    .join("\n");
}

export default function WorklogForm() {
  const {
    tasks,
    hydrated,
    addTask,
    addMultipleTasks,
    updateTask,
    removeTask,
    clearAll,
  } = useLocalTasks();
  const { history, taskNames, getFrequentTasks, saveToHistory } =
    useTaskHistory();
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [globalDate, setGlobalDate] = useState(todayISO());

  const handleAddTask = (defaults?: Partial<Task>) => {
    // Collapse all current tasks
    setCollapsedIds(new Set(tasks.map((t) => t.id)));
    addTask({ date: globalDate, ...defaults });
  };

  const handleAIGenerate = (overrides: Partial<Task>[]) => {
    // Collapse all current tasks before inserting AI-generated ones
    setCollapsedIds(new Set(tasks.map((t) => t.id)));
    addMultipleTasks(overrides);
  };

  const handleAIFix = (overrides: Partial<Task>[]) => {
    // Replace all tasks with the fixed versions from AI
    addMultipleTasks(overrides);
  };

  const handleMyUsualDay = () => {
    const frequent = getFrequentTasks(6);
    if (frequent.length === 0) return;

    // Add global date to each task
    const withDate = frequent.map((t) => ({ ...t, date: globalDate }));
    setCollapsedIds(new Set(tasks.map((t) => t.id)));
    addMultipleTasks(withDate);
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
    if (tasks.length === 0) return;
    const tsv = buildTSV(tasks);
    // Save completed tasks to history for future suggestions
    saveToHistory(tasks);
    try {
      await navigator.clipboard.writeText(tsv);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      // Fallback: some browsers block clipboard in non-secure contexts
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

  // Don't render until hydrated to avoid flash of empty state
  if (!hydrated) {
    return (
      <div className="w-full max-w-[1400px] mx-auto flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-8">
      {/* Header row: Title left, controls right */}
      <div className="flex items-center justify-between gap-6">
        <h1 className="text-2xl font-bold text-gray-800 tracking-wide uppercase">
          WORKLOG
        </h1>

        <div className="flex items-center gap-4">
          {/* Date Picker */}
          <div className="shrink-0">
            <input
              type="date"
              value={globalDate}
              onChange={(e) => setGlobalDate(e.target.value)}
              className="field w-40"
            />
          </div>

          {/* My Usual Day */}
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleMyUsualDay}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors h-[34px] flex items-center gap-1.5 border border-indigo-200"
            >
              <Zap className="w-3.5 h-3.5" />
              My Usual Day
            </button>
          )}

          {/* Collapse Controls */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors h-[34px]"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors h-[34px]"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>


      {/* AI Quick Log */}
      <AIQuickLog
        globalDate={globalDate}
        onGenerate={handleAIGenerate}
        history={history}
      />

      {/* Task cards */}
      <div className="space-y-3">
        {tasks.length === 0 && (
          <div className="glass-card px-6 py-12 text-center text-gray-400">
            <p className="text-sm">
              No tasks yet. Use the Quick Add buttons above or add a blank task
              below.
            </p>
          </div>
        )}
        {tasks.map((task, idx) => (
          <TaskCard
            key={task.id}
            task={task}
            index={idx}
            collapsed={collapsedIds.has(task.id)}
            suggestions={taskNames}
            history={history}
            onToggle={() => handleToggleCollapse(task.id)}
            onUpdate={(field, value) => updateTask(task.id, field, value)}
            onRemove={() => removeTask(task.id)}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          type="button"
          onClick={() => handleAddTask()}
          className="btn-secondary"
        >
          <Plus className="w-4 h-4" />
          Add Another Task
        </button>

        <AIReviewButton tasks={tasks} onFixedTasks={handleAIFix} />

        <button
          type="button"
          onClick={handleCopy}
          disabled={tasks.length === 0}
          className="btn-primary"
        >
          {copyState === "copied" ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <ClipboardCopy className="w-4 h-4" />
              Copy Data for Sheets
            </>
          )}
        </button>

        {tasks.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Are you sure you want to clear all tasks?")) {
                clearAll();
              }
            }}
            className="text-sm text-red-400 hover:text-red-600 transition-colors flex items-center gap-1 ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
