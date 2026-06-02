# Rules System Architecture

This directory contains the engineering standards, architectural invariants, and domain-specific guidelines for the TradeJournal project.

## Folder Structure

```text
.instructions/rules/
├── ARCHITECTURE.md             # This file (meta-documentation)
├── nextjs-rules.md             # Senior Engineering: React, Hooks, UI, and General Patterns
├── type-safety.md              # Data Integrity: Strict TypeScript rules, "zero-any" policy
├── mongoose-query-typing.md    # Database: Typed Mongoose queries — lean<T>(), aggregate<T>()
├── naming-conventions.md       # Consistency: File and variable naming standards
└── guidlines.md                # API route structure, step comments, performance tracking
```

## How to Use These Rules

1. **Always-Apply Rules**: Files like `nextjs-rules.md` and `type-safety.md` have `alwaysApply: true` in their frontmatter. They should be considered the "Constitution" of the codebase.
2. **Context-Specific Rules**: Rules like `mongoose-query-typing.md` apply when writing database access code.
3. **Hierarchy**:
   - `CLAUDE.md` (Root) → Absolute Master Context (System Philosophy)
   - `.instructions/rules/` → Implementation Standards (Engineering Constitution)

## Maintenance

- When introducing a new architectural pattern, update `nextjs-rules.md`.
- When adding new Mongoose models, follow `mongoose-query-typing.md` for all queries.
- API routes must always follow `guidlines.md` step-comment structure.
