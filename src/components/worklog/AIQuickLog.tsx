import { useState } from "react";
import { Sparkles, Settings, Loader2, AlertCircle, Play } from "lucide-react";
import { useGeminiKey } from "@/hooks/useGeminiKey";
import type { Task } from "@/types";
import { normalizeStatus } from "@/constants";
import {
  clockTimeToMinutes,
  decimalHoursToTimeSpent,
  minutesToClockTime12Hour,
  normalizeClockTimeTo12Hour,
  timeSpentToMinutes,
} from "@/utils";

interface AIQuickLogProps {
  globalDate: string;
  onGenerate: (overrides: Partial<Task>[]) => void;
}

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

function buildSystemPrompt(todayFormatted: string): string {
  return `You are a smart worklog assistant. The user will describe their day casually, sometimes with full details and sometimes vaguely (for example: "standup, 2 classes, helped students"). Turn that into six-column worklog entries for Google Sheets.

Key behaviors:
- Return only these six fields: date, task, startTime, endTime, timeSpent, status.
- If the user enters multiple lines, treat each non-empty line as a separate worklog row. Do not merge lines.
- Correct obvious spelling and capitalization mistakes in the final task text, such as "REact" to "React", "Ib3" to "IB3", "compeleted" to "completed", and "Praticipitated" to "Participated".
- The task field must be detailed and specific enough to paste directly into the Tasks column.
- Do NOT use single-word or overly short task names like "Class", "Standup", "Meeting", or "Doubts".
- Expand casual inputs into very detailed task descriptions. The user's wording is only a reference, not the final detail level.
- Each task should usually be 14-28 words and include the action, audience or context, topic/activity, and useful outcome when inferable.
- For example, "Class" becomes "Conduct React class for students covering component state, event handling, live examples, and doubt clarification" when that intent is clear.
- If the user gives a duration, convert it to H:MM format for timeSpent (examples: 15 minutes = "0:15", 1 hour = "1:00", 90 minutes = "1:30").
- If the user gives a start/end time range, fill startTime and endTime in 12-hour format with AM/PM (examples: "8:30 AM", "12:15 PM", "4:45 PM") and calculate timeSpent in H:MM.
- If the user gives only a duration, fill timeSpent and leave startTime and endTime as "".
- If the user gives a start time plus duration, infer endTime and fill all three time fields.
- Maintain chronological context across lines. If a line has only a duration and the previous line has an endTime, use the previous endTime as the new line's startTime and add the duration to infer endTime.
- Treat casual ranges like "9 30 to 10 30", "9:30 to 10:30", or "9.30-10.30" as time ranges. If AM/PM is missing, infer the most likely workday time from surrounding rows.
- Treat phrases like "time took 1 hr", "took 1 hour", "spent 45 mins", or "for 30 minutes" as duration signals.
- If the user is vague about duration, infer a reasonable Time Spent from the task context.
- If you truly cannot infer Time Spent, leave timeSpent as "".
- Date defaults to "${todayFormatted}" unless specified.

Status rules:
- Default status is "Not Done".
- If the user says "done", "complete", "completed", "compeleted", "finished", "over", or uses past tense (for example "took class", "conducted class", "had standup", "cleared doubts"), set status to "Completed".
- If the user says "in progress", "doing", "working on", or "ongoing", set status to "In Progress".
- If the user says "pending", "not done", "yet to start", "will do", or "need to", set status to "Not Done" or "Yet to Start".
- If the user says "on hold", "blocked", or "waiting", set status to "On Hold".
- If the user says "carry forward", "tomorrow", or "postpone", set status to "Carry Forward".
- Valid statuses are ONLY: "Completed", "Not Done", "Yet to Start", "On Hold", "In Progress", "Carry Forward".

Return ONLY a raw JSON array, with no markdown fences, explanation, or extra text:
[{ "date": "YYYY-MM-DD", "task": "string", "startTime": "h:mm AM/PM or empty", "endTime": "h:mm AM/PM or empty", "timeSpent": "H:MM e.g. 1:30", "status": "Completed or Not Done etc" }]

Sequential time example:
User input:
PS session for S2 9 30 to 10 30 completed
React class for IB2 1 hour completed

Output:
[
  { "date": "${todayFormatted}", "task": "Conduct problem solving session for S2 students with guided practice, exercise walkthroughs, and doubt clarification", "startTime": "9:30 AM", "endTime": "10:30 AM", "timeSpent": "1:00", "status": "Completed" },
  { "date": "${todayFormatted}", "task": "Conduct React class for IB2 students with concept explanation, practical examples, and interactive doubt clarification", "startTime": "10:30 AM", "endTime": "11:30 AM", "timeSpent": "1:00", "status": "Completed" }
]

Example:
User input: Conducted Practice session for S2 time took 1 hr and completed the task
Output: [{ "date": "${todayFormatted}", "task": "Conduct practice session for S2 students with guided problem solving, exercise walkthroughs, and doubt clarification", "startTime": "", "endTime": "", "timeSpent": "1:00", "status": "Completed" }]

Multi-line example:
User input:
Conducted Practice session for S2 time took 1 hr and completed the task
Conducted React Class for IB2 time took 1hr completed
Invigilation for DSA exam 1hr 30 minutes complete
Conducted React Class for S2 1hr completed
Working on project and adding new versions 1hr completed
Conducted REact class for Ib3 and 6 1hr compeleted
Praticipitated in Learning Hours in progress 15 minutes

Output:
[
  { "date": "${todayFormatted}", "task": "Conduct practice session for S2 students with guided problem solving, exercise walkthroughs, and doubt clarification", "startTime": "", "endTime": "", "timeSpent": "1:00", "status": "Completed" },
  { "date": "${todayFormatted}", "task": "Conduct React class for IB2 students covering key concepts, practical examples, and student doubt clarification", "startTime": "", "endTime": "", "timeSpent": "1:00", "status": "Completed" },
  { "date": "${todayFormatted}", "task": "Invigilate DSA examination by monitoring students, maintaining exam discipline, and supporting smooth assessment completion", "startTime": "", "endTime": "", "timeSpent": "1:30", "status": "Completed" },
  { "date": "${todayFormatted}", "task": "Conduct React class for S2 students with concept explanation, hands-on examples, and interactive Q&A support", "startTime": "", "endTime": "", "timeSpent": "1:00", "status": "Completed" },
  { "date": "${todayFormatted}", "task": "Work on project enhancements by adding new version updates, refining functionality, and validating implementation changes", "startTime": "", "endTime": "", "timeSpent": "1:00", "status": "Completed" },
  { "date": "${todayFormatted}", "task": "Conduct React class for IB3 and IB6 students with topic explanation, examples, and doubt clarification", "startTime": "", "endTime": "", "timeSpent": "1:00", "status": "Completed" },
  { "date": "${todayFormatted}", "task": "Participate in Learning Hours session to engage with ongoing discussions, learning activities, and collaborative knowledge sharing", "startTime": "", "endTime": "", "timeSpent": "0:15", "status": "In Progress" }
]

Rules:
- task must be a very detailed description, not a single word, bare category, or lightly edited copy of the user's shorthand.
- startTime and endTime must be 12-hour time with AM/PM when present, otherwise "".
- timeSpent must be H:MM when present. Do not use decimal hours.
- one input line should produce exactly one output object unless the line clearly contains multiple separate tasks.
- Output ONLY the JSON array. No other text whatsoever.`;
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
    <div className="h-full flex flex-col bg-white">
      <div className="h-12 shrink-0 border-b border-[#d8deea] bg-[#fbfcff] flex items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-sm font-semibold text-[#4b5579] truncate">
            worklog-input
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="h-9 w-9 inline-flex items-center justify-center rounded border border-[#d8deea] text-[#7b83a6] hover:bg-[#f3f6ff] hover:text-blue-600 transition-colors"
            title="API key settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!hasKey || !input.trim() || loading}
            className="h-9 inline-flex items-center gap-2 rounded bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run
              </>
            )}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="shrink-0 px-4 py-3 border-b border-[#d8deea] bg-[#fbfcff] animate-fade-in">
          <label className="label-text">Gemini API Key</label>
          <input
            type="password"
            placeholder="Paste your Gemini API key here..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="field font-mono text-xs"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Your key is stored locally in this browser only.
          </p>
        </div>
      )}

      {!hasKey && (
        <div className="shrink-0 flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Add your Gemini API key in settings to enable Run.</span>
        </div>
      )}

      {error && (
        <div className="shrink-0 flex items-start gap-2 border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="min-h-0 flex-1 bg-white">
        <textarea
          placeholder={
            "Paste one task per line...\nPS session for S2 9 30 to 10 30 completed\nReact class for IB2 1 hour completed\nLearning Hours in progress 15 minutes"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="h-full w-full resize-none border-0 bg-white px-4 py-4 font-mono text-sm leading-6 text-[#1f2537] outline-none placeholder:text-[#a4abc2] disabled:opacity-70"
        />
      </div>
    </div>
  );
}
