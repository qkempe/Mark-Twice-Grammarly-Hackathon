// Local checks for pack.ts: runs the SDK's upload validation, then executes
// each formula with its fetcher wired straight to val.ts (in-memory storage).
// Run: deno test -A --unsafe-proto pack-test.ts

import { pack } from "./pack.ts";
import { handle, memoryStorage } from "./val.ts";
import { compilePackMetadata } from "npm:@codahq/packs-sdk@1.18.3/dist/helpers/metadata.js";
import { validatePackVersionMetadata } from "npm:@codahq/packs-sdk@1.18.3/dist/testing/upload_validation.js";
import { executeFormulaFromPackDef, newMockExecutionContext } from "npm:@codahq/packs-sdk@1.18.3/dist/development.js";

function assertEquals(actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`expected ${e}\n     got ${a}`);
}

// A context whose fetcher calls val.ts directly, recording each request.
function contextWithBackend() {
  const storage = memoryStorage();
  const requests: { method: string; url: string; cacheTtlSecs?: number }[] = [];
  const context = newMockExecutionContext();
  // deno-lint-ignore no-explicit-any
  context.fetcher.fetch = (async (req: any) => {
    requests.push({ method: req.method, url: req.url, cacheTtlSecs: req.cacheTtlSecs });
    const res = await handle(new Request(req.url, { method: req.method, headers: req.headers, body: req.body }), storage);
    return { status: res.status, headers: {}, body: await res.json() };
  }) as typeof context.fetcher.fetch;
  return { context, requests };
}

Deno.test("pack metadata passes SDK upload validation", async () => {
  // pack.new assigns the version on Build; give it one here.
  // deno-lint-ignore no-explicit-any
  const metadata = compilePackMetadata({ ...pack, version: "1.0.0" } as any);
  await validatePackVersionMetadata(metadata, "1.18.3");
});

Deno.test("formulas round-trip through the backend", async () => {
  const { context, requests } = contextWithBackend();
  const run = (name: string, params: unknown[]) =>
    // deno-lint-ignore no-explicit-any
    executeFormulaFromPackDef(pack, name, params as any, context);

  // The SDK normalizes property names to PascalCase on output.
  assertEquals(await run("GetMarks", ["comma splice"]), { Label: "comma splice", Count: 0, Examples: [] });

  const first = await run("RecordMark", ["comma splice", "I was tired, I went to bed.", "use a period"]);
  assertEquals([first.Count, first.Duplicate], [1, false]);
  const again = await run("RecordMark", ["comma splice", "I was tired, I went to bed.", "use a period"]);
  assertEquals(again.Duplicate, true);
  await run("RecordMark", ["comma splice", "It rained, we stayed in.", "use a period"]);

  const marks = await run("GetMarks", ["comma splice"]);
  assertEquals(marks.Count, 2);

  const labels = await run("ListLabels", []);
  assertEquals(labels.length, 1);

  assertEquals(await run("ResetMarks", ["comma splice"]), "Cleared: comma splice");
  assertEquals((await run("GetMarks", ["comma splice"])).Count, 0);

  const saved = await run("SaveMarks", [
    "It rained, we stayed in. {comma splice: use a period} This is bad. {vague pronoun: this what?}",
  ]);
  assertEquals([saved.Found, saved.Added, saved.Summary], [2, 2, "comma splice: 1, vague pronoun: 1"]);

  // GETs must never be cached, or "track my marks" shows a stale count.
  for (const r of requests.filter((r) => r.method === "GET")) assertEquals(r.cacheTtlSecs, 0);
  console.log(JSON.stringify(marks, null, 2));
});
