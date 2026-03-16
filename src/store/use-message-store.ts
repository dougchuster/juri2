import { create } from "zustand";

export type MessageCanal = "WHATSAPP" | "EMAIL";

interface MessageStore {
  isOpen: boolean;
  clienteId: string | null;
  canalInicial: MessageCanal;
  
  openMessageModal: (clienteId: string, canal?: MessageCanal) => void;
  closeMessageModal: () => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  isOpen: false,
  clienteId: null,
  canalInicial: "WHATSAPP",
  
  openMessageModal: (clienteId, canal = "WHATSAPP") => set({ 
    isOpen: true, 
    clienteId,
    canalInicial: canal 
  }),
  
  closeMessageModal: () => set({ 
    isOpen: false, 
    clienteId: null 
  }),
}));
