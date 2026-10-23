/**
 * Turns the plain math notation used in quant copy ("6/10 × 5/9 = 1/3", "C(6, 2)", "(5/6)⁴",
 * "P(sick | positive)") into LaTeX for KaTeX, so calculations are typeset like a textbook:
 * stacked fractions, binomial coefficients, proper powers and spacing. Words become \text.
 */

const SUPERSCRIPTS: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "ⁿ": "n", "ᵏ": "k", "ᴺ": "N", "ᵃ": "a", "ᵗ": "t", "ʳ": "r", "⁻": "-", "⁺": "+",
};
const SUBSCRIPTS: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "ᵢ": "i", "ₙ": "n", "ₖ": "k",
};
const OPERATORS: Record<string, string> = {
  "×": "\\times", "÷": "\\div", "−": "-", "≈": "\\approx", "≤": "\\le", "≥": "\\ge", "<": "<", ">": ">", "=": "=", "+": "+",
  "|": "\\mid", "…": "\\dots", "·": "\\cdot", "→": "\\to", "∞": "\\infty", "↔": "\\leftrightarrow",
  "π": "\\pi", "≠": "\\ne", "∩": "\\cap", "∪": "\\cup",
};
/** Names written upright, as textbooks set them. */
const FUNCTIONS = new Set(["Var", "SD", "Cov", "max", "min", "log", "ln"]);

type Token = { kind: "num" | "word" | "op" | "open" | "close" | "other"; text: string };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === " ") {
      tokens.push({ kind: "other", text: " " });
      i++;
    } else if (/[0-9.]/.test(ch)) {
      let j = i;
      // Digits, a decimal point, and thousands commas like 1,296 (a comma then 3 digits).
      while (j < src.length && (/[0-9.]/.test(src[j]) || (src[j] === "," && /^[0-9]{3}(?![0-9])/.test(src.slice(j + 1))))) j++;
      tokens.push({ kind: "num", text: src.slice(i, j) });
      i = j;
    } else if (/[A-Za-z’']/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z’'-]/.test(src[j])) j++;
      tokens.push({ kind: "word", text: src.slice(i, j) });
      i = j;
    } else if (ch === "(" || ch === "[") {
      tokens.push({ kind: "open", text: ch });
      i++;
    } else if (ch === ")" || ch === "]") {
      tokens.push({ kind: "close", text: ch });
      i++;
    } else if (OPERATORS[ch] !== undefined || ch === "/") {
      tokens.push({ kind: "op", text: ch });
      i++;
    } else {
      tokens.push({ kind: "other", text: ch });
      i++;
    }
  }
  return tokens;
}

class Parser {
  i = 0;
  constructor(
    readonly tokens: Token[],
    private stack: boolean,
  ) {}

  private peek(offset = 0) {
    return this.tokens[this.i + offset];
  }

  /** The whole expression up to a closing bracket (or the end). */
  expression(): string {
    let out = "";
    while (this.i < this.tokens.length) {
      const token = this.peek();
      if (token.kind === "close") break;
      out += this.term();
    }
    return out;
  }

  /** A term, with any fraction bar after it folded in. */
  private term(): string {
    const token = this.peek();
    if (token.kind === "op" && token.text !== "/") {
      this.i++;
      return ` ${OPERATORS[token.text]} `;
    }
    if (token.kind === "other") {
      this.i++;
      return this.other(token.text);
    }
    let left = this.operand();
    // a/b, including a/(b + c) and chains like 1/2/3 (rare, left to right).
    while (this.peek()?.kind === "op" && this.peek().text === "/" && this.peek(1) && this.peek(1).kind !== "other") {
      this.i++;
      const right = this.operand();
      left = this.stack ? `\\frac{${strip(left)}}{${strip(right)}}` : `${left}/${right}`;
    }
    return left;
  }

  private other(text: string): string {
    if (text === " ") return " ";
    if (text === "$") return "\\$";
    if (text === "%") return "\\%";
    if (text === "!") return "!";
    if (text === ",") return ",\\,";
    if (text === ":") return "\\colon ";
    if (text === "√") {
      const inner = this.operand();
      return `\\sqrt{${strip(inner)}}`;
    }
    if (text === "∑") return "\\sum ";
    if (SUPERSCRIPTS[text] !== undefined) return `^{${this.script(SUPERSCRIPTS)}}`;
    if (SUBSCRIPTS[text] !== undefined) return `_{${this.script(SUBSCRIPTS)}}`;
    if (text === "½") return "\\tfrac{1}{2}";
    // Anything else outside plain ASCII (dashes, quotes, arrows not listed) is set as text.
    return /^[\x21-\x7e]$/.test(text) ? text : `\\text{${text}}`;
  }

