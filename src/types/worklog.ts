export interface Task {
  id: string;
  date: string;
  task: string;
  category: string;
  outcome: string;
  priority: string;
  status: string;
  plannedMinutes: string;
  totalPlannedTime: string;
  startTime: string;
  endTime: string;
  actualTime: string;
  remarks: string;
  dependencies: string;
  deviations: string;
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
    category: "NIAT",
    outcome: "",
    priority: "Medium",
    status: "Yet to Start",
    plannedMinutes: "",
    totalPlannedTime: "",
    startTime: "",
    endTime: "",
    actualTime: "",
    remarks: "",
    dependencies: "",
    deviations: "",
    ...overrides,
  };
}
