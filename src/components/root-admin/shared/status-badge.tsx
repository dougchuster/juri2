"use client";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
}

const statusColorMap: Record<string, { bg: string; text: string; label: string }> = {
  ATIVO: { bg: "bg-green-500/20", text: "text-green-400", label: "Ativo" },
  SUSPENSO: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Suspenso" },
  BLOQUEADO: { bg: "bg-red-500/20", text: "text-red-400", label: "Bloqueado" },
  INATIVO: { bg: "bg-gray-500/20", text: "text-gray-400", label: "Inativo" },
  TRIAL: { bg: "bg-indigo-500/20", text: "text-indigo-400", label: "Trial" },
  ATIVA: { bg: "bg-green-500/20", text: "text-green-400", label: "Ativa" },
  INADIMPLENTE: { bg: "bg-red-500/20", text: "text-red-400", label: "Inadimplente" },
  SUSPENSA: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Suspensa" },
  CANCELADA: { bg: "bg-gray-500/20", text: "text-gray-400", label: "Cancelada" },
  EXPIRADA: { bg: "bg-red-500/20", text: "text-red-400", label: "Expirada" },
  PENDENTE: { bg: "bg-slate-500/20", text: "text-slate-400", label: "Pendente" },
  PAGA: { bg: "bg-green-500/20", text: "text-green-400", label: "Paga" },
  ATRASADA: { bg: "bg-red-500/20", text: "text-red-400", label: "Atrasada" },
  REEMBOLSADA: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Reembolsada" },
};

const sizeMap = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2 text-base",
};

export default function StatusBadge({
  status,
  size = "md",
}: StatusBadgeProps) {
  const config = statusColorMap[status] || {
    bg: "bg-gray-500/20",
    text: "text-gray-400",
    label: status,
  };

  return (
    <span className={`${config.bg} ${config.text} rounded-lg font-medium inline-block ${sizeMap[size]}`}>
      {config.label}
    </span>
  );
}
