"use client";

import { useSyncExternalStore } from "react";

/**
 * Which question types a player has got right (or tried) in this browser, per lesson. It's a
 * convenience for the Questions list; mastery itself is saved on the server.
 */
export type TypeMark = "solved" | "tried";
type Marks = Record<string, TypeMark>;

const listeners = new Set<() => void>();
const cache = new Map<string, Marks>();
const EMPTY: Marks = {};

const storageKey = (lessonId: string) => `quant-types:${lessonId}`;

function read(lessonId: string): Marks {
  if (!cache.has(lessonId)) {
    try {
      cache.set(lessonId, JSON.parse(localStorage.getItem(storageKey(lessonId)) ?? "{}") as Marks);
    } catch {
      cache.set(lessonId, {});
    }
  }
  return cache.get(lessonId)!;
}

/** Records a result for a type; a right answer sticks, a miss only marks an untouched type. */
export function markType(lessonId: string, familyId: string, right: boolean) {
  const marks = read(lessonId);
  if (marks[familyId] === "solved" || (!right && marks[familyId] === "tried")) return;
  const next = { ...marks, [familyId]: right ? "solved" : "tried" } as Marks;
  cache.set(lessonId, next);
  try {
    localStorage.setItem(storageKey(lessonId), JSON.stringify(next));
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTypeMarks(lessonId: string): Marks {
  return useSyncExternalStore(subscribe, () => read(lessonId), () => EMPTY);
}
