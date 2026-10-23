import assert from "node:assert/strict";
import test from "node:test";
import katex from "katex";
import { plainToTex } from "./tex";
import { QUANT_LESSONS, QUANT_PUZZLES } from "./lessons";
import { sample } from "./test-helpers";

const renders = (tex: string) => katex.renderToString(tex, { throwOnError: true, strict: "ignore" });

test("plain notation becomes textbook LaTeX", () => {
  assert.equal(plainToTex("6/10 × 5/9 = 1/3"), "\\frac{6}{10} \\times \\frac{5}{9} = \\frac{1}{3}");
  assert.equal(plainToTex("(5/6)⁴"), "\\left(\\frac{5}{6}\\right)^{4}");
  assert.equal(plainToTex("9/(9 + 19)"), "\\frac{9}{9 + 19}");
  assert.equal(plainToTex("C(6, 2) = 15"), "\\binom{6}{2} = 15");
  assert.equal(plainToTex("4 of the 10"), "4 \\text{ of the } 10");
  assert.equal(plainToTex("1,296"), "1{,}296");
});

test("every working line and displayed calculation in the course typesets", () => {
  const lines = new Set<string>();
  for (const lesson of QUANT_LESSONS) {
    for (const problem of [lesson.example, ...sample(lesson.id, 40)]) {
      for (const step of problem.steps) lines.add(step.result ? `${step.work} = ${step.result}` : step.work);
    }
  }
  for (const puzzle of QUANT_PUZZLES) for (const step of puzzle.problem.steps) lines.add(step.result ? `${step.work} = ${step.result}` : step.work);
  const failures: string[] = [];
  for (const line of lines) {
    const tex = plainToTex(line);
    try {
      renders(tex);
    } catch (error) {
      failures.push(`${line} → ${tex}: ${String(error).slice(0, 120)}`);
    }
  }
  assert.deepEqual(failures.slice(0, 15), []);
});

test("every formula, inline LaTeX and displayed calculation in the lessons typesets", () => {
  const failures: string[] = [];
  const check = (tex: string, label: string) => {
    try {
      renders(tex);
    } catch (error) {
      failures.push(`${label}: ${tex}: ${String(error).slice(0, 100)}`);
    }
  };
  const copy = (text: string, label: string) => {
    assert.equal((text.match(/`/g) ?? []).length % 2, 0, `${label}: unpaired backticks in "${text}"`);
    for (const [, tex] of text.matchAll(/`([^`]+)`/g)) check(tex, label);
    for (const [, plain] of text.matchAll(/\{\{(.+?)\}\}/g)) check(plainToTex(plain), label);
  };
  for (const lesson of QUANT_LESSONS) {
    for (const part of lesson.parts) {
      const texts: string[] = [];
      if (part.type === "rule") {
        for (const line of part.lines) check(line.tex, `${lesson.id} rule`);
        texts.push(...part.lines.map((l) => l.lead ?? ""), ...(part.where ?? []), part.plain, part.note ?? "");
      }
      if (part.type === "text") texts.push(...part.body);
      if (part.type === "story") texts.push(...part.beats.map((b) => b.text));
      if (part.type === "check") texts.push(part.prompt, part.explain, ...part.choices);
      if (part.type === "trap") texts.push(part.body);
      if (part.type === "example") texts.push(part.lead ?? "");
      if (part.type === "list") texts.push(...part.items);
      for (const text of texts) copy(text, lesson.id);
    }
  }
  // Step explanations in the working, and puzzle explanations.
  for (const lesson of QUANT_LESSONS) {
    for (const problem of [lesson.example, ...sample(lesson.id, 30)]) for (const step of problem.steps) copy(step.explain ?? "", problem.key);
  }
  for (const puzzle of QUANT_PUZZLES) for (const step of puzzle.problem.steps) copy(step.explain ?? "", puzzle.id);
  assert.deepEqual(failures, []);
});
