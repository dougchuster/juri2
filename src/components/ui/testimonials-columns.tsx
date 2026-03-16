"use client";

import React from "react";
import { motion } from "framer-motion";

export interface Testimonial {
  text: string;
  image: string;
  name: string;
  role: string;
}

interface TestimonialsColumnProps {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}

export const TestimonialsColumn = (props: TestimonialsColumnProps) => {
  return (
    <div className={props.className}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, image, name, role }, i) => (
                <div 
                  className="w-full max-w-xs rounded-3xl border border-[color:var(--border-hover)] bg-[color:var(--glass-card-bg)] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm" 
                  key={i}
                >
                  <div className="text-sm leading-relaxed text-[color:var(--text-secondary)]">
                    &ldquo;{text}&rdquo;
                  </div>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-[color:var(--accent)]/20">
                      <img
                        src={image}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col">
                      <div className="text-sm font-semibold tracking-tight text-[color:var(--text-primary)]">
                        {name}
                      </div>
                      <div className="text-xs text-[color:var(--text-muted)]">
                        {role}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )),
        ]}
      </motion.div>
    </div>
  );
};
