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
