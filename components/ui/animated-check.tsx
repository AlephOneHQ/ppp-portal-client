"use client"

import { motion } from "framer-motion"

export function AnimatedCheck() {
  return (
    <motion.svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial="hidden"
      animate="visible"
    >
      <motion.circle
        cx="36"
        cy="36"
        r="32"
        stroke="#22C55E"
        strokeWidth="6"
        variants={{
          hidden: { pathLength: 0 },
          visible: { pathLength: 1, transition: { duration: 0.8 } },
        }}
      />
      <motion.path
        d="M22 37L32 47L52 27"
        stroke="#22C55E"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0 },
          visible: { pathLength: 1, transition: { duration: 0.6, delay: 0.6 } },
        }}
      />
    </motion.svg>
  )
}
