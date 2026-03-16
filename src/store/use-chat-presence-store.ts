import { create } from "zustand";

import type { ChatDirectoryUser } from "@/lib/chat/types";

type CurrentChatPresence = ChatDirectoryUser["presence"] & { userId?: string };

type ChatPresenceStore = {
  currentPresence: CurrentChatPresence | null;
  setCurrentPresence: (
    presence:
      | CurrentChatPresence
      | null
      | ((current: CurrentChatPresence | null) => CurrentChatPresence | null)
  ) => void;
};

export const useChatPresenceStore = create<ChatPresenceStore>((set) => ({
  currentPresence: null,
  setCurrentPresence: (presence) =>
    set((state) => ({
      currentPresence:
        typeof presence === "function" ? presence(state.currentPresence) : presence,
    })),
}));
