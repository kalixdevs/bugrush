import type { Difficulty, PlayableLanguage } from "./challenges";

/**
 * TRACE-mode problems: the player reads a short snippet and types what it
 * prints. Validation in store.ts uses `matchOutput` from ./validate.
 */
export type TraceChallenge = {
  id: string;
  title: string;
  language: PlayableLanguage;
  difficulty: Difficulty;
  code: string;
  expectedOutput: string;
};

export const traceChallenges: TraceChallenge[] = [
  // ── JavaScript ─────────────────────────────────────────────────────────
  {
    id: "trace-js-squares",
    title: "Loop squares",
    language: "javascript",
    difficulty: "easy",
    code: `for (let i = 0; i < 4; i++) {
  console.log(i * i);
}`,
    expectedOutput: "0\n1\n4\n9",
  },
  {
    id: "trace-js-array-map",
    title: "Map and join",
    language: "javascript",
    difficulty: "easy",
    code: `const xs = [1, 2, 3];
console.log(xs.map(n => n + 10).join("-"));`,
    expectedOutput: "11-12-13",
  },
  {
    id: "trace-js-closure-loop",
    title: "var in a loop",
    language: "javascript",
    difficulty: "normal",
    code: `var fns = [];
for (var i = 0; i < 3; i++) {
  fns.push(() => i);
}
console.log(fns.map(f => f()).join(","));`,
    expectedOutput: "3,3,3",
  },
  {
    id: "trace-js-nan",
    title: "NaN equality",
    language: "javascript",
    difficulty: "normal",
    code: `console.log(NaN === NaN);
console.log([] == false);
console.log(null == undefined);`,
    expectedOutput: "false\ntrue\ntrue",
  },
  {
    id: "trace-js-reduce",
    title: "Reduce with index",
    language: "javascript",
    difficulty: "hard",
    code: `const xs = [4, 2, 6, 1];
const r = xs.reduce((acc, x, i) => acc + x * i, 0);
console.log(r);`,
    expectedOutput: "20",
  },

  // ── TypeScript ─────────────────────────────────────────────────────────
  {
    id: "trace-ts-tuple",
    title: "Destructured tuple",
    language: "typescript",
    difficulty: "easy",
    code: `const t: [number, number, number] = [10, 20, 30];
const [a, , c] = t;
console.log(a + c);`,
    expectedOutput: "40",
  },
  {
    id: "trace-ts-enum-flag",
    title: "Bitflag enum",
    language: "typescript",
    difficulty: "normal",
    code: `enum F { A = 1, B = 2, C = 4 }
const v = F.A | F.C;
console.log(v);
console.log((v & F.B) !== 0);`,
    expectedOutput: "5\nfalse",
  },

  // ── Python ─────────────────────────────────────────────────────────────
  {
    id: "trace-py-slice",
    title: "Negative slice step",
    language: "python",
    difficulty: "easy",
    code: `xs = [1, 2, 3, 4, 5]
print(xs[::-2])`,
    expectedOutput: "[5, 3, 1]",
  },
  {
    id: "trace-py-default-arg",
    title: "Mutable default trap",
    language: "python",
    difficulty: "normal",
    code: `def push(x, into=[]):
    into.append(x)
    return into

print(push(1))
print(push(2))`,
    expectedOutput: "[1]\n[1, 2]",
  },
  {
    id: "trace-py-dict-keys",
    title: "Dict membership",
    language: "python",
    difficulty: "normal",
    code: `d = {"a": 1, "b": 2}
print("a" in d)
print(1 in d)
print(sum(d.values()))`,
    expectedOutput: "True\nFalse\n3",
  },

  // ── C++ ────────────────────────────────────────────────────────────────
  {
    id: "trace-cpp-postfix",
    title: "Post-increment",
    language: "cpp",
    difficulty: "easy",
    code: `#include <iostream>
int main() {
    int i = 5;
    std::cout << i++ << " " << i << "\\n";
    return 0;
}`,
    expectedOutput: "5 6",
  },
  {
    id: "trace-cpp-vector-sum",
    title: "Vector accumulate",
    language: "cpp",
    difficulty: "normal",
    code: `#include <iostream>
#include <vector>
int main() {
    std::vector<int> v = {2, 4, 6};
    int s = 0;
    for (auto x : v) s += x;
    std::cout << s << "\\n";
    return 0;
}`,
    expectedOutput: "12",
  },

  // ── C# ─────────────────────────────────────────────────────────────────
  {
    id: "trace-cs-ternary",
    title: "Ternary chain",
    language: "csharp",
    difficulty: "easy",
    code: `int x = 7;
string s = x < 5 ? "small" : x < 10 ? "mid" : "big";
System.Console.WriteLine(s);`,
    expectedOutput: "mid",
  },
  {
    id: "trace-cs-string-format",
    title: "String interpolation",
    language: "csharp",
    difficulty: "normal",
    code: `int n = 3;
System.Console.WriteLine($"{n * n} = {n}^2");`,
    expectedOutput: "9 = 3^2",
  },

  // ── Ruby ───────────────────────────────────────────────────────────────
  {
    id: "trace-rb-each-with-index",
    title: "each_with_index",
    language: "ruby",
    difficulty: "easy",
    code: `["a", "b", "c"].each_with_index do |v, i|
  puts "#{i}:#{v}"
end`,
    expectedOutput: "0:a\n1:b\n2:c",
  },
  {
    id: "trace-rb-symbol-vs-string",
    title: "Symbol vs string",
    language: "ruby",
    difficulty: "normal",
    code: `h = { :a => 1, "a" => 2 }
puts h[:a]
puts h["a"]
puts h.size`,
    expectedOutput: "1\n2\n2",
  },
];
