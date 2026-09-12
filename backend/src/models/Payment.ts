import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const paymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    externalRef: { type: String, required: true, unique: true },
    product: { type: String, default: "vip", index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "GHS" },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    phone: { type: String, trim: true, default: "" },
    smsSent: { type: Boolean, default: false },
    slipViewed: { type: Boolean, default: false },
    moolreTxId: { type: String, default: "" },
    rawCallback: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export type PaymentDoc = InferSchemaType<typeof paymentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Payment: Model<PaymentDoc> =
  mongoose.models.Payment ?? mongoose.model<PaymentDoc>("Payment", paymentSchema);
