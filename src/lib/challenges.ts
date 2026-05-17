export type LanguageId =
  | "javascript"
  | "python"
  | "typescript"
  | "cpp"
  | "csharp"
  | "ruby";

export type PlayableLanguage =
  | "javascript"
  | "python"
  | "typescript"
  | "cpp"
  | "csharp"
  | "ruby";

export type Difficulty = "easy" | "normal" | "hard";

export type Challenge = {
  id: string;
  language: PlayableLanguage;
  difficulty: Difficulty;
  title: string;
  hint: string;
  broken: string;
  solution: string;
};

export const LANGUAGES: ReadonlyArray<{
  id: LanguageId;
  label: string;
  available: boolean;
}> = [
  { id: "javascript", label: "JS",     available: true },
  { id: "python",     label: "Python", available: true },
  { id: "typescript", label: "TS",     available: true },
  { id: "cpp",        label: "C++",    available: true },
  { id: "csharp",     label: "C#",     available: true },
  { id: "ruby",       label: "Ruby",   available: true },
];

export const challenges: Challenge[] = [
  {
    id: "assign-vs-compare",
    language: "javascript",
    difficulty: "easy",
    title: "Lookup returns the wrong user",
    hint: "users.find never matches — every call returns the first user.",
    broken: `function getUser(users, id) {
  return users.find(u => u.id = id);
}`,
    solution: `function getUser(users, id) {
  return users.find(u => u.id === id);
}`,
  },
  {
    id: "off-by-one",
    language: "javascript",
    difficulty: "normal",
    title: "Last item is missing from the output",
    hint: "The loop stops one iteration too early.",
    broken: `function collect(items) {
  const out = [];
  for (let i = 0; i < items.length - 1; i++) {
    out.push(items[i]);
  }
  return out;
}`,
    solution: `function collect(items) {
  const out = [];
  for (let i = 0; i < items.length; i++) {
    out.push(items[i]);
  }
  return out;
}`,
  },
  {
    id: "async-no-await",
    language: "javascript",
    difficulty: "hard",
    title: "Total is always NaN",
    hint: "Caller awaits a Promise it never unwrapped before doing math.",
    broken: `async function total(fetchPrice, ids) {
  let sum = 0;
  for (const id of ids) {
    sum += fetchPrice(id);
  }
  return sum;
}`,
    solution: `async function total(fetchPrice, ids) {
  let sum = 0;
  for (const id of ids) {
    sum += await fetchPrice(id);
  }
  return sum;
}`,
  },
  {
    id: "python-mutable-default",
    language: "python",
    difficulty: "hard",
    title: "List keeps growing across calls",
    hint: "Mutable default argument is shared between invocations.",
    broken: `def append_item(item, bucket=[]):
    bucket.append(item)
    return bucket`,
    solution: `def append_item(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket`,
  },
  {
    id: "shadowed-var",
    language: "javascript",
    difficulty: "normal",
    title: "Discount never applies",
    hint: "An inner declaration shadows the outer variable.",
    broken: `function price(base, isMember) {
  let total = base;
  if (isMember) {
    let total = base * 0.9;
  }
  return total;
}`,
    solution: `function price(base, isMember) {
  let total = base;
  if (isMember) {
    total = base * 0.9;
  }
  return total;
}`,
  },
  {
    id: "missing-return",
    language: "javascript",
    difficulty: "easy",
    title: "Function resolves to undefined",
    hint: "The arrow body computes the value but never returns it.",
    broken: `const double = (xs) => {
  xs.map(x => x * 2);
};`,
    solution: `const double = (xs) => {
  return xs.map(x => x * 2);
};`,
  },
  {
    id: "js-loose-equality",
    language: "javascript",
    difficulty: "easy",
    title: "Zero is treated as falsy",
    hint: "Loose equality coerces — 0 == \"\" passes when it shouldn't.",
    broken: `function isZero(n) {
  return n == 0;
}`,
    solution: `function isZero(n) {
  return n === 0;
}`,
  },
  {
    id: "js-var-in-loop",
    language: "javascript",
    difficulty: "normal",
    title: "Every callback prints the same number",
    hint: "var is function-scoped, so the closure captures the final value.",
    broken: `function schedule(n) {
  for (var i = 0; i < n; i++) {
    setTimeout(() => console.log(i), 0);
  }
}`,
    solution: `function schedule(n) {
  for (let i = 0; i < n; i++) {
    setTimeout(() => console.log(i), 0);
  }
}`,
  },
  {
    id: "js-float-compare",
    language: "javascript",
    difficulty: "hard",
    title: "0.1 + 0.2 isn't 0.3",
    hint: "Floating-point equality fails. Compare with a small epsilon.",
    broken: `function isThreeTenths(a, b) {
  return a + b === 0.3;
}`,
    solution: `function isThreeTenths(a, b) {
  return Math.abs((a + b) - 0.3) < 1e-9;
}`,
  },
  {
    id: "js-foreach-async",
    language: "javascript",
    difficulty: "hard",
    title: "forEach doesn't wait",
    hint: "Array.forEach ignores returned promises. Switch the loop.",
    broken: `async function saveAll(items, save) {
  items.forEach(async (it) => {
    await save(it);
  });
}`,
    solution: `async function saveAll(items, save) {
  for (const it of items) {
    await save(it);
  }
}`,
  },
  {
    id: "py-is-none",
    language: "python",
    difficulty: "easy",
    title: "Null check fails on edge cases",
    hint: "None should be compared with identity, not equality.",
    broken: `def greet(name):
    if name == None:
        return "hi, stranger"
    return "hi, " + name`,
    solution: `def greet(name):
    if name is None:
        return "hi, stranger"
    return "hi, " + name`,
  },
  {
    id: "py-range-off-by-one",
    language: "python",
    difficulty: "easy",
    title: "First element is skipped",
    hint: "range(1, n) starts at 1. We want to include index 0.",
    broken: `def total(nums):
    s = 0
    for i in range(1, len(nums)):
        s += nums[i]
    return s`,
    solution: `def total(nums):
    s = 0
    for i in range(len(nums)):
        s += nums[i]
    return s`,
  },
  {
    id: "py-print-vs-return",
    language: "python",
    difficulty: "easy",
    title: "Caller always gets None",
    hint: "The function prints the value instead of returning it.",
    broken: `def double(x):
    print(x * 2)`,
    solution: `def double(x):
    return x * 2`,
  },
  {
    id: "py-late-binding",
    language: "python",
    difficulty: "normal",
    title: "Every lambda returns the same number",
    hint: "Late binding: the closure captures i by name, not by value.",
    broken: `def make_callbacks(n):
    return [lambda: i for i in range(n)]`,
    solution: `def make_callbacks(n):
    return [lambda i=i: i for i in range(n)]`,
  },
  {
    id: "py-dict-keyerror",
    language: "python",
    difficulty: "normal",
    title: "Missing key crashes the function",
    hint: "Subscripting raises KeyError. Use .get with a default.",
    broken: `def get_count(d, key):
    return d[key]`,
    solution: `def get_count(d, key):
    return d.get(key, 0)`,
  },
  {
    id: "py-shallow-copy",
    language: "python",
    difficulty: "normal",
    title: "Original list mutates unexpectedly",
    hint: "b = a aliases the same list. You need a copy.",
    broken: `def with_extra(a, item):
    b = a
    b.append(item)
    return b`,
    solution: `def with_extra(a, item):
    b = list(a)
    b.append(item)
    return b`,
  },
  {
    id: "py-iterator-exhausted",
    language: "python",
    difficulty: "hard",
    title: "Second pass sees nothing",
    hint: "An iterator can only be consumed once. Materialize it.",
    broken: `def summarize(source):
    it = iter(source)
    total = sum(it)
    count = sum(1 for _ in it)
    return total, count`,
    solution: `def summarize(source):
    items = list(source)
    total = sum(items)
    count = len(items)
    return total, count`,
  },
  {
    id: "js-array-reverse-mutates",
    language: "javascript",
    difficulty: "easy",
    title: "Caller's array is silently flipped",
    hint: "Array.reverse mutates in place. Copy before reversing.",
    broken: `function reversed(arr) {
  return arr.reverse();
}`,
    solution: `function reversed(arr) {
  return [...arr].reverse();
}`,
  },
  {
    id: "js-typeof-null",
    language: "javascript",
    difficulty: "easy",
    title: "Null sneaks past the object guard",
    hint: "typeof null is \"object\". Add an explicit null check.",
    broken: `function isPlainObject(x) {
  return typeof x === "object";
}`,
    solution: `function isPlainObject(x) {
  return typeof x === "object" && x !== null;
}`,
  },
  {
    id: "js-array-sort-numbers",
    language: "javascript",
    difficulty: "normal",
    title: "Sorted numbers come out in the wrong order",
    hint: "Array.sort is lexicographic by default. Pass a comparator.",
    broken: `function ascending(nums) {
  return nums.sort();
}`,
    solution: `function ascending(nums) {
  return nums.sort((a, b) => a - b);
}`,
  },
  {
    id: "js-promise-then-no-return",
    language: "javascript",
    difficulty: "normal",
    title: "Next then receives undefined",
    hint: "The .then callback computes but never returns.",
    broken: `function load(fetchUser, id) {
  return fetchUser(id).then(u => {
    u.fullName;
  });
}`,
    solution: `function load(fetchUser, id) {
  return fetchUser(id).then(u => {
    return u.fullName;
  });
}`,
  },
  {
    id: "js-this-in-setinterval",
    language: "javascript",
    difficulty: "hard",
    title: "this is undefined inside the tick",
    hint: "function() rebinds this. Use an arrow.",
    broken: `class Clock {
  start() {
    setInterval(function () {
      this.tick();
    }, 1000);
  }
}`,
    solution: `class Clock {
  start() {
    setInterval(() => {
      this.tick();
    }, 1000);
  }
}`,
  },
  {
    id: "js-json-parse-date",
    language: "javascript",
    difficulty: "hard",
    title: "Parsed dates come back as strings",
    hint: "JSON.parse doesn't rehydrate Date objects. Use a reviver.",
    broken: `function parseEvent(raw) {
  return JSON.parse(raw);
}`,
    solution: `function parseEvent(raw) {
  return JSON.parse(raw, (key, value) => {
    if (key === "at") return new Date(value);
    return value;
  });
}`,
  },
  {
    id: "py-is-vs-eq-string",
    language: "python",
    difficulty: "easy",
    title: "Identity check unreliable for strings",
    hint: "Use == for string value comparison, not is.",
    broken: `def is_hello(s):
    return s is "hello"`,
    solution: `def is_hello(s):
    return s == "hello"`,
  },
  {
    id: "py-string-plus-int",
    language: "python",
    difficulty: "easy",
    title: "Concatenation crashes when n is a number",
    hint: "Python won't coerce int to str. Convert explicitly.",
    broken: `def label(n):
    return "count: " + n`,
    solution: `def label(n):
    return "count: " + str(n)`,
  },
  {
    id: "py-list-index-missing",
    language: "python",
    difficulty: "normal",
    title: "Missing item crashes with ValueError",
    hint: "list.index raises when the item is absent. Guard first.",
    broken: `def position(xs, x):
    return xs.index(x)`,
    solution: `def position(xs, x):
    if x in xs:
        return xs.index(x)
    return -1`,
  },
  {
    id: "py-modify-while-iterating",
    language: "python",
    difficulty: "normal",
    title: "Some items survive the filter",
    hint: "Don't mutate a list while iterating it. Iterate a copy.",
    broken: `def drop_negatives(xs):
    for x in xs:
        if x < 0:
            xs.remove(x)
    return xs`,
    solution: `def drop_negatives(xs):
    for x in xs[:]:
        if x < 0:
            xs.remove(x)
    return xs`,
  },
  {
    id: "py-class-var-shared",
    language: "python",
    difficulty: "hard",
    title: "Instances share the same list",
    hint: "Class-level mutables are shared. Initialize in __init__.",
    broken: `class Box:
    items = []
    def add(self, x):
        self.items.append(x)`,
    solution: `class Box:
    def __init__(self):
        self.items = []
    def add(self, x):
        self.items.append(x)`,
  },
  {
    id: "py-shallow-vs-deep-copy",
    language: "python",
    difficulty: "hard",
    title: "Nested edits leak into the copy",
    hint: "copy.copy is shallow. Use copy.deepcopy for nested structures.",
    broken: `import copy

def snapshot(state):
    return copy.copy(state)`,
    solution: `import copy

def snapshot(state):
    return copy.deepcopy(state)`,
  },
  // ===== TypeScript =====
  {
    id: "ts-non-null-assertion",
    language: "typescript",
    difficulty: "easy",
    title: "Bang silences a real problem",
    hint: "Optional chaining is safer than a non-null assertion here.",
    broken: `function username(user?: { name: string }): string {
  return user!.name;
}`,
    solution: `function username(user?: { name: string }): string {
  return user?.name;
}`,
  },
  {
    id: "ts-narrow-typeof-null",
    language: "typescript",
    difficulty: "easy",
    title: "Null sneaks past the object guard",
    hint: "typeof null is \"object\". Add an explicit check.",
    broken: `function isRecord(x: unknown): boolean {
  return typeof x === "object";
}`,
    solution: `function isRecord(x: unknown): boolean {
  return typeof x === "object" && x !== null;
}`,
  },
  {
    id: "ts-array-find-undefined",
    language: "typescript",
    difficulty: "normal",
    title: "Find result might be undefined",
    hint: "Array.find returns T | undefined. Guard before use.",
    broken: `function nameOf(users: { id: number; name: string }[], id: number): string {
  const u = users.find(x => x.id === id);
  return u.name;
}`,
    solution: `function nameOf(users: { id: number; name: string }[], id: number): string {
  const u = users.find(x => x.id === id);
  if (!u) return "";
  return u.name;
}`,
  },
  {
    id: "ts-as-cast-vs-narrow",
    language: "typescript",
    difficulty: "normal",
    title: "Cast hides a real check",
    hint: "Narrow with the in operator instead of casting.",
    broken: `type A = { kind: "a"; foo: string };
type B = { kind: "b"; bar: number };

function describe(v: A | B): string {
  return (v as A).foo;
}`,
    solution: `type A = { kind: "a"; foo: string };
type B = { kind: "b"; bar: number };

function describe(v: A | B): string {
  if (v.kind === "a") return v.foo;
  return "";
}`,
  },
  {
    id: "ts-readonly-mutation",
    language: "typescript",
    difficulty: "hard",
    title: "Cannot mutate a readonly array",
    hint: "Copy the readonly input before mutating.",
    broken: `function appended(xs: readonly number[], x: number): number[] {
  xs.push(x);
  return xs;
}`,
    solution: `function appended(xs: readonly number[], x: number): number[] {
  const out = [...xs];
  out.push(x);
  return out;
}`,
  },
  {
    id: "ts-never-return-type",
    language: "typescript",
    difficulty: "hard",
    title: "Return type infers as never",
    hint: "Annotate the return type explicitly so the empty branch is allowed.",
    broken: `function first<T>(xs: T[]) {
  for (const x of xs) {
    return x;
  }
}`,
    solution: `function first<T>(xs: T[]): T | undefined {
  for (const x of xs) {
    return x;
  }
}`,
  },
  // ===== C++ =====
  {
    id: "cpp-assignment-in-if",
    language: "cpp",
    difficulty: "easy",
    title: "Assignment, not comparison",
    hint: "= assigns, == compares.",
    broken: `bool isZero(int x) {
  if (x = 0) {
    return true;
  }
  return false;
}`,
    solution: `bool isZero(int x) {
  if (x == 0) {
    return true;
  }
  return false;
}`,
  },
  {
    id: "cpp-vector-bracket-vs-at",
    language: "cpp",
    difficulty: "easy",
    title: "Index access is unchecked",
    hint: "Use .at() to throw on out-of-range instead of undefined behavior.",
    broken: `int safeGet(const std::vector<int>& v, size_t i) {
  return v[i];
}`,
    solution: `int safeGet(const std::vector<int>& v, size_t i) {
  return v.at(i);
}`,
  },
  {
    id: "cpp-pass-string-by-value",
    language: "cpp",
    difficulty: "normal",
    title: "String is copied on every call",
    hint: "Pass strings by const reference.",
    broken: `void greet(std::string name) {
  std::cout << "hi " << name;
}`,
    solution: `void greet(const std::string& name) {
  std::cout << "hi " << name;
}`,
  },
  {
    id: "cpp-cout-no-flush",
    language: "cpp",
    difficulty: "normal",
    title: "Output never appears",
    hint: "std::endl flushes; \"\\n\" alone may buffer.",
    broken: `void report(int n) {
  std::cout << "count=" << n;
}`,
    solution: `void report(int n) {
  std::cout << "count=" << n << std::endl;
}`,
  },
  {
    id: "cpp-dangling-reference",
    language: "cpp",
    difficulty: "hard",
    title: "Returning a reference to a local",
    hint: "Return by value, not by reference.",
    broken: `const std::string& greeting() {
  std::string s = "hello";
  return s;
}`,
    solution: `std::string greeting() {
  std::string s = "hello";
  return s;
}`,
  },
  {
    id: "cpp-erase-during-iteration",
    language: "cpp",
    difficulty: "hard",
    title: "Iterator invalidated after erase",
    hint: "erase returns the next valid iterator. Use it.",
    broken: `void dropZeros(std::vector<int>& v) {
  for (auto it = v.begin(); it != v.end(); ++it) {
    if (*it == 0) {
      v.erase(it);
    }
  }
}`,
    solution: `void dropZeros(std::vector<int>& v) {
  for (auto it = v.begin(); it != v.end(); ) {
    if (*it == 0) {
      it = v.erase(it);
    } else {
      ++it;
    }
  }
}`,
  },
  // ===== C# =====
  {
    id: "cs-int-division",
    language: "csharp",
    difficulty: "easy",
    title: "Integer division loses the fraction",
    hint: "Cast one operand to double to force floating-point division.",
    broken: `double Half(int n) {
    return n / 2;
}`,
    solution: `double Half(int n) {
    return n / 2.0;
}`,
  },
  {
    id: "cs-null-method-call",
    language: "csharp",
    difficulty: "easy",
    title: "NullReferenceException waiting to happen",
    hint: "Use the null-conditional operator.",
    broken: `string Label(object obj) {
    return obj.ToString();
}`,
    solution: `string Label(object obj) {
    return obj?.ToString();
}`,
  },
  {
    id: "cs-async-void",
    language: "csharp",
    difficulty: "normal",
    title: "async void breaks await",
    hint: "Use async Task so callers can await.",
    broken: `async void Save(Stream s) {
    await s.FlushAsync();
}`,
    solution: `async Task Save(Stream s) {
    await s.FlushAsync();
}`,
  },
  {
    id: "cs-linq-deferred",
    language: "csharp",
    difficulty: "normal",
    title: "Deferred LINQ changes after the call",
    hint: "Materialize with ToList so the query is evaluated once.",
    broken: `IEnumerable<int> Positives(IEnumerable<int> xs) {
    return xs.Where(x => x > 0);
}`,
    solution: `IEnumerable<int> Positives(IEnumerable<int> xs) {
    return xs.Where(x => x > 0).ToList();
}`,
  },
  {
    id: "cs-using-missing",
    language: "csharp",
    difficulty: "hard",
    title: "Stream is never disposed",
    hint: "Wrap with using so it's disposed on exit.",
    broken: `void Write(string path, string text) {
    var f = new StreamWriter(path);
    f.Write(text);
}`,
    solution: `void Write(string path, string text) {
    using var f = new StreamWriter(path);
    f.Write(text);
}`,
  },
  {
    id: "cs-result-deadlock",
    language: "csharp",
    difficulty: "hard",
    title: ".Result deadlocks under sync context",
    hint: "Await the task instead of blocking on .Result.",
    broken: `async Task<int> Total(Task<int> a, Task<int> b) {
    return a.Result + b.Result;
}`,
    solution: `async Task<int> Total(Task<int> a, Task<int> b) {
    return await a + await b;
}`,
  },
  // ===== Ruby =====
  {
    id: "rb-nil-empty",
    language: "ruby",
    difficulty: "easy",
    title: "empty? crashes on nil",
    hint: "Guard against nil before calling empty?.",
    broken: `def blank?(s)
  s.empty?
end`,
    solution: `def blank?(s)
  s.nil? || s.empty?
end`,
  },
  {
    id: "rb-puts-vs-return",
    language: "ruby",
    difficulty: "easy",
    title: "Caller always gets nil",
    hint: "puts prints and returns nil; return the value instead.",
    broken: `def double(x)
  puts x * 2
end`,
    solution: `def double(x)
  x * 2
end`,
  },
  {
    id: "rb-each-vs-map",
    language: "ruby",
    difficulty: "normal",
    title: "each returns the original array",
    hint: "map returns a new array of transformed values.",
    broken: `def doubled(xs)
  xs.each { |x| x * 2 }
end`,
    solution: `def doubled(xs)
  xs.map { |x| x * 2 }
end`,
  },
  {
    id: "rb-single-quote-interp",
    language: "ruby",
    difficulty: "normal",
    title: "Interpolation doesn't fire",
    hint: "Single quotes are literal. Use double quotes.",
    broken: `def greet(name)
  'hello #{name}'
end`,
    solution: `def greet(name)
  "hello #{name}"
end`,
  },
  {
    id: "rb-frozen-mutation",
    language: "ruby",
    difficulty: "hard",
    title: "Cannot modify a frozen string",
    hint: "Duplicate the string before mutating.",
    broken: `def shout(s)
  s << "!"
end`,
    solution: `def shout(s)
  s.dup << "!"
end`,
  },
  {
    id: "rb-yield-no-block",
    language: "ruby",
    difficulty: "hard",
    title: "yield with no block raises",
    hint: "Guard with block_given? before yielding.",
    broken: `def maybe
  yield
end`,
    solution: `def maybe
  yield if block_given?
end`,
  },
];
