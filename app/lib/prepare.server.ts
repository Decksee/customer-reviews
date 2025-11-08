import { createServer } from "http";
import { connectDB, disconnectDB } from "~/core/db/db.server";
import { logger } from "~/core/utils/logger.server";
import emailUtils from "~/core/utils/email.server";
import { schedulerService } from "~/services/scheduler.service.server";
import { settingsService } from "~/services/settings.service.server";
import { redirect } from "react-router";

// Keep track of server initialization
let isServerInitialized = false;

/**
 * Prepare the server for production use
 * 
 * This function initializes the server, connects to the database,
 * initializes the system configuration, and sets up the email service.
 * 
 * @returns {Promise<void>}
 */
export default async function prepareServer() {
  if (isServerInitialized) {
    return;
  }

  try {
    // Initialize database first
    try {
      await connectDB();
      logger.info("Connected to the database.");
    } catch (error) {
      logger.error("Failed to connect to database:", error);
      throw error; // Re-throw to prevent further initialization
    }

    // Initialize settings service - ensure default settings exist
    try {
      await settingsService.getSettings();
      logger.info("Settings initialized.");
    } catch (error) {
      logger.error("Failed to initialize settings:", error);
      // Don't throw here, as we can continue with default settings
    }

    // Initialize email service
    try {
      const isEmailConnected = await emailUtils.connectToEmailServer(['test']);
      if (isEmailConnected) {
        logger.info("Email server initialized.");
      } else {
        logger.error("Failed to initialize email server.");
        // Don't throw here, as email is not critical for the app to run
      }
    } catch (error) {
      logger.error("Error initializing email service:", error);
      // Don't throw here, as email is not critical for the app to run
    }

    // Initialize scheduler for automatic report generation using cron
    try {
      await schedulerService.initialize();
      logger.info("Report scheduler initialized with cron jobs.");
    } catch (error) {
      logger.error("Error initializing report scheduler:", error);
      // Don't throw here, as scheduler is not critical for the app to run
    }

    isServerInitialized = true;
  } catch (error) {
    logger.error("Failed to prepare server:", error);
    // Clean up any partial initialization
    await disconnectDB();
    throw error;
  }
}
