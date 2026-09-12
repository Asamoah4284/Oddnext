import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const statsSchema = new Schema(
  {
    key: { type: String, unique: true, default: "global" },
    winRate: { type: Number, default: 90 },
    monthlyTips: { type: Number, default: 320 },
    vipMembers: { type: Number, default: 1840 },
    telegramCount: { type: Number, default: 100000 },
    telegramUrl: { type: String, default: "https://t.me/oddnext" },
    vipPriceGhs: { type: Number, default: 1500 },
  },
  { timestamps: true }
);

export type StatsDoc = InferSchemaType<typeof statsSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type StatsDocument = mongoose.HydratedDocument<StatsDoc>;

export const Stats: Model<StatsDoc> =
  mongoose.models.Stats ?? mongoose.model<StatsDoc>("Stats", statsSchema);

export async function getOrCreateStats(): Promise<StatsDocument> {
  const existing = await Stats.findOne({ key: "global" });
  if (existing) return existing;
  return Stats.create({ key: "global" });
}
