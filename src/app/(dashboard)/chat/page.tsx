import { redirect } from "next/navigation";

import { getSession } from "@/actions/auth";
import { InternalChatPage } from "@/components/chat/internal-chat-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ChatPage() {
  const currentUser = await getSession();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div className="flex h-full animate-fade-in flex-col gap-3 px-6 pb-4 pt-5">
      <div className="shrink-0">
        <h1 className="font-display text-2xl font-bold text-text-primary">Chat Interno</h1>
        <p className="mt-1 text-sm text-text-muted">
          Mensageria privada entre membros do escritorio com presenca, leitura e anexos.
        </p>
      </div>

      <InternalChatPage
        data-page-chat
        currentUser={{
          id: currentUser.id,
          name: currentUser.name,
          avatarUrl: currentUser.avatarUrl,
          role: currentUser.role,
        }}
      />
    </div>
  );
}
