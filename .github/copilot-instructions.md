# Project Guidelines for AI Assistance

## Critical: Always Consult Documentation First

**Before doing anything, answering questions, or reviewing changes, you MUST:**

1. FULLY Read/Check `DATABASE_SCHEMA.md` for database structure, table definitions, and relationships
2. FULLY Read/Check `ARCHITECTURE.md` for system design, component structure, and architectural decisions
3. FULLY Read/Check `PROJECT_PLAN.md` for project goals, features, roadmap, and implementation priorities

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

## Security Standards

**Follow these security principles at all times:**

1. **Row Level Security (RLS)**: All database tables MUST have proper RLS policies. Never bypass RLS unless absolutely necessary and documented
2. **Supabase Edge Functions**: Use Edge Functions for any sensitive operations, API calls with secrets, or business logic that shouldn't be exposed client-side
3. **No Sensitive Data Client-Side**: Never expose API keys, secrets, or sensitive configuration in client-side code. Use environment variables and Edge Functions
4. **Abuse Prevention**: Implement rate limiting, input validation, and proper authentication checks to prevent abuse
5. **Principle of Least Privilege**: Grant only the minimum permissions necessary for each role/user
6. **Input Validation**: Always validate and sanitize user inputs on both client and server side
7. **Secure by Default**: When in doubt, choose the more secure option

## Coding Guidelines
