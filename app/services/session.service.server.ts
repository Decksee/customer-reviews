/* eslint-disable @typescript-eslint/no-explicit-any */
import UserSession, {
  type IUserSession,
  type IUserSessionMethods,
  type UserSessionModel,
} from "~/core/entities/session.entity.server";
import { BaseService } from "~/core/abstracts/service.server";

export default class SessionService extends BaseService<
  IUserSession,
  IUserSessionMethods,
  UserSessionModel
> {
  constructor() {
    super(UserSession);
  }

  private static instance: SessionService;

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  async createSession(
    data: Record<string, unknown>,
    expires: Date
  ): Promise<string> {
    // Check if there's an existing active session with the same user ID
    if (data.userId) {
      const existingSession = await this.model.findOne({
        'data.userId': data.userId,
        expires: { $gt: new Date() }
      }).lean().exec();

      if (existingSession) {
        // Update existing session instead of creating new one
        await this.updateSession(existingSession._id.toString(), data, expires);
        return existingSession._id.toString();
      }
    }

    const session = await this.createOne({ data, expires });
    return session.id.toString();
  }

  async getSession(id: string): Promise<Record<string, unknown> | null> {
    const session = await this.model.findById(id).lean().exec();
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expires <= new Date()) {
      await this.deleteSession(id); // Clean up expired session
      return null;
    }

    return session.data;
  }

  async updateSession(
    id: string,
    data: Record<string, unknown>,
    expires: Date
  ): Promise<void> {
    const session = await this.model.findById(id).exec();
    if (!session) {
      throw new Error(`Session with id ${id} not found`);
    }

    // Merge data while preserving important fields
    const mergedData = {
      ...session.data,
      ...data,
      userId: data.userId || session.data.userId, // Preserve userId if exists
    };

    await this.model.updateOne(
      { _id: id },
      { 
        data: mergedData,
        expires,
        updatedAt: new Date()
      }
    ).exec();
  }

  async deleteSession(id: string): Promise<void> {
    await this.deleteOne({ _id: id });
  }

  // New method to clean up expired sessions
  async cleanupExpiredSessions(): Promise<void> {
    await this.model.deleteMany({
      expires: { $lte: new Date() }
    }).exec();
  }
}

export const sessionService = SessionService.getInstance();
