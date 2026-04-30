import type { TaskTemplate } from "@/types";

export const STATUSES = [
  "Completed",
  "Not Done",
  "Yet to Start",
  "On Hold",
  "In Progress",
  "Carry Forward",
];

export function normalizeStatus(status: string): string {
  const value = status.trim().toLowerCase().replace(/\s+/g, " ");

  if (["completed", "complete", "compeleted", "done", "finished"].includes(value)) {
    return "Completed";
  }
  if (["not done", "pending", "incomplete"].includes(value)) {
    return "Not Done";
  }
  if (["yet to start", "not started", "to start"].includes(value)) {
    return "Yet to Start";
  }
  if (["on hold", "hold", "blocked", "waiting"].includes(value)) {
    return "On Hold";
  }
  if (["in progress", "progress", "ongoing", "working"].includes(value)) {
    return "In Progress";
  }
  if (["carry forward", "carried forward", "postpone", "postponed"].includes(value)) {
    return "Carry Forward";
  }

  return STATUSES.includes(status) ? status : "Not Done";
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    label: "Worklog & Standup",
    defaults: {
      task: "Update daily worklog entries and attend standup sync to align on progress, blockers, and priorities",
      status: "Completed",
      timeSpent: "0:15",
    },
  },
  {
    label: "Class Prep",
    defaults: {
      task: "Prepare class material, examples, and practice flow for the upcoming student learning session",
      status: "Completed",
      timeSpent: "0:30",
    },
  },
  {
    label: "Conduct Class",
    defaults: {
      task: "Conduct scheduled class session for students with concept explanation, live examples, and Q&A support",
      status: "Completed",
      timeSpent: "1:00",
    },
  },
  {
    label: "Doubt Clearing",
    defaults: {
      task: "Clear student doubts through one-on-one support, debugging guidance, and conceptual clarification",
      status: "Completed",
      timeSpent: "0:15",
    },
  },
  {
    label: "LH Meeting",
    defaults: {
      task: "Attend LH meeting to review updates, discuss blockers, and align on next action items",
      status: "Completed",
      timeSpent: "0:30",
    },
  },
];
