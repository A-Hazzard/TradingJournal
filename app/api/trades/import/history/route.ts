/**
 * Import History API Route
 *
 * Lists past CSV import batches for the current user.
 *
 * @module app/api/trades/import/history/route
 */

import { connectDB } from '@/app/api/lib/db'
import { ImportLogModel, type ImportLogDocument } from '@/app/api/lib/models/importLog'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const logs = await ImportLogModel.find({ userId }).sort({ createdAt: -1 }).lean<ImportLogDocument[]>()
    return NextResponse.json(logs.map((l) => ({ ...l, id: l._id?.toString() ?? '' })))
  } catch (e) {
    console.error('[Import History GET] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to fetch import history' }, { status: 500 })
  }
}
