/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from "jsonwebtoken";
import config from "~/config/config.server";
import { userService } from "~/services/user.service.server";
import { redirect, type Session } from "react-router";
import { commitSession, getSession, destroySession } from "~/utils/session.server";
import type { IUser } from "~/core/entities/user.entity.server";
import { sessionService } from "./session.service.server";
import { serializeDocument, serializeDocuments } from "~/core/db/utils";

/**
 * Authentication service class providing methods for user authentication,
 * token generation, session management, and route protection.
 */
class AuthService {
  private config = config;

  /**
   * Authenticates a user using their email and password.
   *
   * @param email - The user's email address.
   * @param password - The user's password.
   * @returns A Promise that resolves to the authenticated user object if credentials are valid, or null otherwise.
   */
  async withEmailAuthenticate(
    email: string,
    password: string
  ): Promise<IUser | null> {
    const user = await userService.findByEmailAndPassword(email, password);
    return user || null;
  }

  /**
   * Generates a signed JWT token for the authenticated user.
   *
   * @param user - The user object for whom to generate the token.
   * @returns A JWT token string signed with the session secret.
   */
  generateToken(user: IUser): string {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      // Add timestamp to ensure unique tokens
      iat: Date.now()
    };

    return jwt.sign(payload, this.config.secrets.sessionSecret, {
      expiresIn: "24h",
    });
  }

  /**
   * Retrieves the authenticated user from the session and validates the JWT token.
   * This method is used to protect routes that require authentication.
   *
   * @param request - The incoming HTTP request object.
   * @returns A Promise that resolves to the authenticated user object.
   * @throws Redirects to the login page if the user is not authenticated or the token is invalid.
   */
  async requireUser(request: Request) {

    const session = await getSession(request.headers.get("Cookie"));
    const token = session.get("token") as string | undefined;

    if (!token) {
      throw redirect("/admin/login", {
        headers: { "Set-Cookie": await commitSession(session) },
      });
    }

    try {
      // Verify token
      const decodedToken = jwt.verify(
        token,
        this.config.secrets.sessionSecret
      ) as { id: string; email: string; role: string };

      // Get user with necessary relations
      const user = await userService.readOne({
        id: decodedToken.id,
      });

      if (!user) {
        session.unset("token"); // Clear invalid token
        throw redirect("/admin/login", {
          headers: { "Set-Cookie": await commitSession(session) },
        });
      }

      // Update session with latest user data if needed
      const currentUserData = session.get("userData");
      if (!currentUserData || currentUserData.email !== user.email) {
        session.set("userData", {
          id: user.id,
          email: user.email,
          role: user.role
        });
        await commitSession(session);
      }

      console.log("user", user);

      // Ensure that only user with role 'manager' can access the app
      // if (user.role !== "manager") {
      //   throw redirect("/admin/login", {
      //     headers: { "Set-Cookie": await commitSession(session) },
      //   });
      // }

      return serializeDocument(user);
    } catch (error) {
      // Handle token verification errors and redirect to login page
      if (error instanceof jwt.JsonWebTokenError ||
        error instanceof jwt.TokenExpiredError) {
        session.unset("token");
        throw redirect("/admin/login", {
          headers: { "Set-Cookie": await commitSession(session) },
        });
      }
      throw error;
    }
  }

  async getUser(request: Request) {
    const session = await getSession(request.headers.get("Cookie"));
    const token = session.get("token") as string | undefined;

    if (!token) {
      return null;
    }

    const decodedToken = jwt.verify(token, this.config.secrets.sessionSecret) as { id: string; email: string; role: string };

    const user = await userService.readOne({
      id: decodedToken.id,

      // 
      populate: 'position'
    });

    return serializeDocument(user);
  }


  /**
   * Stores the authentication token and user data in the session.
   *
   * @param session - The session object to update.
   * @param token - The authentication token to store.
   * @param user - The authenticated user object.
   * @returns The updated session object.
   */
  setAuthToken(session: Session, token: string, user: IUser): Session {
    // Store session ID in the session for later cleanup
    const sessionId = session.get(".id");
    if (sessionId) {
      session.set("sessionId", sessionId);
    }

    session.set("token", token);
    session.set("userData", {
      id: user.id,
      email: user.email,
      role: user.role
    });
    return session;
  }

  /**
   * Logs out the user by clearing both client session and database session.
   */
  async logout(session: Session): Promise<Session> {
    try {
      // Get the session ID if it exists
      const sessionId = session.get("sessionId");

      // Clear the session from database if we have an ID
      if (sessionId) {
        await sessionService.deleteSession(sessionId);
      }

      // Clear all session data
      session.unset("token");
      session.unset("userData");
      session.unset("userId");
      session.unset("sessionId");

      // Return the cleared session
      return session;
    } catch (error) {
      console.error("Error during logout:", error);
      // Even if DB cleanup fails, return the cleared session
      return session;
    }
  }
}

export const authService = new AuthService();
