// Uncontracted (grade 1) braille for product names on medicine packs, with
// the French accented letters. Dots are numbered 1–3 down the left column
// and 4–6 down the right column.

const LETTERS: Record<string, string> = {
  a: "1", b: "12", c: "14", d: "145", e: "15", f: "124", g: "1245", h: "125", i: "24", j: "245",
  k: "13", l: "123", m: "134", n: "1345", o: "135", p: "1234", q: "12345", r: "1235", s: "234", t: "2345",
  u: "136", v: "1236", w: "2456", x: "1346", y: "13456", z: "1356",
  é: "123456", à: "12356", è: "2346", ù: "23456", â: "16", ê: "126", î: "146", ô: "1456", û: "156",
  ë: "1246", ï: "12456", ü: "1256", ç: "12346", œ: "246",
};

const PUNCT: Record<string, string> = {
  ".": "256",
  ",": "2",
  "-": "36",
  "/": "34",
  "+": "235",
  "'": "3",
};

const DIGITS = "jabcdefghi"; // 0–9 share the cells of a–j
const NUMBER_SIGN = "3456";
const LETTER_SIGN = "56";

/** A cell is the list of raised dot numbers (1–6). An empty cell is a space. */
export type Cell = number[];

const toCell = (s: string): Cell => s.split("").map(Number);

export interface BrailleResult {
  cells: Cell[];
  unsupported: string[];
}

export function textToBraille(text: string): BrailleResult {
  const cells: Cell[] = [];
  const unsupported = new Set<string>();
  let numeric = false;
  const chars = Array.from(text.normalize("NFC").toLowerCase());
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === " ") {
      cells.push([]);
      numeric = false;
      continue;
    }
    if (ch >= "0" && ch <= "9") {
      if (!numeric) cells.push(toCell(NUMBER_SIGN));
      numeric = true;
      cells.push(toCell(LETTERS[DIGITS[Number(ch)]]));
      continue;
    }
    if ((ch === "." || ch === ",") && numeric && /[0-9]/.test(chars[i + 1] ?? "")) {
      cells.push(toCell(PUNCT[ch]));
      continue;
    }
    if (LETTERS[ch]) {
      if (numeric && "abcdefghij".includes(ch)) cells.push(toCell(LETTER_SIGN));
      numeric = false;
      cells.push(toCell(LETTERS[ch]));
      continue;
    }
    if (PUNCT[ch]) {
      numeric = false;
      cells.push(toCell(PUNCT[ch]));
      continue;
    }
    unsupported.add(ch);
  }
  return { cells, unsupported: [...unsupported] };
}

/** Marburg Medium geometry (mm). */
export const MARBURG = {
  dotDiameter: 1.5,
  dotPitch: 2.5,
  cellPitch: 6.0,
  linePitch: 10.0,
};

/** Splits cells into lines of at most `max` cells, breaking at spaces where possible. */
export function wrapCells(cells: Cell[], max: number): Cell[][] {
  if (max < 1) return [];
  const words: Cell[][] = [];
  let cur: Cell[] = [];
  for (const c of cells) {
    if (c.length === 0) {
      if (cur.length) words.push(cur);
      cur = [];
    } else cur.push(c);
  }
  if (cur.length) words.push(cur);
  const lines: Cell[][] = [];
  let lineCells: Cell[] = [];
  for (let word of words) {
    while (word.length > max) {
      if (lineCells.length) {
        lines.push(lineCells);
        lineCells = [];
      }
      lines.push(word.slice(0, max));
      word = word.slice(max);
    }
    const needed = lineCells.length ? lineCells.length + 1 + word.length : word.length;
    if (needed <= max) {
      lineCells = lineCells.length ? [...lineCells, [], ...word] : [...word];
    } else {
      if (lineCells.length) lines.push(lineCells);
      lineCells = [...word];
    }
  }
  if (lineCells.length) lines.push(lineCells);
  return lines;
}

/** Dot centres for wrapped lines, relative to the block's top-left dot. */
export function dotPositions(lines: Cell[][]): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  lines.forEach((cells, li) => {
    cells.forEach((cell, ci) => {
      for (const d of cell) {
        const col = d <= 3 ? 0 : 1;
        const row = (d - 1) % 3;
        out.push({
          x: ci * MARBURG.cellPitch + col * MARBURG.dotPitch,
          y: li * MARBURG.linePitch + row * MARBURG.dotPitch,
        });
      }
    });
  });
  return out;
}

export function blockSize(lines: Cell[][]): { w: number; h: number } {
  const maxCells = Math.max(0, ...lines.map((l) => l.length));
  if (!maxCells) return { w: 0, h: 0 };
  return {
    w: (maxCells - 1) * MARBURG.cellPitch + MARBURG.dotPitch + MARBURG.dotDiameter,
    h: (lines.length - 1) * MARBURG.linePitch + 2 * MARBURG.dotPitch + MARBURG.dotDiameter,
  };
}
