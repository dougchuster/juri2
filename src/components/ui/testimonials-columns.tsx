"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";

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
  paused?: boolean;
}

export const TestimonialsColumn = (props: TestimonialsColumnProps) => {
  const duplicatedTestimonials = [...props.testimonials, ...props.testimonials];

  return (
    <div className={props.className}>
      <motion.div
        className="testimonials-column-track flex flex-col gap-6 pb-6"
        animate={props.paused ? undefined : { translateY: "-50%" }}
        transition={
          props.paused
            ? undefined
            : {
                duration: props.duration || 10,
                repeat: Infinity,
                ease: "linear",
                repeatType: "loop",
              }
        }
      >
        {duplicatedTestimonials.map(({ text, image, name, role }, i) => (
          <div
            className="w-full max-w-xs rounded-3xl border border-[color:var(--border-hover)] bg-[color:var(--glass-card-bg)] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm"
            key={`${name}-${i}`}
          >
            <div className="text-sm leading-relaxed text-[color:var(--text-secondary)]">
              &ldquo;{text}&rdquo;
            </div>
            <div className="mt-6 flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-[color:var(--accent)]/20">
                <Image
                  src={image}
                  alt={name}
                  fill
                  sizes="40px"
                  className="object-cover"
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
      </motion.div>
    </div>
  );
};
