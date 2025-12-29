---
applyTo: '**'
---

# Project Guidelines for AI Assistance

## Critical: Always Consult Documentation First

**Before doing anything, answering questions, or reviewing changes, you MUST:**

1. Check `DATABASE_SCHEMA.md` for database structure, table definitions, and relationships
2. Check `ARCHITECTURE.md` for system design, component structure, and architectural decisions
3. Check `PROJECT_PLAN.md` for project goals, features, roadmap, and implementation priorities

These files contain the source of truth for this project. Any code generation or modifications must align with the specifications in these documents.

## Keep Documentation Synchronized

**If you make changes to the codebase and/or to the backend:**

1. Update the relevant documentation file (`DATABASE_SCHEMA.md`, `ARCHITECTURE.md`, or `PROJECT_PLAN.md`) to reflect the current reality
2. Always add or update the "Last Edited" date at the top of the modified documentation file
3. Ensure consistency between code and documentation - documentation should always match the actual implementation

Format for date tracking in documentation files:
```
Last Edited: YYYY-MM-DD
```

## Coding Guidelines
