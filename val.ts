// Mark Twice backend: a Val Town HTTP val that remembers a teacher's marks.
//
// Routes
//   GET  /                     health check
//   GET  /marks?label=X        -> {"label":"x","count":N,"examples":[...]}
//   POST /marks                body {"label","excerpt","comment"} -> records one mark
//   GET  /labels               -> {"labels":[{"label","count","comment"}]}
//   POST /scan                 body {"text"} -> finds and records every {label: comment} mark
//   POST /reset[?label=X]      clears one label, or everything
//
// Deploy: create a new HTTP val on val.town and paste this whole file in.

export interface Mark {
  excerpt: string;
  comment: string;
  at: string;
}

export type MarkStore = Record<string, Mark[]>;

export interface Storage {
  load(): Promise<MarkStore>;
  save(data: MarkStore): Promise<void>;
}

const BLOB_KEY = "mark-twice-marks";

// Val Town blob storage. Imported lazily so the file also runs locally.
function blobStorage(): Storage {
  // Scoped blob storage (Val Town's default for new vals).
  const BLOB_MODULE = "https://esm.town/v/std/blob/main.ts";
  let blobPromise: Promise<any> | undefined;
  const getBlob = () => (blobPromise ??= import(BLOB_MODULE).then((m) => m.blob));
  return {
    async load() {
      const blob = await getBlob();
      return ((await blob.getJSON(BLOB_KEY)) as MarkStore) ?? {};
    },
    async save(data) {
      const blob = await getBlob();
      await blob.setJSON(BLOB_KEY, data);
    },
  };
}

export function memoryStorage(): Storage {
  let data: MarkStore = {};
  return {
    load: async () => structuredClone(data),
    save: async (d) => {
      data = structuredClone(d);
    },
  };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// "Comma Splice " and "comma splice" are the same label.
export function normalizeLabel(label: string | null | undefined): string {
  return (label ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Used to spot the same sentence recorded twice.
function normalizeExcerpt(excerpt: string): string {
  return excerpt.trim().toLowerCase().replace(/\s+/g, " ");
}

// Finds every {label: comment} mark in a block of text, along with the sentence right before it.
export function extractMarks(text: string): { label: string; excerpt: string; comment: string }[] {
  const found: { label: string; excerpt: string; comment: string }[] = [];
  const markPattern = /\{([^{}:]+):([^{}]*)\}/g;
  for (const match of text.matchAll(markPattern)) {
    const before = text.slice(0, match.index).replace(/\s+$/, "");
    // The sentence starts after the previous sentence end, mark, or line break.
    const head = before.slice(0, -1);
    let start = Math.max(head.lastIndexOf("\n"), head.lastIndexOf("}"));
    for (const end of head.matchAll(/[.!?]["')\]]?\s/g)) {
      start = Math.max(start, end.index! + end[0].length - 1);
    }
    const excerpt = before.slice(start + 1).trim();
    const label = normalizeLabel(match[1]);
    if (label && excerpt) found.push({ label, excerpt, comment: match[2].trim() });
  }
  return found;
}

export async function handle(req: Request, storage: Storage): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/" && req.method === "GET") {
    return json({ ok: true, service: "mark-twice", routes: ["/marks", "/labels", "/scan", "/reset"] });
  }

  if (path === "/marks" && req.method === "GET") {
    const label = normalizeLabel(url.searchParams.get("label"));
    if (!label) return json({ error: "label is required" }, 400);
    const examples = (await storage.load())[label] ?? [];
    return json({ label, count: examples.length, examples });
  }

  if (path === "/marks" && req.method === "POST") {
    let body: { label?: string; excerpt?: string; comment?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "body must be JSON" }, 400);
    }
    const label = normalizeLabel(body.label);
    const excerpt = (body.excerpt ?? "").trim();
    const comment = (body.comment ?? "").trim();
    if (!label || !excerpt) return json({ error: "label and excerpt are required" }, 400);

    const data = await storage.load();
    const examples = data[label] ?? [];
    const duplicate = examples.some((m) => normalizeExcerpt(m.excerpt) === normalizeExcerpt(excerpt));
    if (!duplicate) {
      examples.push({ excerpt, comment, at: new Date().toISOString() });
      data[label] = examples;
      await storage.save(data);
    }
    return json({ ok: true, label, count: examples.length, duplicate });
  }

  if (path === "/scan" && req.method === "POST") {
    let body: { text?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "body must be JSON" }, 400);
    }
    const marks = extractMarks(body.text ?? "");
    const data = await storage.load();
    let added = 0;
    for (const { label, excerpt, comment } of marks) {
      const examples = data[label] ?? [];
      if (!examples.some((m) => normalizeExcerpt(m.excerpt) === normalizeExcerpt(excerpt))) {
        examples.push({ excerpt, comment, at: new Date().toISOString() });
        data[label] = examples;
        added++;
      }
    }
    if (added) await storage.save(data);
    const counts = Object.fromEntries([...new Set(marks.map((m) => m.label))].map((l) => [l, data[l].length]));
    return json({ ok: true, found: marks.length, added, counts });
  }

  if (path === "/labels" && req.method === "GET") {
    const data = await storage.load();
    const labels = Object.entries(data).map(([label, marks]) => ({
      label,
      count: marks.length,
      comment: marks[marks.length - 1]?.comment ?? "",
    }));
    return json({ labels });
  }

  if (path === "/reset" && req.method === "POST") {
    const label = normalizeLabel(url.searchParams.get("label"));
    const data = label ? { ...(await storage.load()) } : {};
    if (label) delete data[label];
    await storage.save(data);
    return json({ ok: true, cleared: label || "all" });
  }

  return json({ error: `no route for ${req.method} ${path}` }, 404);
}

const storage = blobStorage();

export default async function (req: Request): Promise<Response> {
  return handle(req, storage);
}
