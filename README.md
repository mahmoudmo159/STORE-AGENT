# Store AI Agent v2 — Split Deployment

This package is prepared as three separately deployable parts:

- `customer/` — customer-facing store/agent
- `owner/` — owner dashboard + Agent Studio
- `backend/` — shared API, agent runtime, tools and data

## Important
The current backend still uses JSON persistence and bearer-token auth from the supplied v1. That is suitable for local testing, NOT multi-tenant production sales. Before selling to multiple stores, replace persistence/auth with a real database/auth service, add tenant isolation, rate limiting, audit logs, secure cookies and HTTPS.

## Deployment
Deploy backend first and obtain its public URL. Then set `API_BASE` in both frontend apps to that backend URL and deploy each frontend separately.

The Agent remains our orchestration layer; an LLM is only an optional language/reasoning provider.
