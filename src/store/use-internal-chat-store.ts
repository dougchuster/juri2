import { create } from "zustand";

type InternalChatWidgetState = {
  isOpen: boolean;
  selectedConversationId: string | null;
  globalUnreadCount: number;
  open: (conversationId?: string | null) => void;
  close: () => void;
  toggle: () => void;
  setSelectedConversationId: (conversationId: string | null) => void;
  setGlobalUnreadCount: (count: number) => void;
};

export const useInternalChatStore = create<InternalChatWidgetState>((set, get) => ({
  isOpen: false,
  selectedConversationId: null,
  globalUnreadCount: 0,
  open: (conversationId) =>
    set({
      isOpen: true,
      selectedConversationId: conversationId ?? get().selectedConversationId,
    }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setSelectedConversationId: (conversationId) => set({ selectedConversationId: conversationId }),
  setGlobalUnreadCount: (count) => set({ globalUnreadCount: count }),
}));
