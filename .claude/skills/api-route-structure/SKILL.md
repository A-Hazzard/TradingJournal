# api-route-structure Skill

## Role & Purpose
Ensures Next.js API routes follow the standard route layout:
- Include a descriptive JSDoc `@module` header.
- Use step-numbered comments with `// ===` separators (e.g. `// === STEP 1: Parse params ===`).
- Connect to database with `await connectDB()`.
- Validate user identity from `x-user-id` header.
- Limit payload sizes and format outputs correctly.
