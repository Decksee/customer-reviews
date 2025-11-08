import { motion } from "framer-motion"

export function AdminBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-white to-gray-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 opacity-60"></div>
      
      {/* Abstract shapes */}
      <motion.div
        className="absolute top-20 right-[15%] w-96 h-96 rounded-full bg-blue-300/5 dark:bg-blue-700/5"
        animate={{
          y: [0, 15, 0],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      <motion.div
        className="absolute top-[30%] left-[10%] w-72 h-72 rounded-full bg-green-300/5 dark:bg-green-700/5"
        animate={{
          y: [0, -10, 0],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      <motion.div
        className="absolute bottom-[10%] right-[5%] w-64 h-64 rounded-full bg-purple-300/5 dark:bg-purple-700/5"
        animate={{
          y: [0, 10, 0],
          scale: [1, 1.03, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      {/* Subtle squares/rectangles */}
      <motion.div
        className="absolute top-[45%] right-[25%] w-24 h-24 rotate-45 bg-gray-300/5 dark:bg-gray-400/5 rounded-md"
        animate={{
          rotate: [45, 55, 45],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      <motion.div
        className="absolute bottom-[30%] left-[20%] w-32 h-16 bg-blue-200/5 dark:bg-blue-600/5 rounded-md"
        animate={{
          rotate: [0, 5, 0],
          x: [0, 10, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)]"></div>
      
      {/* Light rays/gleams */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/20 via-transparent to-transparent dark:from-blue-900/10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-gray-100/20 via-transparent to-transparent dark:from-gray-800/10"></div>
    </div>
  )
} 