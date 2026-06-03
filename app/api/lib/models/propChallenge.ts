import mongoose, { Schema, type InferSchemaType, type Document } from 'mongoose'

const propChallengeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    firm: { type: String, default: 'custom' },
    accountSize: { type: Number, required: true },
    startingBalance: { type: Number, required: true },
    profitTarget: { type: Number, required: true },
    maxDailyLoss: { type: Number, required: true },
    maxTotalDrawdown: { type: Number, required: true },
    drawdownType: { type: String, enum: ['static', 'trailing'], default: 'static' },
    startDate: { type: String, required: true },
    endDate: { type: String, default: null },
    phase: { type: String, enum: ['challenge', 'verification', 'funded'], default: 'challenge' },
    status: { type: String, enum: ['active', 'passed', 'failed'], default: 'active' },
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

propChallengeSchema.index({ userId: 1, status: 1 })

export type PropChallengeDocument = InferSchemaType<typeof propChallengeSchema> & Document & { id: string }

export const PropChallengeModel =
  (mongoose.models.PropChallenge as mongoose.Model<PropChallengeDocument>) ||
  mongoose.model<PropChallengeDocument>('PropChallenge', propChallengeSchema)
