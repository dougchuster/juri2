"use client";

import { Play, Save } from "lucide-react";

import type { ReguaCobrancaDashboard } from "@/lib/services/regua-cobranca";
import type { ReguaCobrancaConfig } from "@/lib/services/regua-cobranca-config";
import type { ReguaCobrancaConfigInput } from "@/lib/validators/regua-cobranca";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";

interface Props {
    config: ReguaCobrancaConfig;
    dashboard: ReguaCobrancaDashboard;
    pending: boolean;
    onSave: (payload: ReguaCobrancaConfigInput) => void;
    onRun: () => void;
}

export function ReguaCobrancaPanel({ config, dashboard, pending, onSave, onRun }: Props) {
    return (
        <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <MetricCard label="Faturas ativas" value={String(dashboard.summary.totalFaturasAtivas)} />
                <MetricCard label="Faturas em atraso" value={String(dashboard.summary.totalFaturasEmAtraso)} />
                <MetricCard label="Faturas pagas" value={String(dashboard.summary.totalFaturasPagas)} />
                <MetricCard label="Jobs pendentes" value={String(dashboard.summary.totalJobsPendentes)} />
                <MetricCard label="Jobs concluidos" value={String(dashboard.summary.totalJobsConcluidos)} />
                <MetricCard label="Jobs com falha" value={String(dashboard.summary.totalJobsFalhos)} />
            </div>

            <form
                action={(formData) =>
                    onSave({
                        enabled: formData.get("enabled") === "true",
                        syncGatewayBeforeRun: formData.get("syncGatewayBeforeRun") === "true",
                        maxInvoicesPerRun: Number(formData.get("maxInvoicesPerRun") ?? "200"),
                        steps: config.steps.map((_, index) => ({
                            id: String(formData.get(`step_${index}_id`) ?? ""),
                            label: String(formData.get(`step_${index}_label`) ?? ""),
                            dayOffset: Number(formData.get(`step_${index}_dayOffset`) ?? "0"),
                            active: formData.get(`step_${index}_active`) === "true",
                            channels: String(formData.get(`step_${index}_channels`) ?? "")
                                .split(",")
                                .map((item) => item.trim())
                                .filter(Boolean) as Array<"WHATSAPP" | "EMAIL">,
                            whatsappTemplate: String(formData.get(`step_${index}_whatsappTemplate`) ?? ""),
                            emailSubject: String(formData.get(`step_${index}_emailSubject`) ?? ""),
                            emailTemplate: String(formData.get(`step_${index}_emailTemplate`) ?? ""),
                        })),
                    })
                }
                className="glass-card space-y-5 p-5"
            >
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-semibold text-text-primary">Configurar regua automatizada</h3>
                        <p className="mt-1 text-sm text-text-secondary">
                            Defina quais etapas disparam por dia em relacao ao vencimento e por quais canais a cobranca sera enviada.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" size="sm" onClick={onRun} disabled={pending}>
                            <Play size={14} />
                            Executar agora
                        </Button>
                        <Button type="submit" size="sm" disabled={pending}>
                            <Save size={14} />
                            Salvar regua
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Select
                        name="enabled"
                        label="Regua ativa"
                        defaultValue={String(config.enabled)}
                        options={[
                            { value: "true", label: "Sim" },
                            { value: "false", label: "Nao" },
                        ]}
                    />
                    <Select
                        name="syncGatewayBeforeRun"
                        label="Sincronizar gateway antes"
                        defaultValue={String(config.syncGatewayBeforeRun)}
                        options={[
                            { value: "true", label: "Sim" },
                            { value: "false", label: "Nao" },
                        ]}
                    />
                    <Input
                        name="maxInvoicesPerRun"
                        label="Limite por execucao"
                        type="number"
                        min={1}
                        max={1000}
                        defaultValue={String(config.maxInvoicesPerRun)}
                    />
                </div>

                <div className="space-y-4">
                    {config.steps.map((step, index) => (
                        <div key={step.id} className="rounded-[24px] border border-border/70 p-4">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold text-text-primary">{step.label}</div>
                                    <div className="text-xs text-text-secondary">
                                        Offset atual: {step.dayOffset >= 0 ? `D+${step.dayOffset}` : `D${step.dayOffset}`}
                                    </div>
                                </div>
                                <Badge variant={step.active ? "success" : "muted"}>{step.active ? "Ativa" : "Inativa"}</Badge>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <Input name={`step_${index}_id`} label="ID" defaultValue={step.id} />
                                <Input name={`step_${index}_label`} label="Nome da etapa" defaultValue={step.label} />
                                <Input name={`step_${index}_dayOffset`} label="Dia relativo" type="number" defaultValue={String(step.dayOffset)} />
                                <Select
                                    name={`step_${index}_active`}
                                    label="Etapa ativa"
                                    defaultValue={String(step.active)}
                                    options={[
                                        { value: "true", label: "Sim" },
                                        { value: "false", label: "Nao" },
                                    ]}
                                />
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Input
                                    name={`step_${index}_channels`}
                                    label="Canais"
                                    defaultValue={step.channels.join(", ")}
                                    hint="Use WHATSAPP, EMAIL"
                                />
                                <Input
                                    name={`step_${index}_emailSubject`}
                                    label="Assunto do email"
                                    defaultValue={step.emailSubject}
                                />
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                                <Textarea
                                    name={`step_${index}_whatsappTemplate`}
                                    label="Template WhatsApp"
                                    defaultValue={step.whatsappTemplate}
                                    rows={4}
                                />
                                <Textarea
                                    name={`step_${index}_emailTemplate`}
                                    label="Template email"
                                    defaultValue={step.emailTemplate}
                                    rows={4}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </form>

            <div className="grid gap-5 xl:grid-cols-2">
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-text-primary">Faturas por etapa</h3>
                    <div className="mt-4 space-y-3">
                        {dashboard.byStep.map((step) => (
                            <div key={step.stepId} className="rounded-2xl border border-border/70 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="font-medium text-text-primary">{step.label}</div>
                                        <div className="text-xs text-text-secondary">
                                            {step.dayOffset >= 0 ? `D+${step.dayOffset}` : `D${step.dayOffset}`}
                                        </div>
                                    </div>
                                    <Badge variant="info">{step.faturas} fatura(s)</Badge>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                                    <div className="rounded-2xl bg-bg-secondary/60 px-3 py-2 text-text-secondary">
                                        Pendentes: <span className="font-medium text-text-primary">{step.jobsPending}</span>
                                    </div>
                                    <div className="rounded-2xl bg-bg-secondary/60 px-3 py-2 text-text-secondary">
                                        Concluidos: <span className="font-medium text-text-primary">{step.jobsCompleted}</span>
                                    </div>
                                    <div className="rounded-2xl bg-bg-secondary/60 px-3 py-2 text-text-secondary">
                                        Falhas: <span className="font-medium text-text-primary">{step.jobsFailed}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-text-primary">Historico recente</h3>
                    <div className="mt-4 space-y-3">
                        {dashboard.recentJobs.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-text-secondary">
                                Ainda nao ha envios registrados pela regua.
                            </div>
                        ) : null}
                        {dashboard.recentJobs.map((job) => (
                            <div key={job.id} className="rounded-2xl border border-border/70 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="font-medium text-text-primary">{job.clientName ?? "Cliente nao identificado"}</div>
                                        <div className="text-xs text-text-secondary">
                                            {job.invoiceNumber ?? "Sem fatura"} · {job.stepLabel} · {job.canal}
                                        </div>
                                    </div>
                                    <Badge variant={job.status === "COMPLETED" ? "success" : job.status === "FAILED" ? "danger" : "warning"}>
                                        {job.status}
                                    </Badge>
                                </div>
                                <div className="mt-2 text-xs text-text-secondary">
                                    Agendado em {formatDate(job.scheduledFor)}
                                    {job.completedAt ? ` · Concluido em ${formatDate(job.completedAt)}` : ""}
                                </div>
                                {job.errorMessage ? (
                                    <div className="mt-2 text-xs text-danger">{job.errorMessage}</div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="glass-card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</div>
            <div className="mt-2 text-lg font-semibold text-text-primary">{value}</div>
        </div>
    );
}
