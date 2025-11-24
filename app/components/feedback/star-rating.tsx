import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { isBrowser } from "~/utils/browser.client"

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
                            ★
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
export default StarRating;