# Evaluation & Debugging Log

This documents the process of building and hardening the CRAG retrieval pipeline and multi-format document ingestion — specifically, bugs found through deliberate testing against ground-truth answers, not just "it looks like it works."

The methodology throughout: ask a question with a known, verifiable answer (checked directly against the source document), and treat any mismatch as a bug to trace to its root cause rather than a fluke.

---

## 1. Retrieval returning zero results after a document rename

**Symptom:** A document renamed via the UI returned "No relevant information found" for every query, even ones with obvious, direct answers.

**Root cause:** The `/documents/rename` endpoint updated the filename in PostgreSQL and on disk, but never updated the `source` metadata on the corresponding chunks already stored in ChromaDB. Retrieval filters on `where={"source": file_path}` — after a rename, that filter pointed at the *new* path, while every embedded chunk was still tagged with the *old* path. Zero overlap, zero results, every time.

A related issue surfaced during the same investigation: the rename endpoint had no filename sanitization, so a filename containing `/` (e.g. `"IC/EC"`) was interpreted as a path separator, silently restructuring the upload directory and stripping the file's extension — which then broke ingestion entirely for that document.

**Fix:** Rename now syncs ChromaDB by fetching all chunks under the old `source`, deleting them, and re-adding them with updated metadata pointing to the new path. Filenames are validated to reject path separators and to require a supported extension before any rename is applied.

**Verification:** Re-tested rename → query on a fresh document; confirmed retrieval worked correctly post-rename. The originally-corrupted document (tangled across three different historical paths from testing the bug itself) was not recoverable and was deleted and re-uploaded clean.

---

## 2. Wrong section retrieved from structurally repetitive PDFs

**Symptom:** Asking "What are Dania's tasks for week 3?" against a 7-week project plan PDF returned Week 5's content instead.

**Root cause:** The PDF has near-identical table structures repeated under 7 different "Week N" headings. The original PDF loader extracted text per-page and passed it to a generic character-based text splitter with no awareness of section boundaries — a chunk could be split away from the heading it belonged to, so downstream retrieval had no way to distinguish "Week 3's table" from "Week 5's table" once the heading context was lost.

**Fix:** Rewrote PDF loading to detect headings using relative font-size/boldness (not hardcoded wording, so it generalizes across different PDFs), and to split content *at* heading boundaries rather than tagging by page. Each resulting chunk carries its actual originating section heading.

**Verification:** Confirmed via direct retrieval testing (`hybrid_search()` called directly in a Python shell) that the correct section's content was returned for both a previously-failing week and a different week, ruling out both retrieval and ingestion as the remaining cause.

---

## 3. Table column headers misidentified as section headings

**Symptom:** After fix #2, retrieval still surfaced the wrong week's content for some queries — this time pulling Week 1 content for a Week 3 question.

**Root cause:** Table column-header rows (e.g. "Day / Task Owner Specific Output / File") are styled bold/larger in the source PDF, the same visual signal used to detect real section headings. The heading detector was treating these as legitimate headings and overwriting the *real* current section ("Week 3 — ...") with a generic table-header string, so all content following that table was mislabeled.

**Fix:** Added a filter that rejects heading candidates composed mostly of generic table-column vocabulary ("day," "task," "owner," "output," "file," etc.), so table headers no longer overwrite genuine section headings.

**Verification:** Re-ran the same Week 3 query; confirmed the retrieved chunk's section tag and content now matched (verified against the literal source text). Cross-checked with a positive control ("What is the goal of week 3?") to confirm the fix generalized rather than overfitting to one question.

---

## 4. Garbled meta-commentary leaking into follow-up answers

**Symptom:** In multi-turn conversations, follow-up questions occasionally produced answers that opened with phrases like "You are correct, I didn't ask about X" — responding to a claim the user never made.

**Root cause:** The query-rewriting chain (which turns follow-ups into standalone questions using conversation history) had no constraint against producing conversational meta-text instead of a clean rewritten question. When it did, that garbled text was used as the actual query passed to both retrieval and the answer-generation model, which then responded to the broken rewrite rather than the user's real question.

**Fix:** Tightened the rewrite prompt to explicitly forbid commentary, acknowledgments, or meta-text, and added a fallback: if the rewrite output is suspiciously long or contains known meta-text markers, the original question is used instead of the rewrite.

**Verification:** Re-ran a multi-turn conversation across several documents with follow-ups using pronouns and ellipsis ("what about X instead?", "and for Y?"); confirmed no meta-text leakage across the full test set.

---

## 5. Over-literal answer generation on paraphrased questions

**Symptom:** A question like "total papers gathered?" returned "not in context" even though the document explicitly stated "Raw Hit Count: 1845" — the correct answer, just under different wording.

**Root cause:** The generation prompt instructed the model to "quote or paraphrase directly" and "never infer beyond what is written," which in practice caused it to require near-literal phrase overlap between the question and the source text, rather than allowing reasonable semantic connection.

**Fix:** Relaxed the prompt to explicitly permit connecting differently-worded but semantically equivalent information, while keeping the hard constraint against introducing facts not present in the context.

**Verification:** Re-tested the original failing question; confirmed the correct figure was returned. Re-tested previously-passing exact-match questions to confirm no regression from the relaxed wording.

---

## 6. Unsupported file types silently missing from the loader

**Symptom:** `.pptx` uploads failed with `Unsupported file type: .pptx`, despite a working `load_pptx()` function already existing in the codebase.

**Root cause:** The function existed but was never wired into `load_document()`'s branching logic — an omission, not a bug in the function itself.

**Fix:** Added the missing branch. The same investigation also surfaced a `python-pptx` API incompatibility (`table.rows` doesn't support slice indexing) inside `load_pptx()` itself, which was fixed by converting to a list before slicing.

---

## Known limitations (not fixed, deliberately documented)

- **Compound-condition questions** (e.g. "person X's tasks during week Y," where no such combination exists in the source) can still occasionally retrieve topically-related-but-incorrect chunks rather than confidently returning "not found." This reflects a structural limitation of chunk-based similarity retrieval — a chunk mentioning the person and a chunk mentioning the week can both score highly without ever co-occurring in the way the question requires. A prompt-level mitigation (requiring both conditions to be satisfied by the same passage) was added but is not a complete solution.
- **Aggregation across tabular rows** (e.g. "what's the most expensive item," "how many items does supplier X provide in total") is unreliable, since each retrieved chunk sees only a slice of a table, not the full dataset. A more robust fix would route detected aggregation queries to a structured tool (pandas/SQL) rather than the vector store — noted as future work, not implemented.
