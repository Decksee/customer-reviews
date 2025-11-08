/* eslint-disable @typescript-eslint/ban-types */
import mongoose, { Schema, Model } from "mongoose";
import { type IBaseModel } from "~/core/abstracts/model.server";
import toJSON from "~/core/db/plugins/toJSON.plugin.server";
import paginate from "../db/plugins/paginate.plugin.server";

export interface IUserSession extends IBaseModel {
  userId?: string; // Reference to the user
  data: Record<string, unknown>; // To store flexible session data
  expires: Date; // Expiration date for the session
  lastActivity?: Date; // Track last session activity
}

export type IUserSessionMethods = {
  isExpired(): boolean;
  touch(): Promise<void>;
};

export type UserSessionModel = Model<IUserSession, {}, IUserSessionMethods>;

const userSessionSchema = new Schema<
  IUserSession,
  UserSessionModel,
  IUserSessionMethods
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true, // Add index for better query performance
      sparse: true, // Allow null values and only index documents that have this field
    },
    data: {
      type: Schema.Types.Mixed, // Allows for any data type
      required: true,
      default: {},
    },
    expires: {
      type: Date,
      required: true,
      index: true, // Add index for better cleanup performance
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically add `createdAt` and `updatedAt`
  }
);

// Add methods to the schema
userSessionSchema.methods.isExpired = function() {
  return this.expires <= new Date();
};

userSessionSchema.methods.touch = async function() {
  this.lastActivity = new Date();
  await this.save();
};

// Add indexes for session management
userSessionSchema.index({ userId: 1, expires: 1 }); // Compound index for user sessions
userSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }); // TTL index for automatic cleanup after 7 days

// Add plugins to enhance schema functionality
userSessionSchema.plugin(toJSON); // Converts Mongoose documents to JSON
userSessionSchema.plugin(paginate); // Adds pagination functionality

// Create or reuse the UserSession model
const UserSession =
  mongoose.models.UserSession ||
  mongoose.model<IUserSession, UserSessionModel>("UserSession", userSessionSchema);

export default UserSession;
