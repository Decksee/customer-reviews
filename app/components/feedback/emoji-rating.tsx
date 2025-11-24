import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { isBrowser } from "~/utils/browser.client"

const EmojiRating = ({ onChange, initialValue }: { onChange: (rating: number) => void, initialValue: number | null }) => {
    const [selected, setSelected] = useState<number | null>(initialValue)
    const [animationFace, setAnimationFace] = useState<number | null>(null)

    const runFaceAnimation = (value: number) => {
        setAnimationFace(value)
        setTimeout(() => {
            if (animationFace === value) {
                setAnimationFace(null)
            }
        }, 800)
    }

    useEffect(() => {
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

export default EmojiRating;