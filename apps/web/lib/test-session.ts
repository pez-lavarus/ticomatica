"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TestMode } from "@/lib/types";
import { FULL_TEST_TIME, SECTION_TIME } from "@/lib/constants";

export const SESSION_KEY = "bxm-pilot-session";

export const LEGACY_KEYS = [
  "bxm-pilot-answers",
  "bxm-pilot-flags",
  "bxm-pilot-mode",
  "bxm-pilot-index",
  "bxm-pilot-topic-index",
  "bxm-pilot-time-left",
  "bxm-pilot-review",
] as const;

export type SessionPhase = "active" | "results";

export interface TestSession {
  phase: SessionPhase;
  mode: TestMode;
  answers: Record<number, string>;
  flags: Record<number, boolean>;
  index: number;
  topicIndex: number;
  timeLeft: number;
  review: boolean;
}

export const EMPTY_SESSION: TestSession = {
  phase: "active",
  mode: "full",
  answers: {},
  flags: {},
  index: 0,
  topicIndex: 0,
  timeLeft: FULL_TEST_TIME,
  review: false,
};

function isTestMode(value: unknown): value is TestMode {
  return (
    value === "full" ||
    value === "Geometría" ||
    value === "Funciones" ||
    value === "Estadística y Probabilidad"
  );
}

function parseRecord(raw: string | null): Record<number, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function parseFlags(raw: string | null): Record<number, boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function parseIntSafe(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) ? fallback : value;
}

function normalize(raw: unknown): TestSession {
  const s = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    phase: s.phase === "results" ? "results" : "active",
    mode: isTestMode(s.mode) ? s.mode : "full",
    answers: (typeof s.answers === "object" && s.answers !== null ? s.answers : {}) as Record<number, string>,
    flags: (typeof s.flags === "object" && s.flags !== null ? s.flags : {}) as Record<number, boolean>,
    index: typeof s.index === "number" ? s.index : 0,
    topicIndex: typeof s.topicIndex === "number" ? s.topicIndex : 0,
    timeLeft: typeof s.timeLeft === "number" ? s.timeLeft : FULL_TEST_TIME,
    review: s.review === true,
  };
}

function readLegacySession(): TestSession | null {
  const hasAny = LEGACY_KEYS.some((key) => {
    const value = window.localStorage.getItem(key);
    return value !== null && value !== "";
  });
  if (!hasAny) return null;

  const rawMode = window.localStorage.getItem("bxm-pilot-mode");
  const mode = isTestMode(rawMode) ? rawMode : "full";
  const defaultTime = mode === "full" ? FULL_TEST_TIME : SECTION_TIME;

  return {
    phase: "active",
    mode,
    answers: parseRecord(window.localStorage.getItem("bxm-pilot-answers")),
    flags: parseFlags(window.localStorage.getItem("bxm-pilot-flags")),
    index: parseIntSafe(window.localStorage.getItem("bxm-pilot-index"), 0),
    topicIndex: parseIntSafe(window.localStorage.getItem("bxm-pilot-topic-index"), 0),
    timeLeft: parseIntSafe(window.localStorage.getItem("bxm-pilot-time-left"), defaultTime),
    review: window.localStorage.getItem("bxm-pilot-review") === "true",
  };
}

export function loadTestSession(): TestSession {
  if (typeof window === "undefined") return { ...EMPTY_SESSION };

  const blob = window.localStorage.getItem(SESSION_KEY);
  if (blob) {
    try {
      const parsed = JSON.parse(blob);
      if (typeof parsed === "object" && parsed !== null) {
        return normalize(parsed);
      }
    } catch (e) {
      console.error("Failed to parse saved session", e);
    }
  }

  const legacy = readLegacySession();
  if (legacy) {
    saveTestSession(legacy);
    LEGACY_KEYS.forEach((key) => window.localStorage.removeItem(key));
    return legacy;
  }

  return { ...EMPTY_SESSION };
}

export function saveTestSession(session: TestSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function resetTestSession(mode: TestMode, timeLeft: number): TestSession {
  const session: TestSession = {
    phase: "active",
    mode,
    answers: {},
    flags: {},
    index: 0,
    topicIndex: 0,
    timeLeft,
    review: false,
  };
  saveTestSession(session);
  return session;
}

export function clearTestSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  LEGACY_KEYS.forEach((key) => window.localStorage.removeItem(key));
}

export function hasTestProgress(): boolean {
  const session = loadTestSession();
  return (
    Object.keys(session.answers).length > 0 ||
    session.review ||
    session.phase === "results"
  );
}

type UpdatePatch = Partial<TestSession> | ((prev: TestSession) => Partial<TestSession>);

export function useTestSession() {
  const [session, setSession] = useState<TestSession>(EMPTY_SESSION);
  const [hydrated, setHydrated] = useState(false);
  const sessionRef = useRef<TestSession>(EMPTY_SESSION);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const loaded = loadTestSession();
    sessionRef.current = loaded;
    setSession(loaded);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const update = useCallback((patch: UpdatePatch) => {
    const prev = sessionRef.current;
    const nextPatch = typeof patch === "function" ? patch(prev) : patch;
    const next = { ...prev, ...nextPatch };
    sessionRef.current = next;
    saveTestSession(next);
    setSession(next);
  }, []);

  const reset = useCallback((mode: TestMode, timeLeft: number) => {
    const next = resetTestSession(mode, timeLeft);
    sessionRef.current = next;
    setSession(next);
  }, []);

  const clear = useCallback(() => {
    clearTestSession();
    sessionRef.current = { ...EMPTY_SESSION };
    setSession({ ...EMPTY_SESSION });
  }, []);

  return { session, hydrated, update, reset, clear };
}
