rule("Backend API route files must follow strict structure and documentation for maintainability, clarity, and code quality.") {
appliesTo: "app/api/**/*.ts"

checklist: [
"File-level JSDoc with summary, features, and @module tag",
"Imports grouped and ordered: helpers, types, utilities, Next.js, external libraries",
"Handler functions (e.g., GET) must use documented step-by-step visual comments and numbered steps",
"Each major operation inside handlers must be labeled as `STEP N: [Description]` with separator lines",
"Flow must be pre-documented in handler JSDoc (listing steps)",
"All API handlers must properly document their params (@param and @body) and provide a high-level explanation of what the method is for",
"Complex or reusable logic extracted to app/api/lib/helpers/[feature].ts and imported",
"Performance tracking added (measure elapsed time; log >1000ms and on error)",
"Proper try/catch error handling with suitable HTTP status codes and safe error messages",
"No use of any types; types defined and imported where necessary",
"No direct db.collection access; always use imported Mongoose models from app/api/lib/models/",
"when querying by id, use findOne({ _id: id }) not findById(id)"
]

rationale: """
- Ensures routes are easy to maintain, audit, and extend
- Establishes uniform code/comment/documentation style
- Prevents accidental type safety, security, or organization regressions
- Enables scalable helper extraction and modularization
- Prevents performance regressions by highlighting slow routes
- Reduces error-proneness in database access
"""

examples: [
section("File-level JSDoc") {
snippet("""
/**
 * Trades API Route
 *
 * This route handles trade record retrieval and creation.
 * It supports:
 * - List all trades with optional filters
 * - Create a new trade
 *
 * @module app/api/trades/route
 */
""")
},
section("Import order") {
snippet("""
// Helpers
import { buildTradeFilter } from '@/app/api/lib/helpers/trades';
// Types
import { type TradeDocument } from '@/app/api/lib/types';
// Utilities
import { connectDB } from '@/app/api/lib/db';
// Next.js
import { NextRequest, NextResponse } from 'next/server';
""")
},
section("Handler structure with comments and flow doc") {
snippet("""
/**
 * Main GET handler for trades
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Fetch trades from database
 * 4. Return JSON response
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Fetch trades from database
    // ============================================================================
    const trades = await TradeModel.find({}).lean<TradeDocument[]>();

    // ============================================================================
    // STEP 4: Return response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Trades GET] Completed in ${duration}ms`);
    }
    return NextResponse.json(trades);
  } catch (e) {
    const duration = Date.now() - startTime;
    console.error(`[Trades GET] Failed after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error');
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
""")
}
]

antiPatterns: [
"Missing step-by-step comments or visual separators",
"No file-level JSDoc or @module tag",
"Direct use of findById or findByIdAndUpdate",
"Usage of any type in parameters or results",
"Untracked slow operations",
"No input validation or missing HTTP status codes on error"
]
}

rule("All backend code must use strict TypeScript standards.") {
  appliesTo: "app/api/**"
  checklist: [
  "Prefer type over interface unless extending interfaces",
  "No any types",
  "No single-letter variables (use descriptive names even in loops/reduces)",
  "No underscore-prefixed variables, except _id for MongoDB",
  "Types organized: types/ (cross-domain), app/api/lib/types (backend only)",
  "Database types modelled using InferSchemaType<typeof schema> & Document for Mongoose"
  ]
  rationale: "Type safety, maintainability, and clarity for all contributors."
}

rule("Frontend code must never import React namespace.") {
  appliesTo: "components/**/*.tsx", "lib/**/*.ts", "lib/**/*.tsx", "app/**/*.tsx"
  must: [
  "Use direct named imports: import { useState, useEffect, FC } from 'react'",
  "NEVER use: import React from 'react' or import * as React from 'react'",
  "NEVER use: React.useState, React.useEffect, React.FC, etc."
  ]
  rationale: "Modern React with JSX transform doesn't require React import; direct named imports are cleaner."
}

rule("All backend database access must use Mongoose models, not direct collection calls.") {
appliesTo: "app/api/**/*.ts"
must: [
"Import models from @/app/api/lib/models/ (e.g., import { TradeModel } from '@/app/api/lib/models/trade')",
"Use Model.findOne({ _id: id }) for string IDs, not findById",
"Never use db.collection(), Model.findById(), Model.findByIdAndUpdate()"
]
rationale: "Prevents type-unsafe code and leverages Mongoose features."
}

meta {
lastUpdated: "2025-05-05"
author: "TradeJournal Project"
version: "1.0.0"
}
