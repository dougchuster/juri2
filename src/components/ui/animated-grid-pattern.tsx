"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface AnimatedGridPatternProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: number | string;
  numSquares?: number;
  className?: string;
  maxOpacity?: number;
  duration?: number;
  repeatDelay?: number;
}

export function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 50,
  className,
  maxOpacity = 0.5,
  duration = 4,
  repeatDelay = 0.5,
  ...props
}: AnimatedGridPatternProps) {
  const id = useId();
  const containerRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [squares, setSquares] = useState<{ id: number; pos: [number, number] }[]>([]);

  const getPos = (): [number, number] => {
    if (dimensions.width === 0 || dimensions.height === 0) return [0, 0];
    return [
      Math.floor((Math.random() * dimensions.width) / width),
      Math.floor((Math.random() * dimensions.height) / height),
    ];
  };

  function generateSquares(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      pos: getPos(),
    }));
  }

  const updateSquarePosition = (squareId: number) => {
    setSquares((current) =>
      current.map((sq) => (sq.id === squareId ? { ...sq, pos: getPos() } : sq))
    );
  };

  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      setSquares(generateSquares(numSquares));
    }
  }, [dimensions.width, dimensions.height, numSquares]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    const el = containerRef.current;
    if (el) {
      resizeObserver.observe(el);
    }
    return () => {
      if (el) resizeObserver.unobserve(el);
    };
  }, []);

  return (
    <svg
      ref={containerRef}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-white/20 stroke-white/20",
        className,
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map(({ pos: [posX, posY], id: squareId }, index) => (
          <motion.rect
            key={`${posX}-${posY}-${squareId}-${index}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: maxOpacity }}
            transition={{
              duration,
              repeat: 1,
              delay: index * 0.1,
              repeatType: "reverse",
              repeatDelay,
            }}
            onAnimationComplete={() => updateSquarePosition(squareId)}
            width={width - 1}
            height={height - 1}
            x={posX * width + 1}
            y={posY * height + 1}
            fill="currentColor"
            strokeWidth="0"
          />
        ))}
      </svg>
    </svg>
  );
}
