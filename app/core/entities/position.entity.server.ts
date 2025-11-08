/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */

import mongoose, { Schema, Model } from "mongoose";
import { type IBaseModel } from "~/core/abstracts/model.server";
import toJSON from "~/core/db/plugins/toJSON.plugin.server";
import paginate from "~/core/db/plugins/paginate.plugin.server";

export interface IPosition extends IBaseModel {
  title: string;
}

export type IPositionMethods = {
  // Add custom methods here if needed in the future
};

export type PositionModel = Model<IPosition, {}, IPositionMethods>;

const positionSchema = new Schema<IPosition, PositionModel, IPositionMethods>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins
positionSchema.plugin(toJSON);
positionSchema.plugin(paginate);

// Add indexes to speed up queries
positionSchema.index({ title: 1 });

const Position =
  mongoose.models.Position || mongoose.model<IPosition, PositionModel>("Position", positionSchema);

export default Position; 