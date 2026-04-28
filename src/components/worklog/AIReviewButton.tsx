import { useState } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useGeminiKey } from "@/hooks/useGeminiKey";
import type { Task } from "@/types";

interface AIReviewButtonProps {
  tasks: Task[];
  onFixedTasks: (overrides: Partial<Task>[]) => void;
}

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

const REVIEW_PROMPT = `You are a worklog reviewer. You will receive a JSON array of worklog task entries. Your job is to clean them up and make them submission-ready:

1. Fill in any missing or empty "outcome" fields with DETAILED, SPECIFIC outcomes (1-2 sentences, present/future tense, never past tense).
2. If a task has startTime but no endTime, try to infer a reasonable endTime from the plannedMinutes or context.
3. If status is "Yet to Start" but times are filled, change it to "Not Done" or "In Progress".
4. Fix any formatting inconsistencies in times (ensure HH:mm 24h format).
5. Make vague outcomes more descriptive and specific.
6. Recalculate totalPlannedTime and actualTime if start/end times are present.
7. Do NOT change the task name, date, or category unless they are clearly wrong.
8. Do NOT remove any tasks.

Return ONLY a raw JSON array with the same structure — no markdown fences, no explanation:
[{ "date": "YYYY-MM-DD", "task": "string", "category": "string", "outcome": "detailed outcome", "priority": "string", "status": "string", "totalPlannedTime": "decimal hours", "startTime": "HH:mm", "endTime": "HH:mm", "actualTime": "decimal hours", "remarks": "string", "dependencies": "string", "deviations": "string" }]

Output ONLY the JSON array. No other text.`;

function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?\s*```$/, "");
  }
  return cleaned.trim();
}

export default function AIReviewButton({
  tasks,
  onFixedTasks,
}: AIReviewButtonProps) {
  const { apiKey, hasKey } = useGeminiKey();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReview = async () => {
    if (!hasKey || tasks.length === 0) return;

    setLoading(true);
    setError("");

    // Build a slim version of tasks for the prompt
    const taskData = tasks.map((t) => ({
      date: t.date,
      task: t.task,
      category: t.category,
      outcome: t.outcome,
      priority: t.priority,
      status: t.status,
      totalPlannedTime: t.totalPlannedTime,
      startTime: t.startTime,
      endTime: t.endTime,
      actualTime: t.actualTime,
      remarks: t.remarks,
      dependencies: t.dependencies,
      deviations: t.deviations,
    }));

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
                    REVIEW_PROMPT +
                    "\n\nHere are the current worklog entries:\n" +
                    JSON.stringify(taskData, null, 2),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
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
          "Failed to parse AI response. Raw: " + rawText.slice(0, 200),
        );
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("AI returned an empty or invalid array");
      }

      // Map to Partial<Task> with plannedMinutes computed
      const fixed: Partial<Task>[] = parsed.map((item) => {
        const planned = parseFloat(item.totalPlannedTime || "0");
        const plannedMinutes = isNaN(planned)
          ? ""
          : String(Math.round(planned * 60));

        return {
          date: item.date || "",
          task: item.task || "",
          category: item.category || "NIAT",
          outcome: item.outcome || "",
          priority: item.priority || "High",
          status: item.status || "Not Done",
          plannedMinutes,
          totalPlannedTime: isNaN(planned) ? "" : planned.toFixed(2),
          startTime: item.startTime || "",
          endTime: item.endTime || "",
          actualTime: item.actualTime || "",
          remarks: item.remarks || "",
          dependencies: item.dependencies || "",
          deviations: item.deviations || "",
        };
      });

      onFixedTasks(fixed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!hasKey) return null;

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleReview}
        disabled={loading || tasks.length === 0}
        className="btn-secondary !border-solid !border-violet-200 !text-violet-600 hover:!bg-violet-50 hover:!border-violet-300"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Reviewing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            AI Review & Fix
          </>
        )}
      </button>
      {error && (
        <span className="text-xs text-red-500 flex items-center gap-1 max-w-[200px]">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span className="truncate">{error}</span>
        </span>
      )}
    </div>
  );
}
