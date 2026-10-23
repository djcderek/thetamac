"use client";

import { useSyncExternalStore } from "react";

/**
 * Which question types and puzzles a player has got right (or tried) in this browser. It's a
 * convenience for the lists; mastery itself is saved on the server.
 */
export type TypeMark = "solved" | "tried";
type Marks = Record<string, TypeMark>;

const listeners = new Set<() => void>();
const cache = new Map<string, Marks>();
const EMPTY: Marks = {};

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

/** A right answer sticks; a miss only marks something untouched. */
function mark(key: string, id: string, right: boolean) {
  const marks = read(key);
  if (marks[id] === "solved" || (!right && marks[id] === "tried")) return;
  const next = { ...marks, [id]: right ? "solved" : "tried" } as Marks;
  cache.set(key, next);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}
  listeners.forEach((listener) => listener());
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
