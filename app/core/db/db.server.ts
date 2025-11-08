import config from '~/config/config.server';
import mongoose from 'mongoose';
import { logger } from '~/core/utils/logger.server';

/**
 * Establishes connection to MongoDB database using Mongoose.
 * This function handles the primary database connection for the application.
 * 
 * @returns Promise that resolves when connection is established
 * 
 * @throws {Error} If connection fails or configuration is invalid
 * 
 * @example
 * // In your application startup
 * try {
 *   await connectDB();
 *   // Database is now connected, proceed with app startup
 * } catch (error) {
 *   console.error('Failed to connect to database:', error);
 *   process.exit(1);
 * }
 * 
 * @remarks
 * - Uses connection string from config.db.dbUrlString
 * - Applies connection options from config.db.options
 * - Logs connection status using the application logger
 * - Implements connection retry logic with exponential backoff
 */
export const connectDB = async () => {
  const MAX_RETRIES = 5;
  const INITIAL_RETRY_DELAY = 1000; // 1 second

  let currentTry = 0;
  let lastError: Error | null = null;

  while (currentTry < MAX_RETRIES) {
    try {
      // Validate connection string
      if (!config.db.mainDbUrl) {
        throw new Error('Database connection string is not configured');
      }

      // Enhanced connection options
      const options: mongoose.ConnectOptions = {
        serverSelectionTimeoutMS: 30000, // Increased from 5000
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000, // Increased from 10000
        maxPoolSize: 10,
        minPoolSize: 5,
        retryWrites: true,
        retryReads: true,
        heartbeatFrequencyMS: 2000,
        autoIndex: true,
        family: 4, // Use IPv4, skip trying IPv6
        // Add operation timeouts
        waitQueueTimeoutMS: 30000,
        // Add buffer commands
        bufferCommands: true,
      };

      // Set global mongoose options
      mongoose.set('bufferCommands', true);
      mongoose.set('bufferTimeoutMS', 30000);

      // Attempt to connect with proper timeout settings
      await mongoose.connect(config.db.mainDbUrl, options);

      // If we get here, connection was successful
      logger.info('🟢 Database connection established successfully');
      
      // Set up connection event handlers
      mongoose.connection.on('error', (error) => {
        logger.error(`❌ Database connection error: ${error.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️ Database connection lost. Attempting to reconnect...');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('🟢 Database connection re-established');
      });

      // Verify the connection is still valid
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        logger.info('🟢 Database ping successful');
      }

      return mongoose.connection;

    } catch (error: any) {
      lastError = error;
      currentTry++;

      // Calculate delay with exponential backoff
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, currentTry - 1);

      logger.warn(
        `❌ Database connection attempt ${currentTry}/${MAX_RETRIES} failed: ${error.message}`
      );

      if (currentTry < MAX_RETRIES) {
        logger.info(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If we get here, all retries failed
  const errorMessage = `Failed to connect to database after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`;
  logger.error(errorMessage);
  throw new Error(errorMessage);
};

/**
 * Gracefully closes the database connection.
 * Useful for cleanup during application shutdown.
 * 
 * @returns Promise that resolves when connection is closed
 * 
 * @example
 * // In your application shutdown handler
 * process.on('SIGTERM', async () => {
 *   await disconnectDB();
 *   process.exit(0);
 * });
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('🔵 Database connection closed gracefully');
  } catch (error: any) {
    logger.error(`❌ Error closing database connection: ${error.message}`);
    throw error;
  }
};
