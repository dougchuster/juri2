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
    <div className="space-y-6 p-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Chat Interno</h1>
        <p className="mt-1 text-sm text-text-muted">
          Mensageria privada entre membros do escritorio com presenca, leitura e anexos.
        </p>
      </div>

      <InternalChatPage
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
