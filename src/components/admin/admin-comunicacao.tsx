"use client";

import { useState } from "react";
import Link from "next/link";
import {
    MessageCircle, Mail, FileText, Bell, ListChecks, Calendar,
    CheckCircle, XCircle,
    Clock, AlertTriangle, Sparkles,
    RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SmtpTab, WhatsAppTab } from "@/components/admin/admin-comunicacao-connectivity-tabs";
import { TemplatesTab, RulesTab, JobsTab } from "@/components/admin/admin-comunicacao-management-tabs";
import { type AdminComunicacaoProps as Props, JOB_STATUS_BADGE, MEETING_STATUS_BADGE, REMINDER_STATUS_BADGE, formatDateTime } from "@/components/admin/admin-comunicacao-types";

const tabs = [
    { key: "meetings", label: "Reunioes", icon: Calendar },
    { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
    { key: "smtp", label: "E-mail SMTP", icon: Mail },
    { key: "templates", label: "Templates", icon: FileText },
    { key: "rules", label: "Regras", icon: Bell },
    { key: "jobs", label: "Fila de Jobs", icon: ListChecks },
];


export function AdminComunicacao({ templates, rules, jobStats, recentJobs, meetingDashboard }: Props) {
    const [activeTab, setActiveTab] = useState("meetings");

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <AdminPageHeader
                title="Comunicacao"
                description="WhatsApp, e-mail, templates, regras e fila operacional de jobs."
                icon={Sparkles}
                actions={(
                    <Link href="/admin/comunicacao/auto-mensagens">
                        <Button size="sm" variant="outline">
                            <MessageCircle size={14} />
                            Auto mensagens
                        </Button>
                    </Link>
                )}
            />

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                            activeTab === tab.key
                                ? "border-accent text-accent"
                                : "border-transparent text-text-muted hover:text-text-secondary"
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "meetings" && <MeetingsTab dashboard={meetingDashboard} />}
            {activeTab === "whatsapp" && <WhatsAppTab />}
            {activeTab === "smtp" && <SmtpTab />}
            {activeTab === "templates" && <TemplatesTab templates={templates} />}
            {activeTab === "rules" && <RulesTab rules={rules} templates={templates} />}
            {activeTab === "jobs" && <JobsTab stats={jobStats} jobs={recentJobs} />}
        </div>
    );
}

