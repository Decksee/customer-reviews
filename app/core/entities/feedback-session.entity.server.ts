/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */

import mongoose, { Schema, Model, Document } from "mongoose";
import { type IBaseModel } from "~/core/abstracts/model.server";
import toJSON from "~/core/db/plugins/toJSON.plugin.server";
import paginate from "~/core/db/plugins/paginate.plugin.server";

// We're extending only IBaseModel, but declaring that save() is available
export interface IFeedbackSession extends IBaseModel {
  /** Data from the feedback page */
  // 1. Pharmacy rating
  pharmacyRating?: number; // Rating from 1-5

  // 2. Employee ratings
  employeeRatings: {
    employeeId: mongoose.Types.ObjectId;
    rating: number;
    comment?: string;
  }[];

  /** Data from the contact page */
  // Client data
  clientData?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    consent: boolean;
  };

  /** Data from the suggestion page */
  suggestion?: string; // Optional suggestion text

  /** Session metadata */
  sessionId: string;
  deviceId: string; // Unique identifier for the device/tablet
  completed: boolean;
  processed: boolean;
  lastActiveAt: Date;
  startedAt: Date;
  completedAt?: Date;
  status: 'active' | 'completed' | 'abandoned' | 'processed';
  inactivityTimeout: number; // Timeout in minutes before session is considered abandoned
  
  // Method needed for mongoose document operations
  save(): Promise<IFeedbackSession>;
}

export type IFeedbackSessionMethods = {
  isStale(): boolean;
  markCompleted(): Promise<void>;
};

export type FeedbackSessionModel = Model<IFeedbackSession, {}, IFeedbackSessionMethods>;

const feedbackSessionSchema = new Schema<IFeedbackSession, FeedbackSessionModel, IFeedbackSessionMethods>(
  {
    sessionId: { 
      type: String, 
      required: false, // No longer required as we're using MongoDB _id instead
      unique: true 
    },
    deviceId: { 
      type: String, 
      required: true,
      index: true // Indexed for querying sessions from same device
    },
    
    // Feedback page data
    pharmacyRating: { 
      type: Number, 
      min: 1, 
      max: 5 
    },
    employeeRatings: [{
      employeeId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
      },
      rating: { 
        type: Number, 
        min: 1, 
        max: 5 
      },
      comment: { 
        type: String 
      }
    }],
    
    // Contact page data
    clientData: {
      firstName: { type: String },
      lastName: { type: String },
      email: { type: String },
      phone: { type: String },
      consent: { type: Boolean, default: false }
    },
    
    // Suggestion page data
    suggestion: { type: String },
    
    // Session metadata
    completed: { type: Boolean, default: false },
    processed: { type: Boolean, default: false },
    lastActiveAt: { type: Date, default: Date.now },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    status: { 
      type: String, 
      enum: ['active', 'completed', 'abandoned', 'processed'], 
      default: 'active' 
    },
    inactivityTimeout: { 
      type: Number, 
      default: 1440 // Default to 24 hours (1440 minutes), set to 2 minutes for shared devices
    }
  },
  {
    timestamps: true,
  }
);

// Methods
feedbackSessionSchema.method("isStale", function isStale() {
  const now = new Date();
  const lastActive = new Date(this.lastActiveAt);
  const diffMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60);
  
  return diffMinutes > this.inactivityTimeout;
});

feedbackSessionSchema.method("markCompleted", async function markCompleted() {
  this.completed = true;
  this.status = 'completed';
  this.completedAt = new Date();
  await this.save();
});

// Add indexes for querying scenarios
feedbackSessionSchema.index({ deviceId: 1, lastActiveAt: -1 });
feedbackSessionSchema.index({ status: 1, lastActiveAt: 1 });
feedbackSessionSchema.index({ 'clientData.email': 1 });
feedbackSessionSchema.index({ 'employeeRatings.employeeId': 1 });

// Add plugins
feedbackSessionSchema.plugin(toJSON);
feedbackSessionSchema.plugin(paginate);

const FeedbackSession =
  mongoose.models.FeedbackSession || 
  mongoose.model<IFeedbackSession, FeedbackSessionModel>("FeedbackSession", feedbackSessionSchema);

export default FeedbackSession; 