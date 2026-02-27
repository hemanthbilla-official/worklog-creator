import { useState, useEffect, useCallback } from "react";
import type { Task } from "@/types";
import { createTask } from "@/types";

const TASKS_KEY = "worklog_tasks";
const DATE_KEY = "worklog_lastAccessedDate";

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];

  const today = todayDateString();
  const lastDate = localStorage.getItem(DATE_KEY);

  // Midnight reset — if current date is strictly after stored date, clear tasks
  if (lastDate && today > lastDate) {
    localStorage.removeItem(TASKS_KEY);
    localStorage.setItem(DATE_KEY, today);
    return [];
  }

  localStorage.setItem(DATE_KEY, today);

  const raw = localStorage.getItem(TASKS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as Task[];
    } catch {
      return [];
    }
  }
  return [];
}

export function useLocalTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount (client only)
  useEffect(() => {
    const saved = loadTasks();
    setTasks(saved.length > 0 ? saved : [createTask()]);
    setHydrated(true);
  }, []);

  // Auto-save to localStorage on every change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    localStorage.setItem(DATE_KEY, todayDateString());
  }, [tasks, hydrated]);

  const addTask = useCallback((defaults?: Partial<Task>) => {
    setTasks((prev) => [...prev, createTask(defaults)]);
  }, []);

  const addMultipleTasks = useCallback((overridesArray: Partial<Task>[]) => {
    setTasks((prev) => [
      // Remove untouched empty tasks so AI-generated ones don't sit beside blanks
      ...prev.filter((t) => t.task || t.outcome || t.startTime || t.endTime),
      ...overridesArray.map((overrides) => createTask(overrides)),
    ]);
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
    addTask,
    addMultipleTasks,
    updateTask,
    removeTask,
    clearAll,
  };
}
