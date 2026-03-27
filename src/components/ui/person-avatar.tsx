/* eslint-disable @next/next/no-img-element */

import { cn } from "@/lib/utils";

interface PersonAvatarProps {
    name: string;
    avatarUrl?: string | null;
    className?: string;
    imageClassName?: string;
    fallbackClassName?: string;
}

export function PersonAvatar({
    name,
    avatarUrl,
    className,
    imageClassName,
    fallbackClassName,
}: PersonAvatarProps) {
    return (
        <div className={cn("overflow-hidden rounded-full", className)}>
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt={name}
                    className={cn("h-full w-full object-cover", imageClassName)}
                />
            ) : (
                <svg
                    viewBox="0 0 96 96"
                    aria-hidden="true"
                    className={cn("h-full w-full", fallbackClassName)}
                >
                    <rect width="96" height="96" rx="48" fill="#cd8f66" />
                    <circle cx="48" cy="48" r="45" fill="none" stroke="#16d6a1" strokeWidth="3.5" />
                    <circle cx="48" cy="36" r="15" fill="#fff8f0" fillOpacity="0.9" />
                    <path
                        d="M26 78c3.8-14.6 15.2-22 22-22s18.2 7.4 22 22"
                        fill="#fff8f0"
                        fillOpacity="0.9"
                    />
                    <circle cx="79" cy="79" r="10" fill="#16d6a1" stroke="#fff8f0" strokeWidth="3" />
                </svg>
            )}
        </div>
    );
}
