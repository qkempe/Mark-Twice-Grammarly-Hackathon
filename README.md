# Mark Twice

**Mark an error twice. Superhuman Go marks the rest.**

Teachers write the same comment dozens of times per stack of essays. Mark Twice is a
Superhuman Go agent that watches how a teacher marks a paper and learns the pattern from two
examples. It then suggests the teacher's own mark on every other sentence with the same error,
while the teacher is still grading. Each suggestion is a one-click accept, and look-alike
sentences are left alone.

Track: **Productivity**

## How it works

1. The teacher grades as usual and types an inline mark after a sentence, for example
   `{vague pronoun: this what?}` or `{comma splice: use a period}`. They do it twice.
2. **Without being asked**, Go's "While writing" trigger fires. The Mark Twice agent finds the
   other sentences with the same error and underlines them. Each suggestion appends the
   teacher's exact mark and leaves the student's sentence untouched. The teacher accepts each
   one with a click.
3. Look-alikes are skipped on purpose. "This concern is understandable" isn't a vague pronoun,
   and "When students sleep more, they miss fewer classes" isn't a comma splice.
4. **Memory:** in the Go chat, "track my marks" saves the marks to the Mark Twice backend
   ("You've marked comma splice 2 times. Want me to mark the rest?"). On the next paper, the
   teacher just says "mark comma splices."

It works for any label the teacher invents, not just a fixed list of grammar errors.

```
Teacher types {label: comment} twice ──> Superhuman Go (Grammarly for Chrome)
                                            │  Mark Twice agent (agent builder)
                                            │    · instructions: learn the label, suggest the mark as an edit
                                            │    · trigger: While writing → proactive suggestions
                                            ▼
                                 Mark Twice connector (pack.ts, Packs SDK)
                                    SaveMarks · RecordMark · GetMarks · ListLabels · ResetMarks
                                    skills: Track my marks · Mark the rest of this error
                                            │  HTTPS
                                            ▼
                                 Val Town backend (val.ts) ── blob storage
```

## Agent integration

- **Agent (Go agent builder):** a custom "Mark Twice" agent whose instructions teach Go the
  `{label: comment}` format and the precision rules. Its output is always an edit that
  appends the teacher's mark, never a rewrite of the student's words. See
  [AGENT-SETUP.md](AGENT-SETUP.md).
- **Proactive trigger:** a **While writing** trigger makes Go suggest marks on its own as soon
  as the teacher has marked an error twice. The teacher never has to ask.
- **Connector (Packs SDK):** `pack.ts` gives the agent five tools with LLM `instructions`. `SaveMarks` sends the document text in one call, and the backend finds and saves every mark.
  `RecordMark` and `ResetMarks` are actions. `GetMarks` and `ListLabels` have caching turned
  off so counts are always current. It also defines two skills with `pack.addSkill`, one for
  tracking marks and one for marking the rest.
- **Memory:** the backend stores each label's example sentences, so a new paper with no marks
  on it can still be marked.

## Setup (for judges)

You need a free Superhuman account, Grammarly for Chrome with **Use Superhuman Go** turned on,
and a free Val Town account.

1. **Deploy the backend.** On [val.town](https://val.town), create a new **HTTP** val, paste
   in `val.ts`, and save. Check it: open
   `https://YOUR-VAL-HOSTNAME.web.val.run/marks?label=test`. You should see
   `{"label":"test","count":0,"examples":[]}`.
2. **Build the connector.** Go to [pack.new](https://pack.new), choose **Start with an empty
   Pack**, paste `pack.ts`, and set one line:
   `const VAL_HOST = "YOUR-VAL-HOSTNAME.web.val.run";` (hostname only: no `https://`, no
   trailing `/`). Name the Pack "Mark Twice", then click **Build** and **Release**. Go only
   uses released versions.
3. **Create the agent.** In the Go panel: **Agents → Create an agent**. Copy the name,
   instructions, connector, tool approvals and While-writing trigger from
   [AGENT-SETUP.md](AGENT-SETUP.md).
4. **Try it.** Paste `demo-essay-3.txt` into a document, then **type**
   `{vague pronoun: this what?}` after "This leaves little time..." and after "This is
   important...". Pause. Go should underline "This means..." and "This would protect...",
   and leave "This concern..." and "That approach..." alone. `TEST-CASES.md` lists the
   expected results for all three papers.

To reset the backend: `curl -X POST https://YOUR-VAL-HOSTNAME.web.val.run/reset`

## Backend API

| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/marks?label=X` | | `{label, count, examples:[{excerpt, comment, at}]}` |
| POST | `/marks` | `{label, excerpt, comment}` | `{ok, label, count, duplicate}` |
| GET | `/labels` | | `{labels:[{label, count, comment}]}` |
| POST | `/scan` | `{text}` | Finds and saves every `{label: comment}` mark: `{ok, found, added, counts}` |
| POST | `/reset[?label=X]` | | `{ok, cleared}` |

Labels are case-insensitive. Recording the same sentence twice is ignored.

## Local tests

Requires [Deno](https://deno.com) 2.x.

```bash
deno test local-test.ts                       # backend routes
deno test -A --unsafe-proto pack-test.ts      # SDK upload validation + formulas against the backend
```

## Files

| File | Purpose |
|---|---|
| `pack.ts` | Superhuman Go connector: formulas, skills, memory |
| `AGENT-SETUP.md` | The Go agent's instructions and While-writing trigger |
| `val.ts` | Val Town HTTP backend |
| `demo-essay.txt` / `demo-essay-marked.txt` | Paper 1 (comma splice), without and with the two hand marks |
| `demo-essay-2.txt` | Paper 2 (comma splice, for memory) |
| `demo-essay-3.txt` | Paper 3 (vague pronoun, a different label) |
| `TEST-CASES.md` | Expected flags and decoys |
| `local-test.ts`, `pack-test.ts`, `deno.json` | Local tests |

## Tools and credits

Superhuman Go (agent builder and While-writing trigger), Superhuman Packs SDK
(`@codahq/packs-sdk`), Grammarly for Chrome, Val Town (HTTP val + blob storage), Deno, and
Go's default model. Starter code was drafted with AI assistance (Claude). The demo essays were
written for this demo. No other pre-existing code or assets.
