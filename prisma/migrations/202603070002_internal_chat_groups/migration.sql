DO $$
BEGIN
  ALTER TYPE "InternalChatConversationType" ADD VALUE IF NOT EXISTS 'GROUP';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "internal_chat_conversations"
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "isTeamGroup" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "internal_chat_conversations_escritorioId_isTeamGroup_idx"
  ON "internal_chat_conversations"("escritorioId", "isTeamGroup");
