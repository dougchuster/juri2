import { NextResponse } from "next/server";

const STATUS_BY_CODE: Record<string, number> = {
  UNAUTHORIZED_CHAT: 401,
  MISSING_CHAT_ESCRITORIO: 400,
  CHAT_TARGET_REQUIRED: 400,
  CHAT_SELF_CONVERSATION: 400,
  CHAT_TARGET_NOT_FOUND: 404,
  CHAT_CONVERSATION_NOT_FOUND: 404,
  CHAT_GROUP_TITLE_TOO_SHORT: 400,
  CHAT_GROUP_MIN_MEMBERS: 400,
  CHAT_GROUP_MEMBER_NOT_FOUND: 404,
  CHAT_EMPTY_MESSAGE: 400,
  CHAT_MESSAGE_TOO_LONG: 413,
  FORBIDDEN_CHAT_CONVERSATION: 403,
};

const MESSAGE_BY_CODE: Record<string, string> = {
  UNAUTHORIZED_CHAT: "Nao autorizado.",
  MISSING_CHAT_ESCRITORIO: "Escritorio nao configurado.",
  CHAT_TARGET_REQUIRED: "Selecione um usuario para iniciar a conversa.",
  CHAT_SELF_CONVERSATION: "Nao e possivel abrir conversa com o proprio usuario.",
  CHAT_TARGET_NOT_FOUND: "Usuario alvo nao encontrado.",
  CHAT_CONVERSATION_NOT_FOUND: "Conversa nao encontrada.",
  CHAT_GROUP_TITLE_TOO_SHORT: "O nome do grupo precisa ter pelo menos 3 caracteres.",
  CHAT_GROUP_MIN_MEMBERS: "Selecione pelo menos duas pessoas para criar um grupo.",
  CHAT_GROUP_MEMBER_NOT_FOUND: "Um ou mais membros selecionados nao foram encontrados.",
  CHAT_EMPTY_MESSAGE: "A mensagem nao pode estar vazia.",
  CHAT_MESSAGE_TOO_LONG: "A mensagem excede o limite permitido.",
  FORBIDDEN_CHAT_CONVERSATION: "Acesso negado a esta conversa.",
};

export function chatErrorResponse(error: unknown, fallbackMessage = "Erro interno no chat.") {
  const code =
    error instanceof Error && error.message in STATUS_BY_CODE
      ? error.message
      : null;

  if (!code) {
    console.error("[chat] unexpected error:", error);
    return NextResponse.json({ error: fallbackMessage }, { status: 500 });
  }

  return NextResponse.json(
    {
      error: MESSAGE_BY_CODE[code] || fallbackMessage,
      code,
    },
    { status: STATUS_BY_CODE[code] || 500 }
  );
}
