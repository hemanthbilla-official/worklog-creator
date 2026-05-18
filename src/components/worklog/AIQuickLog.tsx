import { useState } from "react";
import { Sparkles, Settings, Loader2, AlertCircle, Play } from "lucide-react";
import { useGeminiKey } from "../../hooks/useGeminiKey";
import type { Task } from "../../types";
import { normalizeStatus } from "../../constants";
import {
  clockTimeToMinutes,
  decimalHoursToTimeSpent,
  minutesToClockTime12Hour,
  normalizeClockTimeTo12Hour,
  timeSpentToMinutes,
} from "../../utils";

interface AIQuickLogProps {
  globalDate: string;
  onGenerate: (overrides: Partial<Task>[]) => void;
}

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

function buildSystemPrompt(todayFormatted: string): string {
  return `You are a worklog assistant that converts casual daily updates into structured Google Sheets worklog entries.

Return ONLY a raw JSON array with these fields:
date, task, startTime, endTime, timeSpent, status

Format:
[
  {
    "date": "YYYY-MM-DD",
    "task": "string",
    "startTime": "h:mm AM/PM or empty",
    "endTime": "h:mm AM/PM or empty",
    "timeSpent": "H:MM or empty",
    "status": "Completed | Not Done | Yet to Start | On Hold | In Progress | Carry Forward"
  }
]

Rules:

- Each non-empty input line = one worklog entry.
- Do not merge lines unless a single line clearly contains multiple tasks.
- Default date = "${todayFormatted}" unless explicitly provided.

Task Rules:
- Keep tasks short, clear, and professional.
- Do not use single-word tasks.
- Prefer concise descriptions between 5–12 words.
- Expand shorthand only when necessary for clarity.
- Correct obvious spelling/capitalization mistakes:
  - "REact" → "React"
  - "Ib3" → "IB3"
  - "compeleted" → "completed"
  - "Praticipitated" → "Participated"

Time Rules:
- Convert durations to H:MM format:
  - 15 mins → "0:15"
  - 1 hour → "1:00"
  - 90 mins → "1:30"
- If only duration is provided:
  - fill timeSpent
  - leave startTime/endTime empty
- If start + end time provided:
  - fill all time fields
  - calculate duration
- If start time + duration provided:
  - infer end time
- Support casual formats:
  - "9 30 to 10 30"
  - "9:30-10:30"
  - "9.30 to 10.30"
- If AM/PM missing, infer from surrounding context.
- Maintain sequential continuity:
  - if previous row has endTime
  - and next row only has duration
  - use previous endTime as next startTime.

Status Rules:
- Default = "Not Done"
- Completed:
  - done, completed, finished, over
  - or obvious past tense actions
- In Progress:
  - doing, working on, ongoing
- Yet to Start / Not Done:
  - pending, need to, will do
- On Hold:
  - blocked, waiting, on hold
- Carry Forward:
  - tomorrow, postpone, carry forward

Valid statuses ONLY:
- Completed
- Not Done
- Yet to Start
- On Hold
- In Progress
- Carry Forward

Examples:

Input:
React class for IB2 1 hour completed

Output:
[
  {
    "date": "${todayFormatted}",
    "task": "Conduct React class for IB2 students",
    "startTime": "",
    "endTime": "",
    "timeSpent": "1:00",
    "status": "Completed"
  }
]

Input:
PS session for S2 9 30 to 10 30 completed
React class for IB2 1 hour completed

Output:
[
  {
    "date": "${todayFormatted}",
    "task": "Conduct PS session for S2 students",
    "startTime": "9:30 AM",
    "endTime": "10:30 AM",
    "timeSpent": "1:00",
    "status": "Completed"
  },
  {
    "date": "${todayFormatted}",
    "task": "Conduct React class for IB2 students",
    "startTime": "10:30 AM",
    "endTime": "11:30 AM",
    "timeSpent": "1:00",
    "status": "Completed"
  }
]

Return ONLY the JSON array.
No markdown.
No explanations.
No extra text.`;
}

