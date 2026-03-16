export function getActionErrorMessage(error: unknown, fallback = "Ocorreu um erro inesperado.") {
    if (typeof error === "string" && error.trim()) return error;

    if (Array.isArray(error)) {
        const first = error.find((item) => typeof item === "string" && item.trim());
        if (typeof first === "string") return first;
    }

    if (error && typeof error === "object") {
        const record = error as Record<string, unknown>;

        if (typeof record.message === "string" && record.message.trim()) {
            return record.message;
        }

        const form = record._form;
        if (Array.isArray(form)) {
            const first = form.find((item) => typeof item === "string" && item.trim());
            if (typeof first === "string") return first;
        }

        for (const value of Object.values(record)) {
            if (Array.isArray(value)) {
                const first = value.find((item) => typeof item === "string" && item.trim());
                if (typeof first === "string") return first;
            }
            if (typeof value === "string" && value.trim()) {
                return value;
            }
        }
    }

    return fallback;
}
