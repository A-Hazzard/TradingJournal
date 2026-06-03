import mongoose, { Schema, type InferSchemaType, type Document } from 'mongoose'

const importLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, default: '' },
    broker: { type: String, default: 'generic' },
    totalRows: { type: Number, default: 0 },
    imported: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    errors: { type: Number, default: 0 },
    errorMessages: { type: [String], default: [] },
    status: { type: String, enum: ['success', 'partial', 'failed'], default: 'success' },
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

importLogSchema.index({ userId: 1, createdAt: -1 })

export type ImportLogDocument = InferSchemaType<typeof importLogSchema> & Document & { id: string }

export const ImportLogModel =
  (mongoose.models.ImportLog as mongoose.Model<ImportLogDocument>) ||
  mongoose.model<ImportLogDocument>('ImportLog', importLogSchema)
