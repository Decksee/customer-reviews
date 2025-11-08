import { createDatabaseSessionStorage } from "./session-db-storage.server";
import { createCookie } from 'react-router';
import config from "~/config/config.server";

const sessionCookie = createCookie("__session", {
  httpOnly: true, // Enable httpOnly for security
  secure: config.isProduction, // Enable secure in production
  secrets: config.secrets.sessionSecrets,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
});

// Create the session storage with automatic cleanup of expired sessions
const storage = createDatabaseSessionStorage({
  cookie: sessionCookie,
});

export const sessionStorage = storage;

// Export session utilities
export const { getSession, commitSession, destroySession } = sessionStorage;

// Cleanup expired sessions periodically (every hour)
if (typeof setInterval === 'function') {
  setInterval(async () => {
    try {
      const { sessionService } = await import('~/services/session.service.server');
      await sessionService.cleanupExpiredSessions();
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }, 60 * 60 * 1000); // 1 hour
}