# LunaBiner AI Assistant

## Scope and architecture

The assistant runs inside the existing Next.js modular monolith. PostgreSQL/Prisma persists UUID conversations, messages, leads, runtime configuration, rate buckets, knowledge vectors and audit events. Existing auth sessions and `requirePermission("ai:manage")` protect administration.

Request flow: same-origin validation → Zod input → DB rate limit → anonymous HttpOnly session → conversation ownership/lease → recent messages and older-message summary → retrieval → bounded provider tool loop → grounded answer → persistence. Assistant text renders as plain React text; no provider HTML is executed.

## Configuration responsibilities

Infrastructure only: `AI_ASSISTANT_ENABLED`, `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_API_KEY`, `EMBEDDING_BASE_URL`, `EMBEDDING_API_KEY`. Startup validates enabled-provider credentials. Keys are never logged, returned, accepted in admin settings or persisted in runtime JSON.

Database: `AiConfiguration` core columns plus validated `settings` JSON. Admin `/dashboard/ai` edits the JSON schema: active/embedding/summary model, temperature, output tokens, timeout/retry, streaming, RAG top-K/score/chunks, context/summary/retention, language, grounding, recommendations, tools, lead capture, rate and metrics flags, editorial prompt and version. Unknown keys and invalid ranges are rejected. Grounding cannot be disabled. Core columns remain compatible with existing data; missing optional settings use code defaults.

`LLM_BASE_URL` is the **full chat-completions endpoint**, including `/v1/chat/completions`. Embedding URL is the full `/v1/embeddings` endpoint. Empty environment values do not activate the assistant.

## Providers and streaming

OpenAI/OpenAI-compatible chat completions are implemented with response validation, bounded retries/timeouts and SSE parsing. Ollama can use its OpenAI-compatible endpoint. Anthropic/Gemini are explicit extension slots, not implemented native adapters. Add a `LlmProvider` adapter implementing `complete`/`stream`, register it in the provider factory and add its tests.

Tool gathering precedes streaming generation when streaming is enabled. The API returns newline-delimited JSON events (`conversationId`, `delta`, `done`, recommendations/error) or a normal JSON answer when disabled. Errors are user-safe and do not expose provider payloads.

The floating panel preserves the existing LunaBiner colors and responsive layout. Transcript updates scroll to the latest reply; failed empty reply placeholders are removed while partial streamed answers remain available. The prompt requests plain text and forbids invented domains. New recommendation cards label portfolio examples as illustrative and product previews as concepts; the recommendation flag is enforced on every tool-loop exit. Previously saved message metadata is not rewritten.

## Knowledge and RAG

Current content source is the existing static website feature; there is no CMS yet. Services, illustrative case studies, insights, product previews, company description and contact FAQ are normalized and chunked. Products are concepts; example case studies are explicitly not completed client work.

The index uses PostgreSQL JSON vectors and application cosine similarity, avoiding new infrastructure/extensions for the small corpus. Admin reindex replaces the index transactionally only after embeddings succeed. It supports up to 2,000 chunks; migrate retrieval to pgvector/ANN before exceeding this documented scale.

Pipeline: published static content → chunking → embedding endpoint → `AiKnowledgeChunk` → cosine search → score/top-K filtering → bounded context. Change website content, deploy it, then run **Reindex knowledge**. There is no fictional CMS publish hook. If embeddings/index are unavailable, lexical retrieval falls back to existing sources and the response records degraded retrieval. Empty results never justify invented facts.

## Tools and consent

Only the named registry can execute validated tools: search_services, search_case_studies, search_products, search_insights and create_lead. Search is read-only. create_lead offers a human consent form; model arguments cannot create database leads. The form validates name/email/challenge, explicit checkbox consent, UUID conversation ownership and the runtime capture flag. The API writes source AI_ASSISTANT, consent timestamp and conservative scoring from provided fields. Contact information is never inferred. Scheduling remains a future tool contract; use the contact CTA meanwhile.

## Persistence and privacy

AI capture now uses shared leads-domain capture after consent/ownership validation and writes a captured activity atomically. `/dashboard/leads` supports status, owner, notes and related transcripts using leads:read/leads:write (ADMIN/SUPER_ADMIN/MARKETING/SALES); it is no longer read-only or AI-only. Scoped throttling is shared server infrastructure reusing existing rate-bucket storage.

Anonymous UUID cookie is HttpOnly, SameSite Strict and Secure in production. Browser sessionStorage contains only the conversation UUID, not the owner cookie or credentials. Reload fetches the latest 100 transcript messages with ownership and retention checks. New conversation drops the browser reference. It does not delete prior records. Overlapping chat requests receive 409. Lease expires after 10 minutes if a process dies.

Context sends only recent configured messages, bounded stored summary, retrieved data and the system prompt. Older messages are incrementally summarized after the configured threshold. Retention denies expired conversations; admin cleanup deletes expired rows (messages cascade) and old rate buckets.

## Security and operations

All write endpoints enforce same-origin, bounded JSON, validation and persistent per-session/IP rate buckets. The trusted proxy must overwrite forwarded headers. Keep HTTPS in production. Model tool results, summaries, source text and user input are untrusted data; prompt instructions cannot override company grounding. Provider safety is tested with deterministic mocks, not a guarantee of every possible live model response.

Admin updates/reindex/cleanup use server RBAC and audit events. `/dashboard/leads` displays captured requests only to administrators. Metrics include conversation/lead/chunk counts and per-answer degraded/source metadata.

## Troubleshooting and activation

1. Provision PostgreSQL and set DATABASE_URL privately. Run `npx prisma migrate deploy` with the deployment environment loaded. For local `.env.local` configuration, use the command in [installation](deployment/installation.md); Prisma CLI alone reads `.env`, not Next.js environment precedence.
2. Configure provider/embedding credentials through the deployment secret manager, enable AI, and restart.
3. Sign in with existing ADMIN credentials, edit AI settings, then reindex.
4. Test chat, reload history, consent and streaming. If indexing fails, check endpoint/model/embedding credential; original index is retained.
5. Failed provider/DB requests return generic messages. Use infrastructure health checks; do not print key-bearing provider responses.

Repository code has been tested against isolated PostgreSQL and a local mock provider. The local `lunabiner` database has also received all three migrations, and live OpenAI chat/embedding connectivity and vector indexing have been verified. See the [consolidated report](reports/2026/10/03/ai_assistant_phase2_completion.md) for current acceptance checks. Production deployment still needs its own private infrastructure configuration.

## Tests

Node 22.15+ is required for the test loader's registerHooks API. Against an **isolated test database**, deploy migrations then run:
`node --test tests/assistant.test.mjs` and `node tests/assistant-http.mjs`.
The suites intentionally modify/test data and must never target production. HTTP suite uses ports 55440/55441 and a local provider mock; no paid API calls.
