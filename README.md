# OSG QA Platform

React-based quality assurance platform for document validation workflows, built on the Vertesia API.

## Setup

```bash
npm install
npm run dev
```

## Architecture

See `OSG_QA_React_Scaffold.md` for the complete migration plan, module map, and phase breakdown.

## Phase 1 (Current)

Foundation layer — pure JavaScript extraction with zero UI:

- **`src/constants/config.js`** — All API endpoints, agent names, collection templates, localStorage keys
- **`src/services/`** — API client, auth, documents, agents, collections, exports
- **`src/utils/`** — Markdown renderer, HTML escaping, validation parser, dedup logic, audit templates
- **`src/hooks/`** — Polling, state machine, collection groups, client data lookup, localStorage sync

## Phases 2–7

Shell + Auth → Library + DocViewer → Sampling → Test Plan → Validate & Audit → Polish
