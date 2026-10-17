// Mark Twice: a Superhuman Go connector (Packs SDK).
// Mark an error twice by hand; Go learns the pattern and marks the rest.
//
// Setup: paste this file into pack.new ("Start with an empty Pack"), then edit
// the ONE line below to your val's hostname (no https://, no trailing slash),
// e.g. "yourname--0123abcd.web.val.run". Click Build.

import * as sdk from "@codahq/packs-sdk";

const VAL_HOST = "YOUR-VAL-HOSTNAME.web.val.run";

const API = `https://${VAL_HOST}`;

export const pack = sdk.newPack();

// Full hostname, because val.run and web.val.run are public suffixes.
pack.addNetworkDomain(VAL_HOST);

// ---------------------------------------------------------------------------
// Schemas

const ExampleSchema = sdk.makeObjectSchema({
  properties: {
    excerpt: { type: sdk.ValueType.String, description: "The sentence the teacher marked." },
    comment: { type: sdk.ValueType.String, description: "The teacher's comment on that sentence." },
  },
  displayProperty: "excerpt",
});

const MarksSchema = sdk.makeObjectSchema({
  properties: {
    label: { type: sdk.ValueType.String },
    count: { type: sdk.ValueType.Number, description: "How many times the teacher has marked this error." },
    examples: { type: sdk.ValueType.Array, items: ExampleSchema },
  },
  displayProperty: "label",
});

const RecordResultSchema = sdk.makeObjectSchema({
  properties: {
    label: { type: sdk.ValueType.String },
    count: { type: sdk.ValueType.Number, description: "Total marks saved for this label after recording." },
    duplicate: { type: sdk.ValueType.Boolean, description: "True if this exact sentence was already saved." },
  },
  displayProperty: "label",
});

const LabelSchema = sdk.makeObjectSchema({
  properties: {
    label: { type: sdk.ValueType.String },
    count: { type: sdk.ValueType.Number },
    comment: { type: sdk.ValueType.String, description: "The most recent comment used with this label." },
  },
  displayProperty: "label",
});

// ---------------------------------------------------------------------------
// Formulas (tools Go can call)

const labelParam = sdk.makeParameter({
  type: sdk.ParameterType.String,
  name: "label",
  description: "The error label, e.g. \"comma splice\".",
  instructions: `
    The part of the teacher's mark before the colon. In {comma splice: use a period}
    the label is "comma splice". Lowercase, no braces.
  `,
});

pack.addFormula({
  name: "RecordMark",
  description: "Saves one of the teacher's marks so Mark Twice can learn the pattern.",
  instructions: `
    Call once for every teacher mark of the form {label: comment} in the text.
    Pass the sentence the mark is attached to as the excerpt.
    Recording the same sentence twice is safe; it will not be double counted.
  `,
  parameters: [
    labelParam,
    sdk.makeParameter({
      type: sdk.ParameterType.String,
      name: "excerpt",
      description: "The sentence the mark applies to.",
      instructions: `
        The complete sentence immediately before the mark, copied exactly,
        without the {label: comment} mark itself.
      `,
    }),
    sdk.makeParameter({
      type: sdk.ParameterType.String,
      name: "comment",
      description: "The teacher's comment, e.g. \"use a period\".",
      instructions: "The part of the mark after the colon, trimmed.",
    }),
  ],
  resultType: sdk.ValueType.Object,
  schema: RecordResultSchema,
  isAction: true,
  execute: async function ([label, excerpt, comment], context) {
    const response = await context.fetcher.fetch({
      method: "POST",
      url: `${API}/marks`,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, excerpt, comment }),
    });
    const { count, duplicate } = response.body;
    return { label: response.body.label, count, duplicate };
  },
});

const SaveResultSchema = sdk.makeObjectSchema({
  properties: {
    found: { type: sdk.ValueType.Number, description: "How many {label: comment} marks were in the text." },
    added: { type: sdk.ValueType.Number, description: "How many of them were new." },
    summary: { type: sdk.ValueType.String, description: "Saved count per label, e.g. \"comma splice: 2\"." },
  },
  displayProperty: "summary",
});

