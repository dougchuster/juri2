import assert from "node:assert/strict";

import { buildInternalChatDirectKey, isSameParticipantPair } from "@/lib/chat/direct-key";
import { CHAT_LIMITS } from "@/lib/chat/constants";
import { computePresenceStatus } from "@/lib/chat/presence-status";

function run() {
  const escritorioId = "esc-1";
  const userA = "user-b";
  const userB = "user-a";

  const directKey = buildInternalChatDirectKey(escritorioId, userA, userB);
  assert.equal(directKey, "esc-1:user-a:user-b");
  assert.equal(
    buildInternalChatDirectKey(escritorioId, userB, userA),
    directKey,
    "A chave direta deve ser deterministica independentemente da ordem"
  );

  assert.equal(isSameParticipantPair("abc", "abc"), true);
  assert.equal(isSameParticipantPair("abc", "def"), false);

  const now = Date.now();
  assert.equal(
    computePresenceStatus({
      connected: false,
      manualStatus: "BUSY",
      lastActivityAt: new Date(now).toISOString(),
      now,
    }),
    "OFFLINE",
    "Offline deve ter precedencia sobre status manual"
  );

  assert.equal(
    computePresenceStatus({
      connected: true,
      manualStatus: "BUSY",
      lastActivityAt: new Date(now).toISOString(),
      now,
    }),
    "BUSY"
  );

  assert.equal(
    computePresenceStatus({
      connected: true,
      manualStatus: null,
      lastActivityAt: new Date(now - CHAT_LIMITS.awayThresholdMs - 1_000).toISOString(),
      now,
    }),
    "AWAY"
  );

  assert.equal(
    computePresenceStatus({
      connected: true,
      manualStatus: null,
      lastActivityAt: new Date(now - 10_000).toISOString(),
      now,
    }),
    "ONLINE"
  );

  console.log("test-chat-interno: ok");
}

run();
