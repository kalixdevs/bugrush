function normalize(code: string): string {
  return code
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/#.*$/gm, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}();,:=<>+\-*/])\s*/g, "$1")
    .trim();
}

export function isCorrect(submitted: string, solution: string): boolean {
  return normalize(submitted) === normalize(solution);
}

/**
 * Compare a typed program output to an expected one. Lenient on trailing
 * whitespace and a trailing newline; everything else must match exactly
 * (case-sensitive). Used by TRACE-mode rounds.
 */
export function matchOutput(submitted: string, expected: string): boolean {
  const norm = (s: string) =>
    s.split("\n").map((l) => l.trimEnd()).join("\n").trim();
  return norm(submitted) === norm(expected);
}
