import type React from "react"
import { useState, useEffect, useRef } from "react"
import { data, useNavigate, useFetcher, Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
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

const STALE_THRESHOLD_MS = 2 * 60 * 1000;

type FeedbackData = {
  sessionId?: string;
  deviceId: string;
  pharmacyRating: number | null;
  employeeRatings: Record<string, number>;
  employeeComments: Record<string, string>;
  lastActiveAt?: string;
}

const emojis = [
  {
    value: 1,
    color: "#EF4444",
    emoji: "😞",
    label: "Très insatisfait",
  },
  {
    value: 2,
    color: "#F97316",
    emoji: "😕",
    label: "Insatisfait",
  },
  {
    value: 3,
    color: "#EAB308",
    emoji: "😐",
    label: "Neutre",
  },
  {
    value: 4,
    color: "#84CC16",
    emoji: "🙂",
    label: "Satisfait",
  },
  {
    value: 5,
    color: "#22C55E",
    emoji: "😃",
    label: "Très satisfait",
  },
]

const feedbackOptions = [
  "Accueillant",
  "À l'écoute",
  "Rapide",
  "Souriant",
  "Patient",
  "Attentif"
]

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

// const EmojiRating = ({ onChange, initialValue }: any) => {
//   const [selected, setSelected] = useState(initialValue)

//   useEffect(() => {
//     setSelected(initialValue)
//   }, [initialValue])

//   return (
//     <div className="flex justify-center items-center gap-4">
//       {emojis.map((item) => {
//         const isSelected = selected === item.value
//         return (
//           <div key={item.value} className="flex flex-col items-center">
//             <button
//               type="button"
//               onClick={() => {
//                 setSelected(item.value)
//                 onChange(item.value)
//               }}
//               className={`w-16 h-16 md:w-20 md:h-20 text-4xl rounded-full transition-all duration-300 ${isSelected && "ring-4 ring-offset-4 ring-gray-400"
//                 }`}
//               style={{ backgroundColor: item.color }}
//               title={item.label}
//               aria-label={item.label}
//             >{item.emoji}
//             </button>
//             {isSelected && (
//               <span className="text-sm mt-5 font-medium text-gray-700">
//                 {item.label}
//               </span>
//             )}
//           </div>
//         )
//       })}
//     </div>
//   )
// }

const EmojiRating = ({ onChange, initialValue }: { onChange: (rating: number) => void, initialValue: number | null }) => {
  const [selected, setSelected] = useState<number | null>(initialValue)
  const [animationFace, setAnimationFace] = useState<number | null>(null)

  // Function to run animation on a specific face
  const runFaceAnimation = (value: number) => {
    // Start new animation (no need to reset first, just override)
    setAnimationFace(value)

    // Auto stop animation after completion
    setTimeout(() => {
      if (animationFace === value) {
        setAnimationFace(null)
      }
    }, 800)
  }

  // Update selected state if initialValue changes
  useEffect(() => {
    console.log("EmojiRating initialValue updated:", initialValue);
    setSelected(initialValue);
  }, [initialValue]);

  const emojis = [
    {
      value: 1,
      bgGradient: "bg-gradient-to-br from-red-400 via-red-500 to-red-700",
      topGradient: "bg-gradient-to-br from-red-300 via-red-400 to-red-600",
      shadowColor: "shadow-red-600/60",
      glowColor: "drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]",
      ringColor: "ring-red-400",
      initialRotation: { rotateX: 0, rotateY: 0 },
      label: "Très insatisfait",
      face: ({ isAnimating }: { isAnimating: boolean }) => (
        <motion.div
          className="flex items-center justify-center h-full w-full relative z-10"
          animate={isAnimating ? {
            rotateY: [-15, 15, -15, 0],
            rotateX: [-10, 10, -10, 0]
          } : { rotateY: 0, rotateX: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="flex flex-col items-center justify-center transform-gpu">
            <div className="flex space-x-3 mb-1">
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-white shadow-lg border border-white/50"
                animate={isAnimating ? {
                  scaleY: [1, 0.3, 1],
                  rotateX: [0, 90, 0]
                } : { scaleY: 1, rotateX: 0 }}
                transition={{ duration: 0.6, repeat: isAnimating ? 1 : 0 }}
                style={{ transformStyle: "preserve-3d" }}
              ></motion.div>
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-white shadow-lg border border-white/50"
                animate={isAnimating ? {
                  scaleY: [1, 0.3, 1],
                  rotateX: [0, 90, 0]
                } : { scaleY: 1, rotateX: 0 }}
                transition={{ duration: 0.6, repeat: isAnimating ? 1 : 0 }}
                style={{ transformStyle: "preserve-3d" }}
              ></motion.div>
            </div>
            <motion.div
              className="w-6 h-2 mt-1.5 rounded-full border-2 border-white border-b-0 rounded-t-none shadow-lg bg-gradient-to-b from-white/20 to-transparent"
              animate={isAnimating ? {
                scaleX: [1, 1.5, 1],
                rotateX: [0, 15, 0]
              } : { scaleX: 1, rotateX: 0 }}
              transition={{ duration: 0.6 }}
              style={{ transformStyle: "preserve-3d" }}
            ></motion.div>
          </div>
        </motion.div>
      ),
    },
    {
      value: 2,
      bgGradient: "bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700",
      topGradient: "bg-gradient-to-br from-orange-300 via-orange-400 to-orange-600",
      shadowColor: "shadow-orange-600/60",
      glowColor: "drop-shadow-[0_0_15px_rgba(251,146,60,0.6)]",
      ringColor: "ring-orange-400",
      initialRotation: { rotateX: 0, rotateY: 0 },
      label: "Insatisfait",
      face: ({ isAnimating }: { isAnimating: boolean }) => (
        <motion.div
          className="flex items-center justify-center h-full w-full relative z-10"
          animate={isAnimating ? {
            rotateY: [-15, 15, -15, 0],
            rotateX: [-10, 10, -10, 0]
          } : { rotateY: 0, rotateX: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="flex flex-col items-center justify-center transform-gpu">
            <div className="flex space-x-3 mb-1">
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-white shadow-lg border border-white/50"
                animate={isAnimating ? {
                  y: [0, 2, 0],
                  rotateX: [0, 45, 0]
                } : { y: 0, rotateX: 0 }}
                transition={{ duration: 0.6, repeat: isAnimating ? 1 : 0 }}
                style={{ transformStyle: "preserve-3d" }}
              ></motion.div>
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-white shadow-lg border border-white/50"
                animate={isAnimating ? {
                  y: [0, 2, 0],
                  rotateX: [0, 45, 0]
                } : { y: 0, rotateX: 0 }}
                transition={{ duration: 0.6, repeat: isAnimating ? 1 : 0 }}
                style={{ transformStyle: "preserve-3d" }}
              ></motion.div>
            </div>
            <motion.div
              className="w-6 h-2 mt-1.5 rounded-full border-2 border-white border-t-0 rounded-b-none shadow-lg bg-gradient-to-t from-white/20 to-transparent"
              animate={isAnimating ? {
                scaleX: [1, 1.5, 1],
                rotateX: [0, -15, 0]
              } : { scaleX: 1, rotateX: 0 }}
              transition={{ duration: 0.6 }}
              style={{ transformStyle: "preserve-3d" }}
            ></motion.div>
          </div>
        </motion.div>
      ),
    },
    {
      value: 3,
      bgGradient: "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600",
      topGradient: "bg-gradient-to-br from-yellow-200 via-yellow-300 to-yellow-500",
      shadowColor: "shadow-yellow-600/60",
      glowColor: "drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]",
      ringColor: "ring-yellow-300",
      initialRotation: { rotateX: 0, rotateY: 0 },
      label: "Neutre",
      face: ({ isAnimating }: { isAnimating: boolean }) => (
        <motion.div
          className="flex items-center justify-center h-full w-full relative z-10"
          animate={isAnimating ? {
            rotateY: [-10, 10, -10, 0],
            rotateX: [-5, 5, -5, 0]
          } : { rotateY: 0, rotateX: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="flex flex-col items-center justify-center transform-gpu">
            <div className="flex space-x-3 mb-1">
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-white shadow-lg border border-white/50"
                animate={isAnimating ? {
                  scale: [1, 1.5, 1],
                  rotateZ: [0, 360, 0]
                } : { scale: 1, rotateZ: 0 }}
                transition={{ duration: 0.6, repeat: isAnimating ? 1 : 0 }}
                style={{ transformStyle: "preserve-3d" }}
              ></motion.div>
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-white shadow-lg border border-white/50"
                animate={isAnimating ? {
                  scale: [1, 1.5, 1],
                  rotateZ: [0, 360, 0]
                } : { scale: 1, rotateZ: 0 }}
                transition={{ duration: 0.6, repeat: isAnimating ? 1 : 0 }}
                style={{ transformStyle: "preserve-3d" }}
              ></motion.div>
            </div>
            <motion.div
              className="w-6 h-1.5 mt-2 bg-white rounded-full shadow-lg border border-white/30 bg-gradient-to-b from-white to-white/80"
              animate={isAnimating ? {
                scaleX: [1, 1.5, 1],
                rotateY: [0, 15, 0]
              } : { scaleX: 1, rotateY: 0 }}
              transition={{ duration: 0.6 }}
              style={{ transformStyle: "preserve-3d" }}
            ></motion.div>
          </div>
        </motion.div>
      ),
    },
    {
      value: 4,
      bgGradient: "bg-gradient-to-br from-lime-400 via-lime-500 to-lime-700",
      topGradient: "bg-gradient-to-br from-lime-300 via-lime-400 to-lime-600",
      shadowColor: "shadow-lime-600/60",
      glowColor: "drop-shadow-[0_0_15px_rgba(132,204,22,0.6)]",
      ringColor: "ring-lime-400",
      initialRotation: { rotateX: 5, rotateY: 10 },
      label: "Satisfait",
      face: ({ isAnimating }: { isAnimating: boolean }) => (
        <motion.div
          className="flex items-center justify-center h-full w-full relative z-10"
          animate={isAnimating ? {
            rotateY: [-10, 10, -10, 0],
            rotateX: [-5, 5, -5, 0]
          } : { rotateY: 0, rotateX: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="flex flex-col items-center justify-center transform-gpu">
            <div className="flex space-x-3 mb-1">
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-white shadow-lg border border-white/50"
                animate={isAnimating ? {
                  y: [0, -2, 0],
                  rotateX: [0, -45, 0]
                } : { y: 0, rotateX: 0 }}
                transition={{ duration: 0.6, repeat: isAnimating ? 1 : 0 }}
                style={{ transformStyle: "preserve-3d" }}
              ></motion.div>
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-white shadow-lg border border-white/50"
                animate={isAnimating ? {
                  y: [0, -2, 0],
                  rotateX: [0, -45, 0]
                } : { y: 0, rotateX: 0 }}
                transition={{ duration: 0.6, repeat: isAnimating ? 1 : 0 }}
                style={{ transformStyle: "preserve-3d" }}
              ></motion.div>
            </div>
            <motion.div
              className="w-6 h-2 mt-1.5 rounded-full border-2 border-white border-b-0 rounded-t-none transform rotate-180 shadow-lg bg-gradient-to-b from-white/20 to-transparent"
              animate={isAnimating ? {
                scaleX: [1, 1.5, 1],
                rotateX: [180, 195, 180]
              } : { scaleX: 1, rotateX: 180 }}
              transition={{ duration: 0.6 }}
              style={{ transformStyle: "preserve-3d" }}
            ></motion.div>
          </div>
        </motion.div>
      ),
    },
    {
      value: 5,
      bgGradient: "bg-gradient-to-br from-green-400 via-green-500 to-green-700",
      topGradient: "bg-gradient-to-br from-green-300 via-green-400 to-green-600",
      shadowColor: "shadow-green-600/60",
      glowColor: "drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]",
      ringColor: "ring-green-400",
      initialRotation: { rotateX: 8, rotateY: -12 },
      label: "Très satisfait",
      face: ({ isAnimating }: { isAnimating: boolean }) => (
        <motion.div
          className="flex items-center justify-center h-full w-full relative z-10"
          animate={isAnimating ? {
            rotateY: [-15, 15, -15, 0],
            rotateX: [-10, 10, -10, 0]
          } : { rotateY: 0, rotateX: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="flex flex-col items-center justify-center transform-gpu">
            <div className="flex space-x-3 mb-1">
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-white shadow-lg border border-white/50"
                animate={
                  isAnimating
                    ? {
                      scale: [1, 1.5, 1],
                      y: [0, -2, 0],
                      rotateZ: [0, 360, 0]
                    }
                    : { scale: 1, y: 0, rotateZ: 0 }
                }
                transition={{ duration: 0.6, repeat: isAnimating ? 1 : 0 }}
                style={{ transformStyle: "preserve-3d" }}
              ></motion.div>
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-white shadow-lg border border-white/50"
                animate={
                  isAnimating
                    ? {
                      scale: [1, 1.5, 1],
                      y: [0, -2, 0],
                      rotateZ: [0, 360, 0]
                    }
                    : { scale: 1, y: 0, rotateZ: 0 }
                }
                transition={{ duration: 0.6, repeat: isAnimating ? 1 : 0 }}
                style={{ transformStyle: "preserve-3d" }}
              ></motion.div>
            </div>
            <motion.div
              className="w-7 h-3 mt-1 border-2 border-white border-t-0 rounded-b-full shadow-lg bg-gradient-to-b from-white/20 to-transparent"
              animate={isAnimating ? {
                scaleX: [1, 1.5, 1],
                rotateX: [0, 15, 0]
              } : { scaleX: 1, rotateX: 0 }}
              transition={{ duration: 0.6 }}
              style={{ transformStyle: "preserve-3d" }}
            ></motion.div>
          </div>
        </motion.div>
      ),
    },
  ]

  return (
    <div className="flex justify-between items-center gap-3 md:gap-5" style={{ perspective: "1000px" }}>
      {emojis.map((item) => {
        const isSelected = selected === item.value
        const isAnimating = animationFace === item.value
        const Face = item.face

        return (
          <motion.div
            key={item.value}
            className="flex flex-col items-center"
            whileHover={{
              scale: 1.1,
              y: -12,
              rotateX: item.initialRotation.rotateX - 5,
              rotateY: item.initialRotation.rotateY + 5
            }}
            whileTap={{
              scale: 0.95,
              y: 2,
              rotateX: item.initialRotation.rotateX + 10,
              rotateY: item.initialRotation.rotateY - 5
            }}
            initial={{
              opacity: 0.8,
              y: 20,
              scale: 0.9,
              rotateX: item.initialRotation.rotateX,
              rotateY: item.initialRotation.rotateY
            }}
            animate={{
              scale: isSelected ? 1.2 : 1,
              opacity: isSelected ? 1 : isAnimating ? 0.95 : 0.85,
              y: isSelected ? -8 : 0,
              rotateX: isSelected ? item.initialRotation.rotateX - 10 : item.initialRotation.rotateX,
              rotateY: isSelected ? item.initialRotation.rotateY + 5 : item.initialRotation.rotateY,
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 20,
              delay: item.value * 0.08,
            }}
            onHoverStart={() => runFaceAnimation(item.value)}
            onHoverEnd={() => {
              if (animationFace === item.value) {
                setAnimationFace(null)
              }
            }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <motion.button
              type="button"
              onClick={() => {
                const newValue = item.value;
                console.log(`Setting emoji to: ${newValue}`);
                setSelected(newValue);
                onChange(newValue);
                runFaceAnimation(newValue);

                // Add haptic feedback if available
                if (isBrowser && 'vibrate' in navigator) {
                  navigator.vibrate(50)
                }

                console.log(`Selected pharmacy rating: ${newValue}`);
              }}
              className={`relative w-16 h-16 md:w-20 md:h-20 lg:w-18 lg:h-18 xl:w-22 xl:h-22 rounded-full overflow-hidden ${isSelected
                ? `ring-4 ring-offset-4 ${item.ringColor} ${item.shadowColor} shadow-2xl`
                : isAnimating
                  ? `ring-2 ring-offset-2 ${item.ringColor} ${item.shadowColor} shadow-xl`
                  : `${item.shadowColor} shadow-lg hover:shadow-xl`
                } focus:outline-none focus:ring-4 focus:ring-offset-4 focus:${item.ringColor} transition-all duration-300 ease-in-out touch-manipulation transform-gpu`}
              title={item.label}
              aria-label={item.label}
              aria-pressed={isSelected}
              style={{
                transformStyle: "preserve-3d",
                filter: isSelected ? item.glowColor : undefined
              }}
              animate={{
                rotateX: isSelected ? item.initialRotation.rotateX - 15 : item.initialRotation.rotateX,
                rotateY: isSelected ? item.initialRotation.rotateY + 8 : item.initialRotation.rotateY,
                boxShadow: isSelected
                  ? `
                    0 25px 50px -12px rgba(0,0,0,0.25),
                    0 0 40px rgba(59, 130, 246, 0.3),
                    inset 0 2px 4px rgba(255,255,255,0.1),
                    inset 0 -2px 4px rgba(0,0,0,0.1)
                  `
                  : `
                    0 8px 25px -8px rgba(0,0,0,0.15),
                    inset 0 1px 2px rgba(255,255,255,0.1),
                    inset 0 -1px 2px rgba(0,0,0,0.05)
                  `,
              }}
              transition={{ duration: 0.3 }}
            >
              {/* 3D Base Layer (Back/Bottom) */}
              <div
                className={`absolute inset-1 rounded-full ${item.bgGradient}`}
                style={{
                  transform: "translateZ(-4px)",
                  transformStyle: "preserve-3d"
                }}
              />

              {/* 3D Top Layer (Front/Top) */}
              <div
                className={`absolute inset-0 rounded-full ${item.topGradient} border border-white/20`}
                style={{
                  transform: "translateZ(2px)",
                  transformStyle: "preserve-3d"
                }}
              />

              {/* Lighting Effect */}
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-black/10"
                style={{
                  transform: "translateZ(3px)",
                  transformStyle: "preserve-3d"
                }}
              />

              {/* Shimmer effect overlay for selected state */}
              <motion.div
                className="absolute inset-0 rounded-full opacity-0"
                style={{
                  background: "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)",
                  transform: "translateZ(4px)",
                  transformStyle: "preserve-3d"
                }}
                animate={isSelected ? {
                  opacity: [0, 1, 0],
                  x: ["-100%", "100%"],
                } : {}}
                transition={{
                  duration: 2,
                  repeat: isSelected ? Infinity : 0,
                  repeatDelay: 1,
                }}
              />

              {/* 3D Pulse effect for selected state */}
              {isSelected && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-white/40"
                  style={{
                    transform: "translateZ(5px)",
                    transformStyle: "preserve-3d"
                  }}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.6, 0, 0.6],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}

              {/* Face content with 3D positioning */}
              <div
                className="relative w-full h-full flex items-center justify-center"
                style={{
                  transform: "translateZ(4px)",
                  transformStyle: "preserve-3d"
                }}
              >
                <Face isAnimating={isAnimating} />
              </div>
            </motion.button>

            <motion.span
              className={`text-xs md:text-sm mt-3 text-center transition-all duration-300 px-3 py-1.5 rounded-full backdrop-blur-sm ${isSelected
                ? "font-bold text-gray-900 bg-white/30 shadow-lg border border-white/40"
                : "font-medium text-gray-700 bg-white/10"
                }`}
              animate={{
                scale: isSelected ? 1.1 : 1,
                y: isSelected ? -4 : 0,
                rotateX: isSelected ? -5 : 0,
              }}
              style={{ transformStyle: "preserve-3d" }}
              transition={{ duration: 0.3 }}
            >
              {item.label}
            </motion.span>
          </motion.div>
        )
      })}
    </div>
  )
}

// Enhanced Star rating component for employees
const StarRating = ({
  id,
  onChange,
  initialValue = 0,
  className = ""
}: {
  id: string
  onChange: (rating: number) => void
  initialValue?: number
  className?: string
}) => {
  const [rating, setRating] = useState(initialValue)
  const [hover, setHover] = useState(0)
  const [animateIndex, setAnimateIndex] = useState<number | null>(null)

  // Update rating if initialValue changes
  useEffect(() => {
    setRating(initialValue);
  }, [initialValue]);

  // Function to handle star selection with animation sequence
  const handleStarClick = (value: number) => {
    // If selecting the same rating, clear it
    if (value === rating) {
      setRating(0)
      onChange(0)
      return
    }

    // Animate stars in sequence
    for (let i = 1; i <= value; i++) {
      setTimeout(
        () => {
          setAnimateIndex(i)
          // Clear animation state after animation completes
          setTimeout(() => {
            if (i === value) {
              setAnimateIndex(null)
            }
          }, 300)
        },
        (i - 1) * 100,
      )
    }

    if (typeof (window as any).pauseScrollTemporarily === 'function') {
      (window as any).pauseScrollTemporarily();
    }

    setRating(value)
    onChange(value)

    // Add haptic feedback if available
    if (isBrowser && 'vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }

  // Labels for accessibility and tooltips
  const ratingLabels = ["Non évalué", "Très insatisfait", "Insatisfait", "Neutre", "Satisfait", "Très satisfait"]

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex gap-1" role="radiogroup" aria-label="Évaluation par étoiles">
        {[...Array(5)].map((_, index) => {
          const starValue = index + 1
          const isActive = starValue <= (hover || rating)
          const isAnimating = animateIndex === starValue

          return (
            <motion.button
              key={starValue}
              type="button"
              className={`font-extrabold text-4xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500 px-1 py-1 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${isActive ? "text-[#217E82]" : "text-[#D9D9D9]"
                }`}
              onClick={() => handleStarClick(starValue)}
              onMouseEnter={() => setHover(starValue)}
              onMouseLeave={() => setHover(0)}
              onFocus={() => setHover(starValue)}
              onBlur={() => setHover(0)}
              // whileHover={{ scale: 1.2 }}
              // whileTap={{ scale: 0.9 }}
              // initial={{ scale: 1 }}
              // animate={{
              //   scale: isAnimating ? [1, 1.5, 1] : isActive ? 1.1 : 1,
              //   rotate: isAnimating ? [0, 15, 0] : 0,
              // }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 17,
              }}
              title={ratingLabels[starValue]}
              aria-label={ratingLabels[starValue]}
              role="radio"
              aria-checked={rating === starValue}
            >
              ⭑
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence>
        {rating > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="text-sm text-gray-600 dark:text-gray-300"
          >
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Employee card component with animations
const EmployeeCard = ({
  employee,
  employeeId,
  onRatingChange,
  onCommentChange,
  initialRating = 0,
  initialComment = "",
}: {
  employee: any
  employeeId: string
  onRatingChange: (id: string, rating: number) => void
  onCommentChange: (id: string, comment: string) => void
  initialRating?: number
  initialComment?: string
}) => {

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="rounded-md dark:border-gray-700 dark:bg-gray-800 transition-shadow duration-200"
    >
      <div className="border border-gray-200 rounded-lg p-4 pb-2 bg-white shadow-sm">
        <div className="flex gap-4 mb-3">
          <div className="w-[190px] h-[200px] flex-shrink-0">
            <Avatar className="h-full w-full dark:border-blue-700 transition-all duration-300 hover:border-blue-400 !rounded-md">
              {employee.avatar ? (
                <motion.img
                  src={employee.avatar}
                  alt={`${employee.firstName || ''} ${employee.lastName || ''}`}
                  className="h-full w-full object-cover !rounded-md"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                  style={{ cursor: 'pointer' }}
                />
              ) : (
                <AvatarFallback className="text-2xl sm:text-3xl md:text-4xl !rounded-md">
                  {(employee.firstName?.[0] || '') + (employee.lastName?.[0] || '')}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-1xl text-gray-800 dark:text-white">{employee.firstName + " " + employee.lastName}</h3>
            <p className="text-1xl text-gray-600 dark:text-gray-300">
              {employee.position?.title || employee.currentPosition || 'Employé'}
            </p>
            <StarRating
              id={employeeId}
              onChange={(rating) => onRatingChange(employeeId, rating)}
              initialValue={initialRating}
            />
            <div className="grid grid-cols-3 gap-2 mt-4">
              {feedbackOptions.map((option) => (
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
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function FeedbackStart({ loaderData }: Route.ComponentProps) {
  const { employees, feedbackSettings } = loaderData
  const navigate = useNavigate()
  const fetcher = useFetcher()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [pauseScroll, setPauseScroll] = useState(false);

  const deviceId = isBrowser ? getDeviceIdentifier() : '';

  const [feedbackData, setFeedbackData, clearFeedbackData] = useLocalStorage<FeedbackData>("feedbackData", {
    deviceId,
    pharmacyRating: null,
    employeeRatings: {},
    employeeComments: {},
  })

  const completeFetcher = useFetcher();

  useEffect(() => {
    if (!scrollContainerRef.current || employees.length === 0 || pauseScroll || isSearchFocused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % employees.filter((employee) => employee.id || employee._id).length;
        if (scrollContainerRef.current) {
          const cardWidth = scrollContainerRef.current.scrollWidth / employees.filter((employee) => employee.id || employee._id).length;
          scrollContainerRef.current.scrollTo({
            left: cardWidth * nextIndex,
            behavior: 'smooth'
          });
        }
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [employees.length, pauseScroll, isSearchFocused]);

  const pauseScrollTemporarily = () => {
    setPauseScroll(true);
    setTimeout(() => {
      setPauseScroll(false);
    }, 40000);
  };

  useEffect(() => {
    (window as any).pauseScrollTemporarily = pauseScrollTemporarily;
    return () => {
      delete (window as any).pauseScrollTemporarily;
    };
  }, []);

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

  // Handle navigation when fetcher returns a session ID
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
            {/* Note Pharmacie Section */}
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

            {/* Employee Rating Section */}
            <motion.div variants={itemVariants} className="flex flex-col min-h-0">
              <Card className="h-full p-6 border-0 bg-[#FFFFFF40] backdrop-blur-sm dark:bg-gray-800/95 transition-all duration-300 flex flex-col dark:border-[#1c7b80] rounded-[40px] overflow-hidden">
                <CardHeader className="pb-1 pt-3 px-3 flex-shrink-0">
                  <h1 className="text-3xl font-bold text-center">Notre personnel</h1>
                  <h1 className="text-[20px] text-center">Qu’avez-vous pensez du personnel qui vous a reçu ? Donnez une note et sélectionnez vos impressions à chaque personne avec qui vous avez interagit.</h1>
                </CardHeader>
                <div className="relative w-[90%] mx-auto mb-1">
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
                    placeholder="Rechercher un employé"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                  />
                </div>
                <CardContent className="px-3 py-1 flex-1 flex min-h-0 relative overflow-hidden">
                  <motion.div
                    ref={scrollContainerRef}
                    className="flex gap-4 overflow-x-auto overflow-y-hidden pr-1 min-h-0 w-full snap-x snap-mandatory scrollbar-hide"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {employees
                      .filter((employee) => employee.id || employee._id)
                      .filter((employee) => {
                        if (!searchQuery.trim()) return true;
                        const query = searchQuery.toLowerCase();
                        const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase();
                        const inverseFullName = `${employee.lastName || ''} ${employee.firstName || ''}`.toLowerCase();
                        return fullName.includes(query) || inverseFullName.includes(query);
                      })
                      .map((employee, index) => {
                        const employeeId = (employee.id || employee._id?.toString()) as string;
                        return (
                          <motion.div
                            key={employeeId}
                            className="snap-center flex-shrink-0 w-[calc(100%-3rem)]"
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.1, duration: 0.3 }}
                          >
                            <EmployeeCard
                              employee={employee}
                              employeeId={employeeId}
                              onRatingChange={handleEmployeeRatingChange}
                              onCommentChange={handleEmployeeCommentChange}
                              initialRating={feedbackData.employeeRatings[employeeId] || 0}
                              initialComment={feedbackData.employeeComments[employeeId] || ""}
                            />
                          </motion.div>
                        );
                      })}
                  </motion.div>
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