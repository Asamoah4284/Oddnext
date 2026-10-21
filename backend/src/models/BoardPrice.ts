import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const boardPriceSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    priceGhs: { type: Number, required: true, min: 1 },
    priceNgn: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

export type BoardPriceDoc = InferSchemaType<typeof boardPriceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type BoardPriceDocument = mongoose.HydratedDocument<BoardPriceDoc>;

export const BoardPrice: Model<BoardPriceDoc> =
  mongoose.models.BoardPrice ?? mongoose.model<BoardPriceDoc>("BoardPrice", boardPriceSchema);
