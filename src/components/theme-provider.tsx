"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "dark",
    toggleTheme: () => { },
    setTheme: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window === "undefined") {
            return "dark";
        }

        const stored = localStorage.getItem("theme") as Theme | null;
        if (stored === "light" || stored === "dark") {
            return stored;
        }

        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    });

    useEffect(() => {
        document.documentElement.className = theme;
    }, [theme]);

    function setTheme(t: Theme) {
        setThemeState(t);
        localStorage.setItem("theme", t);
    }

    function toggleTheme() {
        setTheme(theme === "dark" ? "light" : "dark");
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
