import { useState, useEffect } from "react";
import { Trash2, ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { Task } from "@/types";
import { PRIORITIES, STATUSES } from "@/constants";
import { calcActualTime, minutesToUnits } from "@/utils";

interface TaskCardProps {
  task: Task;
  index: number;
  collapsed: boolean;
  onToggle: () => void;
  onUpdate: (field: keyof Task, value: string) => void;
  onRemove: () => void;
}

export default function TaskCard({
  task,
  index,
  collapsed,
  onToggle,
  onUpdate,
  onRemove,
}: TaskCardProps) {
  const [showNotes, setShowNotes] = useState(false);

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
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
              {task.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
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

  // ── Expanded view ───────────────────────────────────────────────

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

      {/* Date, Task & Outcome */}
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
          <label className="label-text">Task Description</label>
          <input
            type="text"
            placeholder="Describe the task..."
            value={task.task}
            onChange={(e) => onUpdate("task", e.target.value)}
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
      </div>

      {/* Outcome */}
      <div>
        <label className="label-text">Outcome</label>
        <input
          type="text"
          placeholder="Expected outcome"
          value={task.outcome}
          onChange={(e) => onUpdate("outcome", e.target.value)}
          className="field"
        />
      </div>

      {/* Priority & Status */}
      <div className="grid grid-cols-2 gap-4">
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

      {/* Times */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          <label className="label-text">Planned (hrs)</label>
          <input
            type="text"
            readOnly
            value={task.totalPlannedTime}
            className="field bg-gray-50 cursor-not-allowed text-gray-500"
          />
        </div>
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
          <label className="label-text">Actual (hrs)</label>
          <input
            type="text"
            readOnly
            value={task.actualTime}
            className="field bg-gray-50 cursor-not-allowed text-gray-500"
          />
        </div>
      </div>

      {/* Optional notes toggle */}
      {!showNotes ? (
        <button
          type="button"
          onClick={() => setShowNotes(true)}
          className="text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Notes &amp; Deviations
        </button>
      ) : (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="label-text mb-0">Notes &amp; Deviations</span>
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
  );
}
