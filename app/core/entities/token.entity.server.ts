/* eslint-disable @typescript-eslint/ban-types */

import mongoose, { Schema, Model } from "mongoose";
import { type IBaseModel } from "~/core/abstracts/model.server";
import config from "~/config/config.server";
import toJSON from "~/core/db/plugins/toJSON.plugin.server";
import paginate from "~/core/db/plugins/paginate.plugin.server";

export interface IToken extends IBaseModel {
  user: mongoose.Types.ObjectId;
  token: string;
  expires: Date;
  blacklisted?: boolean;
  type: string;
}

export type ITokenMethods = {};

export type TokenModel = Model<IToken, {}, ITokenMethods>;

const tokenSchema = new Schema<IToken, TokenModel, ITokenMethods>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    expires: {
      type: Date,
      required: true,
    },
    blacklisted: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: Object.values(config.auth.tokenTypes),
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

tokenSchema.plugin(toJSON);
tokenSchema.plugin(paginate);

const Token =
  mongoose.models.Token || mongoose.model<IToken, TokenModel>("Token", tokenSchema);
export default Token;