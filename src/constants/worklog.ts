import type { TaskTemplate } from "@/types";

export const PRIORITIES = ["Highest", "High", "Medium", "Low", "Adhoc"];

export const STATUSES = [
  "Completed",
  "Not Done",
  "Yet to Start",
  "On Hold",
  "In Progress",
  "Carry Forward",
];

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    label: "Worklog & Standup",
    defaults: {
      task: "Worklog and Standup",
      outcome: "Daily sync completed",
      priority: "High",
      status: "Completed",
      plannedMinutes: "15",
    },
  },
  {
    label: "Class Prep",
    defaults: {
      task: "Prep for class",
      outcome: "Preparation completed",
      priority: "High",
      status: "Completed",
      plannedMinutes: "30",
    },
  },
  {
    label: "Conduct Class",
    defaults: {
      task: "Conduct class session",
      outcome: "Session delivered",
      priority: "Highest",
      status: "Completed",
      plannedMinutes: "60",
    },
  },
  {
    label: "Doubt Clearing",
    defaults: {
      task: "Doubt clearing / Student support",
      outcome: "Doubts resolved",
      priority: "Medium",
      status: "Completed",
      plannedMinutes: "15",
    },
  },
  {
    label: "LH Meeting",
    defaults: {
      task: "LH Meeting",
      outcome: "Meeting attended",
      priority: "High",
      status: "Completed",
      plannedMinutes: "30",
    },
  },
];
