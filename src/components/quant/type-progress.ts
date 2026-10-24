"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import type { QuantMarks } from "@/lib/quant/progress";

/**
 * Quant progress for the lists and the lesson steps: which question types and puzzles a player
 * has got right (or tried), and which lessons they've read. It's kept in this browser so it
 * works signed out, and merged with the account once a page when signed in, so it follows the
 * player between devices. Mastery itself is saved on the server separately.
 */
export type TypeMark = "solved" | "tried";
type Marks = Record<string, TypeMark>;

const listeners = new Set<() => void>();
const cache = new Map<string, Marks>();
const EMPTY: Marks = {};
const notify = () => listeners.forEach((listener) => listener());

const typesKey = (lessonId: string) => `quant-types:${lessonId}`;
const PUZZLES_KEY = "quant-puzzles";

function read(key: string): Marks {
  if (!cache.has(key)) {
    try {
      cache.set(key, JSON.parse(localStorage.getItem(key) ?? "{}") as Marks);
    } catch {
      cache.set(key, {});
    }
  }
  return cache.get(key)!;
}

function write(key: string, marks: Marks) {
  cache.set(key, marks);
  try {
    localStorage.setItem(key, JSON.stringify(marks));
  } catch {}
}

/** A right answer sticks; a miss only marks something untouched. */
function mark(key: string, id: string, right: boolean) {
  const marks = read(key);
  if (marks[id] === "solved" || (!right && marks[id] === "tried")) return;
  write(key, { ...marks, [id]: right ? "solved" : "tried" });
  notify();
}

export const markType = (lessonId: string, familyId: string, right: boolean) => mark(typesKey(lessonId), familyId, right);
export const markPuzzle = (puzzleId: string, right: boolean) => mark(PUZZLES_KEY, puzzleId, right);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useMarks(key: string): Marks {
  return useSyncExternalStore(subscribe, () => read(key), () => EMPTY);
}

export const useTypeMarks = (lessonId: string) => useMarks(typesKey(lessonId));
export const usePuzzleMarks = () => useMarks(PUZZLES_KEY);

// ─── Lessons read ────────────────────────────────────────────────────────────────────────

// "Read to the end in this browser" is also how the reader knows to show the whole lesson at
// once; "Read from the start" clears it. The account's reads only tick the Learn step.
const readKey = (lessonId: string) => `quant-read:${lessonId}`;
const accountReads = new Set<string>();
let syncing: "off" | "started" | "on" = "off";

function readHere(lessonId: string) {
  try {
    return localStorage.getItem(readKey(lessonId)) === "1";
  } catch {
    return false;
  }
}

function saveRead(lessonId: string) {
  accountReads.add(lessonId);
  void fetch("/api/quant/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId }), keepalive: true }).catch(() => {});
}

/** Records a lesson as read to the end (or, with false, starts it over in this browser). */
export function setLessonRead(lessonId: string, done: boolean) {
  try {
    if (done) localStorage.setItem(readKey(lessonId), "1");
    else localStorage.removeItem(readKey(lessonId));
  } catch {}
  if (done && syncing === "on" && !accountReads.has(lessonId)) saveRead(lessonId);
  notify();
}

/** Whether the lesson has been read to the end in this browser. */
export const useLessonReadHere = (lessonId: string) => useSyncExternalStore(subscribe, () => readHere(lessonId), () => false);
/** Whether the lesson has been read to the end here or on the account. */
export const useLessonRead = (lessonId: string) =>
  useSyncExternalStore(subscribe, () => readHere(lessonId) || accountReads.has(lessonId), () => false);

// ─── The account ─────────────────────────────────────────────────────────────────────────

function mergeMarks(key: string, from: Record<string, TypeMark>) {
  const marks = { ...read(key) };
  let changed = false;
  for (const [id, value] of Object.entries(from)) {
    if (marks[id] === "solved" || marks[id] === value) continue;
    marks[id] = value;
    changed = true;
  }
  if (changed) write(key, marks);
}

/**
 * Merges the account's progress into this browser, once per page load, when signed in. Lessons
 * read here before signing in are saved to the account on the way.
 */
export function useQuantAccountSync() {
  const { status } = useSession();
  useEffect(() => {
    if (status !== "authenticated" || syncing !== "off") return;
    syncing = "started";
    fetch("/api/quant/progress", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data: QuantMarks & { read: string[] }) => {
        data.read.forEach((lessonId) => accountReads.add(lessonId));
        for (const [lessonId, marks] of Object.entries(data.types)) mergeMarks(typesKey(lessonId), marks);
        mergeMarks(PUZZLES_KEY, data.puzzles);
        syncing = "on";
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const lessonId = key?.startsWith("quant-read:") ? key.slice("quant-read:".length) : null;
            if (lessonId && readHere(lessonId) && !accountReads.has(lessonId)) saveRead(lessonId);
          }
        } catch {}
        notify();
      })
      .catch(() => {
        syncing = "off";
      });
  }, [status]);
}
