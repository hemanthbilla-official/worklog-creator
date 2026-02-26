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

interface AIQuickLogProps {
  globalDate: string;
  onGenerate: (overrides: Partial<Task>[]) => void;
}

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

function buildSystemPrompt(todayFormatted: string): string {
  return `You are a task extraction assistant. Extract the tasks, start times, and end times from the following text. Calculate the totalPlannedTime in hours (decimal, e.g. 1.50). Set category to 'NIAT', priority to 'High', and status to 'Not Done' by default. Generate a concise expected outcome for each task using present/future tense (e.g. "Complete daily sync", "Deliver class session", "Resolve student doubts"). Never use past tense words like "completed", "delivered", or "resolved". If the user does not specify a date, use "${todayFormatted}".

Return ONLY a raw JSON array of objects matching this exact structure — no markdown fences, no explanation, no extra text:
[{ "date": "YYYY-MM-DD", "task": "string", "category": "NIAT", "outcome": "expected outcome in present/future tense", "priority": "High", "status": "Not Done", "totalPlannedTime": "number as string e.g. 1.50", "startTime": "HH:mm (24h)", "endTime": "HH:mm (24h)", "actualTime": "number as string e.g. 1.50", "remarks": "", "dependencies": "", "deviations": "" }]

Rules:
- outcome must be a short expected result in present/future tense (never past tense, never use words ending in -ed)
- startTime and endTime must be in 24-hour HH:mm format (e.g. "09:30", "14:00")
- totalPlannedTime and actualTime should be the duration in hours as a decimal string (e.g. "0.50", "2.00")
- If no end time is given, leave endTime as "" and set totalPlannedTime and actualTime to ""
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
                    buildSystemPrompt(globalDate) +
                    "\n\nUser input:\n" +
                    input.trim(),
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
                "e.g., Standup 9:30am to 10am\nTypescript class 10:30 to 12:30\nDoubt clearing 2pm to 2:30pm"
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
        </div>
      )}
    </div>
  );
}
