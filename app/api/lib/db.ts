/**
 * MongoDB Connection Utility
 *
 * Singleton connection pattern for Next.js — reuses the existing connection
 * across hot-reloads in development and across serverless invocations in production.
 *
 * @module app/api/lib/db
 */

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/trade-journal'

type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var mongooseCache: MongooseCache | undefined
}

const cache: MongooseCache = global.mongooseCache ?? { conn: null, promise: null }
global.mongooseCache = cache

/**
 * Connect to MongoDB using a singleton cached connection.
 * Safe to call multiple times — returns the existing connection if already open.
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    })
  }

  cache.conn = await cache.promise
  return cache.conn
}
