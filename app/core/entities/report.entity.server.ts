/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */

import mongoose, { Schema, Model } from "mongoose";
import { type IBaseModel } from "~/core/abstracts/model.server";
import toJSON from "~/core/db/plugins/toJSON.plugin.server";
import paginate from "~/core/db/plugins/paginate.plugin.server";

export interface IReport extends IBaseModel {
  name: string;
  format: 'PDF' | 'EXCEL';
  size: string;
  date: Date;
  type: 'employees' | 'clients' | 'pharmacy-reviews' | 'employee-reviews' | 'specific-employee-reviews' | 'suggestions';
  filePath: string;
  downloadCount: number;
  generatedBy: mongoose.Types.ObjectId; // Reference to User model
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export type IReportMethods = {
  incrementDownloadCount(): Promise<void>;
};

export type ReportModel = Model<IReport, {}, IReportMethods>;

const reportSchema = new Schema<IReport, ReportModel, IReportMethods>(
  {
    name: { 
      type: String, 
      required: true 
    },
    format: { 
      type: String, 
      enum: ['PDF', 'EXCEL'], 
      required: true 
    },
    size: { 
      type: String, 
      required: true 
    },
    date: { 
      type: Date, 
      default: Date.now 
    },
    type: { 
      type: String, 
      enum: [
        'employees', 
        'clients', 
        'pharmacy-reviews', 
        'employee-reviews', 
        'specific-employee-reviews', 
        'suggestions'
      ],
      required: true 
    },
    filePath: { 
      type: String, 
      required: true 
    },
    downloadCount: { 
      type: Number, 
      default: 0 
    },
    generatedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    },
    dateRange: {
      start: { type: Date },
      end: { type: Date }
    }
  },
  {
    timestamps: true,
  }
);

// Methods
reportSchema.method("incrementDownloadCount", async function incrementDownloadCount() {
  this.downloadCount += 1;
  await this.save();
});

// Add indexes for better performance
reportSchema.index({ type: 1, date: -1 });
reportSchema.index({ generatedBy: 1, date: -1 });
reportSchema.index({ 'dateRange.start': 1, 'dateRange.end': 1 });

// Add plugins
reportSchema.plugin(toJSON);
reportSchema.plugin(paginate);

const Report =
  mongoose.models.Report || 
  mongoose.model<IReport, ReportModel>("Report", reportSchema);

export default Report; 