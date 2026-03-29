CREATE TABLE IF NOT EXISTS legal_agent_response_logs (
    message_id TEXT PRIMARY KEY REFERENCES legal_agent_messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    model TEXT,
    prompt_source TEXT NOT NULL,
    rag_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    confidence_score DOUBLE PRECISION,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    usage_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_agent_response_logs_user_created_idx
    ON legal_agent_response_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS legal_agent_response_logs_agent_created_idx
    ON legal_agent_response_logs (agent_id, created_at DESC);

CREATE TABLE IF NOT EXISTS legal_agent_message_feedback (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES legal_agent_messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT legal_agent_message_feedback_unique UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS legal_agent_message_feedback_user_created_idx
    ON legal_agent_message_feedback (user_id, created_at DESC);
