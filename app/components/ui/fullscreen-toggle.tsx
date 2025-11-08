import { useState, useEffect } from "react"
import { Maximize2, Minimize2 } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "./button"

export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Vérifier si nous sommes côté client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Restaurer l'état du mode plein écran au chargement
  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted) return

    const checkAndEnableFullscreen = async () => {
      const savedFullscreenState = localStorage?.getItem("isFullscreen") === "true"
      if (savedFullscreenState && !document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen()
        } catch (err) {
          console.error(`Error attempting to enable fullscreen:`, err)
        }
      }
      setIsFullscreen(!!document.fullscreenElement)
    }

    checkAndEnableFullscreen()
  }, [isMounted])

  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted) return

    const handleFullscreenChange = () => {
      const newFullscreenState = !!document.fullscreenElement
      setIsFullscreen(newFullscreenState)
      localStorage?.setItem("isFullscreen", newFullscreenState.toString())
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [isMounted])

  const toggleFullscreen = async () => {
    if (typeof window === 'undefined') return

    try {
      if (!isFullscreen) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error(`Error toggling fullscreen:`, err)
    }
  }

  // Ne rien rendre pendant le SSR
  if (!isMounted) return null

  return (
    <motion.div 
      className="absolute top-3 right-3 z-50"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Button
        variant="outline"
        size="icon"
        className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-gray-800/90 shadow-sm rounded-full h-8 w-8"
        onClick={toggleFullscreen}
        title={isFullscreen ? "Quitter le mode plein écran" : "Passer en plein écran"}
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </Button>
    </motion.div>
  )
}