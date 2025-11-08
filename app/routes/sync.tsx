import { data } from "react-router";
import { feedbackSessionService } from "~/services/feedback-session.service.server";

/**
 * This is a specialized route that handles synchronization of feedback session data.
 * It is used by the feedback pages to create and update sessions via useFetcher.
 * 
 * The operation is determined by the 'operation' field in the request body, which can be:
 * - 'create-session' - Create a new feedback session with initial pharmacy and employee ratings
 * - 'pharmacy-rating' - Update pharmacy rating
 * - 'employee-ratings' - Update employee ratings
 * - 'client-data' - Update client contact information
 * - 'suggestion' - Update suggestion
 * - 'complete' - Complete the session
 */

export async function action({ request, params }: { request: Request; params: Record<string, string> }) {
  
  // Parse the request body based on content type
  let body = {};
  
  if (request.headers.get("Content-Type")?.includes("application/json")) {
    body = await request.json();
  } else {
    // Handle form submissions
    const formData = await request.formData();
    for (const [key, value] of formData.entries()) {
      // @ts-ignore
      body[key] = value;
    }
  }
  
  // Extract common fields
  // @ts-ignore
  const { sessionId, operation } = body;
  
  // Operations that don't require a session ID (like create-session)
  if (operation === "create-session") {
    try {

      console.log("Data to create session:", body);
      // Extract required data
      // @ts-ignore
      const deviceId = body.deviceId || `device_${Math.random().toString(36).substring(2, 9)}`;
      // @ts-ignore
      const pharmacyRating = parseInt(body.pharmacyRating, 10);
      
      // Parse employee ratings with comments
      // @ts-ignore
      let employeeRatings = [];
      try {
        // @ts-ignore
        if (typeof body.employeeRatings === 'string') {
          // @ts-ignore
          employeeRatings = JSON.parse(body.employeeRatings);
          // @ts-ignore
          console.log("Parsed employee ratings raw:", body.employeeRatings);
          console.log("Parsed employee ratings object:", JSON.stringify(employeeRatings, null, 2));
        } else {
          // @ts-ignore
          employeeRatings = body.employeeRatings;
          console.log("Employee ratings object (already parsed):", JSON.stringify(employeeRatings, null, 2));
        }
      } catch (parseError) {
        console.error("Error parsing employee ratings:", parseError);
        return data({ 
          success: false, 
          error: "Invalid employee ratings format" 
        }, { status: 400 });
      }
      
      // Validate pharmacy rating
      if (!pharmacyRating || isNaN(pharmacyRating) || pharmacyRating < 1 || pharmacyRating > 5) {
        return data({ 
          success: false, 
          error: "Veuillez évaluer votre expérience globale dans la pharmacie" 
        }, { status: 400 });
      }
      
      // Validate employee ratings
      if (!Array.isArray(employeeRatings) || employeeRatings.length === 0) {
        return data({ 
          success: false, 
          error: "Veuillez évaluer au moins un membre de notre équipe" 
        }, { status: 400 });
      }
      
      // Ensure each employee rating has the expected structure with comments
      const validatedRatings = employeeRatings.map(rating => {
        if (!rating || typeof rating !== 'object') {
          throw new Error("Invalid employee rating format");
        }
        
        // Debug each rating entry to check comment presence
        console.log(`Processing employee rating for ${rating.employeeId}:`, JSON.stringify(rating, null, 2));
        
        return {
          employeeId: rating.employeeId,
          rating: Number(rating.rating),
          // Explicitly handle empty string vs undefined/null for comments
          comment: rating.comment === undefined || rating.comment === null 
            ? "" 
            : String(rating.comment)
        };
      });
      
      console.log("Final validated employee ratings with comments:", JSON.stringify(validatedRatings, null, 2));
      
      // Initialize a new session with 2 minute timeout for shared devices
      const session = await feedbackSessionService.initializeSession(deviceId, 2);
      
      console.log("Created new feedback session with ID:", session._id);
      console.log("Session data:", JSON.stringify(session, null, 2));
      
      // Update session with pharmacy rating
      await feedbackSessionService.updatePharmacyRating(session.sessionId, pharmacyRating);
      
      // Update session with employee ratings including comments
      const employeeUpdateResult = await feedbackSessionService.updateEmployeeRatings(session.sessionId, validatedRatings);
      console.log("Employee ratings update result:", JSON.stringify(employeeUpdateResult, null, 2));
      
      return data({ 
        success: true, 
        data: {
          sessionId: session._id?.toString() || session.sessionId
        }
      });
    } catch (error) {
      console.error("Error creating feedback session:", error);
      return data({ 
        success: false, 
        error: error instanceof Error ? error.message : "Une erreur est survenue lors de la création de la session"
      }, { status: 500 });
    }
  }
  
  // All other operations require a session ID
  if (!sessionId) {
    return data({ success: false, error: "Session ID is required" }, { status: 400 });
  }
  
  if (!operation) {
    return data({ success: false, error: "Operation is required" }, { status: 400 });
  }
  
  try {
    // Update session activity timestamp for all operations
    await feedbackSessionService.updateSessionActivity(sessionId);
    console.log(`Processing operation '${operation}' for session ID: ${sessionId}`);
    
    // Handle different operations
    switch (operation) {
      case "pharmacy-rating": {
        // @ts-ignore
        const rating = parseInt(body.rating, 10);
        if (isNaN(rating) || rating < 1 || rating > 5) {
          return data({ success: false, error: "Valid rating (1-5) is required" }, { status: 400 });
        }
        
        const result = await feedbackSessionService.updatePharmacyRating(sessionId, rating);
        return data({ success: true, data: { sessionId: sessionId } });
      }
      
      case "employee-ratings": {
        // @ts-ignore
        const ratings = typeof body.ratings === 'string' ? JSON.parse(body.ratings) : body.ratings;
        if (!Array.isArray(ratings) || ratings.length === 0) {
          return data({ success: false, error: "Valid ratings array is required" }, { status: 400 });
        }
        
        // Process comments for employee ratings
        const processedRatings = ratings.map(rating => ({
          employeeId: rating.employeeId,
          rating: Number(rating.rating),
          comment: rating.comment === undefined || rating.comment === null 
            ? "" 
            : String(rating.comment)
        }));
        
        const result = await feedbackSessionService.updateEmployeeRatings(sessionId, processedRatings);
        return data({ success: true, data: { sessionId: sessionId } });
      }
      
      case "client-data": {
        // @ts-ignore
        const clientData = typeof body.clientData === 'string' ? JSON.parse(body.clientData) : body.clientData;
        if (!clientData) {
          return data({ success: false, error: "Client data is required" }, { status: 400 });
        }
        
        const result = await feedbackSessionService.updateClientData(sessionId, {
          firstName: clientData.firstName || "",
          lastName: clientData.lastName || "",
          email: clientData.email || "",
          phone: clientData.phone || "",
          consent: clientData.consent || false
        });
        
        console.log(`Updated client data for session ID ${sessionId}`);
        return data({ 
          success: true, 
          data: { sessionId: sessionId }
        });
      }
      
      case "suggestion": {
        // @ts-ignore
        const suggestion = body.suggestion;
        if (suggestion === undefined) {
          return data({ success: false, error: "Suggestion is required" }, { status: 400 });
        }
        
        const result = await feedbackSessionService.updateSuggestion(sessionId, suggestion);
        
        console.log(`Updated suggestion for session ID ${sessionId}`);
        return data({ 
          success: true, 
          data: { sessionId: sessionId }
        });
      }
      
      case "complete": {
        const result = await feedbackSessionService.completeSession(sessionId);
        
        console.log(`Completed session with ID ${sessionId}`);
        return data({ 
          success: true, 
          data: { sessionId: sessionId }
        });
      }
      
      default:
        return data({ success: false, error: "Unknown operation" }, { status: 400 });
    }
  } catch (error) {
    console.error(`Error in sync operation ${operation}:`, error);
    return data({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error during sync"
    }, { status: 500 });
  }
}

// Empty component - this route is only used for its action
export default function SyncRoute() {
  return null;
}
