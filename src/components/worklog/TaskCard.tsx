import { Trash2, ChevronDown, ChevronUp, BookOpenText } from "lucide-react";
import AutocompleteInput from "./AutocompleteInput";
import type { Task } from "../../types";
import { STATUSES } from "../../constants";
import { normalizeClockTimeTo12Hour } from "../../utils";

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
      return "status-chip status-chip-completed";
    case "Not Done":
      return "status-chip status-chip-not-done";
    case "Yet to Start":
      return "status-chip status-chip-yet-to-start";
    case "On Hold":
      return "status-chip status-chip-on-hold";
    case "In Progress":
      return "status-chip status-chip-in-progress";
    case "Carry Forward":
      return "status-chip status-chip-carry-forward";
    default:
      return "status-chip status-chip-default";
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
  const taskLabel = `Task ${index + 1}`;

  if (collapsed) {
    return (
      <article className="task-row task-row-collapsed">
        <button
          type="button"
          onClick={onToggle}
          className="task-summary-button"
          aria-expanded={false}
          aria-label={`Expand ${taskLabel}`}
        >
          <span className="task-number">#{index + 1}</span>
          <span className="task-summary-content">
            <span className="task-meta-line">
              {task.date && <span className="task-date">{task.date}</span>}
              {(task.startTime || task.endTime) && (
                <span className="meta-pill">
                  {normalizeClockTimeTo12Hour(task.startTime) || "--:--"}-
                  {normalizeClockTimeTo12Hour(task.endTime) || "--:--"}
                </span>
              )}
              {task.timeSpent && (
                <span className="meta-pill">{task.timeSpent}</span>
              )}
              {task.status && (
                <span className={statusClass(task.status)}>{task.status}</span>
              )}
            </span>
            <span className="task-title">{summary}</span>
          </span>
        </button>

        <div className="task-actions">
          <button
            type="button"
            onClick={onPreview}
            className="icon-button"
            title="Read full task"
            aria-label={`Read ${taskLabel}`}
          >
            <BookOpenText className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdate(
                "status",
                task.status === "Completed" ? "Not Done" : "Completed",
              )
            }
            className={`task-status-toggle ${
              task.status === "Completed" ? "is-complete" : ""
            }`}
            title={task.status === "Completed" ? "Mark not done" : "Mark done"}
          >
            {task.status === "Completed" ? "Done" : "Mark Done"}
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="icon-button"
            title="Expand task"
            aria-label={`Expand ${taskLabel}`}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="icon-button danger-button"
            title="Remove task"
            aria-label={`Remove ${taskLabel}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="task-row task-row-expanded">
      <div className="task-expanded-content">
        <div className="task-row-head">
          <button
            type="button"
            onClick={onToggle}
            className="task-kicker"
            aria-expanded={true}
          >
            <ChevronUp className="h-4 w-4" />
            {taskLabel}
          </button>
          <div className="task-edit-actions">
            <button type="button" onClick={onPreview} className="text-button">
              <BookOpenText className="h-4 w-4" />
              Read
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="text-button text-button-danger"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        </div>

        <div className="task-fields">
          <div>
            <label className="label-text">Tasks</label>
            <AutocompleteInput
              value={task.task}
              onChange={(v) => onUpdate("task", v)}
              suggestions={suggestions}
              placeholder="Conduct React hooks practice session with examples and doubt clarification"
            />
          </div>

          <div className="task-field-grid">
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
    </article>
  );
}
