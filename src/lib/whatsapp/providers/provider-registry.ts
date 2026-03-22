import type { WhatsappProviderType } from "@/generated/prisma";
import type { WhatsappProviderAdapter } from "@/lib/whatsapp/providers/types";
import { evolutionWhatsmeowProvider } from "@/lib/whatsapp/providers/evolution-whatsmeow-provider";
import { legacyBaileysProvider } from "@/lib/whatsapp/providers/legacy-baileys-provider";
import { metaCloudProvider } from "@/lib/whatsapp/providers/meta-cloud-provider";

const PROVIDERS: Record<WhatsappProviderType, WhatsappProviderAdapter> = {
    META_CLOUD_API: metaCloudProvider,
    EVOLUTION_WHATSMEOW: evolutionWhatsmeowProvider,
    EMBEDDED_BAILEYS_LEGACY: legacyBaileysProvider,
};

export function getWhatsappProviderAdapter(providerType: WhatsappProviderType) {
    return PROVIDERS[providerType];
}
