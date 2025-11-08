import { useState, useEffect, useRef } from "react"
import { data, useFetcher, useLoaderData } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { motion } from "framer-motion"
import { Loader2 } from 'lucide-react'
import { useLocalStorage } from "@/hooks/use-local-storage"
import { PharmacyBackground } from "@/components/ui/pharmacy-background"
import type { Route } from "./+types/contact"
import { isBrowser } from "~/utils/browser.client"
import { toast } from "sonner"
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

export async function loader() {
  const feedbackSettings = await settingsService.getFeedbackPageSettings();
  return data({
    feedbackSettings
  });
}

export default function ContactPage() {
  const { feedbackSettings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const completeFetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  const [redirecting, setRedirecting] = useState(false);
  
  // Form data with localStorage persistence
  const [feedbackData, setFeedbackData, clearFeedbackData] = useLocalStorage<FeedbackData>("feedbackData", {
    deviceId: "",
    pharmacyRating: null,
    employeeRatings: {},
    employeeComments: {},
  });
  
  // Get values from feedbackData for the form
  const [firstName, setFirstName] = useState(feedbackData.firstName || "");
  const [lastName, setLastName] = useState(feedbackData.lastName || "");
  const [email, setEmail] = useState(feedbackData.email || "");
  const [phone, setPhone] = useState(feedbackData.phone || "");
  const [consent, setConsent] = useState(feedbackData.consent || false);
  const [formError, setFormError] = useState<string | null>(null);
  
  
  // Track inactivity timeout for shared devices
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 // Reset current session - for shared device scenarios
 const resetCurrentSession = () => {
  if (!isBrowser) return;
  
  // Keep device ID for shared devices
  const deviceId = feedbackData.deviceId;
  
  // Clear active feedback data but don't delete stored sessions
  clearFeedbackData();
};

  const makeWhereToGoDecision = () => {
    if (feedbackSettings.suggestionEnabled) {
      window.location.href = "/suggestion";
    } else if (feedbackSettings.thankYouEnabled) {
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

      // Refresh the page
      window.location.href = "/feedback";
    }
  }
  
  // Save form data to local storage when values change
  useEffect(() => {
    // Use functional update pattern to avoid dependency on feedbackData
    setFeedbackData(prevData => {
      // Only update if any values have changed to prevent unnecessary rerenders
      if (
        prevData.firstName === firstName &&
        prevData.lastName === lastName &&
        prevData.email === email &&
        prevData.phone === phone &&
        prevData.consent === consent
      ) {
        return prevData;
      }
      
      return {
        ...prevData,
        firstName,
        lastName,
        email,
        phone,
        consent,
        lastActiveAt: new Date().toISOString()
      };
    });
  }, [firstName, lastName, email, phone, consent, setFeedbackData]);
  
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
        console.log("Redirecting to suggestion page...");
        // Navigate to the next page with a short delay to ensure animation is seen
        setTimeout(() => {
          window.location.href = "/suggestion";
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
        // window.location.href = "/suggestion";
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

  // Handle form submission using fetcher
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetInactivityTimeout();
    
    // No validation needed for consent as it's optional
    
    // No need for validation since this step is optional
    // Submit client data if session ID exists
    if (feedbackData.sessionId) {
      console.log("Updating client data for session ID:", feedbackData.sessionId);
      setRedirecting(true); // Set redirecting to true immediately when submitting
      
      const clientData = {
        firstName,
        lastName,
        email,
        phone,
        consent
      };
      
      // We only send sessionId - the server can use this to identify the session
      fetcher.submit(
        {
          operation: "client-data",
          sessionId: feedbackData.sessionId, // Use the MongoDB document ID as session ID
          clientData: JSON.stringify(clientData)
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
        // window.location.href = "/suggestion";
        makeWhereToGoDecision();
      }, 3000);
    } else {
      console.error("No session ID found, cannot update client data");
      // If no session ID, just navigate to next page
      // window.location.href = "/suggestion";
      makeWhereToGoDecision();
    }
  };

  // Handle skip
  const handleSkip = () => {
    resetInactivityTimeout();
    // Use window.location.href instead of navigate API
    // window.location.href = "/suggestion";
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
          <h2 className="text-xl md:text-2xl font-bold mb-2 text-[#1c7b80] dark:text-blue-300">Recevez des offres exclusives et Avantages clients</h2>
          <p className="text-[#1c7b80]/80 dark:text-gray-300 text-sm max-w-xl mx-auto">
            Laissez vos coordonnées pour recevoir des promotions et nouveautés en avant-première. C'est 100% gratuit et sans engagement
          </p>
        </motion.div>

        <div className="flex-1 flex flex-col min-h-0 justify-center">
          <motion.div className="max-w-2xl mx-auto w-full" variants={itemVariants}>
            <Card className="border-0 shadow-lg bg-card backdrop-blur-sm border-t-4 border-[#1c7b80] dark:border-[#1c7b80] rounded-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#1c7b80]/10 to-transparent dark:from-gray-800 dark:to-gray-800/70 text-center py-3">
                <span className="text-xs italic">Cette étape est optionnelle.</span>
              </CardHeader> 
              <CardContent className="p-4">
                {formError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-md mb-4">
                    <p className="text-sm">{formError}</p>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Input 
                        id="firstName" 
                        placeholder="Prénom"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          resetInactivityTimeout();
                        }}
                        className="focus:border-blue-400 focus:ring-blue-400 h-12 text-base touch-manipulation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input 
                        id="lastName" 
                        placeholder="Nom"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          resetInactivityTimeout();
                        }}
                        className="focus:border-blue-400 focus:ring-blue-400 h-12 text-base touch-manipulation"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Input 
                      id="phone" 
                      placeholder="Téléphone"
                      type="tel" 
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        resetInactivityTimeout();
                      }}
                      className="focus:border-blue-400 focus:ring-blue-400 h-12 text-base touch-manipulation"
                    />
                  </div>

                  <div className="space-y-2">
                    <Input 
                      id="email" 
                      placeholder="Email"
                      type="email" 
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        resetInactivityTimeout();
                      }}
                      className="focus:border-blue-400 focus:ring-blue-400 h-12 text-base touch-manipulation"
                    />
                  </div>

                  <div className="flex items-start space-x-3 pt-2">
                    <Checkbox 
                      id="consent" 
                      checked={consent}
                      onCheckedChange={(checked) => {
                        setConsent(checked as boolean);
                        resetInactivityTimeout();
                      }}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 w-5 h-5 mt-0.5 touch-manipulation"
                    />
                    <Label htmlFor="consent" className="text-sm font-normal leading-tight cursor-pointer">
                      J'accepte de recevoir les offres promotionnelles de la
                      pharmacie
                    </Label>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        resetInactivityTimeout();
                        window.location.href = "/feedback";
                      }}
                      className="rounded-full px-6 py-3 w-full sm:w-auto border-[#1c7b80]/30 hover:border-[#1c7b80]/50 hover:bg-[#1c7b80]/5 dark:border-blue-800 dark:hover:border-blue-700 dark:hover:bg-blue-900/30 min-h-[48px] text-base touch-manipulation"
                    >
                      Retour
                    </Button>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={handleSkip} 
                        className="rounded-full px-6 py-3 w-full sm:w-auto text-[#1c7b80] dark:text-blue-300 hover:bg-[#1c7b80]/5 dark:hover:bg-blue-900/30 min-h-[48px] text-base touch-manipulation"
                      >
                        Passer cette étape
                      </Button>
                      
                      <Button
                        type="submit"
                        disabled={isSubmitting || redirecting}
                        className="rounded-full px-8 py-3 w-full sm:w-auto bg-[#1c7b80] hover:bg-[#1c7b80]/90 text-white transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[48px] text-base touch-manipulation"
                      >
                        {isSubmitting || redirecting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Envoi en cours...
                          </>
                        ) : (
                          "Envoyer mon avis"
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
            <div className="h-2 w-8 rounded-full bg-[#1c7b80] shadow-sm"></div>
            <div className="h-2 w-8 rounded-full bg-gray-300"></div>
            <div className="h-2 w-8 rounded-full bg-gray-300"></div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
