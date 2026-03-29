import { z } from "zod";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const manualTimesheetEntrySchema = z.object({
    tarefaId: z.string().min(1, "Selecione uma tarefa."),
    horas: z.coerce.number().positive("Informe uma quantidade valida de horas.").max(24, "Limite maximo de 24 horas por lancamento."),
    data: z.string().regex(datePattern, "Informe uma data valida."),
    descricao: z.string().trim().max(500, "Use ate 500 caracteres.").optional().or(z.literal("")),
});

export const timerTimesheetEntrySchema = z.object({
    tarefaId: z.string().min(1, "Selecione uma tarefa."),
    startedAt: z.coerce.number().int().positive("Inicio invalido."),
    endedAt: z.coerce.number().int().positive("Fim invalido."),
    data: z.string().regex(datePattern, "Informe uma data valida."),
    descricao: z.string().trim().max(500, "Use ate 500 caracteres.").optional().or(z.literal("")),
});

export type ManualTimesheetEntryInput = z.infer<typeof manualTimesheetEntrySchema>;
export type TimerTimesheetEntryInput = z.infer<typeof timerTimesheetEntrySchema>;
