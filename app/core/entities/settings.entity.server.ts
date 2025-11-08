/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */

import mongoose, { Schema, Model } from "mongoose";
import { type IBaseModel } from "~/core/abstracts/model.server";
import toJSON from "~/core/db/plugins/toJSON.plugin.server";
import paginate from "~/core/db/plugins/paginate.plugin.server";

export interface IFeedbackPageSettings {
  feedbackCollectionEnabled: boolean;
  clientInfoEnabled: boolean;
  suggestionEnabled: boolean;
  thankYouEnabled: boolean;
}

export interface ISettings extends IBaseModel {
  darkMode: boolean;
  emailNotifications: boolean;
  autoGenerateMonthlyReport: boolean;
  monthlyReportFormat: 'PDF' | 'EXCEL' | 'BOTH';
  feedbackPages: IFeedbackPageSettings;
  updatedBy: mongoose.Types.ObjectId; // Reference to User model
}

export type ISettingsMethods = {};

export type SettingsModel = Model<ISettings, {}, ISettingsMethods>;

const feedbackPagesSchema = new Schema<IFeedbackPageSettings>(
  {
    feedbackCollectionEnabled: { 
      type: Boolean, 
      default: true // Always true
    },
    clientInfoEnabled: { 
      type: Boolean, 
      default: true 
    },
    suggestionEnabled: { 
      type: Boolean, 
      default: true 
    },
    thankYouEnabled: { 
      type: Boolean, 
      default: true 
    }
  },
  { _id: false }
);

const settingsSchema = new Schema<ISettings, SettingsModel, ISettingsMethods>(
  {
    darkMode: { 
      type: Boolean, 
      default: false 
    },
    emailNotifications: { 
      type: Boolean, 
      default: true 
    },
    autoGenerateMonthlyReport: { 
      type: Boolean, 
      default: true 
    },
    monthlyReportFormat: { 
      type: String, 
      enum: ['PDF', 'EXCEL', 'BOTH'], 
      default: 'PDF' 
    },
    feedbackPages: {
      type: feedbackPagesSchema,
      default: {
        feedbackCollectionEnabled: true,
        clientInfoEnabled: true,
        suggestionEnabled: true,
        thankYouEnabled: true
      }
    },
    updatedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    }
  },
  {
    timestamps: true,
  }
);

// Static method to get or create default settings
settingsSchema.statics.getOrCreateDefault = async function(userId) {
  let settings = await this.findOne();
  
  if (!settings) {
    settings = await this.create({
      darkMode: false,
      language: 'fr',
      emailNotifications: true,
      autoGenerateMonthlyReport: true,
      monthlyReportFormat: 'PDF',
      feedbackPages: {
        feedbackCollectionEnabled: true,
        clientInfoEnabled: true,
        suggestionEnabled: true,
        thankYouEnabled: true
      },
      updatedBy: userId
    });
  }
  
  return settings;
};

// Add plugins
settingsSchema.plugin(toJSON);
settingsSchema.plugin(paginate);

const Settings =
  mongoose.models.Settings || 
  mongoose.model<ISettings, SettingsModel>("Settings", settingsSchema);

export default Settings; 