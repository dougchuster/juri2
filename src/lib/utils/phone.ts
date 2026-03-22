/**
 * Phone number utilities
 * Normalizes Brazilian phone numbers to E.164 format and friendly display
 */

/**
 * Extract the local digits from a phone number (strip country code and formatting).
 * Returns the 10 or 11 digit local number (DDD + number).
 */
export function extractLocalDigits(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    // Remove country code 55 if present
    if (digits.startsWith("55") && digits.length >= 12) {
        return digits.slice(2);
    }
    return digits;
}

/**
 * Normalize a Brazilian phone number to E.164 format (+55XXXXXXXXXXX)
 * Handles various input formats:
 * - (62) 99999-9999
 * - 62999999999
 * - +5562999999999
 * - 5562999999999
 * - 61999135861
 */
export function normalizePhoneE164(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, "");

    // Already has country code
    if (digits.startsWith("55") && digits.length >= 12) {
        return `+${digits}`;
    }

    // Has DDD but no country code (10 or 11 digits)
    if (digits.length === 10 || digits.length === 11) {
        return `+55${digits}`;
    }

    // Just the number without DDD (8 or 9 digits) - can't normalize without DDD
    // Return as-is with country code prefix
    if (digits.length === 8 || digits.length === 9) {
        return `+55${digits}`;
    }

    // Return with + prefix if not present
    return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
}

/**
 * Normalize a WhatsApp number to digits-only international format.
 * Example: (31) 99999-9999 -> 5531999999999
 */
export function normalizeWhatsApp(phone: string): string {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("55")) return digits;
    return digits.length >= 10 ? `55${digits}` : digits;
}

/**
 * Normalize provider payloads like 5511999999999@s.whatsapp.net or +55 11...
 * to digits-only WhatsApp format.
 */
export function normalizeProviderPhone(phone: string): string {
    const stripped = String(phone || "")
        .replace(/@s\.whatsapp\.net$/i, "")
        .replace(/@c\.us$/i, "")
        .replace(/@g\.us$/i, "");
    return normalizeWhatsApp(stripped);
}

export function formatWhatsAppDisplay(phone: string): string {
    const digits = normalizeWhatsApp(phone);
    if (!digits) return "";
    return formatPhoneDisplay(digits);
}

export function buildWhatsAppLink(phone: string): string {
    return `https://wa.me/${normalizeWhatsApp(phone)}`;
}

/**
 * Format a phone number for display: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
 */
export function formatPhoneDisplay(phone: string): string {
    const digits = phone.replace(/\D/g, "");

    // Remove country code if present
    const local = digits.startsWith("55") ? digits.slice(2) : digits;

    if (local.length === 11) {
        // Cell: (XX) XXXXX-XXXX
        return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    }

    if (local.length === 10) {
        // Landline: (XX) XXXX-XXXX
        return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    }

    // Fallback
    return phone;
}

/**
 * Validates if a string looks like a Brazilian phone number
 * Accepts any format with 10-13 digits (with or without country code)
 */
export function isValidBrazilianPhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, "");
    const local = digits.startsWith("55") ? digits.slice(2) : digits;
    return local.length === 10 || local.length === 11;
}

/**
 * Extract DDD from a phone number
 */
export function extractDDD(phone: string): string | null {
    const digits = phone.replace(/\D/g, "");
    const local = digits.startsWith("55") ? digits.slice(2) : digits;
    if (local.length >= 10) {
        return local.slice(0, 2);
    }
    return null;
}

/**
 * Compare two phone numbers for equality, ignoring formatting and country code.
 * Returns true if they represent the same phone number.
 */
export function phonesMatch(a: string, b: string): boolean {
    const localA = extractLocalDigits(a);
    const localB = extractLocalDigits(b);
    if (localA === localB) return true;
    // Also check if one contains the other (for 10 vs 11 digit numbers)
    if (localA.length > localB.length && localA.endsWith(localB.slice(-8))) return true;
    if (localB.length > localA.length && localB.endsWith(localA.slice(-8))) return true;
    return false;
}

/**
 * Auto-format a raw phone input to a consistent stored format.
 * Always stores as E.164 (+55XXXXXXXXXX).
 */
export function autoFormatPhoneForStorage(phone: string): string {
    if (!phone || phone.trim() === "") return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 0) return "";
    // If it already has country code
    if (digits.startsWith("55") && digits.length >= 12) {
        return `+${digits}`;
    }
    // Brazilian number (10 or 11 digits with DDD)
    if (digits.length === 10 || digits.length === 11) {
        return `+55${digits}`;
    }
    // Return as is if we can't determine format
    return phone;
}
