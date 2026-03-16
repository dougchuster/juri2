import { create } from "zustand";

type InternalChatWidgetState = {
  isOpen: boolean;
  selectedConversationId: string | null;
  open: (conversationId?: string | null) => void;
  close: () => void;
  toggle: () => void;
  setSelectedConversationId: (conversationId: string | null) => void;
};

export const useInternalChatStore = create<InternalChatWidgetState>((set, get) => ({
  isOpen: false,
  selectedConversationId: null,
  open: (conversationId) =>
    set({
      isOpen: true,
      selectedConversationId: conversationId ?? get().selectedConversationId,
    }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setSelectedConversationId: (conversationId) => set({ selectedConversationId: conversationId }),
}));
