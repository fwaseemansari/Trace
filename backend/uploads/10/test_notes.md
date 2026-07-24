# Project Zen — Sprint Notes

## Overview
Zen is a document-aware assistant that lets users upload files and ask
questions grounded in their own content, with page-level citations.

## Key Features
- Corrective RAG (CRAG) retrieval grading
- Hybrid search combining BM25 and dense vector retrieval
- Streaming responses with conversation memory
- Multi-format document ingestion: PDF, DOCX, PPTX, XLSX, CSV, TXT, MD

## Open Questions
1. Should the reset-password flow expire codes after a single failed attempt?
2. How should multi-sheet spreadsheets be cited — by sheet name or index?
3. Do we need a rate limit on the `/chat/ask` endpoint for anonymous users?

## Team Notes
> The grading step should stay isolated from generation logic so it can be
> swapped or tuned independently.

### Sample Table

| Component      | Model                     | Purpose            |
|-----------------|---------------------------|---------------------|
| Grader          | llama-3.1-8b-instant       | Chunk relevance     |
| Generator       | llama-3.3-70b-versatile     | Final answer        |
| Query rewriter  | llama-3.1-8b-instant       | Standalone question |

## Next Steps
- [ ] Add `.xlsx` support to the ingestion pipeline
- [ ] Write integration tests for the streaming endpoint
- [ ] Draft the README before deployment
