import { useState, useEffect } from "react";

const STORAGE_KEY = "worklog_gemini_api_key";

export function useGeminiKey() {
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(STORAGE_KEY) || "";
  });

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(STORAGE_KEY, apiKey);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [apiKey]);

  return { apiKey, setApiKey, hasKey: apiKey.length > 0 };
}
