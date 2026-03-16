import {
    canSendAutomatedReply,
    detectAttendanceUrgency,
    evaluateAttendanceAutomationFlow,
    evaluateKeywordActivation,
    replaceAttendanceAutomationVars,
} from "@/lib/services/attendance-automation-core";

function assert(condition: unknown, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

function main() {
    const afterHoursFlow = {
        id: "flow-after-hours",
        name: "After hours",
        triggerType: "AFTER_HOURS" as const,
        keywordMode: "ANY",
        keywords: [],
        businessHoursStart: 8,
        businessHoursEnd: 18,
        initialReplyTemplate: "Oi {nome}",
        followUpReplyTemplate: null,
        aiEnabled: true,
        aiInstructions: null,
        humanizedStyle: null,
        maxAutoReplies: 3,
        cooldownMinutes: 10,
    };

    const matchedAfterHours = evaluateAttendanceAutomationFlow({
        flow: afterHoursFlow,
        incomingText: "Preciso falar com o escritorio",
        referenceDate: new Date("2026-03-11T22:30:00-03:00"),
    });
    assert(matchedAfterHours.matched, "Fluxo after hours deveria disparar fora do horario.");

    const notMatchedBusinessHours = evaluateAttendanceAutomationFlow({
        flow: afterHoursFlow,
        incomingText: "Preciso falar com o escritorio",
        referenceDate: new Date("2026-03-11T10:00:00-03:00"),
    });
    assert(!notMatchedBusinessHours.matched, "Fluxo after hours nao deveria disparar no horario comercial.");

    const keywordFlow = {
        ...afterHoursFlow,
        id: "flow-keyword",
        name: "Triagem",
        triggerType: "KEYWORD" as const,
        keywords: ["honorarios", "consulta"],
    };

    const matchedKeyword = evaluateAttendanceAutomationFlow({
        flow: keywordFlow,
        incomingText: "Gostaria de saber os honorarios para uma consulta.",
        referenceDate: new Date("2026-03-11T11:00:00-03:00"),
    });
    assert(matchedKeyword.matched, "Fluxo por keyword deveria reconhecer termo configurado.");

    const exactKeyword = evaluateKeywordActivation({
        incomingText: "Preciso de revisao de contrato empresarial",
        keywords: ["revisao de contrato"],
        mode: "EXACT",
    });
    assert(exactKeyword.matched, "Modo EXATO deveria reconhecer a frase configurada.");

    const fuzzyKeyword = evaluateKeywordActivation({
        incomingText: "Quero agendmento de consulta",
        keywords: ["agendamento"],
        mode: "FUZZY",
    });
    assert(fuzzyKeyword.matched, "Modo FUZZY deveria tolerar variacao simples de digitacao.");

    const cooldownBlocked = canSendAutomatedReply({
        flow: keywordFlow,
        session: {
            replyCount: 1,
            lastReplyAt: new Date("2026-03-11T11:05:00-03:00"),
        },
        now: new Date("2026-03-11T11:10:00-03:00"),
    });
    assert(!cooldownBlocked.allowed, "Cooldown deveria bloquear resposta automatica muito proxima.");

    const urgencyDetected = detectAttendanceUrgency("Meu pai foi preso e preciso de ajuda urgente");
    assert(urgencyDetected, "Mensagem urgente deveria ser reconhecida.");

    const cooldownBypassed = canSendAutomatedReply({
        flow: keywordFlow,
        session: {
            replyCount: 1,
            lastReplyAt: new Date("2026-03-11T11:05:00-03:00"),
        },
        now: new Date("2026-03-11T11:06:00-03:00"),
        bypassCooldown: true,
    });
    assert(cooldownBypassed.allowed, "Urgencia explicita deveria permitir bypass controlado do cooldown.");

    const limitBlocked = canSendAutomatedReply({
        flow: keywordFlow,
        session: {
            replyCount: 3,
            lastReplyAt: new Date("2026-03-11T11:00:00-03:00"),
        },
        now: new Date("2026-03-11T12:00:00-03:00"),
    });
    assert(!limitBlocked.allowed, "Limite maximo deveria bloquear novas respostas.");

    const templateOutput = replaceAttendanceAutomationVars(
        "Oi {nome}, o atendimento humano do {escritorio} vai ate {fim}h.",
        { nome: "Paula", escritorio: "ADV", fim: 18 }
    );
    assert(
        templateOutput === "Oi Paula, o atendimento humano do ADV vai ate 18h.",
        "Interpolacao de variaveis do template retornou valor inesperado."
    );

    console.log("test-attendance-automation-core: ok");
}

main();
