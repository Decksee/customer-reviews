import { useEffect, useState, useRef } from "react"
import { useNavigate, useFetcher } from "react-router"
import { motion } from "framer-motion"
import { CheckCircle2, Heart } from 'lucide-react'
import confetti from "canvas-confetti"
import { PharmacyBackground } from "@/components/ui/pharmacy-background"
import { useLocalStorage } from "@/hooks/use-local-storage"
import type { Route } from "./+types/thank-you"
import { isBrowser } from "~/utils/browser.client"
import { toast } from "sonner"

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
  completed?: boolean;
}

export default function ThankYouPage() {
  const [countdown, setCountdown] = useState(5)
  const navigate = useNavigate();
  const fetcher = useFetcher();
  
  // Get the feedback data from localStorage
  const [feedbackData, setFeedbackData, clearFeedbackData] = useLocalStorage<FeedbackData>("feedbackData", {
    deviceId: "",
    pharmacyRating: null,
    employeeRatings: {},
    employeeComments: {},
  });
  
  // Track if session has been completed
  const [sessionCompleted, setSessionCompleted] = useState(false);
  
  // Complete the session
  useEffect(() => {
    if (isBrowser && feedbackData.sessionId && !sessionCompleted) {
      console.log("Completing feedback session with ID:", feedbackData.sessionId);
      
      // Call the sync route to complete the session with the MongoDB document ID
      fetcher.submit(
        {
          operation: "complete",
          sessionId: feedbackData.sessionId
        },
        { 
          method: "post", 
          action: "/sync", 
          encType: "application/json"
        }
      );
      
      // Mark as completed locally
      setSessionCompleted(true);
      setFeedbackData({
        ...feedbackData,
        completed: true
      });
    } else if (isBrowser && !feedbackData.sessionId) {
      console.error("No session ID found, cannot complete feedback session");
    }
  }, [feedbackData.sessionId, sessionCompleted, fetcher, setFeedbackData]);

  // Trigger confetti effect with pharmacy colors
  useEffect(() => {
    if (!isBrowser) return;
    
    const duration = 4 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { 
      startVelocity: 30, 
      spread: 360, 
      ticks: 60, 
      zIndex: 100, // Higher z-index to appear above background
      gravity: 0.8 // Slightly reduced gravity for slower falling
    }

    // Define pharmacy colors with higher saturation
    const colors = [
      '#1c7b80', // Primary teal
      '#34d3aa', // Light teal
      '#a8d7d9', // Pale teal
      '#5e6bfb', // Bright purple
      '#f3a952'  // Bright orange
    ]

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval: NodeJS.Timeout = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 60 * (timeLeft / duration) // More particles
      
      // Launch confetti from multiple positions
      confetti({
        ...defaults,
        particleCount: Math.floor(particleCount * 0.6),
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: [colors[Math.floor(Math.random() * colors.length)], colors[Math.floor(Math.random() * colors.length)]],
        scalar: 1.2 // Bigger confetti
      })
      confetti({
        ...defaults,
        particleCount: Math.floor(particleCount * 0.6),
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: [colors[Math.floor(Math.random() * colors.length)], colors[Math.floor(Math.random() * colors.length)]],
        scalar: 1.2 // Bigger confetti
      })
      
      // Add center launch occasionally
      if (Math.random() > 0.7) {
        confetti({
          ...defaults,
          particleCount: Math.floor(particleCount * 0.4),
          origin: { x: 0.5, y: 0.2 },
          colors: [colors[Math.floor(Math.random() * colors.length)], colors[Math.floor(Math.random() * colors.length)]],
          scalar: 1.5 // Even bigger confetti
        })
      }
    }, 250)

    return () => clearInterval(interval)
  }, [])

  // Auto-redirect after countdown
  useEffect(() => {
    if (!isBrowser) return;
    
    if (countdown <= 0) {
      // Clear active session data
      resetCurrentSession();
      
      // Redirect to home page
      navigate("/");
      return
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, navigate])

  // Reset current session - for shared device scenarios
  const resetCurrentSession = () => {
    if (!isBrowser) return;
    
    // Keep device ID for shared devices
    const deviceId = feedbackData.deviceId;
    
    // Clear active feedback data but don't delete stored sessions
    // setFeedbackData({
    //   deviceId,
    //   pharmacyRating: null,
    //   employeeRatings: {},
    //   employeeComments: {},
    // });

    clearFeedbackData();
  };

  // Start new feedback function - specifically for shared device use
  const startNewFeedback = () => {
    if (!isBrowser) return;
    
    // Don't remove stored sessions from localStorage, but reset current session
    resetCurrentSession();
    
    // Redirect to feedback page
    navigate("/feedback");
  };

  // Add hidden staff reset gesture to the logo
  const setupStaffResetGesture = () => {
    if (!isBrowser) return;
    
    let tapCount = 0;
    let tapResetTimer: number | undefined;
    
    const handleLogoClick = () => {
      tapCount++;
      
      clearTimeout(tapResetTimer);
      tapResetTimer = window.setTimeout(() => {
        tapCount = 0;
      }, 2000);
      
      // Triple-tap triggers reset
      if (tapCount >= 3) {
        performFullReset();
        tapCount = 0;
      }
    };
    
    // Find the logo element and attach the event listener
    const logoElements = document.querySelectorAll('h2.bg-gradient-to-r');
    if (logoElements.length > 0) {
      logoElements[0].addEventListener('click', handleLogoClick);
    }
    
    return () => {
      if (logoElements.length > 0) {
        logoElements[0].removeEventListener('click', handleLogoClick);
      }
      if (tapResetTimer) {
        clearTimeout(tapResetTimer);
      }
    };
  };
  
  // Function to completely reset the feedback system (for staff)
  const performFullReset = () => {
    if (!isBrowser) return;
    
    // Keep device ID for shared devices
    const deviceId = feedbackData.deviceId;
    
    // Clear the current session data
    setFeedbackData({
      deviceId,
      pharmacyRating: null,
      employeeRatings: {},
      employeeComments: {},
    });
    
    // Clear stored sessions to start fresh
    localStorage.removeItem("storedSessions");
    
    console.log("Staff reset performed - all sessions cleared");
    toast("Application réinitialisée", {
      description: "Toutes les données ont été effacées."
    });
    
    // Redirect to feedback start page
    navigate("/feedback");
  };
  
  // Set up triple-tap gesture for staff reset
  useEffect(() => {
    const cleanup = setupStaffResetGesture();
    return cleanup;
  }, []);

  return (
    <motion.div
      className="min-h-screen max-h-screen overflow-hidden flex items-center justify-center relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Make background visible with fixed positioning */}
      <div className="fixed inset-0">
        <PharmacyBackground />
      </div>
      
      
      <div className="w-full h-screen px-6 py-4 flex flex-col items-center justify-center relative z-10">
        <motion.div
          className="text-center p-6 relative z-10 bg-card backdrop-blur-md rounded-xl shadow-2xl max-w-md w-full border-2 border-[#1c7b80]/20 dark:border-[#1c7b80]/30 mx-auto"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-[#1c7b80]/10 to-[#1c7b80]/20 dark:from-[#1c7b80]/20 dark:to-[#1c7b80]/30 text-[#1c7b80] dark:text-[#1c7b80]/90 mb-6 mx-auto shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1], rotate: [0, 10, 0] }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 5, 0] }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="relative"
            >
              <CheckCircle2 size={56} className="drop-shadow-md" />
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 15, 0]
                }}
                transition={{
                  repeat: Infinity,
                  repeatType: "reverse",
                  duration: 2,
                  delay: 1
                }}
              >
                <Heart size={18} className="fill-red-500 text-red-500" />
              </motion.div>
            </motion.div>
          </motion.div>
          
          <motion.h2 
            className="text-3xl font-bold mb-4 text-[#1c7b80] drop-shadow-sm"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Merci!
          </motion.h2>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-6 space-y-2"
          >
            <p className="text-lg font-semibold text-[#1c7b80] dark:text-[#1c7b80]/90">
              Merci pour votre temps!
            </p>
            <p className="text-base text-[#1c7b80]/80 dark:text-gray-300">
              Votre avis nous aide à mieux vous servir.
            </p>
            <p className="text-sm italic text-[#1c7b80] dark:text-[#1c7b80]/80">
              Bonne santé à vous
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.6 }}
            className="text-sm text-gray-500 dark:text-gray-400 mt-6 p-4 bg-[#1c7b80]/5 dark:bg-gray-700/40 rounded-lg shadow-inner"
          >
            <p>Redirection automatique dans <span className="font-bold text-[#1c7b80] dark:text-[#1c7b80]/90">{countdown}</span> secondes...</p>
          </motion.div>

          {/* New feedback button - important for shared devices */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.7 }}
            className="mt-4"
          >
            <button
              onClick={startNewFeedback}
              id="newFeedbackButton"
              className="px-6 py-3 bg-[#1c7b80]/10 dark:bg-[#1c7b80]/20 text-[#1c7b80] dark:text-[#1c7b80]/90 rounded-full hover:bg-[#1c7b80]/20 dark:hover:bg-[#1c7b80]/30 transition-colors min-h-[48px] text-base touch-manipulation w-full sm:w-auto"
            >
              Commencer un nouvel avis
            </button>
          </motion.div>

          {/* Progress indicator */}
          <motion.div 
            className="mt-6 flex justify-center" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-8 rounded-full bg-gray-300"></div>
              <div className="h-2 w-8 rounded-full bg-gray-300"></div>
              <div className="h-2 w-8 rounded-full bg-gray-300"></div>
              <div className="h-2 w-8 rounded-full bg-[#1c7b80] shadow-md"></div>
            </div>
          </motion.div>
          
          {/* Hidden note for support staff */}
          <div className="mt-6 text-[9px] text-center text-gray-400 dark:text-gray-600 opacity-50">
            Support: Triple-cliquez sur le titre "Merci!" pour réinitialiser complètement l'application
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
