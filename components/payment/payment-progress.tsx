"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Loader2 } from "lucide-react"

interface Props {
  status: "idle" | "pending" | "verifying" | "paid" | "failed"
}

export function PaymentProgress({ status }: Props) {
  const steps = [
    { id: 1, title: "Initialize" },
    { id: 2, title: "Checkout" },
    { id: 3, title: "Verify" },
    { id: 4, title: "Complete" },
  ]

  const activeIndex =
    status === "idle"
      ? 0
      : status === "pending"
      ? 1
      : status === "verifying"
      ? 2
      : status === "paid"
      ? 3
      : 0

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">

        {steps.map((step, i) => {
          const completed = i < activeIndex
          const active = i === activeIndex
          const isLast = i === steps.length - 1

          return (
            <div
              key={step.id}
              className={`flex items-center ${!isLast ? "flex-1" : ""}`}
            >
              {/* STEP */}
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  className={`
                    w-9 h-9 rounded-full flex items-center justify-center border shadow-sm 
                    bg-white 
                    ${
                      completed
                        ? "bg-[#EED8D8] border-[#C13C3D]"
                        : active
                        ? "border-primary"
                        : "border-muted-foreground/20"
                    }
                  `}
                  animate={{ scale: active ? 1.1 : 1 }}
                  transition={{ duration: 0.25 }}
                >
                  {completed ? (
                    <CheckCircle2 className="text-[#C13C3D] w-5 h-5" />
                  ) : active ? (
                    status === "verifying" ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <div className="w-2.5 h-2.5 bg-primary rounded-full" />
                    )
                  ) : (
                    <div className="w-2.5 h-2.5 bg-muted-foreground/30 rounded-full" />
                  )}
                </motion.div>

                <span
                  className={`text-[10px] tracking-wide ${
                    active || completed ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </span>
              </div>

              {/* LINE BETWEEN STEPS — ONLY IF NOT LAST */}
              {!isLast && (
                <div className="flex-1 mx-2 relative">
                  {/* Base line */}
                  <div className="w-full h-[0.5px] bg-muted absolute top-1/2 -translate-y-1/2 rounded-full" />

                  {/* Progress line */}
                  <motion.div
                    className="h-[0.5px] bg-primary absolute top-1/2 -translate-y-1/2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width:
                        activeIndex > i
                          ? "100%"
                          : activeIndex === i
                          ? "50%"
                          : "0%",
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
