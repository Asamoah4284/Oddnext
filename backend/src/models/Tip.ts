import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { SLIP_PRODUCT_IDS } from "../products.js";

const tipSchema = new Schema(
  {
    kickoffAt: { type: Date, required: true, index: true },
    league: { type: String, required: true, trim: true },
    homeTeam: { type: String, required: true, trim: true },
    awayTeam: { type: String, required: true, trim: true },
    prediction: { type: String, required: true, trim: true },
    odds: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["pending", "won", "lost"],
      default: "pending",
    },
    product: {
      type: String,
      enum: SLIP_PRODUCT_IDS,
      default: "odds10",
      index: true,
    },
    isVip: { type: Boolean, default: true, index: true },
    bookingCode: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

tipSchema.index({ product: 1, kickoffAt: 1 });

export type TipDoc = InferSchemaType<typeof tipSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Tip: Model<TipDoc> =
  mongoose.models.Tip ?? mongoose.model<TipDoc>("Tip", tipSchema);