function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?\s*```$/, "");
  }
  return cleaned.trim();
}

function normalizeGeneratedTimeSpent(value: string): string {
  const normalized = decimalHoursToTimeSpent(value);
  return normalized || value.trim();
}

function fillSequentialTimes(tasks: Partial<Task>[]): Partial<Task>[] {
  let previousEndMinutes: number | null = null;

  return tasks.map((task) => {
    const startTime = normalizeClockTimeTo12Hour(task.startTime || "");
    const endTime = normalizeClockTimeTo12Hour(task.endTime || "");
    const timeSpent = normalizeGeneratedTimeSpent(task.timeSpent || "");

    const startMinutes = clockTimeToMinutes(startTime);
    const endMinutes = clockTimeToMinutes(endTime);
    const durationMinutes = timeSpentToMinutes(timeSpent);

    if (startMinutes !== null && endMinutes !== null) {
      previousEndMinutes = endMinutes;
      return { ...task, startTime, endTime, timeSpent };
    }

    if (
      !startTime &&
      !endTime &&
      previousEndMinutes !== null &&
      durationMinutes !== null
    ) {
      const inferredEndMinutes = previousEndMinutes + durationMinutes;
      const inferredTask = {
        ...task,
        startTime: minutesToClockTime12Hour(previousEndMinutes),
        endTime: minutesToClockTime12Hour(inferredEndMinutes),
        timeSpent,
      };

      previousEndMinutes = inferredEndMinutes;
      return inferredTask;
    }

    if (startMinutes !== null && !endTime && durationMinutes !== null) {
      const inferredEndMinutes = startMinutes + durationMinutes;
      previousEndMinutes = inferredEndMinutes;
      return {
        ...task,
        startTime,
        endTime: minutesToClockTime12Hour(inferredEndMinutes),
        timeSpent,
      };
    }

    if (endMinutes !== null) {
      previousEndMinutes = endMinutes;
    }

    return { ...task, startTime, endTime, timeSpent };
  });
}

export default function AIQuickLog({
  globalDate,
  onGenerate,
}: AIQuickLogProps) {
  const { apiKey, setApiKey, hasKey } = useGeminiKey();
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!hasKey || !input.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    buildSystemPrompt(globalDate) +
                    "\n\nUser input:\n" +
                    input.trim(),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(
          errBody?.error?.message || `API returned ${response.status}`,
        );
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!rawText) {
        throw new Error("Empty response from Gemini API");
      }

      const cleaned = stripMarkdownFences(rawText);
      let parsed: Record<string, string>[];

      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error(
          "Failed to parse AI response as JSON. Raw: " + rawText.slice(0, 200),
        );
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("AI returned an empty or invalid array");
      }

      const taskOverrides = fillSequentialTimes(
        parsed.map((item) => ({
          date: item.date || globalDate,
          task: item.task || "",
          startTime: item.startTime || "",
          endTime: item.endTime || "",
          timeSpent: item.timeSpent || "",
          status: normalizeStatus(item.status || "Not Done"),
        })),
      );

      onGenerate(taskOverrides);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="input-pane">
      <div className="pane-head">
        <div className="pane-title">
          <Sparkles className="h-4 w-4" />
          <span>worklog-input</span>
        </div>

        <div className="pane-tools">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="icon-button"
            title="API key settings"
            aria-label="API key settings"
            aria-pressed={showSettings}
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!hasKey || !input.trim() || loading}
            className="run-button"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run
              </>
            )}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="settings-sheet">
          <label className="label-text">Gemini API Key</label>
          <input
            type="password"
            placeholder="Paste your Gemini API key here..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="field"
          />
          <p className="helper-text">
            Your key is stored locally in this browser only.
          </p>
        </div>
      )}

      {!hasKey && (
        <div className="notice notice-warning">
          <AlertCircle className="h-4 w-4" />
          <span>Add your Gemini API key in settings to enable Run.</span>
        </div>
      )}

      {error && (
        <div className="notice notice-error">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="quicklog-editor">
        <textarea
          placeholder={
            "PS session for S2 9 30 to 10 30 completed\nReact class for IB2 1 hour completed\nLearning Hours in progress 15 minutes"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="quicklog-textarea"
        />
      </div>
    </div>
  );
}