pack.addFormula({
  name: "SaveMarks",
  description: "Saves every teacher mark in the document in one call.",
  instructions: `
    The fastest way to save marks: call this ONCE with the document text and it
    finds and saves every {label: comment} mark and the sentence before it.
    Use it instead of calling RecordMark many times.
  `,
  parameters: [
    sdk.makeParameter({
      type: sdk.ParameterType.String,
      name: "text",
      description: "The document text containing the teacher's marks.",
      instructions: `
        Copy the text exactly. At minimum include every paragraph that contains a
        {label: comment} mark; the whole document is fine too.
      `,
    }),
  ],
  resultType: sdk.ValueType.Object,
  schema: SaveResultSchema,
  // Not an action: Go's background (while-writing) runs can't run actions. Caching off so
  // every call reaches the backend; saving the same text twice is harmless.
  cacheTtlSecs: 0,
  execute: async function ([text], context) {
    const response = await context.fetcher.fetch({
      method: "POST",
      url: `${API}/scan`,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const { found, added, counts } = response.body;
    const summary = Object.entries(counts as Record<string, number>)
      .map(([label, count]) => `${label}: ${count}`)
      .join(", ");
    return { found, added, summary: summary || "no marks found" };
  },
});

pack.addFormula({
  name: "GetMarks",
  description: "Gets how many times the teacher has marked an error, with their example sentences.",
  instructions: `
    Use after recording marks to get the up-to-date count, and before marking
    the rest of a paper to load the teacher's example sentences for that label.
  `,
  parameters: [labelParam],
  resultType: sdk.ValueType.Object,
  schema: MarksSchema,
  // Counts change as marks are recorded, so never serve a cached result.
  cacheTtlSecs: 0,
  execute: async function ([label], context) {
    const response = await context.fetcher.fetch({
      method: "GET",
      url: sdk.withQueryParams(`${API}/marks`, { label }),
      cacheTtlSecs: 0,
    });
    const body = response.body;
    return {
      label: body.label,
      count: body.count,
      examples: body.examples.map((e: { excerpt: string; comment: string }) => ({
        excerpt: e.excerpt,
        comment: e.comment,
      })),
    };
  },
});

pack.addFormula({
  name: "ListLabels",
  description: "Lists every error label the teacher has marked so far, with counts.",
  instructions: `
    Use when the teacher asks what they have marked, or names an error loosely
    (e.g. "splices") and you need the exact saved label.
  `,
  parameters: [],
  resultType: sdk.ValueType.Array,
  items: LabelSchema,
  cacheTtlSecs: 0,
  execute: async function ([], context) {
    const response = await context.fetcher.fetch({
      method: "GET",
      url: `${API}/labels`,
      cacheTtlSecs: 0,
    });
    return response.body.labels;
  },
});

pack.addFormula({
  name: "ResetMarks",
  description: "Forgets the teacher's saved marks for one label, or all of them.",
  instructions: "Only call when the teacher explicitly asks to reset, clear, or forget marks.",
  parameters: [
    sdk.makeParameter({
      type: sdk.ParameterType.String,
      name: "label",
      description: "Label to clear. Leave empty to clear everything.",
      optional: true,
    }),
  ],
  resultType: sdk.ValueType.String,
  isAction: true,
  execute: async function ([label], context) {
    const url = label ? sdk.withQueryParams(`${API}/reset`, { label }) : `${API}/reset`;
    const response = await context.fetcher.fetch({ method: "POST", url });
    return `Cleared: ${response.body.cleared}`;
  },
});

// ---------------------------------------------------------------------------
// Skills

const MARK_FORMAT = `
The user is a teacher grading student writing. A teacher mark looks like
{label: comment}, typed inline right after the sentence it applies to, e.g.
"Most teens need nine hours, they get seven. {comma splice: use a period}"
Here the label is "comma splice", the comment is "use a period", and the
marked sentence is "Most teens need nine hours, they get seven."
`;

const MARKING_RULES = `
How to mark the rest of the paper for one label:

1. Call GetMarks with the label to load the teacher's example sentences and
   comment. If the count is 0, tell the teacher to mark it by hand at least
   twice first, and stop. If you are unsure of the exact label, call ListLabels.

2. Read EVERY paragraph on screen, through the last one. Split each paragraph
   into sentences and check each sentence on its own, including short ones.
   Decide whether it has the SAME error as the teacher's examples. Use the
   label, the comment, and the examples to understand the error. Skip any
   sentence that already has a {...} mark after it. Before finishing, go back
   over the final paragraph once more; errors there are easy to miss.

3. Precision matters more than recall. A teacher would rather miss one than
   get a wrong mark. If you are not sure, do not flag it.

   For "comma splice" specifically, flag a sentence ONLY if two independent
   clauses (each has its own subject and verb and could stand alone as a
   sentence) are joined by nothing but a comma. Do NOT flag:
   - Comma + coordinating conjunction: "Sleep affects memory, and memory
     affects learning." (for, and, nor, but, or, yet, so)
   - A dependent clause before the comma: "When students sleep more, they miss
     fewer classes." (when, if, because, although, since, while, after,
     before, unless, as)
   - "however", "therefore", etc. used correctly after a semicolon or period:
     "Some schools tried later start times; however, change is slow."
   - Introductory phrases, lists, appositives, or quotations.
   DO flag "however", "therefore", etc. joining two clauses with only commas:
   "It was late, however, we kept going."
   DO flag short ones too. Length doesn't matter: "These problems are real,
   they can be solved." and "It rained, we stayed in." are comma splices.
   Test: replace the comma with a period. If both halves are complete
   sentences and there is no conjunction, it's a comma splice.

4. Make ONE call to the Rewrite tool with all suggestions. Use one rewrite per
   paragraph. For each:
   - originalText: the flagged sentence copied exactly. If a paragraph has
     several flagged sentences, use the exact text running from the start of
     the first to the end of the last.
   - replacementText: the same text with " {label: comment}" added right after
     each flagged sentence, using the teacher's label and comment exactly as
     saved (e.g. " {comma splice: use a period}").
     Change NOTHING else. Do not fix the error, reword, or re-punctuate. The
     teacher's mark is the feedback; the student does the fixing.
   - explanation: one short line naming the pattern, e.g. "Two complete
     sentences joined only by a comma, like your marked example."
   - paragraphId: the id of the paragraph containing the text.

   If the Rewrite tool isn't available on this page, list each flagged
   sentence in chat with the mark appended instead, then say "Open this in a
   Google Doc to get these as one-click suggestions."

5. After the Rewrite call, reply in one or two short lines: how many sentences
   you marked, and which look-alike sentences you deliberately skipped (quote
   the first few words of each). Example: "Marked 4 more comma splices.
   Skipped 3 look-alikes: 'When students sleep more...', 'Sleep affects
   memory...', 'Some schools tried...'."
`;

pack.addSkill({
  name: "TrackMarks",
  displayName: "Track my marks",
  description:
    "Learns a teacher's inline grading marks like {comma splice: use a period}. " +
    "Use when the user says \"track my marks\", \"learn my marks\", \"remember these marks\", " +
    "asks what they've marked, or accepts the offer to mark the rest.",
  prompt: `
${MARK_FORMAT}

When the teacher asks you to track their marks:

1. Find every {label: comment} mark in the text on screen.
2. For each one, call RecordMark with the label, the exact sentence right
   before the mark (without the mark), and the comment.
3. For each distinct label, call GetMarks to get the total count.
4. Reply with one short line per label and nothing else:
   - count 2 or more: "You've marked <label> <count> times. Want me to mark the rest?"
   - count 1: "You've marked <label> once. Mark it one more time and I can take it from here."
   Use "times", never a numeral plus "x". Do not rewrite anything yet.

If there are no marks, explain the format in one sentence:
"Type a mark like {comma splice: use a period} right after a sentence, then ask me again."

If the teacher then says yes (or "do it", "go ahead", "mark the rest"), mark
the rest of the paper for that label by following these rules:
${MARKING_RULES}
`,
  tools: [
    { type: sdk.ToolType.Pack },
    {
      type: sdk.ToolType.ScreenAnnotation,
      annotation: { type: sdk.ScreenAnnotationType.Rewrite },
    },
  ],
});

pack.addSkill({
  name: "MarkTheRest",
  displayName: "Mark the rest of this error",
  description:
    "Applies a teacher's saved grading marks to every matching sentence in the paper as suggestions. " +
    "Use when the user says \"mark the rest\", \"mark comma splices\", \"mark <error>\", " +
    "\"grade this paper\", or says yes after being offered to mark the rest.",
  prompt: `
${MARK_FORMAT}

The teacher wants you to apply one of their saved marks across this paper.
Work out which label they mean from their message (e.g. "mark comma splices"
means the label "comma splice"); if they did not name one, call ListLabels and
use the label with the highest count.

${MARKING_RULES}
`,
  tools: [
    { type: sdk.ToolType.Pack },
    {
      type: sdk.ToolType.ScreenAnnotation,
      annotation: { type: sdk.ScreenAnnotationType.Rewrite },
    },
  ],
});
