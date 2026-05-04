import { Trash2, ChevronDown, ChevronUp, BookOpenText } from "lucide-react";
import AutocompleteInput from "./AutocompleteInput";
import type { Task } from "@/types";
import { STATUSES } from "@/constants";
import { normalizeClockTimeTo12Hour } from "@/utils";

interface TaskCardProps {
  task: Task;
  index: number;
  collapsed: boolean;
  suggestions: string[];
  onToggle: () => void;
  onPreview: () => void;
  onUpdate: (field: keyof Task, value: string) => void;
  onRemove: () => void;
}

function statusClass(status: string): string {
  switch (status) {
    case "Completed":
      return "bg-green-50 text-green-600";
    case "Not Done":
      return "bg-red-50 text-red-600";
    case "Yet to Start":
      return "bg-amber-50 text-amber-700";
    case "On Hold":
      return "bg-purple-50 text-purple-600";
    case "In Progress":
      return "bg-rose-50 text-rose-600";
    case "Carry Forward":
      return "bg-blue-50 text-blue-600";
    default:
      return "bg-gray-100 text-gray-500";
  }
}

export default function TaskCard({
  task,
  index,
  collapsed,
  suggestions,
  onToggle,
  onPreview,
  onUpdate,
  onRemove,
}: TaskCardProps) {
  const summary = task.task || "Untitled task";

  if (collapsed) {
    return (
      <div
        onClick={onToggle}
        className="glass-card px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between cursor-pointer hover:border-gray-300 transition-colors"
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
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
          {(task.startTime || task.endTime) && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full shrink-0">
              {normalizeClockTimeTo12Hour(task.startTime) || "--:--"}-
              {normalizeClockTimeTo12Hour(task.endTime) || "--:--"}
            </span>
          )}
          {task.timeSpent && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
              {task.timeSpent}
            </span>
          )}
          {task.status && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusClass(task.status)}`}
            >
              {task.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            title="Read full task"
          >
            <BookOpenText className="w-4 h-4" />
          </button>
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
            title="Remove task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 space-y-4 relative animate-fade-in border-l-4 border-l-indigo-500 shadow-lg shadow-indigo-500/5 transition-all duration-300">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onToggle}
          className="text-xs font-bold tracking-widest text-gray-400 uppercase flex items-center gap-1.5 hover:text-gray-600 transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          Task {index + 1}
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPreview}
            className="text-blue-500 hover:text-blue-700 transition-colors text-sm flex items-center gap-1"
          >
            <BookOpenText className="w-4 h-4" />
            Read
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
      </div>

      <div className="space-y-4">
        <div>
          <label className="label-text">Tasks</label>
          <AutocompleteInput
            value={task.task}
            onChange={(v) => onUpdate("task", v)}
            suggestions={suggestions}
            placeholder="Very detailed task, e.g. Conduct React hooks practice session with examples and doubt clarification"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-5 gap-4">
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
          <label className="label-text">Start Time</label>
          <input
            type="text"
            placeholder="8:30 AM"
            value={task.startTime}
            onChange={(e) => onUpdate("startTime", e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="label-text">End Time</label>
          <input
            type="text"
            placeholder="9:30 AM"
            value={task.endTime}
            onChange={(e) => onUpdate("endTime", e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="label-text">Time Spent</label>
          <input
            type="text"
            placeholder="1:30"
            value={task.timeSpent}
            onChange={(e) => onUpdate("timeSpent", e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="label-text">Task Status</label>
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
      </div>
    </div>
  );
}
