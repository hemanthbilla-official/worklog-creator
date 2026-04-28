import { useState, useEffect, useRef } from "react";
import { Trash2, ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import AutocompleteInput from "./AutocompleteInput";
import type { Task } from "@/types";
import type { HistoryEntry } from "@/hooks/useTaskHistory";
import { PRIORITIES, STATUSES } from "@/constants";
import { calcActualTime, minutesToUnits } from "@/utils";

interface TaskCardProps {
  task: Task;
  index: number;
  collapsed: boolean;
  suggestions: string[];
  history: HistoryEntry[];
  onToggle: () => void;
  onUpdate: (field: keyof Task, value: string) => void;
  onRemove: () => void;
}

export default function TaskCard({
  task,
  index,
  collapsed,
  suggestions,
  history,
  onToggle,
  onUpdate,
  onRemove,
}: TaskCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const prevTaskRef = useRef(task.task);

  // Auto-calculate actual time when start/end change
  useEffect(() => {
    const computed = calcActualTime(task.startTime, task.endTime);
    if (computed !== task.actualTime) {
      onUpdate("actualTime", computed);
    }
  }, [task.startTime, task.endTime]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-calculate planned time (hours) from planned minutes
  useEffect(() => {
    const computed = minutesToUnits(task.plannedMinutes);
    if (computed !== task.totalPlannedTime) {
      onUpdate("totalPlannedTime", computed);
    }
  }, [task.plannedMinutes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill outcome from history when task name changes
  useEffect(() => {
    if (task.task === prevTaskRef.current) return;
    prevTaskRef.current = task.task;

    // Only auto-fill if outcome is empty
    if (task.outcome) return;
    if (!task.task.trim()) return;

    const match = history.find(
      (h) => h.task.trim().toLowerCase() === task.task.trim().toLowerCase(),
    );
    if (match && match.outcome) {
      onUpdate("outcome", match.outcome);
    }
  }, [task.task, task.outcome, history]); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = task.task || "Untitled task";

  // ── Collapsed view ──────────────────────────────────────────────

  if (collapsed) {
    return (
      <div
        onClick={onToggle}
        className="glass-card px-5 py-3 flex items-center justify-between cursor-pointer hover:border-gray-300 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-bold text-gray-400 uppercase shrink-0">
            #{index + 1}
          </span>
          {task.date && (
            <span className="text-xs font-semibold text-indigo-500 shrink-0">
              {task.date}
            </span>
          )}
          <span className="text-sm font-medium text-gray-800 truncate">
            {summary}
          </span>
          {task.plannedMinutes && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
              {task.plannedMinutes}m
            </span>
          )}
          {task.status && task.status !== "Yet to Start" && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                task.status === "Completed"
                  ? "bg-green-50 text-green-600"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {task.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Done toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(
                "status",
                task.status === "Completed" ? "Not Done" : "Completed",
              );
            }}
            className={`text-xs font-medium px-2.5 py-1 rounded-md transition-all ${
              task.status === "Completed"
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600"
            }`}
            title={task.status === "Completed" ? "Mark not done" : "Mark done"}
          >
            {task.status === "Completed" ? "Done" : "Mark Done"}
          </button>
          <ChevronDown className="w-4 h-4 text-gray-400" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-red-400 hover:text-red-600 transition-colors ml-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Expanded view (compact by default) ─────────────────────────

  return (
    <div
      className={`glass-card p-6 space-y-5 relative animate-fade-in border-l-4 border-l-indigo-500 shadow-lg shadow-indigo-500/5 transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onToggle}
          className="text-xs font-bold tracking-widest text-gray-400 uppercase flex items-center gap-1.5 hover:text-gray-600 transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          Task {index + 1}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-400 hover:text-red-600 transition-colors text-sm flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
          Remove
        </button>
      </div>

      {/* === Compact fields (always visible): Task, Outcome, Times, Status === */}

      {/* Task Description */}
      <div>
        <label className="label-text">Task Description</label>
        <AutocompleteInput
          value={task.task}
          onChange={(v) => onUpdate("task", v)}
          suggestions={suggestions}
          placeholder="Describe the task..."
        />
      </div>

      {/* Outcome */}
      <div>
        <label className="label-text">Outcome</label>
        <input
          type="text"
          placeholder="Expected outcome (detailed)"
          value={task.outcome}
          onChange={(e) => onUpdate("outcome", e.target.value)}
          className="field"
        />
      </div>

      {/* Times + Status in one row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="label-text">Start Time</label>
          <input
            type="time"
            value={task.startTime}
            onChange={(e) => onUpdate("startTime", e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="label-text">End Time</label>
          <input
            type="time"
            value={task.endTime}
            onChange={(e) => onUpdate("endTime", e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="label-text">Planned (mins)</label>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 30"
            value={task.plannedMinutes}
            onChange={(e) => onUpdate("plannedMinutes", e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="label-text">Status</label>
          <select
            value={task.status}
            onChange={(e) => onUpdate("status", e.target.value)}
            className="field"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* === "More Details" toggle for less-used fields === */}
      {!showDetails ? (
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="text-sm text-gray-400 hover:text-indigo-500 font-medium transition-colors flex items-center gap-1.5"
        >
          <Settings2 className="w-3.5 h-3.5" />
          More Details
        </button>
      ) : (
        <div className="space-y-4 animate-fade-in border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <span className="label-text mb-0">Additional Details</span>
            <button
              type="button"
              onClick={() => setShowDetails(false)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Hide
            </button>
          </div>

          {/* Date, Category, Priority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label-text">Date</label>
              <input
                type="date"
                value={task.date}
                onChange={(e) => onUpdate("date", e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label className="label-text">Category</label>
              <input
                type="text"
                value={task.category}
                onChange={(e) => onUpdate("category", e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label className="label-text">Priority</label>
              <select
                value={task.priority}
                onChange={(e) => onUpdate("priority", e.target.value)}
                className="field"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Computed fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Planned (hrs)</label>
              <input
                type="text"
                readOnly
                value={task.totalPlannedTime}
                className="field bg-gray-50 cursor-not-allowed text-gray-500"
              />
            </div>
            <div>
              <label className="label-text">Actual (hrs)</label>
              <input
                type="text"
                readOnly
                value={task.actualTime}
                className="field bg-gray-50 cursor-not-allowed text-gray-500"
              />
            </div>
          </div>

          {/* Notes & Deviations */}
          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1"
            >
              + Add Notes & Deviations
            </button>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="label-text mb-0">Notes & Deviations</span>
                <button
                  type="button"
                  onClick={() => setShowNotes(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Hide
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label-text">Remarks</label>
                  <input
                    type="text"
                    placeholder="Additional notes"
                    value={task.remarks}
                    onChange={(e) => onUpdate("remarks", e.target.value)}
                    className="field"
                  />
                </div>
                <div>
                  <label className="label-text">Dependencies</label>
                  <input
                    type="text"
                    placeholder="Blocked by..."
                    value={task.dependencies}
                    onChange={(e) => onUpdate("dependencies", e.target.value)}
                    className="field"
                  />
                </div>
                <div>
                  <label className="label-text">Deviations</label>
                  <input
                    type="text"
                    placeholder="Any deviations"
                    value={task.deviations}
                    onChange={(e) => onUpdate("deviations", e.target.value)}
                    className="field"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
