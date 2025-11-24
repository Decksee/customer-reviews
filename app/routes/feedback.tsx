import type React from "react"
import { useState, useEffect, useRef } from "react"
import { data, useNavigate, useFetcher, Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Route } from "./+types/feedback"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { PharmacyBackground } from "@/components/ui/pharmacy-background"
import { getDeviceIdentifier, isBrowser } from "~/utils/browser.client"
import { userService } from "~/services/user.service.server"
import { serializeDocuments } from "~/core/db/utils"
import { settingsService } from "~/services/settings.service.server"
import EmojiRating from "~/components/feedback/emoji-rating"
import StarRating from "~/components/feedback/star-rating"

const STALE_THRESHOLD_MS = 2 * 60 * 1000;

type FeedbackData = {
  sessionId?: string;
  deviceId: string;
  pharmacyRating: number | null;
  employeeRatings: Record<string, number>;
  employeeComments: Record<string, string>;
  lastActiveAt?: string;
}

const feedbackOptionsByRating = {
  low: ["Lent", "Froid", "Distrait", "Brusque", "Absent"],
  medium: ["Correct", "Rapide", "Poli", "Efficace", "Attentif"],
  high: ["Parfait", "Souriant", "Pro", "Génial", "Top"]
}

export async function loader() {
  const employees = await userService.readMany({
    isActive: true,
    role: { $nin: ["manager", "admin"] } as any
  }, {
    populate: 'position'
  });

  const feedbackSettings = await settingsService.getFeedbackPageSettings();
  return data({
    employees: serializeDocuments(employees),
    feedbackSettings
  })
}

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Évaluez votre expérience - Pharmacie Val d'Oise" },
    { name: "description", content: "Partagez votre avis sur nos services et votre expérience avec notre équipe pharmaceutique" },

    { property: "og:type", content: "website" },
    { property: "og:url", content: "/feedback" },
    { property: "og:title", content: "Évaluez votre expérience - Pharmacie Val d'Oise" },
    { property: "og:description", content: "Partagez votre avis sur nos services et votre expérience avec notre équipe pharmaceutique" },
    { property: "og:image", content: "/images/logo.png" },

    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Évaluez votre expérience - Pharmacie Val d'Oise" },
    { name: "twitter:description", content: "Partagez votre avis sur nos services et votre expérience avec notre équipe pharmaceutique" },
    { name: "twitter:image", content: "/images/logo.png" },
  ];
}

export const links = () => [
  { rel: "preload", href: "/images/rh.mp4", as: "video", type: "video/mp4" }
];

