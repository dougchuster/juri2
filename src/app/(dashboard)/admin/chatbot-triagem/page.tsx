import { ChatbotTriagemAdmin } from "@/components/admin/chatbot-triagem-admin";

export const metadata = {
    title: "Chatbot de Triagem",
    description: "Configure o chatbot do site e gerencie leads captados",
};

export default function ChatbotTriagemPage() {
    return (
        <div className="p-6 max-w-6xl mx-auto">
            <ChatbotTriagemAdmin />
        </div>
    );
}
