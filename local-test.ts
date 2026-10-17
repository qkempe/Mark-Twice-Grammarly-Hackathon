// Local checks for val.ts, using in-memory storage instead of Val Town blob.
// Run: deno test local-test.ts

import { handle, memoryStorage } from "./val.ts";

const BASE = "https://example.web.val.run";

function assertEquals(actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`expected ${e}\n     got ${a}`);
}

async function call(storage: ReturnType<typeof memoryStorage>, method: string, path: string, body?: unknown) {
  const res = await handle(
    new Request(BASE + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
    storage,
  );
  return { status: res.status, body: await res.json() };
}

Deno.test("empty label returns the exact shape from the plan", async () => {
  const s = memoryStorage();
  const res = await call(s, "GET", "/marks?label=test");
  assertEquals(res.body, { label: "test", count: 0, examples: [] });
});

Deno.test("record, dedupe, normalize label", async () => {
  const s = memoryStorage();
  const mark = { label: "Comma Splice", excerpt: "I was tired, I went to bed.", comment: "use a period" };
  assertEquals((await call(s, "POST", "/marks", mark)).body.count, 1);

  // Same sentence again (different spacing/case) does not double count.
  const dup = await call(s, "POST", "/marks", { ...mark, excerpt: "  i was tired,  I went to bed. " });
  assertEquals([dup.body.count, dup.body.duplicate], [1, true]);

  await call(s, "POST", "/marks", { ...mark, excerpt: "It rained, we stayed in." });
  const got = await call(s, "GET", "/marks?label=comma%20splice");
  assertEquals(got.body.count, 2);
  assertEquals(got.body.examples[0].comment, "use a period");
});

Deno.test("labels and reset", async () => {
  const s = memoryStorage();
  await call(s, "POST", "/marks", { label: "comma splice", excerpt: "a, b.", comment: "use a period" });
  await call(s, "POST", "/marks", { label: "vague pronoun", excerpt: "This is bad.", comment: "this what?" });
  assertEquals((await call(s, "GET", "/labels")).body.labels.length, 2);

  await call(s, "POST", "/reset?label=vague%20pronoun");
  assertEquals((await call(s, "GET", "/labels")).body.labels.map((l: { label: string }) => l.label), ["comma splice"]);

  await call(s, "POST", "/reset");
  assertEquals((await call(s, "GET", "/marks?label=comma%20splice")).body.count, 0);
});

Deno.test("bad input", async () => {
  const s = memoryStorage();
  assertEquals((await call(s, "GET", "/marks")).status, 400);
  assertEquals((await call(s, "POST", "/marks", { label: "x" })).status, 400);
  assertEquals((await call(s, "GET", "/nope")).status, 404);
});

Deno.test("scan finds every mark and the sentence before it", async () => {
  const s = memoryStorage();
  const text = `Why Students Should Learn to Cook

Cooking is a skill every student will need, few schools teach it. {comma splice: use a period} This leaves many teens unprepared. {vague pronoun: this what?}

Students who cook at home eat more vegetables, they also spend less on fast food. {comma splice: use a period} This saves families money. {vague pronoun: this what?}

School starts at 7:30, many students wake up before six. {comma splice: use a period}`;
  const res = await call(s, "POST", "/scan", { text });
  assertEquals(res.body.found, 5);
  assertEquals(res.body.counts, { "comma splice": 3, "vague pronoun": 2 });

  const cs = await call(s, "GET", "/marks?label=comma%20splice");
  assertEquals(cs.body.examples.map((e: { excerpt: string }) => e.excerpt), [
    "Cooking is a skill every student will need, few schools teach it.",
    "Students who cook at home eat more vegetables, they also spend less on fast food.",
    "School starts at 7:30, many students wake up before six.",
  ]);
  const vp = await call(s, "GET", "/marks?label=vague%20pronoun");
  assertEquals(vp.body.examples.map((e: { excerpt: string }) => e.excerpt), [
    "This leaves many teens unprepared.",
    "This saves families money.",
  ]);

  // Scanning the same text again adds nothing.
  const again = await call(s, "POST", "/scan", { text });
  assertEquals([again.body.added, again.body.counts["comma splice"]], [0, 3]);
});
