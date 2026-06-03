import mongoose, { Schema, type InferSchemaType, type Document } from 'mongoose'

const journalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    content: { type: String, default: '' },
    mood: {
      type: String,
      enum: ['great', 'good', 'neutral', 'bad', 'terrible'],
      default: 'neutral',
    },
    dailyGoal: { type: String, default: '' },
    lessonLearned: { type: String, default: '' },
    // ── Psychology ──────────────────────────────────────────────────────────
    preSessionChecklist: {
      type: {
        sleptWell: { type: Boolean, default: false },
        focused: { type: Boolean, default: false },
        reviewedPlan: { type: Boolean, default: false },
        notDistracted: { type: Boolean, default: false },
        acceptedRisk: { type: Boolean, default: false },
      },
      default: null,
    },
    mentalScore: { type: Number, min: 1, max: 10, default: null },
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

journalSchema.index({ userId: 1, date: -1 })
journalSchema.index({ userId: 1, date: 1 }, { unique: true })

export type JournalDocument = InferSchemaType<typeof journalSchema> & Document & { id: string }

export const JournalModel =
  (mongoose.models.Journal as mongoose.Model<JournalDocument>) ||
  mongoose.model<JournalDocument>('Journal', journalSchema)
