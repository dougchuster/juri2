import { db } from "@/lib/db";
import { AutoMensagensConfig } from "@/components/admin/auto-mensagens-config";

export default async function AutoMensagensPage() {
  const template = await db.messageTemplate.upsert({
    where: { name: "auto_ack_whatsapp" },
    update: {},
    create: {
      name: "auto_ack_whatsapp",
      canal: "WHATSAPP",
      category: "sistema",
      subject: null,
      content: "Recebemos sua mensagem. Um advogado do escritorio respondera em breve.",
      isActive: false,
    },
  });

  return (
    <AutoMensagensConfig
      initialEnabled={template.isActive}
      initialContent={template.content}
      updatedAt={template.updatedAt.toISOString()}
    />
  );
}