function MeetingsTab({ dashboard }: { dashboard: Props["meetingDashboard"] }) {
    const overviewCards = [
        { label: "Reunioes futuras", value: dashboard.stats.upcomingMeetings, icon: Calendar, color: "text-info" },
        { label: "Nas proximas 24h", value: dashboard.stats.dueNext24h, icon: Clock, color: "text-warning" },
        { label: "Aguardando confirmacao", value: dashboard.stats.pendingConfirmation, icon: AlertTriangle, color: "text-warning" },
        { label: "Confirmadas", value: dashboard.stats.confirmedMeetings, icon: CheckCircle, color: "text-success" },
        { label: "Pedidos de remarcacao", value: dashboard.stats.rescheduleRequested, icon: RefreshCw, color: "text-info" },
        { label: "Jobs com falha", value: dashboard.stats.failedMeetingJobs, icon: XCircle, color: "text-danger" },
    ];

    const reminderCards = [
        { label: "Reminders pendentes", value: dashboard.stats.remindersPending, variant: "warning" as const },
        { label: "Reminders agendados", value: dashboard.stats.remindersScheduled, variant: "info" as const },
        { label: "Reminders enviados", value: dashboard.stats.remindersSent, variant: "success" as const },
        { label: "Reminders falhos", value: dashboard.stats.remindersFailed, variant: "danger" as const },
        { label: "Reminders cancelados", value: dashboard.stats.remindersCancelled, variant: "muted" as const },
        { label: "Jobs atrasados", value: dashboard.stats.staleMeetingJobs, variant: "danger" as const },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
                {overviewCards.map((card) => (
                    <div key={card.label} className="glass-card p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <card.icon size={16} className={card.color} />
                            <span className="text-xs font-medium text-text-muted uppercase">{card.label}</span>
                        </div>
                        <p className="text-xl font-bold text-text-primary font-mono">{card.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
                {reminderCards.map((card) => (
                    <div key={card.label} className="rounded-xl border border-border bg-bg-secondary/60 px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-text-muted uppercase">{card.label}</span>
                            <Badge variant={card.variant} size="sm">{card.value}</Badge>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid xl:grid-cols-2 gap-6">
                <div className="glass-card p-4">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <h3 className="text-base font-semibold text-text-primary">Proximas reunioes</h3>
                        <Badge variant="info" size="sm">{dashboard.nextMeetings.length}</Badge>
                    </div>

                    <div className="space-y-3">
                        {dashboard.nextMeetings.map((meeting) => (
                            <div key={meeting.id} className="rounded-xl border border-border/60 bg-bg-secondary/40 p-3">
                                <div className="flex items-center justify-between gap-3 mb-1">
                                    <p className="text-sm font-medium text-text-primary">{meeting.titulo}</p>
                                    <Badge
                                        variant={MEETING_STATUS_BADGE[meeting.statusConfirmacao]?.variant || "muted"}
                                        size="sm"
                                    >
                                        {MEETING_STATUS_BADGE[meeting.statusConfirmacao]?.label || meeting.statusConfirmacao}
                                    </Badge>
                                </div>
                                <p className="text-xs text-text-muted">
                                    {meeting.cliente?.nome || "Sem cliente"} • {formatDateTime(meeting.dataInicio)}
                                </p>
                                <p className="text-xs text-text-muted mt-1">
                                    {meeting.advogado?.user.name || "Sem responsavel"} • {meeting.local || "Local a definir"}
                                </p>
                                {meeting.atendimento && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="muted" size="sm">{meeting.atendimento.statusReuniao}</Badge>
                                        <Badge variant="muted" size="sm">{meeting.atendimento.statusOperacional}</Badge>
                                    </div>
                                )}
                            </div>
                        ))}
                        {dashboard.nextMeetings.length === 0 && (
                            <p className="text-sm text-text-muted py-6 text-center">Nenhuma reuniao futura encontrada.</p>
                        )}
                    </div>
                </div>

                <div className="glass-card p-4">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <h3 className="text-base font-semibold text-text-primary">Jobs com problema</h3>
                        <Badge variant={dashboard.stats.failedMeetingJobs > 0 ? "danger" : "success"} size="sm">
                            {dashboard.recentProblemJobs.length}
                        </Badge>
                    </div>

                    <div className="space-y-3">
                        {dashboard.recentProblemJobs.map((job) => (
                            <div key={job.id} className="rounded-xl border border-danger/20 bg-danger/5 p-3">
                                <div className="flex items-center justify-between gap-3 mb-1">
                                    <p className="text-sm font-medium text-text-primary">
                                        {job.compromisso?.titulo || job.rule?.name || "Job sem titulo"}
                                    </p>
                                    <Badge variant={JOB_STATUS_BADGE[job.status]?.variant || "muted"} size="sm">
                                        {JOB_STATUS_BADGE[job.status]?.label || job.status}
                                    </Badge>
                                </div>
                                <p className="text-xs text-text-muted">
                                    {job.compromisso?.cliente?.nome || job.recipientPhone || job.recipientEmail || "Sem destino"} • {job.canal}
                                </p>
                                <p className="text-xs text-danger mt-1">{job.errorMessage || "Sem mensagem de erro"}</p>
                            </div>
                        ))}
                        {dashboard.recentProblemJobs.length === 0 && (
                            <p className="text-sm text-text-muted py-6 text-center">Nenhum job problemático recente.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-text-primary">Reminders recentes</h3>
                    <Badge variant="muted" size="sm">{dashboard.recentReminders.length}</Badge>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-bg-tertiary/50">
                        <tr className="text-text-muted text-xs uppercase">
                            <th className="text-left px-4 py-3 font-medium">Reuniao</th>
                            <th className="text-left px-4 py-3 font-medium">Kind</th>
                            <th className="text-left px-4 py-3 font-medium">Status</th>
                            <th className="text-left px-4 py-3 font-medium">Agendado para</th>
                            <th className="text-left px-4 py-3 font-medium">Responsavel</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dashboard.recentReminders.map((reminder) => (
                            <tr key={reminder.id} className="border-t border-border/50 hover:bg-bg-tertiary/20">
                                <td className="px-4 py-3">
                                    <p className="text-text-primary text-sm">{reminder.compromisso.titulo}</p>
                                    <p className="text-xs text-text-muted">
                                        {reminder.compromisso.cliente?.nome || "Sem cliente"} • {formatDateTime(reminder.compromisso.dataInicio)}
                                    </p>
                                </td>
                                <td className="px-4 py-3 text-text-muted">{reminder.kind}</td>
                                <td className="px-4 py-3">
                                    <Badge
                                        variant={REMINDER_STATUS_BADGE[reminder.status]?.variant || "muted"}
                                        size="sm"
                                    >
                                        {REMINDER_STATUS_BADGE[reminder.status]?.label || reminder.status}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3 text-text-muted">{formatDateTime(reminder.scheduledFor)}</td>
                                <td className="px-4 py-3 text-text-muted">
                                    {reminder.compromisso.advogado?.user.name || "Sem responsavel"}
                                </td>
                            </tr>
                        ))}
                        {dashboard.recentReminders.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-text-muted">Nenhum reminder encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

