/* eslint-disable @typescript-eslint/no-explicit-any */
import FeedbackSession, {
  type IFeedbackSession,
  type IFeedbackSessionMethods,
  type FeedbackSessionModel,
} from "~/core/entities/feedback-session.entity.server";
import { BaseService } from "~/core/abstracts/service.server";
import { logger } from "~/core/utils/logger.server";
import mongoose, { type PipelineStage } from "mongoose";
import { ObjectId } from "mongodb";
import { positionService } from "~/services/position.service.server";

export default class FeedbackSessionService extends BaseService<
  IFeedbackSession,
  IFeedbackSessionMethods,
  FeedbackSessionModel
> {
  constructor() {
    super(FeedbackSession);
  }

  private static instance: FeedbackSessionService;

  public static getInstance(): FeedbackSessionService {
    if (!FeedbackSessionService.instance) {
      FeedbackSessionService.instance = new FeedbackSessionService();
    }
    return FeedbackSessionService.instance;
  }

  /**
   * Initialize a new feedback session
   * @param deviceId - Unique identifier for the device
   * @param inactivityTimeout - Timeout in minutes before session is considered abandoned (default: 1440 minutes or 24 hours)
   * @returns Promise<IFeedbackSession> - The created feedback session
   */
  async initializeSession(
    deviceId: string,
    inactivityTimeout: number = 1440
  ): Promise<IFeedbackSession> {
    try {
      // No longer generating a separate sessionId - we'll use MongoDB's _id
      const session = await this.createOne({
        // We'll set the sessionId field to match the MongoDB _id after creation
        deviceId,
        employeeRatings: [],
        lastActiveAt: new Date(),
        startedAt: new Date(),
        completed: false,
        processed: false,
        status: "active",
        inactivityTimeout,
      });

      // Now set the sessionId to match the MongoDB document ID
      session.sessionId = session._id.toString();
      await session.save();

      return session;
    } catch (error) {
      logger.error("Error initializing feedback session:", error);
      throw new Error("Failed to initialize feedback session");
    }
  }

  /**
   * Get active session by session ID
   * @param sessionId - The unique session identifier (either a sessionId value or MongoDB _id)
   * @returns Promise<IFeedbackSession | null> - The feedback session or null if not found
   */
  async getSessionById(sessionId: string): Promise<IFeedbackSession | null> {
    try {
      // First try finding by sessionId field
      let session = await this.model.findOne({ sessionId });

      // If not found and sessionId looks like a MongoDB ObjectId, try finding by _id
      if (!session && sessionId.match(/^[0-9a-fA-F]{24}$/)) {
        try {
          session = await this.model.findById(sessionId);
        } catch (err) {
          // Ignore errors with ObjectId casting
          logger.debug("Failed to find session by _id:", err);
        }
      }

      return session;
    } catch (error) {
      logger.error("Error getting feedback session by ID:", error);
      return null;
    }
  }

  /**
   * Update pharmacy rating in a session
   * @param sessionId - The unique session identifier
   * @param pharmacyRating - Rating value from 1-5
   * @returns Promise<IFeedbackSession | null> - The updated feedback session or null if update failed
   */
  async updatePharmacyRating(
    sessionId: string,
    pharmacyRating: number
  ): Promise<IFeedbackSession | null> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) {
        return null;
      }

      session.pharmacyRating = pharmacyRating;
      session.lastActiveAt = new Date();

      await session.save();
      return session;
    } catch (error) {
      logger.error("Error updating pharmacy rating:", error);
      return null;
    }
  }

  /**
   * Update or add employee ratings in a session
   * @param sessionId - The unique session identifier
   * @param employeeRatings - Array of employee ratings with employee ID, rating value, and optional comment
   * @returns Promise<IFeedbackSession | null> - The updated feedback session or null if update failed
   */
  async updateEmployeeRatings(
    sessionId: string,
    employeeRatings: Array<{
      employeeId: string;
      rating: number;
      comment?: string;
    }>
  ): Promise<IFeedbackSession | null> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) {
        return null;
      }

      // Convert string IDs to ObjectIds
      const formattedRatings = employeeRatings.map((rating) => ({
        employeeId: new mongoose.Types.ObjectId(rating.employeeId),
        rating: rating.rating,
        comment: rating.comment,
      }));

      session.employeeRatings = formattedRatings;
      session.lastActiveAt = new Date();

      await session.save();
      return session;
    } catch (error) {
      logger.error("Error updating employee ratings:", error);
      return null;
    }
  }

  /**
   * Update client contact information in a session
   * @param sessionId - The unique session identifier
   * @param clientData - Client contact information
   * @returns Promise<IFeedbackSession | null> - The updated feedback session or null if update failed
   */
  async updateClientData(
    sessionId: string,
    clientData: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      consent: boolean;
    }
  ): Promise<IFeedbackSession | null> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) {
        return null;
      }

      session.clientData = clientData;
      session.lastActiveAt = new Date();

      await session.save();
      return session;
    } catch (error) {
      logger.error("Error updating client data:", error);
      return null;
    }
  }

  /**
   * Update suggestion in a session
   * @param sessionId - The unique session identifier
   * @param suggestion - Suggestion text
   * @returns Promise<IFeedbackSession | null> - The updated feedback session or null if update failed
   */
  async updateSuggestion(
    sessionId: string,
    suggestion: string
  ): Promise<IFeedbackSession | null> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) {
        return null;
      }

      session.suggestion = suggestion;
      session.lastActiveAt = new Date();

      await session.save();
      return session;
    } catch (error) {
      logger.error("Error updating suggestion:", error);
      return null;
    }
  }

  /**
   * Complete a feedback session
   * @param sessionId - The unique session identifier
   * @returns Promise<IFeedbackSession | null> - The completed feedback session or null if completion failed
   */
  async completeSession(sessionId: string): Promise<IFeedbackSession | null> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) {
        return null;
      }

      session.completed = true;
      session.status = "completed";
      session.completedAt = new Date();
      session.lastActiveAt = new Date();

      await session.save();
      return session;
    } catch (error) {
      logger.error("Error completing feedback session:", error);
      return null;
    }
  }

  /**
   * Find and process stale sessions
   * @param olderThanMinutes - Process sessions inactive for at least this many minutes
   * @returns Promise<number> - Number of processed sessions
   */
  async processAbandonedSessions(
    olderThanMinutes: number = 120
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMinutes(cutoffDate.getMinutes() - olderThanMinutes);

      const staleSessions = await this.model.find({
        status: "active",
        processed: false,
        lastActiveAt: { $lt: cutoffDate },
      });

      let processedCount = 0;

      for (const session of staleSessions) {
        if (this.hasValidData(session)) {
          // Mark as abandoned but keep the data
          session.status = "abandoned";
          session.processed = true;
          await session.save();
        } else {
          // No valuable data, just delete
          await this.model.findByIdAndDelete(session._id);
        }
        processedCount++;
      }

      return processedCount;
    } catch (error) {
      logger.error("Error processing abandoned sessions:", error);
      return 0;
    }
  }

  /**
   * Check if a session has valid data worth keeping
   * @param session - The feedback session to check
   * @returns boolean - True if the session has valuable data
   */
  private hasValidData(session: IFeedbackSession): boolean {
    // Session has valid data if it has a pharmacy rating
    // or at least one employee rating or a suggestion
    return (
      !!session.pharmacyRating ||
      (session.employeeRatings && session.employeeRatings.length > 0) ||
      !!session.suggestion
    );
  }

  /**
   * Get active session by device ID (most recent)
   * @param deviceId - The device identifier
   * @returns Promise<IFeedbackSession | null> - The most recent active session or null if not found
   */
  async getActiveSessionByDeviceId(
    deviceId: string
  ): Promise<IFeedbackSession | null> {
    try {
      return await this.model
        .findOne({
          deviceId,
          status: "active",
          processed: false,
        })
        .sort({ lastActiveAt: -1 });
    } catch (error) {
      logger.error("Error getting active session by device ID:", error);
      return null;
    }
  }

  /**
   * Update session activity timestamp
   * @param sessionId - The unique session identifier
   * @returns Promise<boolean> - True if update successful, false otherwise
   */
  async updateSessionActivity(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) {
        return false;
      }

      session.lastActiveAt = new Date();
      await session.save();
      return true;
    } catch (error) {
      logger.error("Error updating session activity timestamp:", error);
      return false;
    }
  }

  /**
   * Update session status
   * @param sessionId - The unique session identifier
   * @param status - New status ('active', 'completed', 'abandoned', 'processed')
   * @returns Promise<boolean> - True if update successful, false otherwise
   */
  async updateSessionStatus(
    sessionId: string,
    status: "active" | "completed" | "abandoned" | "processed"
  ): Promise<boolean> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) {
        return false;
      }

      session.status = status;

      // If completing, set completed flag and timestamp
      if (status === "completed") {
        session.completed = true;
        session.completedAt = new Date();
      }

      // If marking as processed, set processed flag
      if (status === "processed" || status === "abandoned") {
        session.processed = true;
      }

      session.lastActiveAt = new Date();
      await session.save();
      return true;
    } catch (error) {
      logger.error("Error updating session status:", error);
      return false;
    }
  }

  /**
   * Create or update a complete feedback session from client-side data
   * @param sessionData - Complete session data from client
   * @returns Promise<IFeedbackSession | null> - The created/updated session or null if operation failed
   */
  async syncSession(sessionData: any): Promise<IFeedbackSession | null> {
    try {
      let session = await this.getSessionById(sessionData.sessionId);

      if (session) {
        // Update existing session
        if (sessionData.pharmacyRating !== undefined) {
          session.pharmacyRating = sessionData.pharmacyRating;
        }

        if (
          sessionData.employeeRatings &&
          sessionData.employeeRatings.length > 0
        ) {
          // Convert string IDs to ObjectIds
          const formattedRatings = sessionData.employeeRatings.map(
            (rating: any) => ({
              employeeId: new mongoose.Types.ObjectId(rating.employeeId),
              rating: rating.rating,
              comment: rating.comment,
            })
          );

          session.employeeRatings = formattedRatings;
        }

        if (sessionData.clientData) {
          session.clientData = sessionData.clientData;
        }

        if (sessionData.suggestion !== undefined) {
          session.suggestion = sessionData.suggestion;
        }

        if (sessionData.status) {
          session.status = sessionData.status;
        }

        if (sessionData.completed) {
          session.completed = true;
          session.completedAt = new Date();
        }

        session.lastActiveAt = new Date();
        await session.save();
      } else {
        // Create new session
        const newSessionData: any = {
          sessionId: sessionData.sessionId,
          deviceId: sessionData.deviceId,
          employeeRatings: [],
          lastActiveAt: new Date(),
          startedAt: new Date(sessionData.startedAt) || new Date(),
          completed: sessionData.completed || false,
          processed: sessionData.processed || false,
          status: sessionData.status || "active",
          inactivityTimeout: sessionData.inactivityTimeout || 1440,
        };

        if (sessionData.pharmacyRating !== undefined) {
          newSessionData.pharmacyRating = sessionData.pharmacyRating;
        }

        if (
          sessionData.employeeRatings &&
          sessionData.employeeRatings.length > 0
        ) {
          // Convert string IDs to ObjectIds
          newSessionData.employeeRatings = sessionData.employeeRatings.map(
            (rating: any) => ({
              employeeId: new mongoose.Types.ObjectId(rating.employeeId),
              rating: rating.rating,
              comment: rating.comment,
            })
          );
        }

        if (sessionData.clientData) {
          newSessionData.clientData = sessionData.clientData;
        }

        if (sessionData.suggestion !== undefined) {
          newSessionData.suggestion = sessionData.suggestion;
        }

        if (sessionData.completedAt) {
          newSessionData.completedAt = new Date(sessionData.completedAt);
        }

        session = await this.createOne(newSessionData);
      }

      return session;
    } catch (error) {
      logger.error("Error syncing session:", error);
      return null;
    }
  }

  /**
   * Get client data extracted from feedback sessions
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @param search - Optional search term for client name or contact info
   * @returns Promise<{clients: any[], total: number}> - Paginated clients and total count
   */
  async getClientsList(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<{ clients: any[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      // Build the search filter if provided
      const searchFilter: any = search
        ? {
            $or: [
              { "clientData.firstName": { $regex: search, $options: "i" } },
              { "clientData.lastName": { $regex: search, $options: "i" } },
              { "clientData.email": { $regex: search, $options: "i" } },
              { "clientData.phone": { $regex: search, $options: "i" } },
            ],
          }
        : {};

      // Only include sessions with client data
      const baseFilter = {
        clientData: { $exists: true, $ne: null },
        ...searchFilter,
      };

      // Get the total count
      const total = await this.model.countDocuments(baseFilter);

      // Get the clients with pagination
      const sessions = await this.model
        .find(baseFilter)
        .sort({ lastActiveAt: -1 })
        .skip(skip)
        .limit(limit);

      // Extract and format client data
      const clients = sessions.map((session) => {
        return {
          id: session._id.toString(),
          sessionId: session.sessionId,
          firstName: session.clientData?.firstName || "",
          lastName: session.clientData?.lastName || "",
          email: session.clientData?.email || "",
          phone: session.clientData?.phone || "",
          consent: session.clientData?.consent || false,
          dateJoined: session.startedAt,
          lastVisit: session.lastActiveAt,
          totalVisits: 1, // This would need to be aggregated from multiple sessions
          totalReviews:
            session.pharmacyRating || session.employeeRatings?.length ? 1 : 0,
          avgRating: session.pharmacyRating || 0,
        };
      });

      return { clients, total };
    } catch (error) {
      logger.error("Error getting clients list:", error);
      return { clients: [], total: 0 };
    }
  }

  /**
   * Get pharmacy ratings data for reporting
   * @param timeFilter - Time period filter (all, 30days, quarter, etc.)
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @param ratingFilter - Optional filter for specific rating value
   * @param sentimentFilter - Optional filter for sentiment (all, positive, negative)
   * @returns Promise<{ratings: any[], stats: any, total: number}> - Ratings data, stats and total count
   */
  async getPharmacyRatings(
    timeFilter: string = "all",
    page: number = 1,
    limit: number = 10,
    ratingFilter?: string,
    sentimentFilter: string = "all"
  ): Promise<{ ratings: any[]; stats: any; total: number }> {
    try {
      const skip = (page - 1) * limit;

      // Build the date filter based on timeFilter
      const dateFilter: any = {};
      const now = new Date();

      if (timeFilter !== "all") {
        let startDate = new Date();

        switch (timeFilter) {
          case "30days":
            startDate.setDate(startDate.getDate() - 30);
            break;
          case "quarter":
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case "semester":
            startDate.setMonth(startDate.getMonth() - 6);
            break;
          case "year":
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          case "lastYear":
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() - 1);
            startDate.setFullYear(startDate.getFullYear() - 2);
            dateFilter.lastActiveAt = { $gte: startDate, $lte: endDate };
            break;
          default:
            break;
        }

        if (!dateFilter.lastActiveAt) {
          dateFilter.lastActiveAt = { $gte: startDate };
        }
      }

      // AJOUTEZ CE BLOC - Filtre de sentiment
      let ratingNumFilter: any;

      if (sentimentFilter === "positive") {
        ratingNumFilter = {
          pharmacyRating: { $gte: 4, $exists: true, $ne: null },
        };
      } else if (sentimentFilter === "negative") {
        ratingNumFilter = {
          pharmacyRating: { $lte: 3, $exists: true, $ne: null },
        };
      } else if (ratingFilter && ratingFilter !== "all") {
        // Filtre par note exacte (prioritaire)
        ratingNumFilter = { pharmacyRating: parseInt(ratingFilter) };
      } else {
        // Tous les avis
        ratingNumFilter = { pharmacyRating: { $exists: true, $ne: null } };
      }

      // Combine filters
      const filter = {
        ...dateFilter,
        ...ratingNumFilter,
      };

      // Get total count
      const total = await this.model.countDocuments(filter);

      // Get ratings with pagination
      const sessions = await this.model
        .find(filter)
        .sort({ lastActiveAt: -1 })
        .skip(skip)
        .limit(limit);

      // Extract and format ratings
      const ratings = sessions.map((session) => ({
        id: session._id.toString(),
        sessionId: session.sessionId,
        rating: session.pharmacyRating || 0,
        comment: "",
        date: session.lastActiveAt,
        client: {
          name: session.clientData
            ? `${session.clientData.firstName || ""} ${
                session.clientData.lastName || ""
              }`.trim()
            : "Anonymous",
        },
      }));

      // Calculate statistics
      const statsResult = await this.calculatePharmacyRatingStats(timeFilter);

      return { ratings, stats: statsResult, total };
    } catch (error) {
      logger.error("Error getting pharmacy ratings:", error);
      return { ratings: [], stats: {}, total: 0 };
    }
  }

  /**
   * Calculate pharmacy rating statistics
   * @param timeFilter - Time period filter
   * @returns Promise<any> - Statistics for the given time period
   */
  private async calculatePharmacyRatingStats(
    timeFilter: string = "all"
  ): Promise<any> {
    try {
      // Build the date filter based on timeFilter
      const dateFilter: any = {};
      const now = new Date();

      if (timeFilter !== "all") {
        let startDate = new Date();

        switch (timeFilter) {
          case "30days":
            startDate.setDate(startDate.getDate() - 30);
            break;
          case "quarter":
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case "semester":
            startDate.setMonth(startDate.getMonth() - 6);
            break;
          case "year":
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          case "lastYear":
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() - 1);
            startDate.setFullYear(startDate.getFullYear() - 2);
            dateFilter.lastActiveAt = { $gte: startDate, $lte: endDate };
            break;
          default:
            // No date filter
            break;
        }

        if (!dateFilter.lastActiveAt) {
          dateFilter.lastActiveAt = { $gte: startDate };
        }
      }

      // Filter for sessions with pharmacy ratings
      const filter = {
        ...dateFilter,
        pharmacyRating: { $exists: true, $ne: null },
      };

      // Get sessions for the calculations
      const sessions = await this.model.find(filter);

      // Calculate average rating
      let totalRating = 0;
      const ratingsDistribution: Record<number, number> = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };

      sessions.forEach((session) => {
        if (session.pharmacyRating) {
          totalRating += session.pharmacyRating;
          ratingsDistribution[session.pharmacyRating] =
            (ratingsDistribution[session.pharmacyRating] || 0) + 1;
        }
      });

      const totalReviews = sessions.length;
      const averageRating =
        totalReviews > 0 ? +(totalRating / totalReviews).toFixed(1) : 0;

      // Calculate comparison to last period
      let comparisonToLastMonth = 0;

      if (timeFilter !== "all") {
        // Calculate the previous period
        const currentPeriodFilter = { ...filter };
        const previousPeriodFilter: any = {};

        let previousStartDate = new Date();
        let previousEndDate = new Date();

        switch (timeFilter) {
          case "30days":
            previousStartDate.setDate(previousStartDate.getDate() - 60);
            previousEndDate.setDate(previousEndDate.getDate() - 30);
            break;
          case "quarter":
            previousStartDate.setMonth(previousStartDate.getMonth() - 6);
            previousEndDate.setMonth(previousEndDate.getMonth() - 3);
            break;
          case "semester":
            previousStartDate.setMonth(previousStartDate.getMonth() - 12);
            previousEndDate.setMonth(previousEndDate.getMonth() - 6);
            break;
          case "year":
            previousStartDate.setFullYear(previousStartDate.getFullYear() - 2);
            previousEndDate.setFullYear(previousEndDate.getFullYear() - 1);
            break;
          default:
            // Default to last month
            previousStartDate.setMonth(previousStartDate.getMonth() - 2);
            previousEndDate.setMonth(previousEndDate.getMonth() - 1);
            break;
        }

        previousPeriodFilter.lastActiveAt = {
          $gte: previousStartDate,
          $lte: previousEndDate,
        };
        previousPeriodFilter.pharmacyRating = { $exists: true, $ne: null };

        // Get sessions for the previous period
        const previousSessions = await this.model.find(previousPeriodFilter);

        // Calculate previous period average
        let previousTotalRating = 0;
        previousSessions.forEach((session) => {
          if (session.pharmacyRating) {
            previousTotalRating += session.pharmacyRating;
          }
        });

        const previousTotalReviews = previousSessions.length;
        const previousAverageRating =
          previousTotalReviews > 0
            ? +(previousTotalRating / previousTotalReviews).toFixed(1)
            : 0;

        comparisonToLastMonth =
          previousAverageRating > 0
            ? +(averageRating - previousAverageRating).toFixed(1)
            : 0;
      }

      return {
        averageRating,
        totalReviews,
        ratingsDistribution,
        comparisonToLastMonth,
      };
    } catch (error) {
      logger.error("Error calculating pharmacy rating stats:", error);
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingsDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
        comparisonToLastMonth: 0,
      };
    }
  }

  /**
   * Get employee ratings data
   * @param employeeId - Optional employee ID to filter for a specific employee
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @returns Promise<{ratings: any[], total: number}> - Employee ratings and total count
   */
  async getEmployeeRatings(
    employeeId?: string,
    page: number = 1,
    limit: number = 10,
    sentimentFilter?: string
  ): Promise<{ ratings: any[]; total: number }> {
    try {
      // First find all sessions with employee ratings
      let matchFilter: any = { "employeeRatings.0": { $exists: true } };

      // If employeeId provided, filter for that specific employee
      if (employeeId) {
        matchFilter = {
          employeeRatings: {
            $elemMatch: {
              employeeId: new mongoose.Types.ObjectId(employeeId),
            },
          },
        };
      }

      // If sentiment filter provided, integrate it to the query
      if (sentimentFilter) {
        let sentimentQuery: any;
        if (sentimentFilter === "positive") {
          sentimentQuery = { "employeeRatings.rating": { $gte: 3 } };
        } else if (sentimentFilter === "negative") {
          sentimentQuery = { "employeeRatings.rating": { $lt: 3 } };
        }
        if (sentimentQuery) {
          matchFilter = { ...matchFilter, ...sentimentQuery };
        }
      }

      // We need to use aggregation to extract employee ratings
      const pipeline: PipelineStage[] = [
        { $match: matchFilter },
        { $unwind: "$employeeRatings" },
        // If employeeId provided, filter again after unwinding
        ...(employeeId
          ? [
              {
                $match: {
                  "employeeRatings.employeeId": new mongoose.Types.ObjectId(
                    employeeId
                  ),
                },
              } as PipelineStage,
            ]
          : []),
        // Join with users collection to get employee details
        {
          $lookup: {
            from: "users",
            localField: "employeeRatings.employeeId",
            foreignField: "_id",
            as: "employee",
          },
        },
        // Unwind the employee array (from lookup)
        { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
        // Join with positions collection to get position details
        {
          $lookup: {
            from: "positions",
            localField: "employee.position",
            foreignField: "_id",
            as: "positionData",
          },
        },
        {
          $project: {
            _id: 1,
            sessionId: 1,
            lastActiveAt: 1,
            clientData: 1,
            employeeId: "$employeeRatings.employeeId",
            rating: "$employeeRatings.rating",
            comment: "$employeeRatings.comment",
            // Include full employee details for proper formatting
            "employee.firstName": 1,
            "employee.lastName": 1,
            "employee.role": 1,
            "employee.currentPosition": 1,
            positionTitle: {
              $cond: {
                if: { $gt: [{ $size: "$positionData" }, 0] },
                then: { $arrayElemAt: ["$positionData.title", 0] },
                else: "$employee.currentPosition",
              },
            },
          },
        },
        { $sort: { lastActiveAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ];

      // Get total count first (no need for lookup here)
      const countPipeline: PipelineStage[] = [
        { $match: matchFilter },
        { $unwind: "$employeeRatings" },
        ...(employeeId
          ? [
              {
                $match: {
                  "employeeRatings.employeeId": new mongoose.Types.ObjectId(
                    employeeId
                  ),
                },
              } as PipelineStage,
            ]
          : []),
        { $count: "total" },
      ];

      const countResult = await this.model.aggregate(countPipeline).exec();
      const total = countResult.length > 0 ? countResult[0].total : 0;

      // Get the ratings
      const results = await this.model.aggregate(pipeline).exec();

      // Format the result
      const ratings = results.map((item) => ({
        id: item._id.toString(),
        sessionId: item.sessionId,
        employeeId: item.employeeId.toString(),
        rating: item.rating,
        comment: item.comment || "",
        date: item.lastActiveAt,
        // Include employee name from the lookup results
        employee: {
          firstName: item.employee?.firstName || "",
          lastName: item.employee?.lastName || "",
          // Include additional fields - role here means position in report context
          role: item.positionTitle || item.employee?.currentPosition || "",
          position: item.positionTitle || item.employee?.currentPosition || "",
        },
        // Also include a formatted name directly for convenience
        employeeName: item.employee
          ? `${item.employee.lastName || ""} ${
              item.employee.firstName || ""
            }`.trim()
          : "N/A",
        clientName: item.clientData
          ? `${item.clientData.firstName || ""} ${
              item.clientData.lastName || ""
            }`.trim()
          : "Anonymous",
      }));

      return { ratings, total };
    } catch (error) {
      logger.error("Error getting employee ratings:", error);
      return { ratings: [], total: 0 };
    }
  }

  /**
   * Get employee statistics from ratings
   * @param employeeId - Optional employee ID to filter for a specific employee
   * @returns Promise<any> - Statistics about employee ratings
   */
  async getEmployeeStatistics(employeeId?: string): Promise<any> {
    try {
      // First find all sessions with employee ratings
      let matchFilter: any = { "employeeRatings.0": { $exists: true } };

      // If employeeId provided, filter for that specific employee
      if (employeeId) {
        matchFilter = {
          employeeRatings: {
            $elemMatch: {
              employeeId: new mongoose.Types.ObjectId(employeeId),
            },
          },
        };
      }

      // Aggregation pipeline to calculate employee statistics
      const pipeline = [
        { $match: matchFilter },
        { $unwind: "$employeeRatings" },
        // If employeeId provided, filter again after unwinding
        ...(employeeId
          ? [
              {
                $match: {
                  "employeeRatings.employeeId": new mongoose.Types.ObjectId(
                    employeeId
                  ),
                },
              },
            ]
          : []),
        {
          $group: {
            _id: "$employeeRatings.employeeId",
            totalRating: { $sum: "$employeeRatings.rating" },
            totalReviews: { $sum: 1 },
            ratings: { $push: "$employeeRatings.rating" },
          },
        },
        {
          $project: {
            _id: 1,
            totalRating: 1,
            totalReviews: 1,
            averageRating: { $divide: ["$totalRating", "$totalReviews"] },
            ratings: 1,
          },
        },
      ] as unknown as PipelineStage[];

      const results = await this.model.aggregate(pipeline).exec();

      // Format the result
      const employeeStats = results.map((item) => {
        // Calculate distribution of ratings
        const distribution: Record<number, number> = {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        };

        item.ratings.forEach((rating: number) => {
          if (rating >= 1 && rating <= 5) {
            distribution[rating] = (distribution[rating] || 0) + 1;
          }
        });

        return {
          employeeId: item._id.toString(),
          totalReviews: item.totalReviews,
          averageRating: parseFloat(item.averageRating.toFixed(1)),
          score: (item.averageRating * Math.log(item.totalReviews + 1)).toFixed(
            2
          ),
          ratingDistribution: distribution,
        };
      });

      if (employeeId && employeeStats.length > 0) {
        return employeeStats[0];
      }

      return employeeStats;
    } catch (error) {
      logger.error("Error getting employee statistics:", error);
      return [];
    }
  }

  /**
   * Get pharmacy rating trends chart data by time period
   * @param timeFilter - Time period filter (30days, quarter, semester, year, lastYear, all)
   * @returns Promise<any> - Chart data for pharmacy rating trends
   */
  async getPharmacyRatingTrends(timeFilter: string = "all"): Promise<any> {
    try {
      // Build the date filter based on timeFilter
      const dateFilter: any = {};
      const now = new Date();

      if (timeFilter !== "all") {
        let startDate = new Date();

        switch (timeFilter) {
          case "30days":
            startDate.setDate(startDate.getDate() - 30);
            break;
          case "quarter":
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case "semester":
            startDate.setMonth(startDate.getMonth() - 6);
            break;
          case "year":
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          case "lastYear":
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() - 1);
            startDate.setFullYear(startDate.getFullYear() - 2);
            dateFilter.lastActiveAt = { $gte: startDate, $lte: endDate };
            break;
          default:
            // No date filter
            break;
        }

        if (!dateFilter.lastActiveAt) {
          dateFilter.lastActiveAt = { $gte: startDate };
        }
      }

      // Filter for sessions with pharmacy ratings
      const filter = {
        ...dateFilter,
        pharmacyRating: { $exists: true, $ne: null },
      };

      // Get sessions with pharmacy ratings in the time frame
      const sessions = await this.model.find(filter).sort({ lastActiveAt: 1 });

      // Generate appropriate labels and group data based on timeFilter
      let labels: string[] = [];
      let groupedData: Record<string, { sum: number; count: number }> = {};

      switch (timeFilter) {
        case "30days":
          // Group by weeks in the last 30 days
          labels = [];
          for (let i = 0; i < 5; i++) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (4 - i) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            const label = `${weekStart.getDate()}/${
              weekStart.getMonth() + 1
            } - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;
            labels.push(label);
            groupedData[label] = { sum: 0, count: 0 };
          }

          sessions.forEach((session) => {
            if (session.pharmacyRating) {
              const sessionDate = new Date(session.lastActiveAt);
              const daysDiff = Math.floor(
                (now.getTime() - sessionDate.getTime()) / (1000 * 3600 * 24)
              );
              const weekIndex = Math.floor(daysDiff / 7);

              if (weekIndex >= 0 && weekIndex < 5) {
                const label = labels[4 - weekIndex]; // Reverse order for chronological display
                groupedData[label].sum += session.pharmacyRating;
                groupedData[label].count += 1;
              }
            }
          });
          break;

        case "quarter":
          // Group by months in the last quarter
          labels = [];
          for (let i = 2; i >= 0; i--) {
            const monthDate = new Date();
            monthDate.setMonth(monthDate.getMonth() - i);
            const monthName = monthDate.toLocaleDateString("fr-FR", {
              month: "short",
            });
            labels.push(monthName);
            groupedData[monthName] = { sum: 0, count: 0 };
          }

          sessions.forEach((session) => {
            if (session.pharmacyRating) {
              const sessionDate = new Date(session.lastActiveAt);
              const monthName = sessionDate.toLocaleDateString("fr-FR", {
                month: "short",
              });
              if (groupedData[monthName]) {
                groupedData[monthName].sum += session.pharmacyRating;
                groupedData[monthName].count += 1;
              }
            }
          });
          break;

        case "semester":
          // Group by months in the last semester
          labels = [];
          for (let i = 5; i >= 0; i--) {
            const monthDate = new Date();
            monthDate.setMonth(monthDate.getMonth() - i);
            const monthName = monthDate.toLocaleDateString("fr-FR", {
              month: "short",
            });
            labels.push(monthName);
            groupedData[monthName] = { sum: 0, count: 0 };
          }

          sessions.forEach((session) => {
            if (session.pharmacyRating) {
              const sessionDate = new Date(session.lastActiveAt);
              const monthName = sessionDate.toLocaleDateString("fr-FR", {
                month: "short",
              });
              if (groupedData[monthName]) {
                groupedData[monthName].sum += session.pharmacyRating;
                groupedData[monthName].count += 1;
              }
            }
          });
          break;

        case "year":
        case "lastYear":
          // Group by months
          labels = [
            "Jan",
            "Fév",
            "Mar",
            "Avr",
            "Mai",
            "Jun",
            "Jul",
            "Aoû",
            "Sep",
            "Oct",
            "Nov",
            "Déc",
          ];
          labels.forEach((label) => {
            groupedData[label] = { sum: 0, count: 0 };
          });

          sessions.forEach((session) => {
            if (session.pharmacyRating) {
              const month = new Date(session.lastActiveAt).getMonth();
              const label = labels[month];
              groupedData[label].sum += session.pharmacyRating;
              groupedData[label].count += 1;
            }
          });
          break;

        case "all":
          // Group by years
          labels = [];
          const yearSet = new Set<number>();

          sessions.forEach((session) => {
            yearSet.add(new Date(session.lastActiveAt).getFullYear());
          });

          const sortedYears = Array.from(yearSet).sort();
          labels = sortedYears.map((year) => year.toString());

          labels.forEach((label) => {
            groupedData[label] = { sum: 0, count: 0 };
          });

          sessions.forEach((session) => {
            if (session.pharmacyRating) {
              const year = new Date(session.lastActiveAt)
                .getFullYear()
                .toString();
              if (groupedData[year]) {
                groupedData[year].sum += session.pharmacyRating;
                groupedData[year].count += 1;
              }
            }
          });
          break;
      }

      // Calculate averages for each period
      const data = labels.map((label) => {
        const group = groupedData[label];
        return group.count > 0 ? +(group.sum / group.count).toFixed(1) : 0;
      });

      return {
        labels,
        datasets: [
          {
            label: "Note Pharmacie",
            data,
            borderColor: "rgba(59, 130, 246, 1)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
          },
        ],
      };
    } catch (error) {
      logger.error("Error getting pharmacy rating trends:", error);
      return {
        labels: [
          "Jan",
          "Fév",
          "Mar",
          "Avr",
          "Mai",
          "Jun",
          "Jul",
          "Aoû",
          "Sep",
          "Oct",
          "Nov",
          "Déc",
        ],
        datasets: [
          {
            label: "Note Pharmacie",
            data: new Array(12).fill(0),
            borderColor: "rgba(59, 130, 246, 1)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
          },
        ],
      };
    }
  }

  /**
   * Get monthly rating data for dashboard charts
   * @param year - Optional year to filter data (defaults to current year)
   * @returns Promise<any> - Monthly rating data for charts
   */
  async getMonthlyRatingData(
    year: number = new Date().getFullYear()
  ): Promise<any> {
    try {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      // Initialize data with zeros
      const pharmacyRatings = new Array(12).fill(0);
      const employeeRatings = new Array(12).fill(0);

      // Get all sessions with ratings for the specified year
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      const sessions = await this.model
        .aggregate([
          {
            $match: {
              lastActiveAt: { $gte: startDate, $lte: endDate },
              $or: [
                { pharmacyRating: { $exists: true, $ne: null } },
                { "employeeRatings.0": { $exists: true } },
              ],
            },
          },
        ] as unknown as PipelineStage[])
        .exec();

      // Calculate monthly averages
      const monthlyPharmacyRatings = new Array(12)
        .fill(0)
        .map(() => ({ sum: 0, count: 0 }));
      const monthlyEmployeeRatings = new Array(12)
        .fill(0)
        .map(() => ({ sum: 0, count: 0 }));

      sessions.forEach((session) => {
        const month = new Date(session.lastActiveAt).getMonth();

        // Pharmacy ratings
        if (session.pharmacyRating) {
          monthlyPharmacyRatings[month].sum += session.pharmacyRating;
          monthlyPharmacyRatings[month].count += 1;
        }

        // Employee ratings
        if (session.employeeRatings && session.employeeRatings.length > 0) {
          const avgEmployeeRating =
            session.employeeRatings.reduce(
              (sum: number, er: any) => sum + er.rating,
              0
            ) / session.employeeRatings.length;
          monthlyEmployeeRatings[month].sum += avgEmployeeRating;
          monthlyEmployeeRatings[month].count += 1;
        }
      });

      // Calculate averages
      for (let i = 0; i < 12; i++) {
        pharmacyRatings[i] =
          monthlyPharmacyRatings[i].count > 0
            ? +(
                monthlyPharmacyRatings[i].sum / monthlyPharmacyRatings[i].count
              ).toFixed(1)
            : null;

        employeeRatings[i] =
          monthlyEmployeeRatings[i].count > 0
            ? +(
                monthlyEmployeeRatings[i].sum / monthlyEmployeeRatings[i].count
              ).toFixed(1)
            : null;
      }

      // Ensure we have reasonable values for visualization (fill nulls with 0)
      const cleanPharmacyRatings = pharmacyRatings.map((r) =>
        r === null ? 0 : r
      );
      const cleanEmployeeRatings = employeeRatings.map((r) =>
        r === null ? 0 : r
      );

      return {
        labels: months,
        datasets: [
          {
            label: "Note Pharmacie",
            data: cleanPharmacyRatings,
            borderColor: "rgba(59, 130, 246, 1)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
          },
          {
            label: "Note Employés",
            data: cleanEmployeeRatings,
            borderColor: "rgba(16, 185, 129, 1)",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
          },
        ],
      };
    } catch (error) {
      logger.error("Error getting monthly rating data:", error);
      return {
        labels: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
        datasets: [
          {
            label: "Note Pharmacie",
            data: new Array(12).fill(0),
            borderColor: "rgba(59, 130, 246, 1)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
          },
          {
            label: "Note Employés",
            data: new Array(12).fill(0),
            borderColor: "rgba(16, 185, 129, 1)",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
          },
        ],
      };
    }
  }

  /**
   * Generate dynamic colors for charts
   * @param count - Number of colors needed
   * @returns Object with background and border color arrays
   */
  private generateColors(count: number): {
    background: string[];
    border: string[];
  } {
    const baseColors = [
      "rgba(59, 130, 246, 0.8)", // Blue
      "rgba(16, 185, 129, 0.8)", // Green
      "rgba(249, 115, 22, 0.8)", // Orange
      "rgba(168, 85, 247, 0.8)", // Purple
      "rgba(236, 72, 153, 0.8)", // Pink
      "rgba(245, 158, 11, 0.8)", // Amber
      "rgba(239, 68, 68, 0.8)", // Red
      "rgba(14, 165, 233, 0.8)", // Sky
      "rgba(34, 197, 94, 0.8)", // Emerald
      "rgba(156, 163, 175, 0.8)", // Gray
    ];

    const baseBorderColors = [
      "rgba(59, 130, 246, 1)",
      "rgba(16, 185, 129, 1)",
      "rgba(249, 115, 22, 1)",
      "rgba(168, 85, 247, 1)",
      "rgba(236, 72, 153, 1)",
      "rgba(245, 158, 11, 1)",
      "rgba(239, 68, 68, 1)",
      "rgba(14, 165, 233, 1)",
      "rgba(34, 197, 94, 1)",
      "rgba(156, 163, 175, 1)",
    ];

    // If we need more colors than available, generate additional ones
    const background = [];
    const border = [];

    for (let i = 0; i < count; i++) {
      if (i < baseColors.length) {
        background.push(baseColors[i]);
        border.push(baseBorderColors[i]);
      } else {
        // Generate additional colors using HSL
        const hue = (i * 137.508) % 360; // Golden angle approximation
        background.push(`hsla(${hue}, 70%, 60%, 0.8)`);
        border.push(`hsla(${hue}, 70%, 60%, 1)`);
      }
    }

    return { background, border };
  }

  /**
   * Get role performance data for dashboard charts
   * @param employeeStats - Employee statistics with ratings
   * @returns Promise<any> - Role performance data for charts
   */
  async getRolePerformanceData(employeeStats: any[]): Promise<any> {
    try {
      // Get all positions from the database
      const allPositions = await positionService.readMany({});
      const positionTitles = allPositions.map((p: any) => p.title);

      // Get aggregated rating data by position
      const employees = await this.model
        .aggregate([
          { $unwind: "$employeeRatings" },
          {
            $lookup: {
              from: "users", // The users collection
              localField: "employeeRatings.employeeId",
              foreignField: "_id",
              as: "employeeData",
            },
          },
          { $unwind: "$employeeData" },
          {
            $lookup: {
              from: "position", // The positions collection
              localField: "employeeData.position",
              foreignField: "_id",
              as: "positionData",
            },
          },
          {
            $addFields: {
              positionTitle: {
                $cond: {
                  if: { $gt: [{ $size: "$positionData" }, 0] },
                  then: { $arrayElemAt: ["$positionData.title", 0] },
                  else: "$employeeData.currentPosition",
                },
              },
            },
          },
          {
            $group: {
              _id: "$positionTitle",
              totalRating: { $sum: "$employeeRatings.rating" },
              count: { $sum: 1 },
              averageRating: { $avg: "$employeeRatings.rating" },
            },
          },
        ] as unknown as PipelineStage[])
        .exec();

      // Create a map of position ratings
      const positionRatingsMap = new Map();
      employees.forEach((result) => {
        positionRatingsMap.set(result._id, result.averageRating || 0);
      });

      // Map all positions to their average ratings (0 if no ratings)
      const averageRatingsByPosition = positionTitles.map(
        (position: string) =>
          +(positionRatingsMap.get(position) || 0).toFixed(1)
      );

      // Generate dynamic colors for each position
      const colors = this.generateColors(positionTitles.length);

      return {
        labels: positionTitles,
        datasets: [
          {
            label: "Note Moyenne",
            data: averageRatingsByPosition,
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderWidth: 1,
          },
        ],
      };
    } catch (error) {
      logger.error("Error getting role performance data:", error);
      return {
        labels: [],
        datasets: [
          {
            label: "Note Moyenne",
            data: [],
            backgroundColor: [],
          },
        ],
      };
    }
  }

  /**
   * Get statistics for satisfaction trends over time
   * @param timeFrame - Time frame to analyze data ('month', 'year', 'all')
   * @returns Promise<any> - Satisfaction data over time
   */
  async getSatisfactionTrends(timeFrame: string = "year"): Promise<any> {
    try {
      const labels = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Determine start date based on time frame
      let startDate = new Date();
      if (timeFrame === "month") {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (timeFrame === "year") {
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else if (timeFrame === "all") {
        // For "all", use a far past date to include everything
        startDate = new Date(2020, 0, 1);
      }

      // Get all sessions with pharmacy ratings in the time frame
      const sessions = await this.model
        .find({
          lastActiveAt: { $gte: startDate },
          pharmacyRating: { $exists: true, $ne: null },
        })
        .sort({ lastActiveAt: 1 });

      // Group by month and calculate satisfaction percentage
      // Assuming rating 4-5 is satisfied, 1-3 is not satisfied
      const monthlyData: Record<string, { satisfied: number; total: number }> =
        {};

      // Initialize all months in the period
      if (timeFrame === "year" || timeFrame === "all") {
        for (let i = 0; i < 12; i++) {
          const monthIdx = (currentMonth - 11 + i + 12) % 12; // Ensures we get the last 12 months
          const year = currentYear - (monthIdx > currentMonth ? 1 : 0);
          const monthKey = `${year}-${monthIdx + 1}`;
          monthlyData[monthKey] = { satisfied: 0, total: 0 };
        }
      } else if (timeFrame === "month") {
        // For month timeframe, use last 30 days grouped by day
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - 29 + i);
          const dayKey = `${date.getFullYear()}-${
            date.getMonth() + 1
          }-${date.getDate()}`;
          monthlyData[dayKey] = { satisfied: 0, total: 0 };
        }
      }

      // Process the sessions
      sessions.forEach((session) => {
        const date = new Date(session.lastActiveAt);
        let key: string;

        if (timeFrame === "month") {
          key = `${date.getFullYear()}-${
            date.getMonth() + 1
          }-${date.getDate()}`;
        } else {
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        }

        if (!monthlyData[key]) {
          monthlyData[key] = { satisfied: 0, total: 0 };
        }

        monthlyData[key].total += 1;
        if (session.pharmacyRating && session.pharmacyRating >= 4) {
          monthlyData[key].satisfied += 1;
        }
      });

      // Calculate satisfaction percentages and prepare data for chart
      let sortedData: { label: string; value: number }[];

      if (timeFrame === "month") {
        // For month, return daily data for the last 30 days
        sortedData = Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, data]) => {
            const day = key.split("-")[2];
            return {
              label: day,
              value:
                data.total > 0
                  ? Math.round((data.satisfied / data.total) * 100)
                  : 0,
            };
          });
      } else {
        // For year or all, return monthly data
        sortedData = Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, data]) => {
            const month = parseInt(key.split("-")[1]) - 1;
            return {
              label: labels[month],
              value:
                data.total > 0
                  ? Math.round((data.satisfied / data.total) * 100)
                  : 0,
            };
          });
      }

      // Prepare chart data
      const chartData = {
        labels: sortedData.map((item) => item.label),
        datasets: [
          {
            label: "Satisfaction globale",
            data: sortedData.map((item) => item.value),
            borderColor: "rgba(59, 130, 246, 1)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
          },
        ],
      };

      return chartData;
    } catch (error) {
      logger.error("Error getting satisfaction trends:", error);
      return {
        labels: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
        datasets: [
          {
            label: "Satisfaction globale",
            data: new Array(12).fill(0),
            borderColor: "rgba(59, 130, 246, 1)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
          },
        ],
      };
    }
  }

  /**
   * Get statistics for monthly visitors
   * @param timeFrame - Time frame to analyze data ('month', 'year', 'all')
   * @returns Promise<any> - Monthly visitor data
   */
  async getMonthlyVisitors(timeFrame: string = "year"): Promise<any> {
    try {
      const labels = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Determine start date based on time frame
      let startDate = new Date();
      if (timeFrame === "month") {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (timeFrame === "year") {
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else if (timeFrame === "all") {
        startDate = new Date(2020, 0, 1);
      }

      // Count unique devices by month
      const pipeline = [
        {
          $match: {
            lastActiveAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$lastActiveAt" },
              month: { $month: "$lastActiveAt" },
              deviceId: "$deviceId",
            },
          },
        },
        {
          $group: {
            _id: {
              year: "$_id.year",
              month: "$_id.month",
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ] as unknown as PipelineStage[];

      const result = await this.model.aggregate(pipeline).exec();

      // Initialize monthly data with zeros
      const monthlyData: Record<string, number> = {};

      // Initialize all months in the period
      if (timeFrame === "year" || timeFrame === "all") {
        for (let i = 0; i < 12; i++) {
          const monthIdx = (currentMonth - 11 + i + 12) % 12;
          const year = currentYear - (monthIdx > currentMonth ? 1 : 0);
          const monthKey = `${year}-${monthIdx + 1}`;
          monthlyData[monthKey] = 0;
        }
      } else if (timeFrame === "month") {
        // For month timeframe, use last 30 days
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - 29 + i);
          const dayKey = `${date.getFullYear()}-${
            date.getMonth() + 1
          }-${date.getDate()}`;
          monthlyData[dayKey] = 0;
        }
      }

      // Fill in the data from the result
      result.forEach((item) => {
        const year = item._id.year;
        const month = item._id.month;
        const key = `${year}-${month}`;
        monthlyData[key] = item.count;
      });

      // Prepare data for chart
      let sortedData: { label: string; value: number }[];

      if (timeFrame === "month") {
        // For month, return daily data for the last 30 days
        sortedData = Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, count]) => {
            const day = key.split("-")[2];
            return {
              label: day,
              value: count,
            };
          });
      } else {
        // For year or all, return monthly data
        sortedData = Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, count]) => {
            const month = parseInt(key.split("-")[1]) - 1;
            return {
              label: labels[month],
              value: count,
            };
          });
      }

      // Prepare chart data
      const chartData = {
        labels: sortedData.map((item) => item.label),
        datasets: [
          {
            label: "Nombre de visites",
            data: sortedData.map((item) => item.value),
            borderColor: "rgba(16, 185, 129, 1)",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
          },
        ],
      };

      return chartData;
    } catch (error) {
      logger.error("Error getting monthly visitors:", error);
      return {
        labels: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
        datasets: [
          {
            label: "Nombre de visites",
            data: new Array(12).fill(0),
            borderColor: "rgba(16, 185, 129, 1)",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
          },
        ],
      };
    }
  }

  /**
   * Get star rating distribution
   * @param timeFrame - Time frame to analyze data ('month', 'year', 'all')
   * @returns Promise<any> - Star rating distribution data
   */
  async getStarRatingDistribution(timeFrame: string = "year"): Promise<any> {
    try {
      // Determine start date based on time frame
      let startDate = new Date();
      if (timeFrame === "month") {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (timeFrame === "year") {
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else if (timeFrame === "all") {
        startDate = new Date(2020, 0, 1);
      }

      // Get all sessions with pharmacy ratings in the time frame
      const sessions = await this.model.find({
        lastActiveAt: { $gte: startDate },
        pharmacyRating: { $exists: true, $ne: null },
      });

      // Count ratings by star value
      const ratingCounts = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };

      sessions.forEach((session) => {
        if (
          session.pharmacyRating &&
          session.pharmacyRating >= 1 &&
          session.pharmacyRating <= 5
        ) {
          const rating = session.pharmacyRating as 1 | 2 | 3 | 4 | 5;
          ratingCounts[rating]++;
        }
      });

      // Prepare chart data
      const chartData = {
        labels: [
          "1 étoile",
          "2 étoiles",
          "3 étoiles",
          "4 étoiles",
          "5 étoiles",
        ],
        datasets: [
          {
            label: "Distribution des notes",
            data: [
              ratingCounts[1],
              ratingCounts[2],
              ratingCounts[3],
              ratingCounts[4],
              ratingCounts[5],
            ],
            backgroundColor: [
              "rgba(239, 68, 68, 0.8)",
              "rgba(249, 115, 22, 0.8)",
              "rgba(234, 179, 8, 0.8)",
              "rgba(16, 185, 129, 0.8)",
              "rgba(59, 130, 246, 0.8)",
            ],
          },
        ],
      };

      return chartData;
    } catch (error) {
      logger.error("Error getting star rating distribution:", error);
      return {
        labels: [
          "1 étoile",
          "2 étoiles",
          "3 étoiles",
          "4 étoiles",
          "5 étoiles",
        ],
        datasets: [
          {
            label: "Distribution des notes",
            data: [0, 0, 0, 0, 0],
            backgroundColor: [
              "rgba(239, 68, 68, 0.8)",
              "rgba(249, 115, 22, 0.8)",
              "rgba(234, 179, 8, 0.8)",
              "rgba(16, 185, 129, 0.8)",
              "rgba(59, 130, 246, 0.8)",
            ],
          },
        ],
      };
    }
  }

  /**
   * Get feedback distribution by time of day
   * @param timeFrame - Time frame to analyze data ('month', 'year', 'all')
   * @returns Promise<any> - Feedback distribution by time
   */
  async getFeedbackByTime(timeFrame: string = "year"): Promise<any> {
    try {
      // Determine start date based on time frame
      let startDate = new Date();
      if (timeFrame === "month") {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (timeFrame === "year") {
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else if (timeFrame === "all") {
        startDate = new Date(2020, 0, 1);
      }

      // Get all sessions with feedback in the time frame
      const sessions = await this.model.find({
        lastActiveAt: { $gte: startDate },
        $or: [
          { pharmacyRating: { $exists: true, $ne: null } },
          { "employeeRatings.0": { $exists: true } },
        ],
      });

      // Define time slots
      const timeSlots = [
        { label: "8h-10h", start: 8, end: 10, count: 0 },
        { label: "10h-12h", start: 10, end: 12, count: 0 },
        { label: "12h-14h", start: 12, end: 14, count: 0 },
        { label: "14h-16h", start: 14, end: 16, count: 0 },
        { label: "16h-18h", start: 16, end: 18, count: 0 },
        { label: "18h-20h", start: 18, end: 20, count: 0 },
      ];

      // Count feedback by time slot
      sessions.forEach((session) => {
        const date = new Date(session.lastActiveAt);
        const hour = date.getHours();

        for (const slot of timeSlots) {
          if (hour >= slot.start && hour < slot.end) {
            slot.count++;
            break;
          }
        }
      });

      // Prepare chart data
      const chartData = {
        labels: timeSlots.map((slot) => slot.label),
        datasets: [
          {
            label: "Avis par horaire",
            data: timeSlots.map((slot) => slot.count),
            backgroundColor: "rgba(16, 185, 129, 0.7)",
          },
        ],
      };

      return chartData;
    } catch (error) {
      logger.error("Error getting feedback by time:", error);
      return {
        labels: [
          "8h-10h",
          "10h-12h",
          "12h-14h",
          "14h-16h",
          "16h-18h",
          "18h-20h",
        ],
        datasets: [
          {
            label: "Avis par horaire",
            data: [0, 0, 0, 0, 0, 0],
            backgroundColor: "rgba(16, 185, 129, 0.7)",
          },
        ],
      };
    }
  }

  /**
   * Get statistics summary for dashboard
   * @param timeFrame - Time frame to analyze data ('month', 'year', 'all')
   * @returns Promise<any> - Statistics summary
   */
  async getStatisticsSummary(timeFrame: string = "year"): Promise<any> {
    try {
      // Determine start date and comparison start date based on time frame
      let startDate = new Date();
      let comparisonStartDate = new Date();
      let comparisonEndDate = new Date(startDate);

      if (timeFrame === "month") {
        startDate.setMonth(startDate.getMonth() - 1);
        comparisonStartDate.setMonth(comparisonStartDate.getMonth() - 2);
        comparisonEndDate.setMonth(comparisonEndDate.getMonth() - 1);
      } else if (timeFrame === "year") {
        startDate.setFullYear(startDate.getFullYear() - 1);
        comparisonStartDate.setFullYear(comparisonStartDate.getFullYear() - 2);
        comparisonEndDate.setFullYear(comparisonEndDate.getFullYear() - 1);
      } else if (timeFrame === "all") {
        // For 'all', we'll just compare the last year to the year before
        startDate = new Date(2020, 0, 1);
        comparisonStartDate = new Date(startDate);
        comparisonEndDate = new Date();
        comparisonEndDate.setFullYear(comparisonEndDate.getFullYear() - 1);
      }

      // Get current period sessions
      const currentSessions = await this.model.find({
        lastActiveAt: { $gte: startDate },
      });

      // Get comparison period sessions
      const comparisonSessions = await this.model.find({
        lastActiveAt: { $gte: comparisonStartDate, $lt: comparisonEndDate },
      });

      // Calculate satisfaction rate
      let totalRatings = 0;
      let satisfiedRatings = 0;
      let comparisonTotalRatings = 0;
      let comparisonSatisfiedRatings = 0;

      currentSessions.forEach((session) => {
        if (session.pharmacyRating) {
          totalRatings++;
          if (session.pharmacyRating >= 4) {
            satisfiedRatings++;
          }
        }
      });

      comparisonSessions.forEach((session) => {
        if (session.pharmacyRating) {
          comparisonTotalRatings++;
          if (session.pharmacyRating >= 4) {
            comparisonSatisfiedRatings++;
          }
        }
      });

      const satisfactionRate =
        totalRatings > 0
          ? Math.round((satisfiedRatings / totalRatings) * 100)
          : 0;
      const comparisonSatisfactionRate =
        comparisonTotalRatings > 0
          ? Math.round(
              (comparisonSatisfiedRatings / comparisonTotalRatings) * 100
            )
          : 0;
      const satisfactionChange = satisfactionRate - comparisonSatisfactionRate;

      // Count total feedbacks
      const totalFeedbacks = currentSessions.filter(
        (s) =>
          s.pharmacyRating ||
          (s.employeeRatings && s.employeeRatings.length > 0)
      ).length;

      const comparisonTotalFeedbacks = comparisonSessions.filter(
        (s) =>
          s.pharmacyRating ||
          (s.employeeRatings && s.employeeRatings.length > 0)
      ).length;

      const feedbackChange =
        comparisonTotalFeedbacks > 0
          ? Math.round(
              ((totalFeedbacks - comparisonTotalFeedbacks) /
                comparisonTotalFeedbacks) *
                100
            )
          : 0;

      // Count unique visitors
      const uniqueDeviceIds = new Set(currentSessions.map((s) => s.deviceId));
      const totalVisitors = uniqueDeviceIds.size;

      const comparisonUniqueDeviceIds = new Set(
        comparisonSessions.map((s) => s.deviceId)
      );
      const comparisonTotalVisitors = comparisonUniqueDeviceIds.size;

      const visitorsChange =
        comparisonTotalVisitors > 0
          ? Math.round(
              ((totalVisitors - comparisonTotalVisitors) /
                comparisonTotalVisitors) *
                100
            )
          : 0;

      // Calculate feedback percentage - Fix to prevent exceeding 100%
      // Count unique devices that have given feedback
      const devicesWithFeedback = new Set(
        currentSessions
          .filter(
            (s) =>
              s.pharmacyRating ||
              (s.employeeRatings && s.employeeRatings.length > 0)
          )
          .map((s) => s.deviceId)
      );

      const feedbackPercentage =
        totalVisitors > 0
          ? Math.min(
              100,
              Math.round((devicesWithFeedback.size / totalVisitors) * 100)
            )
          : 0;

      // Same adjustment for comparison period
      const devicesWithFeedbackComparison = new Set(
        comparisonSessions
          .filter(
            (s) =>
              s.pharmacyRating ||
              (s.employeeRatings && s.employeeRatings.length > 0)
          )
          .map((s) => s.deviceId)
      );

      const comparisonFeedbackPercentage =
        comparisonTotalVisitors > 0
          ? Math.min(
              100,
              Math.round(
                (devicesWithFeedbackComparison.size / comparisonTotalVisitors) *
                  100
              )
            )
          : 0;

      const feedbackPercentageChange =
        feedbackPercentage - comparisonFeedbackPercentage;

      // Calculate employee rating statistics
      let totalEmployeeRating = 0;
      let totalEmployeeReviews = 0;

      currentSessions.forEach((session) => {
        if (session.employeeRatings && session.employeeRatings.length > 0) {
          totalEmployeeReviews += session.employeeRatings.length;
          totalEmployeeRating += session.employeeRatings.reduce(
            (sum, er) => sum + er.rating,
            0
          );
        }
      });

      const employeeAvgRating =
        totalEmployeeReviews > 0
          ? parseFloat((totalEmployeeRating / totalEmployeeReviews).toFixed(1))
          : 0;

      let comparisonTotalEmployeeRating = 0;
      let comparisonTotalEmployeeReviews = 0;

      comparisonSessions.forEach((session) => {
        if (session.employeeRatings && session.employeeRatings.length > 0) {
          comparisonTotalEmployeeReviews += session.employeeRatings.length;
          comparisonTotalEmployeeRating += session.employeeRatings.reduce(
            (sum, er) => sum + er.rating,
            0
          );
        }
      });

      const comparisonEmployeeAvgRating =
        comparisonTotalEmployeeReviews > 0
          ? parseFloat(
              (
                comparisonTotalEmployeeRating / comparisonTotalEmployeeReviews
              ).toFixed(1)
            )
          : 0;

      const employeeRatingChange = parseFloat(
        (employeeAvgRating - comparisonEmployeeAvgRating).toFixed(1)
      );

      const employeeReviewChange =
        comparisonTotalEmployeeReviews > 0
          ? Math.round(
              ((totalEmployeeReviews - comparisonTotalEmployeeReviews) /
                comparisonTotalEmployeeReviews) *
                100
            )
          : 0;

      // Calculate client completion data
      const startedFeedbacks = currentSessions.length;
      const completedFeedbacks = currentSessions.filter(
        (s) => s.completed
      ).length;
      const completionRate =
        startedFeedbacks > 0
          ? parseFloat(
              ((completedFeedbacks / startedFeedbacks) * 100).toFixed(1)
            )
          : 0;

      const comparisonStartedFeedbacks = comparisonSessions.length;
      const comparisonCompletedFeedbacks = comparisonSessions.filter(
        (s) => s.completed
      ).length;
      const comparisonCompletionRate =
        comparisonStartedFeedbacks > 0
          ? parseFloat(
              (
                (comparisonCompletedFeedbacks / comparisonStartedFeedbacks) *
                100
              ).toFixed(1)
            )
          : 0;

      const completionRateChange = parseFloat(
        (completionRate - comparisonCompletionRate).toFixed(1)
      );

      return {
        statsSummary: {
          satisfactionRate,
          satisfactionChange,
          totalFeedbacks,
          feedbackChange,
          totalVisitors,
          visitorsChange,
          feedbackPercentage,
          feedbackPercentageChange,
          employeeAvgRating,
          employeeRatingChange,
          employeeReviewCount: totalEmployeeReviews,
          employeeReviewChange,
        },
        clientCompletionData: {
          startedFeedbacks,
          completedFeedbacks,
          completionRate,
          completionRateChange,
        },
      };
    } catch (error) {
      logger.error("Error getting statistics summary:", error);
      return {
        statsSummary: {
          satisfactionRate: 0,
          satisfactionChange: 0,
          totalFeedbacks: 0,
          feedbackChange: 0,
          totalVisitors: 0,
          visitorsChange: 0,
          feedbackPercentage: 0,
          feedbackPercentageChange: 0,
          employeeAvgRating: 0,
          employeeRatingChange: 0,
          employeeReviewCount: 0,
          employeeReviewChange: 0,
        },
        clientCompletionData: {
          startedFeedbacks: 0,
          completedFeedbacks: 0,
          completionRate: 0,
          completionRateChange: 0,
        },
      };
    }
  }

  /**
   * Get role distribution of feedback ratings
   * @param timeFrame - Time frame to analyze data ('month', 'year', 'all')
   * @returns Promise<any> - Role distribution data and satisfaction by role
   */
  async getRoleDistribution(timeFrame: string = "year"): Promise<any> {
    try {
      // Determine start date based on time frame
      let startDate = new Date();
      if (timeFrame === "month") {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (timeFrame === "year") {
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else if (timeFrame === "all") {
        startDate = new Date(2020, 0, 1);
      }

      // Get all positions from the database
      const allPositions = await positionService.readMany({});
      const positionTitles = allPositions.map((p: any) => p.title);

      // Use aggregation to get role distribution data efficiently
      const pipeline = [
        {
          $match: {
            lastActiveAt: { $gte: startDate },
            "employeeRatings.0": { $exists: true },
          },
        },
        { $unwind: "$employeeRatings" },
        {
          $lookup: {
            from: "users",
            localField: "employeeRatings.employeeId",
            foreignField: "_id",
            as: "employeeData",
          },
        },
        { $unwind: "$employeeData" },
        {
          $lookup: {
            from: "positions",
            localField: "employeeData.position",
            foreignField: "_id",
            as: "positionData",
          },
        },
        {
          $addFields: {
            positionTitle: {
              $cond: {
                if: { $gt: [{ $size: "$positionData" }, 0] },
                then: { $arrayElemAt: ["$positionData.title", 0] },
                else: "$employeeData.currentPosition",
              },
            },
          },
        },
        {
          $group: {
            _id: "$positionTitle",
            count: { $sum: 1 },
            totalRating: { $sum: "$employeeRatings.rating" },
            averageRating: { $avg: "$employeeRatings.rating" },
          },
        },
      ] as unknown as PipelineStage[];

      const results = await this.model.aggregate(pipeline).exec();

      // Create a map of position data
      const positionDataMap = new Map();
      results.forEach((result) => {
        positionDataMap.set(result._id, {
          count: result.count,
          totalRating: result.totalRating,
          averageRating: parseFloat(result.averageRating.toFixed(1)),
        });
      });

      // Map all positions to their data (0 if no data)
      const roleData = positionTitles.map((position: string) => ({
        role: position,
        count: positionDataMap.get(position)?.count || 0,
        totalRating: positionDataMap.get(position)?.totalRating || 0,
        averageRating: positionDataMap.get(position)?.averageRating || 0,
      }));

      // Generate dynamic colors for charts
      const colors = this.generateColors(positionTitles.length);

      // Prepare chart data for role distribution
      const roleDistributionData = {
        labels: positionTitles,
        datasets: [
          {
            label: "Répartition des positions notées",
            data: roleData.map((data: any) => data.count),
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderWidth: 1,
          },
        ],
      };

      // Prepare chart data for satisfaction by role
      const satisfactionByRoleData = {
        labels: positionTitles,
        datasets: [
          {
            label: "Satisfaction moyenne par position",
            data: roleData.map((data: any) => data.averageRating),
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderWidth: 1,
          },
        ],
      };

      return {
        roleDistributionData,
        satisfactionByRoleData,
      };
    } catch (error) {
      logger.error("Error getting role distribution:", error);
      return {
        roleDistributionData: {
          labels: [
            "Pharmacien",
            "Préparateur",
            "Assistant",
            "Vendeur",
            "Stagiaire",
          ],
          datasets: [
            {
              label: "Répartition des rôles notés",
              data: [0, 0, 0, 0, 0],
              backgroundColor: [
                "rgba(59, 130, 246, 0.8)",
                "rgba(16, 185, 129, 0.8)",
                "rgba(249, 115, 22, 0.8)",
                "rgba(168, 85, 247, 0.8)",
                "rgba(236, 72, 153, 0.8)",
              ],
              borderColor: [
                "rgba(59, 130, 246, 1)",
                "rgba(16, 185, 129, 1)",
                "rgba(249, 115, 22, 1)",
                "rgba(168, 85, 247, 1)",
                "rgba(236, 72, 153, 1)",
              ],
              borderWidth: 1,
            },
          ],
        },
        satisfactionByRoleData: {
          labels: [
            "Pharmacien",
            "Préparateur",
            "Assistant",
            "Vendeur",
            "Stagiaire",
          ],
          datasets: [
            {
              label: "Satisfaction moyenne par rôle",
              data: [0, 0, 0, 0, 0],
              backgroundColor: "rgba(59, 130, 246, 0.7)",
            },
          ],
        },
      };
    }
  }

  /**
   * Get suggestions from feedback sessions
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @param dateRange - Optional date range filter
   * @returns Promise<{suggestions: any[], total: number}> - Suggestions data and total count
   */
  async getSuggestions(
    page: number = 1,
    limit: number = 10,
    dateRange?: { start: Date; end: Date }
  ): Promise<{ suggestions: any[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      // Filter for sessions with suggestions
      let filter: any = {
        suggestion: { $exists: true, $ne: null },
      };

      // Add date range filter if provided
      if (dateRange && dateRange.start && dateRange.end) {
        filter.lastActiveAt = { $gte: dateRange.start, $lte: dateRange.end };
      }

      // Get total count
      const total = await this.model.countDocuments(filter);

      // Get suggestions with pagination
      const sessions = await this.model
        .find(filter)
        .sort({ lastActiveAt: -1 })
        .skip(skip)
        .limit(limit);

      // Extract and format suggestions
      const suggestions = sessions.map((session) => {
        const clientName = session.clientData
          ? `${session.clientData.firstName || ""} ${
              session.clientData.lastName || ""
            }`.trim()
          : "Anonyme";

        return {
          id: session._id.toString(),
          sessionId: session.sessionId,
          text: session.suggestion || "",
          date: session.lastActiveAt,
          client: clientName,
          status: session.status === "processed" ? "Traité" : "Nouveau",
        };
      });

      return { suggestions, total };
    } catch (error) {
      logger.error("Error getting suggestions:", error);
      return { suggestions: [], total: 0 };
    }
  }
}

export const feedbackSessionService = FeedbackSessionService.getInstance();
