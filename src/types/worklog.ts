export interface Task {
  id: string;
  date: string;
  task: string;
  status: string;
  timeSpent: string;
}

export interface TaskTemplate {
  label: string;
  defaults: Partial<Task>;
}

let counter = 0;

function uid(): string {
  return `${Date.now()}-${++counter}`;
}

export function createTask(overrides?: Partial<Task>): Task {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return {
    id: uid(),
    date,
    task: "",
    status: "Yet to Start",
    timeSpent: "",
    ...overrides,
  };
}
