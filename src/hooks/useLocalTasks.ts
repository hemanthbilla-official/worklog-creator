import { useState, useEffect, useCallback } from "react";
import type { Task } from "@/types";
import { createTask } from "@/types";

const TASKS_KEY = "worklog_tasks";
const DATE_KEY = "worklog_lastAccessedDate";

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;

  return (
    typeof record.id === "string" &&
    typeof record.date === "string" &&
    typeof record.task === "string" &&
    typeof record.status === "string" &&
    typeof record.timeSpent === "string"
  );
}

function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];

  const today = todayDateString();
  const lastDate = localStorage.getItem(DATE_KEY);

  if (lastDate && today > lastDate) {
    localStorage.removeItem(TASKS_KEY);
    localStorage.setItem(DATE_KEY, today);
    return [];
  }

  localStorage.setItem(DATE_KEY, today);

  const raw = localStorage.getItem(TASKS_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTask);
  } catch {
    return [];
  }
}

export function useLocalTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTasks(loadTasks());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    localStorage.setItem(DATE_KEY, todayDateString());
  }, [tasks, hydrated]);

  const addMultipleTasks = useCallback((overridesArray: Partial<Task>[]) => {
    const newTasks = overridesArray.map((overrides) => createTask(overrides));
    setTasks((prev) => [
      ...prev.filter((t) => t.task || t.timeSpent),
      ...newTasks,
    ]);

    return newTasks;
  }, []);

  const updateTask = useCallback(
    (id: string, field: keyof Task, value: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
      );
    },
    [],
  );

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setTasks([]);
  }, []);

  return {
    tasks,
    hydrated,
    addMultipleTasks,
    updateTask,
    removeTask,
    clearAll,
  };
}
