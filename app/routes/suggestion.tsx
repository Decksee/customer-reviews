import { useState, useEffect, useRef } from "react"
import { data, useFetcher, useLoaderData } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { motion } from "framer-motion"
import { Loader2, Lightbulb } from 'lucide-react'
import { useLocalStorage } from "@/hooks/use-local-storage"
import { PharmacyBackground } from "@/components/ui/pharmacy-background"
import { isBrowser } from "~/utils/browser.client"
import { toast } from "sonner"
import type { Route } from "./+types/suggestion"
import { settingsService } from "~/services/settings.service.server"
// Define stale threshold for shared devices (in milliseconds)
const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

// Define simplified feedback data type
type FeedbackData = {
  sessionId?: string; // MongoDB document ID
  deviceId: string;
  pharmacyRating: number | null;
  employeeRatings: Record<string, number>;
  employeeComments: Record<string, string>;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  consent?: boolean;
  suggestion?: string;
  lastActiveAt?: string;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Vos suggestions - Pharmacie Val d'Oise" },
    { name: "description", content: "Partagez vos idées et suggestions pour améliorer nos services pharmaceutiques" },
    // Open Graph / Facebook
    { property: "og:type", content: "website" },
    { property: "og:url", content: "/suggestion" },
    { property: "og:title", content: "Vos suggestions - Pharmacie Val d'Oise" },
    { property: "og:description", content: "Partagez vos idées et suggestions pour améliorer nos services pharmaceutiques" },
    { property: "og:image", content: "/images/logo.png" },
    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Vos suggestions - Pharmacie Val d'Oise" },
    { name: "twitter:description", content: "Partagez vos idées et suggestions pour améliorer nos services pharmaceutiques" },
    { name: "twitter:image", content: "/images/logo.png" },
  ];
}

export async function loader() {
  const feedbackSettings = await settingsService.getFeedbackPageSettings();
  return data({
    feedbackSettings
  });
}

