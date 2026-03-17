"use client";

import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: "indigo" | "green" | "blue" | "amber" | "red";
  trend?: number;
  trendLabel?: string;
  variation?: string;
  isAlert?: boolean;
}

const colorMap = {
  indigo: {
    bg: "bg-[#6366f1]/10",
    text: "text-[#6366f1]",
    icon: "bg-[#6366f1]/20",
  },
  green: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    icon: "bg-green-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    icon: "bg-blue-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    icon: "bg-amber-500/20",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    icon: "bg-red-500/20",
  },
};

export default function MetricCard({
  label,
  value,
  icon: Icon,
  color = "indigo",
  trend,
  trendLabel,
  variation,
  isAlert,
}: MetricCardProps) {
  const colors = colorMap[color];

  return (
    <div className={`${colors.bg} border border-[rgba(255,255,255,0.08)] rounded-lg p-6 ${
      isAlert ? "border-amber-500/30" : ""
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[#64748b] text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-[#e2e8f0] mt-2">{value}</p>
        </div>
        <div className={`${colors.icon} p-3 rounded-lg`}>
          <Icon size={24} className={colors.text} />
        </div>
      </div>

      {(trend !== undefined || trendLabel || variation) && (
        <div className="flex items-center gap-2 text-xs">
          {trend !== undefined && (
            <span className={colors.text}>+{trend}%</span>
          )}
          {trendLabel && (
            <span className="text-[#64748b]">{trendLabel}</span>
          )}
          {variation && (
            <span className="text-green-400">{variation}</span>
          )}
        </div>
      )}
    </div>
  );
}
