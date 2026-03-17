"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { useEffect, useState } from "react";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";

const ShaderAnimation = dynamic(
  () => import("@/components/ui/shader-animation").then((mod) => mod.ShaderAnimation),
  { ssr: false },
);

interface AuroraBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
  /** Exibe o efeito de grade animada sobre o aurora. */
  showGridPattern?: boolean;
  /** Exibe o shader de linhas animadas — ativado APENAS em desktop/notebook. */
  showShader?: boolean;
  /** Força fundo escuro marrom-padrão (hero section — independente do tema ativo). */
  heroMode?: boolean;
}

const auroraBaseStyle: CSSProperties = {
  backgroundImage: [
    "repeating-linear-gradient(100deg, rgba(255, 252, 248, 0.96) 0%, rgba(255, 252, 248, 0.96) 7%, rgba(255, 252, 248, 0) 10%, rgba(255, 252, 248, 0) 12%, rgba(255, 252, 248, 0.96) 16%)",
    "repeating-linear-gradient(100deg, rgba(199, 154, 112, 0.22) 10%, rgba(164, 112, 63, 0.16) 18%, rgba(255, 255, 255, 0.5) 26%, rgba(208, 183, 158, 0.18) 34%, rgba(199, 154, 112, 0.2) 42%)",
  ].join(","),
  backgroundSize: "300% 200%, 240% 180%",
  backgroundPosition: "50% 50%, 50% 50%",
};

const auroraDetailStyle: CSSProperties = {
  backgroundImage: [
    "repeating-linear-gradient(100deg, rgba(255, 255, 255, 0.66) 0%, rgba(255, 255, 255, 0.66) 8%, rgba(255, 255, 255, 0) 12%, rgba(255, 255, 255, 0) 15%, rgba(255, 255, 255, 0.66) 18%)",
    "repeating-linear-gradient(100deg, rgba(187, 137, 95, 0.3) 10%, rgba(164, 112, 63, 0.24) 18%, rgba(255, 255, 255, 0.78) 28%, rgba(210, 183, 158, 0.3) 38%, rgba(187, 137, 95, 0.22) 46%)",
  ].join(","),
  backgroundSize: "220% 160%, 180% 140%",
  backgroundPosition: "50% 50%, 50% 50%",
};

export function AuroraBackground({
  className,
  children,
  showRadialGradient = true,
  showGridPattern = true,
  showShader = false,
  heroMode = false,
  ...props
}: AuroraBackgroundProps) {
  // Detecta se é desktop/notebook: tela ≥1024px E sem touchscreen primário
  const [isDesktop, setIsDesktop] = useState(false);
  const [shouldUseLiteMode, setShouldUseLiteMode] = useState(false);

  useEffect(() => {
    const check = () => {
      const noTouch = !("ontouchstart" in window) && navigator.maxTouchPoints === 0;
      setIsDesktop(window.innerWidth >= 1024 && noTouch);

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const saveData =
        typeof navigator !== "undefined" &&
        "connection" in navigator &&
        Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
      const lowMemory =
        typeof navigator !== "undefined" &&
        "deviceMemory" in navigator &&
        Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
      const lowCpu =
        typeof navigator !== "undefined" &&
        Number(navigator.hardwareConcurrency ?? 8) <= 4;
      const smallViewport = window.innerWidth < 768;

      setShouldUseLiteMode(reduceMotion || saveData || lowMemory || lowCpu || smallViewport);
    };

    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className={cn("relative isolate overflow-hidden", className)} {...props}>
      {/* Shader — apenas desktop/notebook para evitar crashes em mobile */}
      {showShader && isDesktop && !shouldUseLiteMode && (
        <div className="pointer-events-none absolute inset-0 z-0 opacity-30 mix-blend-screen" aria-hidden>
          <ShaderAnimation />
        </div>
      )}

      {/* Camada Aurora */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {/* Fallback estatico: garante visual do hero mesmo sem carregar animacoes */}
        {heroMode && (
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#342a24_0%,#3d322b_45%,#362c26_100%)]" />
        )}

        <div
          className={cn(
            "absolute -inset-[12%] opacity-70 blur-[12px] will-change-transform",
            showRadialGradient && "[mask-image:radial-gradient(ellipse_at_100%_0%,black_12%,transparent_72%)]",
          )}
          style={auroraBaseStyle}
        />
        {!shouldUseLiteMode && (
          <div
            className={cn(
              "absolute -inset-[10%] opacity-75 blur-[18px] mix-blend-overlay will-change-transform animate-[aurora_34s_linear_infinite]",
              showRadialGradient && "[mask-image:radial-gradient(ellipse_at_100%_0%,black_14%,transparent_74%)]",
            )}
            style={auroraDetailStyle}
          />
        )}
        {/* Fundo base — heroMode usa exatamente o marrom-padrão do tema escuro (igual ao site ao vivo) */}
        <div
          className={cn(
            "absolute inset-0",
            heroMode
              ? "bg-[radial-gradient(circle_at_50%_35%,rgba(175,140,105,0.32),transparent_55%),radial-gradient(circle_at_84%_14%,rgba(255,255,255,0.05),transparent_30%),linear-gradient(180deg,rgba(52,42,36,0.82)_0%,rgba(58,47,40,0.88)_8%,rgba(62,50,43,0.9)_50%,rgba(56,45,38,0.88)_100%)]"
              : "bg-[radial-gradient(circle_at_8%_10%,rgba(199,154,112,0.22),transparent_28%),radial-gradient(circle_at_84%_14%,rgba(255,255,255,0.82),transparent_24%),radial-gradient(circle_at_78%_72%,rgba(214,191,165,0.18),transparent_26%),linear-gradient(180deg,rgba(252,248,243,0.96),rgba(244,237,229,0.94))] dark:bg-[radial-gradient(circle_at_50%_35%,rgba(175,140,105,0.32),transparent_55%),radial-gradient(circle_at_84%_14%,rgba(255,255,255,0.05),transparent_30%),linear-gradient(180deg,rgba(52,42,36,0.82)_0%,rgba(58,47,40,0.88)_8%,rgba(62,50,43,0.9)_50%,rgba(56,45,38,0.88)_100%)]",
          )}
        />
      </div>

      {/* Feixe de luz no topo — borda suave, paleta marrom claro */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2]" aria-hidden>
        {/* Halo suave — menos borda, transição gradual */}
        <div
          className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-[rgba(255,250,246,0.06)] via-[rgba(255,248,242,0.03)] to-transparent blur-2xl"
          style={{ transform: "translateY(-30%)" }}
        />
        {/* Camada principal — mais sutil para evitar faixa dura no topo */}
        <div className="absolute left-0 right-0 top-0 h-[8px] bg-gradient-to-r from-transparent via-[rgba(249,244,235,0.6)] to-transparent blur-md" />
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[rgba(255,252,248,0.4)] to-transparent" />
      </div>

      {/* Camada AnimatedGridPattern (grade animada) */}
      {showGridPattern && !shouldUseLiteMode && (
        <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
          <AnimatedGridPattern
            numSquares={40}
            maxOpacity={0.12}
            duration={3}
            repeatDelay={1}
            className={cn(
              "[mask-image:radial-gradient(600px_circle_at_center,white_15%,transparent_75%)]",
              "inset-x-0 inset-y-[-20%] h-[140%]",
            )}
          />
        </div>
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