const EmployeeCardExpanded = ({
  employee,
  employeeId,
  isSelected,
  onRatingChange,
  onCommentChange,
  initialRating = 0,
  initialComment = "",
  onClick,
  onClose
}: {
  employee: any
  employeeId: string
  isSelected: boolean
  onRatingChange: (id: string, rating: number) => void
  onCommentChange: (id: string, comment: string) => void
  initialRating?: number
  initialComment?: string
  onClick: () => void
  onClose: () => void
}) => {
  const [showCustomComment, setShowCustomComment] = useState(false);
  const [customComment, setCustomComment] = useState(initialComment);

  const getFeedbackOptions = () => {
    if (initialRating === 0) return [];
    if (initialRating <= 2) return feedbackOptionsByRating.low;
    if (initialRating <= 4) return feedbackOptionsByRating.medium;
    return feedbackOptionsByRating.high;
  };

  const currentOptions = getFeedbackOptions();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        width: isSelected ? 'auto' : '200px'
      }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="rounded-2xl dark:border-gray-700 dark:bg-gray-800 transition-shadow duration-200 relative shadow-sm"
    >
      <AnimatePresence>
        {isSelected && (
          <motion.button
            onClick={onClose}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-2 right-2 z-10 w-10 h-10 cursor-pointer flex items-center justify-center bg-white rounded-full shadow-sm hover:bg-gray-100 transition-all duration-200"
            aria-label="Fermer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#FF0000]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div
        layout
        className="border border-gray-200 rounded-2xl p-2 pb-2 bg-white"
      >
        <motion.div layout className="flex gap-4">
          <motion.div
            layout
            onClick={onClick}
            className="cursor-pointer relative rounded-2xl overflow-hidden shadow-sm hover:shadow-sm transition-all duration-300"
          >
            <Avatar className="w-[200px] h-[240px] rounded-2xl">
              {employee.avatar ? (
                <img
                  src={employee.avatar}
                  alt={`${employee.firstName || ''} ${employee.lastName || ''}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <AvatarFallback className="text-4xl rounded-2xl">
                  {(employee.firstName?.[0] || '') + (employee.lastName?.[0] || '')}
                </AvatarFallback>
              )}
            </Avatar>

            {initialRating > 0 && (<div className="absolute top-0 right-2 z-[999]">
              <span className={`font-extrabold text-2xl text-yellow-400`}>★ {initialRating}</span>
            </div>)}

            <AnimatePresence>
              {!isSelected && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4"
                >
                  <h3 className="font-semibold text-white text-center text-lg">
                    {employee.firstName} {employee.lastName}
                  </h3>
                  <p className="text-white/80 text-center text-sm">
                    {employee.position?.title || employee.currentPosition || 'Employé'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex-1"
              >
                <h3 className="font-semibold text-1xl text-gray-800 dark:text-white mt-4">
                  {employee.firstName + " " + employee.lastName}
                </h3>
                <p className="text-1xl text-gray-600 dark:text-gray-300">
                  {employee.position?.title || employee.currentPosition || 'Employé'}
                </p>
                <StarRating
                  id={employeeId}
                  onChange={(rating) => onRatingChange(employeeId, rating)}
                  initialValue={initialRating}
                />
                {initialRating > 0 && !showCustomComment && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {currentOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          onCommentChange(employeeId, option);
                          if (typeof (window as any).pauseScrollTemporarily === 'function') {
                            (window as any).pauseScrollTemporarily();
                          }
                        }}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${initialComment.includes(option)
                          ? "bg-[#217E82] text-white border-teal-600"
                          : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                          }`}
                      >
                        {option}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomComment(true);
                      }}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${showCustomComment || (initialComment && !currentOptions.some(opt => initialComment.includes(opt)))
                        ? "bg-[#217E82] text-white border-teal-600"
                        : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                        }`}
                    >
                      Autre
                    </button>
                  </div>
                )}

                {initialRating > 0 && showCustomComment && (
                  <div className="mt-0">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomComment(false);
                          setCustomComment("");
                          onCommentChange(employeeId, "");
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Retour aux tags"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                      </button>
                      <span className="text-sm text-gray-600">Retour aux tags</span>
                    </div>
                    <textarea
                      value={customComment}
                      onChange={(e) => {
                        setCustomComment(e.target.value);
                        onCommentChange(employeeId, e.target.value);
                      }}
                      placeholder="Commentaire"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#217E82] resize-none"
                      rows={2}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default function FeedbackStart({ loaderData }: Route.ComponentProps) {
  const { employees, feedbackSettings } = loaderData
  const navigate = useNavigate()
  const fetcher = useFetcher()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const deviceId = isBrowser ? getDeviceIdentifier() : '';

  const [feedbackData, setFeedbackData, clearFeedbackData] = useLocalStorage<FeedbackData>("feedbackData", {
    deviceId,
    pharmacyRating: null,
    employeeRatings: {},
    employeeComments: {},
  })

  useEffect(() => {
    if (!scrollContainerRef.current || !isAutoScrolling) return;

    const scrollContainer = scrollContainerRef.current;
    let animationFrameId: number;
    const scrollSpeed = 1;

    const autoScroll = () => {
      if (scrollContainer) {
        scrollContainer.scrollLeft += scrollSpeed;
        const maxScroll = scrollContainer.scrollWidth / 2;
        if (scrollContainer.scrollLeft >= maxScroll) {
          scrollContainer.scrollLeft = 0;
        }

        animationFrameId = requestAnimationFrame(autoScroll);
      }
    };

    animationFrameId = requestAnimationFrame(autoScroll);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isAutoScrolling]);

  const completeFetcher = useFetcher();

  const resetCurrentSession = () => {
    if (!isBrowser) return;
    const deviceId = feedbackData.deviceId;
    clearFeedbackData();
  };

  const makeWhereToGoDecision = () => {
    if (feedbackSettings.clientInfoEnabled) {
      window.location.href = "/contact";
    } else if (feedbackSettings.suggestionEnabled) {
      window.location.href = "/suggestion";
    } else if (feedbackSettings.thankYouEnabled) {
      window.location.href = "/thank-you";
    } else {
      // First complete the feedback process and then refresh the page
      // Call the sync route to complete the session with the MongoDB document ID
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
      window.location.reload();
    }
  }

  useEffect(() => {
    console.log("Fetcher state:", fetcher.state, "Fetcher data:", fetcher.data);

    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.success && fetcher.data.data) {
        console.log("Success! Server provided session data:", fetcher.data.data);

        if (!redirecting) {
          // Prevent multiple redirects
          setRedirecting(true);

          // Store the sessionId from MongoDB
          setFeedbackData({
            ...feedbackData,
            sessionId: fetcher.data.data.sessionId,
            lastActiveAt: new Date().toISOString()
          });

          console.log("Starting redirect to contact page...");

          // Reset submitting state
          setIsSubmitting(false);

          // Navigate to next page with a longer delay to ensure state is updated
          setTimeout(() => {
            makeWhereToGoDecision();
          }, 500);
        }
      } else if (fetcher.data.success === false) {
        console.error("Error in submission:", fetcher.data.error);
        setFormError(fetcher.data.error || "Une erreur est survenue");
        if (isBrowser) {
          toast(fetcher.data.error || "Une erreur est survenue");
        }
        setIsSubmitting(false);
      }
    }
  }, [fetcher.data, fetcher.state, navigate, setFeedbackData, feedbackData, redirecting]);

  // Add a backup redirect mechanism in case fetcher gets stuck
  useEffect(() => {
    if (isSubmitting && !redirecting) {
      const redirectTimeout = setTimeout(() => {
        if (feedbackData.sessionId) {
          console.log("Backup redirect timer triggered");
          setRedirecting(true);
          // window.location.href = "/contact";
          makeWhereToGoDecision();
        }
      }, 5000); // 5 second backup timeout

      return () => clearTimeout(redirectTimeout);
    }
  }, [isSubmitting, redirecting, feedbackData.sessionId]);

  // Handle Note Pharmacie change
  const handlePharmacyRatingChange = (rating: number) => {
    console.log(`Setting pharmacy rating to: ${rating}`);
    setFeedbackData({
      ...feedbackData,
      pharmacyRating: rating,
      lastActiveAt: new Date().toISOString()
    });
    // Reset inactivity timeout when user interacts
    resetInactivityTimeout();
  };

  // Handle employee rating change
  const handleEmployeeRatingChange = (id: string, rating: number) => {
    setFeedbackData({
      ...feedbackData,
      employeeRatings: {
        ...feedbackData.employeeRatings,
        [id]: rating,
      },
      lastActiveAt: new Date().toISOString()
    });
    // Reset inactivity timeout when user interacts
    resetInactivityTimeout();
  };

  // Handle employee comment change
  const handleEmployeeCommentChange = (id: string, comment: string) => {
    setFeedbackData({
      ...feedbackData,
      employeeComments: {
        ...feedbackData.employeeComments,
        [id]: comment,
      },
      lastActiveAt: new Date().toISOString()
    });
    // Reset inactivity timeout when user interacts
    resetInactivityTimeout();
  };

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
    console.log("Inactivity timeout reached - resetting feedback form for shared device");

    // Clear feedback data but keep device identifier
    setFeedbackData({
      deviceId: feedbackData.deviceId,
      pharmacyRating: null,
      employeeRatings: {},
      employeeComments: {},
    });

    if (isBrowser) {
      toast("Votre session a expiré en raison d'inactivité.", {
        description: "Veuillez recommencer votre évaluation.",
        action: {
          label: "OK",
          onClick: () => console.log("Session timeout acknowledged")
        }
      });
    }
  };

  // Form validation
  const validateForm = () => {
    console.log("Validating form with pharmacy rating:", feedbackData.pharmacyRating);

    // Make sure pharmacyRating is a valid number between 1-5
    if (!feedbackData.pharmacyRating ||
      typeof feedbackData.pharmacyRating !== 'number' ||
      feedbackData.pharmacyRating < 1 ||
      feedbackData.pharmacyRating > 5) {
      setFormError("Veuillez évaluer votre expérience globale dans la pharmacie");
      if (isBrowser) {
        toast("Veuillez sélectionner un emoji pour évaluer votre expérience");
      }
      return false;
    }

    // Check if at least one employee has been rated
    const hasRatedEmployee = Object.values(feedbackData.employeeRatings).some((rating) => rating > 0);
    if (!hasRatedEmployee) {
      setFormError("Veuillez évaluer au moins un membre de notre équipe");
      if (isBrowser) {
        toast("Veuillez évaluer au moins un membre de notre équipe");
      }
      return false;
    }

    // If we get here, form is valid
    setFormError(null);
    return true;
  };

  // Handle form submission - now using fetcher instead of form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // If already submitting or redirecting, prevent multiple submissions
    if (isSubmitting || redirecting) {
      return;
    }

    // Reset inactivity timeout when form is submitted
    resetInactivityTimeout();

    // Double-check pharmacy rating before submission
    console.log("Submit - pharmacy rating:", feedbackData.pharmacyRating);

    // Validate the form 
    if (!validateForm()) {
      return;
    }

    // At this point we're guaranteed to have a valid pharmacyRating (validateForm ensures this)
    if (!feedbackData.pharmacyRating) {
      console.error("Unexpected error: pharmacyRating is null after validation");
      setFormError("Une erreur est survenue lors de l'envoi");
      return;
    }

    // Prepare employee ratings in the format expected by the server
    const employeeRatingsArray = Object.entries(feedbackData.employeeRatings)
      .filter(([_, rating]) => rating > 0)
      .map(([employeeId, rating]) => ({
        employeeId,
        rating,
        comment: feedbackData.employeeComments[employeeId] || ""
      }));

    console.log("Submitting employee ratings:", JSON.stringify(employeeRatingsArray, null, 2));

    // Set submitting state
    setIsSubmitting(true);

    // We don't include any client-generated sessionId in the initial request
    // The server will generate a new session ID for us
    const payload = {
      operation: "create-session",
      deviceId: feedbackData.deviceId,
      pharmacyRating: feedbackData.pharmacyRating.toString(),
      employeeRatings: JSON.stringify(employeeRatingsArray)
    };

    console.log("Submitting payload to sync route:", payload);

    // Submit data to sync route to create a new session
    fetcher.submit(
      payload,
      {
        method: "post",
        action: "/sync",
        encType: "application/json"
      }
    );
  };


  // Animation variants for page elements
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

  // Clear error when Note Pharmacie changes
  useEffect(() => {
    if (feedbackData.pharmacyRating) {
      setFormError(null)
    }
  }, [feedbackData.pharmacyRating])

  // Clear error when any employee rating changes
  useEffect(() => {
    if (Object.values(feedbackData.employeeRatings).some((rating) => rating > 0)) {
      setFormError(null)
    }
  }, [feedbackData.employeeRatings])

  // Safety measure to ensure isSubmitting is reset if the fetcher state changes unexpectedly
  useEffect(() => {
    // If we're submitting but the fetcher has gone idle without being handled by our other effect
    if (isSubmitting && fetcher.state === 'idle' && !fetcher.data) {
      console.log("Resetting isSubmitting state as a safety measure");
      setIsSubmitting(false);
    }

    // If there's an error in the fetcher, also reset isSubmitting
    if (fetcher.state === 'idle' && fetcher.data?.success === false) {
      setIsSubmitting(false);
    }
  }, [fetcher.state, fetcher.data, isSubmitting]);

  // Avant le return, après le filtrage
  const filteredEmployees = employees
    .filter((employee) => employee.id || employee._id)
    .filter((employee) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase();
      const inverseFullName = `${employee.lastName || ''} ${employee.firstName || ''}`.toLowerCase();
      return fullName.includes(query) || inverseFullName.includes(query);
    });

  // Arrêter le scroll auto si recherche active
  const shouldAutoScroll = !searchQuery.trim() && isAutoScrolling;

  // Ne dupliquer que si pas de recherche
  const displayEmployees = searchQuery.trim()
    ? filteredEmployees
    : [...filteredEmployees, ...filteredEmployees];

  // Modifier le useEffect du scroll
  useEffect(() => {
    if (!scrollContainerRef.current || !shouldAutoScroll) return;
    // ... reste du code
  }, [shouldAutoScroll]); // Changer la dépendance

  return (
    <motion.div
      className="min-h-screen max-h-screen overflow-hidden relative"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <PharmacyBackground />

      {/* Add discrete login link at top left */}
      <div className="absolute top-2 left-4 z-20">
        <Link
          to="/admin/login"
          className="px-3 py-1 text-xs bg-white/80 hover:bg-white/90 dark:bg-gray-800/80 dark:hover:bg-gray-800/90 text-blue-500/70 hover:text-blue-600 dark:text-blue-400/70 dark:hover:text-blue-400 rounded-full shadow-sm hover:shadow transition-all duration-200 backdrop-blur-sm flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Se connecter
        </Link>
      </div>

      <div className="w-full h-screen px-8 py-3 flex flex-col relative z-10 overflow-hidden">
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 10px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.15);
            border-radius: 10px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.25);
          }
          
          /* Pour Firefox */
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0.05);
          }
          
          /* Cacher complètement la scrollbar */
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>

        <div className="bg-transparent pb-6 px-8 mb-5">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/images/logo-2.svg" className="w-[180px] h-[84px]" alt="" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900">
            Aidez-nous à améliorer nos services
          </h2>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
            <motion.div variants={itemVariants} className="flex flex-col min-h-0">
              <Card className="h-full p-6 border-0 bg-[#FFFFFF40] backdrop-blur-sm dark:bg-gray-800/95 transition-all duration-300 flex flex-col dark:border-[#1c7b80] rounded-[50px] overflow-hidden">
                <CardHeader className="pb-1 pt-3 px-3 flex-shrink-0">
                  <h1 className="text-2xl font-bold text-center">Et vous, quelle est votre retour d’expérience dans notre pharmacie ?</h1>
                </CardHeader>
                <CardContent className="px-3 py-1 flex-1 flex flex-col min-h-0">
                  <div className="flex justify-center my-2 px-2 flex-shrink-0">
                    <video
                      src="/images/rh.mp4"
                      className="w-full max-w-md max-h-[150px] rounded-lg object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    >
                      <track kind="captions" />
                    </video>
                  </div>
                  <h1 className="text-[20px] text-center mt-5 font-bold px-5">Sélectionnez l'emoji qui représente votre niveau de satisfaction</h1>
                  <div className="flex justify-center mt-8 mb-5  flex-shrink-0">
                    <EmojiRating
                      onChange={handlePharmacyRatingChange}
                      initialValue={feedbackData.pharmacyRating}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col min-h-0">
              <Card className="h-full p-6 border-0 bg-[#FFFFFF40] backdrop-blur-sm dark:bg-gray-800/95 transition-all duration-300 flex flex-col dark:border-[#1c7b80] rounded-[40px] overflow-hidden">
                <CardHeader className="pb-1 pt-3 px-3 flex-shrink-0">
                  <h1 className="text-3xl font-bold text-center">Notre personnel</h1>
                  <h1 className="text-[16px] text-center">Qu’avez-vous pensez du personnel qui vous a reçu ? Donnez une note et sélectionnez vos impressions à chaque personne avec qui vous avez interagit.</h1>
                </CardHeader>
                <div className="relative w-[95%] mx-auto mb-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    className="w-full border p-2 pl-10 rounded-[7px] bg-white"
                    placeholder="Recherche"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <CardContent className="px-0 py-1 flex-1 flex flex-col min-h-0 relative overflow-hidden">
                  <div
                    ref={scrollContainerRef}
                    className="flex gap-4 overflow-x-auto overflow-y-hidden pr-1 min-h-0 w-full scrollbar-hide pb-4"
                    style={{ scrollBehavior: isAutoScrolling ? 'auto' : 'smooth' }}
                  >
                    {displayEmployees.map((employee, index) => {
                      const employeeId = (employee.id || employee._id?.toString()) as string;
                      const uniqueKey = `${employeeId}-${index}`;
                      const isSelected = selectedEmployeeId === employeeId;

                      return (
                        <div key={uniqueKey} className="relative">
                          <EmployeeCardExpanded
                            employee={employee}
                            isSelected={isSelected}
                            employeeId={employeeId}
                            onRatingChange={handleEmployeeRatingChange}
                            onCommentChange={handleEmployeeCommentChange}
                            initialRating={feedbackData.employeeRatings[employeeId] || 0}
                            initialComment={feedbackData.employeeComments[employeeId] || ""}
                            onClick={() => {
                              setSelectedEmployeeId(employeeId);
                              setIsAutoScrolling(false);

                              setTimeout(() => {
                                const container = scrollContainerRef.current;
                                const card = container?.children[index] as HTMLElement;
                                if (container && card) {
                                  const containerWidth = container.offsetWidth;
                                  const cardLeft = card.offsetLeft;
                                  const cardWidth = card.offsetWidth;
                                  const offset = 200;
                                  const scrollPosition = cardLeft - (containerWidth / 2) + (cardWidth / 2) + offset;
                                  container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
                                }
                              }, 50);
                            }}
                            onClose={() => {
                              setSelectedEmployeeId(null);
                              setIsAutoScrolling(true);
                            }}
                          />
                        </div>
                      );
                    })}

                  </div>
                </CardContent>

                {formError && (
                  <motion.div
                    className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-md mt-1 max-w-3xl mx-auto flex-shrink-0"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <p className="text-sm font-medium">{formError}</p>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          </div>

          <div className="flex justify-center items-center mt-13 mb-5 flex-shrink-0">
            <motion.div variants={itemVariants}>
              <Button
                type="button"
                onClick={handleSubmit}
                size="lg"
                disabled={isSubmitting || redirecting || fetcher.state === 'submitting' || fetcher.state === 'loading'}
                className="px-10 py-3 text-lg rounded-lg bg-gradient-to-r from-[#1c7b80] to-[#1c7b80]/80 hover:from-[#1c7b80]/90 hover:to-[#1c7b80]/70 dark:from-blue-700 dark:to-green-700 dark:hover:from-blue-800 dark:hover:to-green-800 text-white font-medium transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 touch-manipulation min-h-[48px]"
              >
                {isSubmitting || redirecting || fetcher.state === 'submitting' || fetcher.state === 'loading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {redirecting ? 'Redirection...' : 'Traitement...'}
                  </>
                ) : (
                  "Envoyer"
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}