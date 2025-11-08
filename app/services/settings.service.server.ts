/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import Settings, {
  type ISettings,
  type ISettingsMethods,
  type SettingsModel,
} from "~/core/entities/settings.entity.server";
import { BaseService } from "~/core/abstracts/service.server";
import { logger } from "~/core/utils/logger.server";

export default class SettingsService extends BaseService<
  ISettings,
  ISettingsMethods,
  SettingsModel
> {
  constructor() {
    super(Settings);
  }

  private static instance: SettingsService;

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  /**
   * Get application settings
   * If settings don't exist, creates default settings
   */
  async getSettings(userId?: string): Promise<ISettings> {
    const settings = await this.model.findOne();
    
    if (!settings) {
      // Create default settings
      return this.createDefaultSettings(userId);
    }
    
    return settings;
  }

  /**
   * Create default settings
   */
  async createDefaultSettings(userId?: string): Promise<ISettings> {
    logger.info('Creating default application settings');
    
    return this.model.create({
      darkMode: false,
      emailNotifications: true,
      autoGenerateMonthlyReport: true,
      monthlyReportFormat: 'PDF',
      feedbackPages: {
        feedbackCollectionEnabled: true,// Always true
        clientInfoEnabled: true,
        suggestionEnabled: true,
        thankYouEnabled: true
      },
      updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined
    });
  }

  /**
   * Update application settings
   */
  async updateSettings(settings: Partial<ISettings>, userId: string): Promise<ISettings> {
    const currentSettings = await this.getSettings();
    
    if (!currentSettings) {
      return this.createDefaultSettings(userId);
    }
    
    // Update the settings with new values
    Object.assign(currentSettings, settings, {
      updatedBy: new mongoose.Types.ObjectId(userId)
    });
    
    await (currentSettings as any).save();
    return currentSettings;
  }

  /**
   * Get report generation settings
   */
  async getReportSettings(): Promise<{
    autoGenerateMonthlyReport: boolean;
    monthlyReportFormat: 'PDF' | 'EXCEL' | 'BOTH';
  }> {
    const settings = await this.getSettings();
    
    return {
      autoGenerateMonthlyReport: settings.autoGenerateMonthlyReport,
      monthlyReportFormat: settings.monthlyReportFormat
    };
  }

  /**
   * Map settings entity to view model for UI
   * @param settings - The settings entity from database
   * @returns Object - Settings object formatted for the UI
   */
  mapToViewModel(settings: ISettings): any {
    console.log("mapToViewModel received:", settings);
    
    // Extract feedback pages, ensuring defaults if not present
    let feedbackPages;
    
    if (settings.feedbackPages) {
      // Use explicit boolean comparisons to ensure correct type
      feedbackPages = {
        feedbackCollectionEnabled: settings.feedbackPages.feedbackCollectionEnabled === true,
        clientInfoEnabled: settings.feedbackPages.clientInfoEnabled === true,
        suggestionEnabled: settings.feedbackPages.suggestionEnabled === true,
        thankYouEnabled: settings.feedbackPages.thankYouEnabled === true
      };
    } else {
      // Default values if not present
      feedbackPages = {
        feedbackCollectionEnabled: true,
        clientInfoEnabled: true,
        suggestionEnabled: true,
        thankYouEnabled: true
      };
    }
    
    // Create the view model
    const viewModel = {
      display: {
        darkModeEnabled: settings.darkMode === true
      },
      feedbackPages: feedbackPages,
      reports: {
        autoGenerateMonthlyReport: settings.autoGenerateMonthlyReport === true,
        emailNotifications: settings.emailNotifications === true,
        monthlyReportFormat: settings.monthlyReportFormat || 'PDF',
      }
    };
    
    console.log("mapToViewModel returning:", viewModel);
    return viewModel;
  }

  /**
   * Map UI view model to settings entity for saving
   * @param viewModel - The settings object from the UI
   * @returns Partial<ISettings> - Settings object formatted for the database
   */
  mapFromViewModel(viewModel: any): Partial<ISettings> {
    // Log the input
    console.log("mapFromViewModel received:", viewModel);
    
    // Handle display settings
    const darkMode = viewModel.display?.darkModeEnabled === true;
    
    // Handle report settings
    const emailNotifications = viewModel.reports?.emailNotifications === true;
    const autoGenerateMonthlyReport = viewModel.reports?.autoGenerateMonthlyReport === true;
    const monthlyReportFormat = viewModel.reports?.monthlyReportFormat || 'PDF';
    
    // Handle feedback page settings
    let feedbackPages = undefined;
    
    if (viewModel.feedbackPages) {
      feedbackPages = {
        feedbackCollectionEnabled: viewModel.feedbackPages.feedbackCollectionEnabled === true,
        clientInfoEnabled: viewModel.feedbackPages.clientInfoEnabled === true,
        suggestionEnabled: viewModel.feedbackPages.suggestionEnabled === true,
        thankYouEnabled: viewModel.feedbackPages.thankYouEnabled === true
      };
    }
    
    // Create the final settings object
    const mappedSettings: Partial<ISettings> = {
      darkMode,
      emailNotifications,
      autoGenerateMonthlyReport,
      monthlyReportFormat
    };
    
    // Add feedback pages if they exist
    if (feedbackPages) {
      mappedSettings.feedbackPages = feedbackPages;
    }
    
    // Log the output
    console.log("mapFromViewModel returning:", mappedSettings);
    
    return mappedSettings;
  }

  // Get the feedback page settings
  async getFeedbackPageSettings(): Promise<{ feedbackCollectionEnabled: boolean; clientInfoEnabled: boolean; suggestionEnabled: boolean; thankYouEnabled: boolean }> {
    // Default settings
    const defaultSettings = {
      feedbackCollectionEnabled: true,
      clientInfoEnabled: true,
      suggestionEnabled: true,
      thankYouEnabled: true
    };

    try {
      // Fetch settings from the database
      const settings = await this.getSettings();

      // Return a clean object with destructured properties to avoid returning mongoose objects
      if (settings.feedbackPages) {
        const { feedbackCollectionEnabled, clientInfoEnabled, suggestionEnabled, thankYouEnabled } = settings.feedbackPages;
        return {
          feedbackCollectionEnabled: feedbackCollectionEnabled === true,
          clientInfoEnabled: clientInfoEnabled === true,
          suggestionEnabled: suggestionEnabled === true,
          thankYouEnabled: thankYouEnabled === true
        };
      }

      return { ...defaultSettings };
    } catch (error) {
      console.error("Error fetching feedback page settings:", error);
      // Return default settings in case of an error
      return { ...defaultSettings };
    }
  }
}

export const settingsService = SettingsService.getInstance(); 