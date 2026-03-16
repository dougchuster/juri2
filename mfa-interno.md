# MFA Interno

## Goal
Adicionar MFA TOTP ao login atual com ativacao segura, QR code, recovery codes, politica por perfil, trusted device, alertas e hardening.

## Tasks
- [x] Mapear o fluxo atual de login, sessao e navegacao de conta -> Verify: pontos de emissao e validacao de sessao identificados.
- [x] Adicionar schema Prisma de MFA e migration da Parte 1 -> Verify: `prisma validate`, `prisma migrate deploy`, `prisma generate`.
- [x] Implementar servico TOTP, criptografia de segredo e desafio temporario -> Verify: script de teste cobre token valido/invalido e expiracao.
- [x] Integrar login em duas etapas sem criar sessao final antes do MFA -> Verify: usuario com MFA ativo cai em desafio, usuario sem MFA entra direto.
- [x] Criar UI de ativacao e tela de desafio MFA -> Verify: QR code, confirmacao e envio de codigo funcionam no app.
- [x] Fechar Parte 2 com recovery codes, regeneracao, revogacao e politica por perfil -> Verify: login aceita recovery code, perfil sensivel fica restrito ate ativar MFA e codigos podem ser rotacionados.
- [x] Fechar Parte 3 com trusted device, alertas de seguranca e bloqueio temporario -> Verify: dispositivo confiavel pode pular MFA por 30 dias, eventos sensiveis geram alertas e falhas acumuladas bloqueiam o MFA por 15 minutos.
- [x] Registrar auditoria e executar validacoes finais -> Verify: TypeScript, ESLint, testes do fluxo MFA e status de migration verdes.

## Done When
- [x] Usuario consegue ativar MFA por app autenticador e fazer login com TOTP obrigatorio quando ativo.