export default function SuggestionsPage() {
  const { feedbackSettings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const completeFetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  const [redirecting, setRedirecting] = useState(false);
  
  // Get session data from localStorage
  const [feedbackData, setFeedbackData, clearFeedbackData] = useLocalStorage<FeedbackData>("feedbackData", {
    deviceId: "",
    pharmacyRating: null,
    employeeRatings: {},
    employeeComments: {},
  });
  
  const [suggestion, setSuggestion] = useState(feedbackData.suggestion || "");
  const [formError, setFormError] = useState<string | null>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null); 

  // Reset current session - for shared device scenarios
 const resetCurrentSession = () => {
  if (!isBrowser) return;
  
  // Keep device ID for shared devices
  const deviceId = feedbackData.deviceId;
  clearFeedbackData();
};

  const makeWhereToGoDecision = () => {
    if (feedbackSettings.thankYouEnabled) {
      window.location.href = "/thank-you";
    } else {
      //  Complet the process and return to the feedback page
    completeFetcher.submit(
        {
          operation: "complete",
          sessionId: feedbackData.sessionId || ""
        },
        { 
          method: "post", 
          action: "/sync"
        }
      );

      // Reset the session
      resetCurrentSession();

      // Go to the feedback page
      window.location.href = "/feedback";
    }
  }
  
  // Save suggestion to local storage when it changes
  useEffect(() => {
    // Use functional update pattern to avoid dependency on feedbackData
    setFeedbackData(prevData => {
      // Only update if suggestion has changed to prevent unnecessary rerenders
      if (prevData.suggestion === suggestion) {
        return prevData;
      }
      
      return {
        ...prevData,
        suggestion,
        lastActiveAt: new Date().toISOString()
      };
    });
  }, [suggestion, setFeedbackData]);
  
  // Make sure we have a session ID
  useEffect(() => {
    if (isBrowser && (!feedbackData.sessionId || !feedbackData.pharmacyRating)) {
      // Redirect back to feedback page if no session ID or pharmacy rating
      window.location.href = "/feedback";
    }
  }, [feedbackData.sessionId, feedbackData.pharmacyRating]);

  // Handle fetcher response
  useEffect(() => {
    console.log("Fetcher state:", fetcher.state, "Fetcher data:", fetcher.data);
    
    if (fetcher.state === 'idle' && fetcher.data) {
      // Start redirecting as soon as we get any response from the server
      setRedirecting(true);
      
      if (fetcher.data.success) {
        console.log("Redirecting to thank-you page...");
        // Navigate to thank you page with a short delay to ensure animation is seen
        setTimeout(() => {
          // window.location.href = "/thank-you";
          makeWhereToGoDecision();
        }, 500);
      } else if (fetcher.data.error) {
        setRedirecting(false); // Only stop redirecting if there's an error
        setFormError(fetcher.data.error);
        if (isBrowser) {
          toast(fetcher.data.error);
        }
      }
    }
  }, [fetcher.data, fetcher.state]);

  // Add an effect to handle timeout-based redirection in case fetcher gets stuck
  useEffect(() => {
    if (isSubmitting && !redirecting) {
      // Set redirecting to true as soon as submission starts
      setRedirecting(true);
      
      const redirectTimeout = setTimeout(() => {
        console.log("Submission timeout reached, redirecting...");
        // window.location.href = "/thank-you";
        makeWhereToGoDecision();
      }, 5000); // 5 seconds timeout
      
      return () => clearTimeout(redirectTimeout);
    }
  }, [isSubmitting, redirecting]);

  // Set up inactivity monitoring for shared devices
  useEffect(() => {
    if (!isBrowser) return;
    
    // Set up the initial timeout
    resetInactivityTimeout();
    
    // Add event listeners for user activity
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll'];
    const handleUserActivity = () => resetInactivityTimeout();
    
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });
    
    // Clean up event listeners on unmount
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, []);
  
  // Function to reset the inactivity timeout
  const resetInactivityTimeout = () => {
    if (!isBrowser) return;
    
    // Clear any existing timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    
    // Set a new timeout (2 minutes for shared devices)
    const newTimeout = setTimeout(() => {
      handleInactivity();
    }, STALE_THRESHOLD_MS);
    
    inactivityTimeoutRef.current = newTimeout;
  };
  
  // Function to handle inactivity timeout
  const handleInactivity = () => {
    console.log("Inactivity timeout reached - redirecting to feedback page");
    
    if (isBrowser) {
      toast("Votre session a expiré en raison d'inactivité.", {
        description: "Vous allez être redirigé vers la page d'accueil.",
      });
      
      // Use functional update to avoid dependency issues
      setFeedbackData(prevData => ({
        deviceId: prevData.deviceId,
        pharmacyRating: null,
        employeeRatings: {},
        employeeComments: {},
      }));
      
      // Redirect to feedback page after a short delay
      setTimeout(() => {
        // Ensure to clear the local storage before redirecting to start a fresh new session
        localStorage.removeItem("feedbackData");
        window.location.href = "/feedback";
      }, 2000);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetInactivityTimeout();
    
    // Validation is optional as this step is optional
    // We only need a session ID to submit
    if (feedbackData.sessionId && suggestion.trim() !== "") {
      console.log("Submitting suggestion for session ID:", feedbackData.sessionId);
      setRedirecting(true); // Set redirecting to true immediately when submitting
      
      fetcher.submit(
        {
          operation: "suggestion",
          sessionId: feedbackData.sessionId, // Use the MongoDB document ID as session ID
          suggestion
        },
        { 
          method: "post", 
          action: "/sync", 
          encType: "application/json"
        }
      );
      
      // Set a backup timeout to redirect after 3 seconds regardless of response
      setTimeout(() => {
        console.log("Backup redirect timer triggered");
        // window.location.href = "/thank-you";
        makeWhereToGoDecision();
      }, 3000);
    } else if (suggestion.trim() === "") {
      // If no suggestion, just go to next page using window.location.href
      // window.location.href = "/thank-you";
      makeWhereToGoDecision();
    } else if (!feedbackData.sessionId) {
      console.error("No session ID found, cannot submit suggestion");
      // If no session ID, redirect back to feedback page
      // window.location.href = "/feedback";
      makeWhereToGoDecision();
    }
  };

  // Handle skip
  const handleSkip = () => {
    resetInactivityTimeout();
    // window.location.href = "/thank-you";
    makeWhereToGoDecision();
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  }

  return (
    <motion.div
      className="min-h-screen max-h-screen overflow-hidden relative"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <PharmacyBackground />
      <div className="w-full h-screen px-6 py-4 flex flex-col relative z-10 overflow-hidden">
        <motion.div className="mb-4 text-center flex-shrink-0" variants={itemVariants}>
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight text-[#1c7b80] drop-shadow-sm">
            Pharmacie Val d'Oise
          </h1>
          <h2 className="text-xl md:text-2xl font-bold mb-2 text-[#1c7b80] dark:text-green-300">Une idée ou une suggestion pour améliorer notre service ?</h2>
        </motion.div>

        <div className="flex-1 flex flex-col min-h-0 justify-center">
          <motion.div className="max-w-2xl mx-auto w-full" variants={itemVariants}>
            <Card className="border-0 shadow-lg bg-card backdrop-blur-sm border-t-4 border-[#1c7b80] dark:border-[#1c7b80] rounded-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#1c7b80]/10 to-transparent dark:from-gray-800 dark:to-gray-800/70 text-center py-3">
                <span className="text-xs italic">Cette étape est optionnelle.</span>
                <div className="flex items-center justify-center space-x-2">
                  <div className="bg-[#1c7b80]/10 dark:bg-green-900/40 p-2 rounded-full">
                    <Lightbulb className="h-5 w-5 text-[#1c7b80] dark:text-green-400" />
                  </div>
                  <CardTitle className="text-[#1c7b80] dark:text-green-300">Vos suggestions</CardTitle>
                </div>
                <CardDescription>
                  C'est ici que vous pouvez nous faire part de vos remarques, idées ou améliorations.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {formError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-md mb-4">
                    <p className="text-sm">{formError}</p>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Textarea
                      id="suggestion"
                      placeholder="Cliquer ici pour écrire votre message..."
                      className="w-full min-h-[120px] focus:border-[#1c7b80] focus:ring-[#1c7b80] transition-all duration-200 text-base touch-manipulation resize-none"
                      value={suggestion}
                      onChange={(e) => {
                        setSuggestion(e.target.value);
                        resetInactivityTimeout();
                      }}
                    />
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        resetInactivityTimeout();
                        window.location.href = "/contact";
                      }}
                      className="rounded-full px-6 py-3 w-full sm:w-auto border-[#1c7b80]/30 hover:border-[#1c7b80]/50 hover:bg-[#1c7b80]/5 dark:border-green-800 dark:hover:border-green-700 dark:hover:bg-green-900/30 min-h-[48px] text-base touch-manipulation"
                    >
                      Retour
                    </Button>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={handleSkip} 
                        className="rounded-full px-6 py-3 w-full sm:w-auto text-[#1c7b80] dark:text-green-300 hover:bg-[#1c7b80]/5 dark:hover:bg-green-900/30 min-h-[48px] text-base touch-manipulation"
                      >
                        Passer cette étape
                      </Button>
                      
                      <Button
                        type="submit"
                        disabled={isSubmitting || redirecting || suggestion.trim() === ""}
                        className="rounded-full px-8 py-3 w-full sm:w-auto bg-[#1c7b80] hover:bg-[#1c7b80]/90 text-white transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[48px] text-base touch-manipulation"
                      >
                        {isSubmitting || redirecting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Envoi en cours...
                          </>
                        ) : (
                          "Continuer"
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Progress indicator */}
        <motion.div className="mt-4 flex justify-center flex-shrink-0" variants={itemVariants}>
          <div className="flex items-center gap-2">
            <div className="h-2 w-8 rounded-full bg-gray-300"></div>
            <div className="h-2 w-8 rounded-full bg-gray-300"></div>
            <div className="h-2 w-8 rounded-full bg-[#1c7b80] shadow-sm"></div>
            <div className="h-2 w-8 rounded-full bg-gray-300"></div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

