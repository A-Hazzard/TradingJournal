import mongoose, { Schema, type InferSchemaType, type Document } from 'mongoose'

const setupSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    entryRules: { type: String, default: '' },
    exitRules: { type: String, default: '' },
    idealConditions: { type: String, default: '' },
    timeframes: { type: [String], default: [] },
    assetClasses: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
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

setupSchema.index({ userId: 1, name: 1 })

export type SetupDocument = InferSchemaType<typeof setupSchema> & Document & { id: string }

export const SetupModel =
  (mongoose.models.Setup as mongoose.Model<SetupDocument>) ||
  mongoose.model<SetupDocument>('Setup', setupSchema)
