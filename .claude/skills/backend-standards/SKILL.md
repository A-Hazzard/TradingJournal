# backend-standards Skill

## Role & Purpose
Enforces database design and query principles:
- Strict user data isolation: all queries must filter on `{userId}`.
- Use of `.lean<T>()` for read queries.
- Direct use of `findOne({ _id: id })` instead of legacy `findById()`.
- Request body parameter whitelisting to eliminate mass-assignment vulnerabilities.
