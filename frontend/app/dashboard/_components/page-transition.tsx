"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: "easeOut",
      }}
      className="min-w-0 max-w-full"
    >
      {children}
    </motion.div>
  );
}
