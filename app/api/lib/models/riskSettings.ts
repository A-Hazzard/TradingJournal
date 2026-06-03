import mongoose, { Schema, type InferSchemaType, type Document } from 'mongoose'

const riskSettingsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    accountBalance: { type: Number, default: 25000 },
    startingBalance: { type: Number, default: 25000 },
    dailyLossLimit: { type: Number, default: 500 },
    maxRiskPerTrade: { type: Number, default: 1.0 },
    maxDailyRiskPercent: { type: Number, default: 2.0 },
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

export type RiskSettingsDocument = InferSchemaType<typeof riskSettingsSchema> & Document & { id: string }

export const RiskSettingsModel =
  (mongoose.models.RiskSettings as mongoose.Model<RiskSettingsDocument>) ||
  mongoose.model<RiskSettingsDocument>('RiskSettings', riskSettingsSchema)
