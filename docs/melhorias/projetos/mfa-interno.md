# Projeto: MFA Interno

> Status: Partes 1, 2 e 3 implementadas em 11 de marco de 2026
> Prioridade: Alta
> Dependencias externas: Nenhuma obrigatoria

---

## 1. Objetivo

Adicionar autenticacao multifator interna ao sistema, baseada em TOTP e codigos de recuperacao, reforcando a seguranca de acesso sem depender de provedores externos.

---

## 2. Problema atual

O sistema trabalha com autenticacao por senha e sessao. Isso protege o acesso basico, mas nao cobre cenarios de vazamento de senha, phishing interno ou acesso indevido a perfis sensiveis.

---

## 3. Objetivos de negocio

- Reduzir risco de invasao em contas administrativas e financeiras.
- Atender exigencias minimas de seguranca operacional.
- Criar base para politicas futuras por perfil.

---

## 4. Escopo

### Inclui

- TOTP com app autenticador;
- QR code de configuracao;
- recovery codes;
- desafio MFA no login;
- politicas por perfil;
- trilha de auditoria.

### Fora de escopo inicial

- SMS OTP;
- push notification;
- biometria;
- SSO corporativo.

---

## 5. Entregas

- ativacao e desativacao de MFA;
- onboarding seguro de segundo fator;
- fluxo de login com desafio;
- tela de recovery codes;
- logs de seguranca.

---

## 6. Requisitos funcionais

- Usuario deve poder ativar MFA na propria conta.
- Sistema deve gerar segredo TOTP e QR code.
- Usuario deve confirmar um codigo valido para concluir ativacao.
- Sistema deve gerar recovery codes de uso unico.
- Usuario com MFA ativo deve informar codigo no login.
- Admin deve poder exigir MFA para certos perfis.
- Sistema deve permitir revogacao e regeneracao de recovery codes.

---

## 7. Requisitos nao funcionais

- segredo TOTP armazenado criptografado;
- recovery codes armazenados com hash;
- limites de tentativa por desafio;
- auditoria de ativacao, desativacao, falha e bypass.

---

## 8. Modelo de dados proposto

`UserMfaConfig`

- `id`
- `userId`
- `isEnabled`
- `secretEncrypted`
- `enabledAt`
- `lastUsedAt`
- `enforcedByPolicy`

`UserRecoveryCode`

- `id`
- `userId`
- `codeHash`
- `usedAt`
- `createdAt`

`MfaLoginChallenge`

- `id`
- `userId`
- `sessionToken`
- `status`
- `attemptCount`
- `expiresAt`
- `verifiedAt`

---

## 9. Backend

### Servicos

- `src/lib/services/mfa-service.ts`
- `src/lib/services/security-policy.ts`

### Casos de uso

- iniciar ativacao;
- validar codigo;
- concluir ativacao;
- gerar recovery codes;
- validar desafio no login;
- revogar MFA.

### Regras

- ativacao exige senha atual ou sessao valida;
- segredo so e persistido apos confirmacao;
- recovery code consumido nao pode ser reutilizado;
- contas de alto risco podem exigir MFA obrigatorio.

---

## 10. Frontend

### Areas

- perfil do usuario;
- tela de login;
- administracao de politicas.

### Componentes

- `MfaSetupCard`
- `MfaChallengeForm`
- `RecoveryCodesPanel`
- `SecurityPolicySettings`

---

## 11. Fluxos principais

### Fluxo 1: Ativacao

1. Usuario solicita ativacao.
2. Sistema gera segredo e QR code.
3. Usuario escaneia e informa codigo.
4. Sistema ativa MFA e entrega recovery codes.

### Fluxo 2: Login

1. Usuario entra com senha.
2. Se MFA ativo, sistema cria desafio temporario.
3. Usuario informa TOTP ou recovery code.
4. Sessao final e liberada.

---

## 12. Fases de implementacao

### Fase 1

- schema;
- ativacao manual;
- login com TOTP.

Status:
implementada.

### Fase 2

- recovery codes;
- auditoria;
- politicas por perfil.

Status:
implementada.

### Fase 3

- trusted device opcional;
- alertas de seguranca;
- hardening adicional.

Status:
implementada.

---

## 13. Criterios de aceite

- Usuario consegue ativar MFA via app autenticador.
- Login com MFA ativo exige segundo fator.
- Recovery codes funcionam uma unica vez.
- Eventos criticos ficam auditados.
- Perfis configurados como obrigatorios nao entram sem MFA.

---

## 14. Riscos

- perda de acesso por usuarios sem recovery code;
- complexidade de UX no primeiro login com MFA;
- necessidade de criptografia correta do segredo.

---

## 15. Medidas de sucesso

- percentual de usuarios sensiveis com MFA ativo;
- tentativas bloqueadas por desafio MFA;
- reducao de risco operacional em contas privilegiadas.
