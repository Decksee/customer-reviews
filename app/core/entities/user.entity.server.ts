/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */

import mongoose, { Schema, Model, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { type IBaseModel } from "~/core/abstracts/model.server";
import toJSON from "~/core/db/plugins/toJSON.plugin.server";
import paginate from "~/core/db/plugins/paginate.plugin.server";

export interface IUser extends IBaseModel {
  firstName: string;
  lastName: string;
  avatar?: string; // Full uri to the user profile image(avatar)
  photo?: string; // Alternative field for user photo
  email: string;
  password: string;
  // 'employee', 'manager' Default is 'employee'.
  // Employee is the default role for all users
  // When access rules matters, pharmacy-owner is not subject to any access rules
  role: string;
  position?: Types.ObjectId; // Reference to Position entity
  currentPosition?: string; // @deprecated Use position field instead
  isActive?: boolean; // The user is active or not
}

export type IUserMethods = {
  /**
   * Check if password matches the user's password
   *
   * @param {string} password
   * @returns {Promise<boolean>}
   */
  isPasswordMatch(password: string): Promise<boolean>;
};

export type UserModel = Model<IUser, {}, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      required: false,
      default: null,
    },
    photo: {
      type: String,
      required: false,
      default: null,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: [
        "employee",  // Default role for all users
        "manager" // Only for the Manager (Users who will use the system for managing the pharmacy's customers feedbacks)
      ],
      default: "employee",
    },
    position: {
      type: Schema.Types.ObjectId,
      ref: "Position",
      required: false,
    },
    currentPosition: {
      type: String,
      required: false,
      // @deprecated Use position field instead
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

/** Method isPasswordMatch */
userSchema.method(
  "isPasswordMatch",
  async function isPasswordMatch(password: string) {
    return bcrypt.compare(password, this.password);
  }
);

// Pre-save hook to hash sensitive fields (pin, pinCode, and password)
userSchema.pre("save", async function (next) {
  const user = this as IUser & mongoose.Document;

  // Hash password if it is modified
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 10);
  }

  next();
});

userSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate() as any;
  const password = update.password;
  const pin = update.pin;
  if (password) {
    update.password = await bcrypt.hash(password, 10);
  }

  if (pin) {
    update.pin = await bcrypt.hash(pin, 10);
  }
  next();
});

// Add plugins
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

// Add indexes to speed up queries
userSchema.index({ email: 1, role: 1, status: 1, firstName: 1, lastName: 1, position: 1 });

const User =
  mongoose.models.User || mongoose.model<IUser, UserModel>("User", userSchema);

export default User;
