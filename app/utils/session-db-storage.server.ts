/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSessionStorage } from "react-router";
import { sessionService } from "~/services/session.service.server";

export function createDatabaseSessionStorage({ cookie }: { cookie: any }) {
  return createSessionStorage({
    cookie,
    async createData(data, expires) {
      // Ensure data is a plain object
      const plainData = JSON.parse(JSON.stringify(data));
      return await sessionService.createSession(plainData, expires as Date);
    },

    async readData(id) {
      try {
        const data = await sessionService.getSession(id);
        return data ? JSON.parse(JSON.stringify(data)) : null;
      } catch (error) {
        console.error('Error reading session:', error);
        return null;
      }
    },

    async updateData(id, data, expires) {
      try {
        // Ensure data is a plain object and remove internal properties
        const plainData = JSON.parse(JSON.stringify(data));
        await sessionService.updateSession(id, plainData, expires as Date);
      } catch (error: any) {
        console.error('Error updating session:', error);
        // Don't throw error to prevent session issues from breaking the app
        // but we might want to create a new session if update fails
        if (error?.message?.includes?.('not found')) {
          await sessionService.createSession(data, expires as Date);
        }
      }
    },

    async deleteData(id) {
      try {
        await sessionService.deleteSession(id);
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    },
  });
}
