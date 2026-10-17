# Test cases: what Go should and should not flag

Use with `demo-essay-marked.txt` (paper 1) and `demo-essay-2.txt` (paper 2).
A pass means every "Flag" row gets a blue bar and no "Don't flag" row does.

## Paper 1 (after the teacher's 2 hand marks in paragraphs 1 and 2)

| Para | Sentence | Expected | Why |
|---|---|---|---|
| 1 | Doctors say teens need eight to ten hours of sleep, most of them get fewer than seven a night. | Already marked (skip) | Teacher's hand mark |
| 1 | Every morning, millions of teenagers drag themselves to school... | Don't flag | Introductory phrase |
| 2 | School often starts at 7:30, many students wake up before six. | Already marked (skip) | Teacher's hand mark |
| 2 | During puberty, the body's internal clock shifts later, so most teens cannot fall asleep until about eleven. | Don't flag | Comma + "so" |
| 3 | A sleepy brain has trouble focusing, lessons that should take ten minutes take twenty. | **Flag** | Comma splice |
| 3 | When students sleep more, they miss fewer classes. | **Don't flag (decoy)** | Dependent clause |
| 4 | Students who skip sleep forget more of what they studied, their grades often drop. | **Flag** | Comma splice |
| 4 | Sleep affects memory, and memory affects learning. | **Don't flag (decoy)** | Comma + "and" |
| 4 | During deep sleep, the brain sorts the day's information... | Don't flag | Introductory phrase |
| 5 | Students there slept about thirty minutes more each night, attendance in first period went up. | **Flag** | Comma splice |
| 5 | Some districts have tried later start times; however, change has been slow. | **Don't flag (decoy)** | Semicolon + however |
| 5 | In Seattle, high schools moved the first bell to 8:45 in 2016. | Don't flag | Introductory phrase |
| 6 | These problems are real, they can be solved. | **Flag** | Comma splice |
| 6 | If schools start later, students will be healthier, safer, and more ready to learn. | Don't flag | Dependent clause + list |

Expected result: **4 flagged** (one per paragraph 3-6), **0 decoys flagged**.
Each suggestion should only append ` {comma splice: use a period}`; the sentence itself must be unchanged.

## Paper 2 (no hand marks; say "mark comma splices")

| Para | Sentence | Expected |
|---|---|---|
| 1 | Supporters say phones distract students, they point to falling test scores. | **Flag** |
| 2 | A single notification can pull attention away for several minutes, it takes time to refocus. | **Flag** |
| 2 | Although phones can be useful tools, most students use them for games and social media. | Don't flag |
| 3 | Some teachers use phones for quick quizzes, and students enjoy them. | Don't flag |
| 3 | Still, the research is mixed; therefore, schools should move carefully. | Don't flag |
| 4 | A clear policy helps everyone, students know what to expect. | **Flag** |
| 4 | Because the rules are the same in every room, there are fewer arguments. | Don't flag |

Expected result: **3 flagged**, **0 decoys flagged**.

## Paper 3: a different label (`demo-essay-3.txt`)

Shows Mark Twice isn't comma-splice only. The teacher types `{vague pronoun: this what?}` after
the "This leaves..." sentence (paragraph 1) and the "This is important..." sentence (paragraph 2).

| Para | Sentence | Expected | Why |
|---|---|---|---|
| 1 | This leaves little time for sleep or family. | Already marked (skip) | Teacher's hand mark |
| 2 | This is important, but the amount matters. | Already marked (skip) | Teacher's hand mark |
| 3 | This means elementary schools could assign less. | **Flag** | "This" with no noun |
| 4 | This concern is understandable. | **Don't flag (decoy)** | "This" + noun |
| 5 | This would protect sleep and still allow practice. | **Flag** | "This" with no noun |
| 5 | That approach balances both goals. | **Don't flag (decoy)** | "That" + noun |

Expected result: **2 flagged**, **0 decoys flagged**.

## Paper 4: four labels in one long essay (`demo-essay-4.txt`)

The teacher types each mark right after the sentence's final period. There are 8 hand marks, 2 per label:

| Label to type | After this sentence (paragraph) |
|---|---|
| `{comma splice: use a period}` | "Some districts have already made the switch, more are considering it." (P1) |
| `{comma splice: use a period}` | "Teachers get an extra day to plan, students get an extra day to rest." (P2) |
| `{vague pronoun: this what?}` | "This makes the job more sustainable." (P2) |
| `{vague pronoun: this what?}` | "This is a big reason some teachers choose to stay in four-day districts." (P3) |
| `{too casual: use academic language}` | "Honestly, a lot of teachers are super burned out by Friday." (P3) |
| `{too casual: use academic language}` | "Kids would be way more chill if they had a real break." (P4) |
| `{needs evidence: cite a source}` | "Everyone knows that rested students learn better." (P4) |
| `{needs evidence: cite a source}` | "Studies prove that four-day weeks raise test scores everywhere." (P5) |

