import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Settings,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useGeminiKey } from "@/hooks/useGeminiKey";
import type { Task } from "@/types";
import type { HistoryEntry } from "@/hooks/useTaskHistory";

interface AIQuickLogProps {
  globalDate: string;
  onGenerate: (overrides: Partial<Task>[]) => void;
  history: HistoryEntry[];
}

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

function buildHistoryContext(history: HistoryEntry[]): string {
  if (history.length === 0) return "";
  const recent = history.slice(-15);
  const lines = recent.map(
    (h) =>
      `- "${h.task}" (${h.category}, ${h.priority}, ~${h.plannedMinutes || "?"}min)`,
  );
  return `\n\nHere are the user's recent/frequent tasks for context. Use these to infer times, categories, and priorities when the user is vague:\n${lines.join("\n")}`;
}

function buildSystemPrompt(
  todayFormatted: string,
  history: HistoryEntry[],
): string {
  const historyBlock = buildHistoryContext(history);

  return `You are a smart worklog assistant. The user will describe their day casually — sometimes with full details, sometimes very vaguely (e.g. "standup, 2 classes, helped students"). Your job is to turn that into structured worklog entries.

Key behaviors:
- If the user gives times, use them exactly.
- If the user is vague about times, infer reasonable times based on their history patterns below. Space tasks logically throughout the day (e.g. standup early morning, classes mid-morning, etc).
- If you truly cannot infer a time, leave startTime and endTime as "".
- Category defaults to "NIAT" unless specified.
- Priority defaults to "High" unless specified.
- Date defaults to "${todayFormatted}" unless specified.

Status rules (VERY IMPORTANT — read the user's intent):
- Default status is "Not Done".
- If the user says "done", "completed", "finished", "over", or uses past tense (e.g. "took class", "had standup", "cleared doubts"), set status to "Completed".
- If the user says "in progress", "doing", "working on", "ongoing", set status to "In Progress".
- If the user says "pending", "not done", "yet to start", "will do", "need to", set status to "Not Done" or "Yet to Start".
- If the user says "on hold", "blocked", "waiting", set status to "On Hold".
- If the user says "carry forward", "tomorrow", "postpone", set status to "Carry Forward".
- Valid statuses are ONLY: "Completed", "Not Done", "Yet to Start", "On Hold", "In Progress", "Carry Forward".
- Understand the user's intent — e.g. "Class 8:30 to 9:30 done" means status is "Completed".

Outcome rules (IMPORTANT):
- Write DETAILED, SPECIFIC outcomes — not generic ones.
- Use present/future tense. Never use past tense or words ending in -ed.
- BAD: "Class delivered", "Sync completed", "Doubts resolved"
- GOOD: "Deliver interactive session on the scheduled topic, covering key concepts with live coding examples and Q&A"
- GOOD: "Conduct daily standup to sync on progress, blockers, and priorities for the day"
- GOOD: "Provide one-on-one doubt clearing support to students, addressing conceptual gaps and debugging issues"
- Each outcome should be 1-2 sentences, specific to the task.${historyBlock}

Return ONLY a raw JSON array — no markdown fences, no explanation, no extra text:
[{ "date": "YYYY-MM-DD", "task": "string", "category": "NIAT", "outcome": "detailed specific outcome in present/future tense", "priority": "High", "status": "Completed or Not Done etc", "totalPlannedTime": "decimal hours e.g. 1.50", "startTime": "HH:mm (24h)", "endTime": "HH:mm (24h)", "actualTime": "decimal hours e.g. 1.50", "remarks": "", "dependencies": "", "deviations": "" }]

Rules:
- startTime and endTime must be in 24-hour HH:mm format (e.g. "09:30", "14:00")
- totalPlannedTime and actualTime = duration in hours as decimal string (e.g. "0.50", "2.00")
- If no end time can be inferred, leave endTime as "" and set totalPlannedTime and actualTime to ""
- Output ONLY the JSON array. No other text whatsoever.`;
}

function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  // Remove ```json ... ``` or ``` ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?\s*```$/, "");
  }
  return cleaned.trim();
}

export default function AIQuickLog({
  globalDate,
  onGenerate,
  history,
}: AIQuickLogProps) {
  const { apiKey, setApiKey, hasKey } = useGeminiKey();
  const [isOpen, setIsOpen] = useState(false);
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
                    buildSystemPrompt(globalDate, history) +
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

      // Map to Partial<Task> — compute plannedMinutes from totalPlannedTime
      const taskOverrides: Partial<Task>[] = parsed.map((item) => {
        const planned = parseFloat(item.totalPlannedTime || "0");
        const plannedMinutes = isNaN(planned)
          ? ""
          : String(Math.round(planned * 60));

        return {
          date: item.date || globalDate,
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

      onGenerate(taskOverrides);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-quicklog glass-card overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-gray-700">
            AI Quick Log
          </span>
          {!hasKey && (
            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              API Key Required
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Collapsible body */}
      {isOpen && (
        <div className="px-5 pb-5 space-y-4 animate-fade-in border-t border-gray-100">
          {/* Settings toggle */}
          <div className="pt-3">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              {showSettings ? "Hide Settings" : "API Key Settings"}
            </button>

            {showSettings && (
              <div className="mt-2 animate-fade-in">
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
          </div>

          {/* Text area */}
          <div>
            <textarea
              rows={3}
              placeholder={
                "Just describe your day casually...\ne.g., standup, 2 classes, helped students after lunch\nor: took react class 10:30-12:30, doubt clearing"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="field !h-auto py-2.5 resize-y leading-relaxed"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Generate button + warning */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!hasKey || !input.trim() || loading}
              className="btn-primary !py-2 !px-4 !text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Tasks
                </>
              )}
            </button>

            {!hasKey && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Add your Gemini API key in settings to enable
              </span>
            )}
          </div>

          {/* Recent Tasks */}
          {history.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Recent Tasks
              </span>
              <div className="flex flex-wrap gap-2">
                {history
                  .slice(-10)
                  .reverse()
                  .map((h) => (
                    <button
                      key={h.task}
                      type="button"
                      onClick={() =>
                        onGenerate([
                          {
                            date: globalDate,
                            task: h.task,
                            outcome: h.outcome,
                            category: h.category,
                            priority: h.priority,
                            plannedMinutes: h.plannedMinutes,
                          },
                        ])
                      }
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-full border border-gray-200 hover:border-indigo-200 transition-all cursor-pointer"
                    >
                      {h.task}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
