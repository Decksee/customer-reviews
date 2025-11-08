import { motion } from "framer-motion"

export function PharmacyBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-[#1c7b80]/5 dark:from-blue-950 dark:via-gray-900 dark:to-emerald-950 opacity-90"></div>
      
      {/* Pills and healthcare shapes */}
      <motion.div
        className="absolute top-10 right-[10%] w-20 h-8 bg-[#1c7b80]/20 dark:bg-blue-600/20 rounded-full"
        animate={{
          y: [0, 20, 0],
          rotate: [0, 5, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      <motion.div
        className="absolute top-[15%] left-[5%] w-12 h-12 bg-[#1c7b80]/25 dark:bg-green-600/20 rounded-full"
        animate={{
          y: [0, -30, 0],
          x: [0, 20, 0],
          rotate: [0, -10, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      {/* Cross symbol - pharmacy icon */}
      <motion.div
        className="absolute bottom-[10%] right-[15%] w-24 h-24 opacity-15"
        animate={{
          rotate: [0, 10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-6 bg-red-500 dark:bg-red-600 rounded-md"></div>
        <div className="absolute top-1/2 left-0 -translate-y-1/2 h-6 w-full bg-red-500 dark:bg-red-600 rounded-md"></div>
      </motion.div>
      
      {/* Capsule pill */}
      <motion.div
        className="absolute top-[40%] left-[80%] w-16 h-8 bg-[#1c7b80]/20 dark:bg-yellow-500/20 rounded-full"
        animate={{
          x: [0, -40, 0],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      {/* Medicine bottle */}
      <motion.div 
        className="absolute bottom-[30%] left-[10%]"
        animate={{
          y: [0, 15, 0],
          rotate: [0, -3, 0],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      >
        <div className="relative">
          <div className="w-10 h-3 bg-[#1c7b80]/40 dark:bg-blue-600/30 rounded-t-lg"></div>
          <div className="w-10 h-14 bg-[#1c7b80]/30 dark:bg-blue-500/20 rounded-b-lg"></div>
        </div>
      </motion.div>
      
      {/* Mortar and pestle */}
      <motion.div 
        className="absolute top-[60%] right-[5%]"
        animate={{
          rotate: [0, 10, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      >
        <div className="w-16 h-10 bg-[#1c7b80]/30 dark:bg-gray-600/30 rounded-b-full"></div>
        <div className="w-4 h-16 bg-[#1c7b80]/25 dark:bg-gray-500/20 ml-6 rounded-b-lg"></div>
      </motion.div>
      
      {/* Light rays/gleams */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1c7b80]/30 via-transparent to-transparent dark:from-blue-900/30"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#1c7b80]/25 via-transparent to-transparent dark:from-green-900/30"></div>
    </div>
  )
}