  /** A run of superscript or subscript characters, read back as plain characters. */
  private script(map: Record<string, string>): string {
    let out = "";
    // The current token was already consumed by `other`; re-read from it.
    this.i--;
    while (this.peek()?.kind === "other" && map[this.peek().text] !== undefined) {
      out += map[this.peek().text];
      this.i++;
    }
    return out;
  }

  /** One operand: a number, a bracketed group, C(n, k), a function call, a word or symbol, with powers. */
  private operand(): string {
    const token = this.peek();
    let out = "";
    if (!token) return "";
    if (token.kind === "open") {
      this.i++;
      const inner = this.expression();
      const close = this.peek()?.text ?? (token.text === "(" ? ")" : "]");
      this.i++;
      // Brackets only grow to fit something tall, like a fraction; otherwise they stay tight.
      const tall = /\\(frac|binom|sum|sqrt)/.test(inner);
      const [l, r] = token.text === "(" ? (tall ? ["\\left(", "\\right)"] : ["(", ")"]) : tall ? ["\\left[", "\\right]"] : ["[", "]"];
      out = `${l}${inner}${close === ")" || close === "]" ? r : ""}`;
    } else if (token.kind === "num") {
      this.i++;
      out = token.text.replace(/,/g, "{,}");
    } else if (token.kind === "word") {
      this.i++;
      const next = this.peek();
      if (token.text === "C" && next?.kind === "open") {
        // C(n, k) as a binomial coefficient.
        this.i++;
        const args = this.expression();
        this.i++;
        const [n, k] = args.split(/,\\,/);
        out = k !== undefined ? `\\binom{${n.trim()}}{${k.trim()}}` : `C\\left(${args}\\right)`;
      } else if (FUNCTIONS.has(token.text)) {
        out = `\\operatorname{${token.text}}`;
      } else if (token.text.length === 1 || /^[A-Z]$/.test(token.text)) {
        out = token.text;
      } else {
        // A run of words, kept together as text: "4 of the 10" → 4 \text{ of the } 10.
        const before = this.tokens[this.i - 2]?.text === " " ? " " : "";
        let words = token.text;
        while (this.peek()?.text === " " && this.peek(1)?.kind === "word" && this.peek(1).text.length > 1) {
          words += " " + this.peek(1).text;
          this.i += 2;
        }
        const after = this.peek()?.text === " " ? " " : "";
        out = `\\text{${before}${words.replace(/’/g, "'")}${after}}`;
      }
    } else if (token.kind === "other") {
      this.i++;
      out = this.other(token.text);
    } else {
      this.i++;
      out = token.text;
    }
    // Powers and subscripts bind to the operand.
    while (this.peek()?.kind === "other" && (SUPERSCRIPTS[this.peek().text] !== undefined || SUBSCRIPTS[this.peek().text] !== undefined || this.peek().text === "!")) {
      const t = this.peek().text;
      this.i++;
      out += t === "!" ? "!" : this.other(t);
    }
    return out;
  }
}

/** Brackets that only group a numerator or denominator are dropped once it's stacked. */
function strip(tex: string): string {
  const plain = /^\((.*)\)$/.exec(tex);
  if (plain && !/[()]/.test(plain[1].replace(/\\left\(|\\right\)/g, ""))) return plain[1];
  const match = /^\\left\((.*)\\right\)$/.exec(tex);
  if (!match) return tex;
  // Only when the brackets wrap the whole thing, not "(a) + (b)".
  let depth = 0;
  const inner = match[1];
  for (let i = 0; i < inner.length; i++) {
    if (inner.startsWith("\\left", i)) depth++;
    if (inner.startsWith("\\right", i)) {
      depth--;
      if (depth < 0) return tex;
    }
  }
  return inner;
}

/** `stack` sets a/b as a stacked fraction; off, it stays a slash (for math inside a sentence). */
export function plainToTex(src: string, { stack = true }: { stack?: boolean } = {}): string {
  const parser = new Parser(tokenize(src.trim()), stack);
  let out = "";
  // Stray closing brackets are kept as plain characters.
  while (parser.i < parser.tokens.length) {
    out += parser.expression();
    if (parser.i < parser.tokens.length) {
      out += ")";
      parser.i++;
    }
  }
  return out.replace(/ {2,}/g, " ").trim();
}
