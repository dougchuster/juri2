"use client";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const variantConfig = {
  danger: { bg: "bg-red-500/20", button: "bg-red-500 hover:bg-red-600" },
  warning: { bg: "bg-amber-500/20", button: "bg-amber-500 hover:bg-amber-600" },
  default: { bg: "bg-indigo-500/20", button: "bg-indigo-500 hover:bg-indigo-600" },
};

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const config = variantConfig[variant];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 max-w-md w-full mx-4">
        <div className={`${config.bg} border border-[rgba(255,255,255,0.1)] rounded-lg p-4 mb-6`}>
          <h3 className="text-[#e2e8f0] font-semibold mb-2">{title}</h3>
          <p className="text-[#c7d2e0] text-sm">{description}</p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-[#252530] hover:bg-[#2a2a32] text-[#e2e8f0] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg ${config.button} text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2`}
          >
            {isLoading && <span className="inline-block animate-spin">⌛</span>}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
