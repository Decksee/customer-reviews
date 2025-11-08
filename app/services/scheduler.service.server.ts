import { reportService } from "./report.service.server";
import { settingsService } from "./settings.service.server";
import fs from "node:fs";
import path from "node:path";
import * as cron from "node-cron";
import { logger } from "~/core/utils/logger.server";

// Dictionary of scheduled tasks
type ScheduledTask = {
  cronJob: cron.ScheduledTask;
  isEnabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
};

export default class SchedulerService {
  private static instance: SchedulerService;
  private scheduledTasks: Record<string, ScheduledTask> = {};
  private initialized = false;

  constructor() {}

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Initialize scheduler and register cron jobs
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Get settings for auto report generation
      const reportSettings = await settingsService.getReportSettings();
      
      // Register monthly report generation job (runs at 1:00 AM on first day of each month)
      this.registerMonthlyReportJob(
        reportSettings.autoGenerateMonthlyReport,
        reportSettings.monthlyReportFormat
      );
      
      this.initialized = true;
      logger.info('Scheduler initialized successfully with cron jobs');
    } catch (error) {
      logger.error('Failed to initialize scheduler:', error);
    }
  }

  /**
   * Register the monthly report generation job 
   */
  registerMonthlyReportJob(isEnabled: boolean, reportFormat: 'PDF' | 'EXCEL' | 'BOTH'): void {
    // Schedule for 11:55 PM on the last day of every month
    const cronJob = cron.schedule('55 23 28-31 * *', async () => {
      try {
        logger.info('Running scheduled monthly report generation');
        
        // Check if it's actually the last day of the month
        const now = new Date();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        
        // Only run if it's the last day of the month
        if (now.getDate() !== lastDayOfMonth) {
          logger.info('Skipping - not the last day of month');
          return;
        }
        
        // Get latest settings in case they changed
        const settings = await settingsService.getReportSettings();
        
        // Skip if disabled in latest settings
        if (!settings.autoGenerateMonthlyReport) {
          logger.info('Monthly report generation skipped - disabled in settings');
          return;
        }
        
        // Use latest format setting
        const format = settings.monthlyReportFormat;
        
        await this.generateMonthlyReport(format);
        
        // Update last run time
        if (this.scheduledTasks['monthlyReport']) {
          this.scheduledTasks['monthlyReport'].lastRun = new Date();
        }
        
        logger.info('Monthly report generation completed successfully');
      } catch (error) {
        logger.error('Failed to generate monthly report:', error);
      }
    });
    
    // Start or stop the job based on isEnabled
    if (isEnabled) {
      cronJob.start();
    } else {
      cronJob.stop();
    }
    
    // Store the scheduled task
    this.scheduledTasks['monthlyReport'] = {
      cronJob,
      isEnabled,
      lastRun: undefined,
      nextRun: this.getNextRunDate('55 23 28-31 * *')
    };
    
    if (isEnabled) {
      logger.info(`Monthly report generation scheduled for the end of month at ${this.scheduledTasks['monthlyReport'].nextRun}`);
    } else {
      logger.info('Monthly report generation is disabled');
    }
  }

  /**
   * Calculate the next run date based on cron expression
   */
  getNextRunDate(cronExpression: string): Date {
    try {
      // Instead of using cron parsing which was causing issues, 
      // calculate the date of the last day of the current or next month
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth();
      
      // If we're already past 11:55 PM on the last day of the month, move to next month
      const lastDayOfCurrentMonth = new Date(year, month + 1, 0);
      lastDayOfCurrentMonth.setHours(23, 55, 0, 0);
      
      if (now > lastDayOfCurrentMonth) {
        month++;
        if (month > 11) {
          month = 0;
          year++;
        }
      }
      
      // Get the last day of the target month
      const lastDay = new Date(year, month + 1, 0);
      lastDay.setHours(23, 55, 0, 0);
      
      return lastDay;
    } catch (error) {
      logger.error('Error calculating next run date:', error);
      return new Date(); // Return current date as fallback
    }
  }

  /**
   * Update scheduler settings based on application settings
   */
  async updateSettings(): Promise<void> {
    try {
      const settings = await settingsService.getReportSettings();
      
      // Update monthly report job
      if (this.scheduledTasks['monthlyReport']) {
        const { cronJob } = this.scheduledTasks['monthlyReport'];
        
        if (settings.autoGenerateMonthlyReport) {
          cronJob.start();
          this.scheduledTasks['monthlyReport'].isEnabled = true;
          this.scheduledTasks['monthlyReport'].nextRun = this.getNextRunDate('55 23 28-31 * *');
          logger.info(`Monthly report generation enabled. Next run: ${this.scheduledTasks['monthlyReport'].nextRun}`);
        } else {
          cronJob.stop();
          this.scheduledTasks['monthlyReport'].isEnabled = false;
          logger.info('Monthly report generation disabled');
        }
      } else {
        // If job doesn't exist, create it
        this.registerMonthlyReportJob(
          settings.autoGenerateMonthlyReport,
          settings.monthlyReportFormat
        );
      }
    } catch (error) {
      logger.error('Failed to update scheduler settings:', error);
    }
  }

  /**
   * Generate monthly reports
   */
  async generateMonthlyReport(format: 'PDF' | 'EXCEL' | 'BOTH'): Promise<void> {
    try {
      // Generate for last month
      const reports = await reportService.generateReportForPeriod('last-month');
      
      if (format === 'BOTH') {
        // Also generate Excel reports if format is BOTH
        for (const reportType of ['employees', 'pharmacy-reviews', 'employee-reviews']) {
          // Use admin user ID (in a real app, you would get this from your settings)
          const adminUserId = "655b37138a9d65c65c888888"; // Mock admin ID
          const dateRange = reportService.getDateRangeForPeriod('last-month');
          
          await reportService.generateReport(
            reportType as any,
            'EXCEL',
            adminUserId,
            dateRange
          );
        }
      }
      
      logger.info(`Generated ${reports.length} monthly reports in ${format === 'BOTH' ? 'PDF and EXCEL' : format} format`);
      return;
    } catch (error) {
      logger.error('Error generating monthly report:', error);
      throw error;
    }
  }

  /**
   * Force run a scheduled task
   */
  async runTask(taskId: string): Promise<boolean> {
    if (!this.scheduledTasks[taskId]) {
      logger.error(`Task ${taskId} not found`);
      return false;
    }
    
    try {
      if (taskId === 'monthlyReport') {
        const settings = await settingsService.getReportSettings();
        await this.generateMonthlyReport(settings.monthlyReportFormat);
        this.scheduledTasks[taskId].lastRun = new Date();
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Error running task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Get information about all scheduled tasks
   */
  getTasksInfo(): Record<string, { isEnabled: boolean; lastRun?: Date; nextRun?: Date }> {
    const info: Record<string, { isEnabled: boolean; lastRun?: Date; nextRun?: Date }> = {};
    
    for (const [taskId, task] of Object.entries(this.scheduledTasks)) {
      info[taskId] = {
        isEnabled: task.isEnabled,
        lastRun: task.lastRun,
        nextRun: task.nextRun
      };
    }
    
    return info;
  }
}

// Export singleton instance
export const schedulerService = SchedulerService.getInstance(); 