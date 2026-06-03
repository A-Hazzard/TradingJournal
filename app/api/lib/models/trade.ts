import mongoose, { Schema, type InferSchemaType, type Document } from 'mongoose'

const tradeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ticker: { type: String, required: true, trim: true, uppercase: true },
    assetClass: { type: String, enum: ['forex', 'indices', 'stocks', 'crypto', 'commodities', 'futures'], default: 'forex' },
    direction: { type: String, enum: ['LONG', 'SHORT'], required: true },
    status: { type: String, enum: ['OPEN', 'CLOSED'], required: true, default: 'OPEN' },
    entryDateTime: { type: String, required: true },
    entryPrice: { type: Number, required: true },
    exitDateTime: { type: String, default: null },
    exitPrice: { type: Number, default: null },
    quantity: { type: Number, required: true },
    stopLoss: { type: Number, default: null },
    takeProfit: { type: Number, default: null },
    commission: { type: Number, default: 0 },
    fees: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    setup: { type: String, default: '' },
    journalNotes: { type: String, default: '' },
    screenshot: { type: String, default: '' },
    pnl: { type: Number, default: 0 },
    pnlPercent: { type: Number, default: 0 },
    rMultiple: { type: Number, default: null },
    holdingDurationMs: { type: Number, default: null },
    // ── Psychology ──────────────────────────────────────────────────────────
    emotionTag: {
      type: String,
      enum: ['confident', 'focused', 'neutral', 'anxious', 'frustrated', 'fomo', 'revenge', 'bored', 'greedy', null],
      default: null,
    },
    processGrade: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'F', null],
      default: null,
    },
    mistakeType: {
      type: String,
      enum: ['early_exit', 'late_entry', 'oversized', 'no_stop', 'broke_rules', 'chased', null],
      default: null,
    },
    // ── Import tracking ─────────────────────────────────────────────────────
    importedFrom: { type: String, default: null },
    importBatchId: { type: Schema.Types.ObjectId, ref: 'ImportLog', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString(): string }).toString()
        delete ret._id
        delete ret.__v
      },
    },
  }
)

tradeSchema.index({ userId: 1, entryDateTime: -1 })
tradeSchema.index({ userId: 1, ticker: 1 })
tradeSchema.index({ userId: 1, status: 1 })

export type TradeDocument = InferSchemaType<typeof tradeSchema> & Document & { id: string }

export const TradeModel =
  (mongoose.models.Trade as mongoose.Model<TradeDocument>) ||
  mongoose.model<TradeDocument>('Trade', tradeSchema)
