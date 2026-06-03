# react-typescript-rules Skill

## Role & Purpose
Enforces React and TypeScript type-safety:
- Explicit typed structures (`type`) instead of standard `interface`.
- Forbidden use of `any` (use `unknown` and perform manual type-guarding).
- Explicit `use client` directives on components utilizing hooks.
- Static type imports where possible.
