import { useState, useEffect, useCallback } from "react";
import type { Task } from "@/types";

const HISTORY_KEY = "worklog_task_history";
const MAX_HISTORY = 50;

export interface HistoryEntry {
  task: string;
  outcome: string;
  category: string;
  priority: string;
  plannedMinutes: string;
}

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(HISTORY_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as HistoryEntry[];
    } catch {
      return [];
    }
  }
  return [];
}

/** Deduplicate by task name (case-insensitive), keep most recent */
function dedup(entries: HistoryEntry[]): HistoryEntry[] {
  const seen = new Map<string, HistoryEntry>();
  for (const e of entries) {
    const key = e.task.trim().toLowerCase();
    if (key) seen.set(key, e); // later entries overwrite earlier ones
  }
  return Array.from(seen.values());
}

export function useTaskHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const saveToHistory = useCallback((tasks: Task[]) => {
    const newEntries: HistoryEntry[] = tasks
      .filter((t) => t.task.trim()) // only save tasks with a name
      .map((t) => ({
        task: t.task,
        outcome: t.outcome,
        category: t.category,
        priority: t.priority,
        plannedMinutes: t.plannedMinutes,
      }));

    setHistory((prev) => {
      const merged = dedup([...prev, ...newEntries]).slice(-MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  /** All unique task names from history */
  const taskNames = history.map((h) => h.task);

  return { history, taskNames, saveToHistory };
}