Expected suggestions (**9**):

| Para | Sentence | Label |
|---|---|---|
| 5 | Students can schedule doctor visits on Mondays, they no longer miss class for them. | comma splice |
| 7 | The longer days can be tiring, younger students may struggle to focus in the afternoon. | comma splice |
| 9 | The change is not perfect, it deserves a serious trial. | comma splice |
| 6 | This could be solved with community programs on the day off. | vague pronoun |
| 8 | That is why the schedule needs local input. | vague pronoun |
| 6 | Parents who work full time would be kinda stuck finding childcare. | too casual |
| 8 | Some critics think the whole idea is pretty dumb. | too casual |
| 7 | Most parents support the change. | needs evidence |
| 9 | Experts agree that the four-day week is the future of education. | needs evidence |

Decoys that must **not** be flagged:

| Para | Sentence | Looks like | Why it's fine |
|---|---|---|---|
| 4 | Because the week is shorter, each day runs about an hour longer. | comma splice | Dependent clause |
| 6 | This problem is real, and districts should plan for it. | comma splice and vague pronoun | ", and" + "This problem" |
| 8 | That approach lets each community decide what works. | vague pronoun | "That" + noun |
| 8 | They argue that students need more time in school, not less. | vague pronoun | "They" clearly means the critics |
| 5 | According to the Pine Valley School District's 2023 attendance report, absences fell by eight percent after the switch. | needs evidence | Has a source |
| 7 | In a survey of 400 parents in Pine Valley, 61 percent said the new schedule worked for their family. | needs evidence | Has a source |
| 9 | Pine Valley saved about $200,000 on buses in its first year, and the district used the savings for teacher pay. | comma splice and needs evidence | ", and" + specific source |

## Paper 5: short, two labels (`demo-essay-5.txt`)

Hand marks (type each one right after the sentence's period):

| Label to type | After this sentence |
|---|---|
| `{comma splice: use a period}` | "School libraries give students a quiet place to read, many students have no such place at home." (P1) |
| `{vague pronoun: this what?}` | "This helps them build focus." (P1) |
| `{comma splice: use a period}` | "Librarians teach students how to find good sources, they also help with research projects." (P2) |
| `{vague pronoun: this what?}` | "This is important for older students." (P2) |

Expected suggestions (**4**):

| Para | Sentence | Label |
|---|---|---|
| 3 | This means students lose access after school. | vague pronoun |
| 4 | Books can be expensive, not every family can buy them. | comma splice |
| 5 | This would help every student succeed. | vague pronoun |
| 5 | The cost is small, the benefit is large. | comma splice |

Decoys (**not** flagged): "When the library closes early, students have fewer places to study." (dependent clause) and "This problem is easy to fix, and libraries already solve it." ("This" + noun, ", and").

## Paper 6: short, two labels (`demo-essay-6.txt`)

Hand marks (type each one right after the sentence's period):

| Label to type | After this sentence |
|---|---|
| `{comma splice: use a period}` | "Cooking is a skill every student will need, few schools teach it." (P1) |
| `{vague pronoun: this what?}` | "This leaves many teens unprepared." (P1) |
| `{comma splice: use a period}` | "Students who cook at home eat more vegetables, they also spend less on fast food." (P2) |
| `{vague pronoun: this what?}` | "This saves families money." (P2) |

Expected suggestions (**4**):

| Para | Sentence | Label |
|---|---|---|
| 3 | This would not cost much. | vague pronoun |
| 4 | Some teachers worry about safety, knives and stoves can be dangerous. | comma splice |
| 5 | Students remember this for years. | vague pronoun |
| 5 | The best time to start is now, the kitchen is waiting. | comma splice |

Decoys (**not** flagged): "If schools already have a kitchen, the class is easy to start." (dependent clause) and "That concern is fair, but training solves it." ("That" + noun, ", but").

## Plumbing smoke tests (type into Go)

1. `Use RecordMark with label "test", excerpt "hello", comment "none"`, then open `YOUR_URL/marks?label=test`. Count should be 1.
2. Say it again. Count should still be 1 (duplicates are ignored).
3. `Use ResetMarks with label "test"`. Count should go back to 0.

## Results log

| Time | Page (textarea / Google Doc) | Flagged correctly | Decoys flagged | Notes |
|---|---|---|---|---|
| | | | | |
