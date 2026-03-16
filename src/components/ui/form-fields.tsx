import { cn } from "@/lib/utils";
import { normalizeMojibake } from "@/lib/text-normalization";
import { ChevronDown } from "lucide-react";

const controlBaseClass =
    "min-h-11 w-full rounded-[20px] border border-[var(--input-border)] bg-[var(--glass-input-bg)] px-4 py-3 text-sm text-text-primary outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_24px_color-mix(in_srgb,var(--shadow-color)_16%,transparent)] backdrop-blur-xl";

const controlStateClass =
    "transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out will-change-transform hover:border-border-hover focus-visible:-translate-y-[1px] focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/16 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string | string[];
    hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
    const errorMsg = normalizeMojibake(Array.isArray(error) ? error[0] : error);
    const labelText = label ? normalizeMojibake(label) : undefined;
    const hintText = hint ? normalizeMojibake(hint) : undefined;
    const placeholderText = typeof props.placeholder === "string" ? normalizeMojibake(props.placeholder) : props.placeholder;

    return (
        <div className="min-w-0 space-y-1.5">
            {labelText && (
                <label
                    htmlFor={id}
                    className="text-[12px] font-semibold uppercase tracking-[0.18em] text-text-muted"
                >
                    {labelText}
                    {props.required && <span className="text-danger ml-0.5">*</span>}
                </label>
            )}
            <input
                id={id}
                className={cn(
                    controlBaseClass,
                    controlStateClass,
                    "placeholder:text-text-muted",
                    errorMsg && "border-danger focus-visible:border-danger focus-visible:ring-danger/20",
                    className
                )}
                aria-invalid={Boolean(errorMsg)}
                placeholder={placeholderText}
                {...props}
            />
            {hintText && !errorMsg && (
                <p className="text-[11px] text-text-muted">{hintText}</p>
            )}
            {errorMsg && (
                <p className="text-xs text-danger">{errorMsg}</p>
            )}
        </div>
    );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string | string[];
    options: { value: string; label: string }[];
    placeholder?: string;
}

export function Select({
    label,
    error,
    options,
    placeholder,
    className,
    id,
    ...props
}: SelectProps) {
    const errorMsg = normalizeMojibake(Array.isArray(error) ? error[0] : error);
    const labelText = label ? normalizeMojibake(label) : undefined;
    const placeholderText = placeholder ? normalizeMojibake(placeholder) : undefined;
    const normalizedOptions = options.map((opt) => ({ ...opt, label: normalizeMojibake(opt.label) }));

    return (
        <div className="min-w-0 space-y-1.5">
            {labelText && (
                <label
                    htmlFor={id}
                    className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted"
                >
                    {labelText}
                    {props.required && <span className="text-danger ml-0.5">*</span>}
                </label>
            )}
            <div className="relative">
                <select
                    id={id}
                    className={cn(
                    controlBaseClass,
                    controlStateClass,
                    "appearance-none rounded-[18px] border-border-hover bg-[color:color-mix(in_srgb,var(--glass-input-bg)_72%,var(--surface-soft))] py-2.5 pl-4 pr-10 text-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_18px_color-mix(in_srgb,var(--shadow-color)_8%,transparent)]",
                    errorMsg && "border-danger focus-visible:border-danger focus-visible:ring-danger/20",
                    className
                )}
                    aria-invalid={Boolean(errorMsg)}
                    {...props}
                >
                    {placeholderText && (
                        <option value="">{placeholderText}</option>
                    )}
                    {normalizedOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary"
                    aria-hidden="true"
                />
            </div>
            {errorMsg && (
                <p className="text-xs text-danger">{errorMsg}</p>
            )}
        </div>
    );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string | string[];
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
    const errorMsg = normalizeMojibake(Array.isArray(error) ? error[0] : error);
    const labelText = label ? normalizeMojibake(label) : undefined;
    const placeholderText = typeof props.placeholder === "string" ? normalizeMojibake(props.placeholder) : props.placeholder;

    return (
        <div className="min-w-0 space-y-1.5">
            {labelText && (
                <label
                    htmlFor={id}
                    className="text-[12px] font-semibold uppercase tracking-[0.18em] text-text-muted"
                >
                    {labelText}
                    {props.required && <span className="text-danger ml-0.5">*</span>}
                </label>
            )}
            <textarea
                id={id}
                className={cn(
                    controlBaseClass,
                    controlStateClass,
                    "min-h-[120px] rounded-[24px] resize-y placeholder:text-text-muted",
                    errorMsg && "border-danger focus-visible:border-danger focus-visible:ring-danger/20",
                    className
                )}
                aria-invalid={Boolean(errorMsg)}
                placeholder={placeholderText}
                {...props}
            />
            {errorMsg && (
                <p className="text-xs text-danger">{errorMsg}</p>
            )}
        </div>
    );
}
