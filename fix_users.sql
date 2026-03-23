SET session_replication_role = replica;

INSERT INTO users (id, email, name, "passwordHash", role, "avatarUrl", "isActive", "lastLoginAt", "createdAt", "updatedAt", whatsapp, "onboardingCompleted")
VALUES
  ('cmmtekfp6001jcsmhql13ikhm', 'dougcruvinel@gmail.com', 'Douglas Cruvinel', '$2b$10$3hyGsnJRWy.99UItWkBiQuGK0ztlGxudEzxZS0xX0a4YAbuwJmqBa', 'ADMIN', '/uploads/funcionarios/2026/03/1773704585242-r85ts6ql-douglas-chuster.jpg', true, '2026-03-21T00:46:50.697Z', '2026-03-16T16:33:28.698Z', '2026-03-21T00:46:50.698Z', null, true),
  ('cmmttp83o002fqkmheeb653x6', 'aandrade.paulla@gmail.com', 'Paula Matos', '$2b$10$jX/2p.5Ju4Gqjo/yiBCD1OuSutCuQmoxUw/vT4lDZd2AERiFby/ii', 'ADMIN', '/uploads/funcionarios/2026/03/1773704314290-sujarzsv-paulamatos.jpg', true, '2026-03-17T14:20:44.007Z', '2026-03-16T23:37:06.371Z', '2026-03-17T15:08:45.537Z', null, false),
  ('cmmuovrir004dqgmhjtaacc8n', 'ingridruasadv@gmail.com', 'Ingrid Ruas', '$2b$10$yvrszoPAXFxAbwM67JG8iOv9osxwo7GDYT8k.laE6mwHlBtjpQjiy', 'ADVOGADO', '/uploads/funcionarios/2026/03/1773756622881-hfoc7im8-b7a8def2-16b1-4792-9219-839bea8672d1.jpg', true, null, '2026-03-17T14:09:59.571Z', '2026-03-17T15:08:37.448Z', null, false),
  ('cmmuoxdm2004mqgmha4c6cypl', 'carlaalves2021@gmail.com', 'Carla Alves', '$2b$10$RfLaADM2VewkMxKc.4e.s.yQMBBXR.DrNxwsBnN.NaSYChegKO5GO', 'SECRETARIA', '/uploads/funcionarios/2026/03/1773756685006-ext7zsbr-2d68aae0-93ed-4b2b-b72b-b179214ecbf1.jpg', true, null, '2026-03-17T14:11:14.858Z', '2026-03-17T14:11:30.044Z', null, false)
ON CONFLICT (id) DO NOTHING;

SELECT id, email, name, role FROM users ORDER BY "createdAt";
