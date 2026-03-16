import { db } from "@/lib/db";
import { getNotificationRules, getJobStats, getMeetingAutomationDashboard, getRecentJobs } from "@/lib/dal/comunicacao";
import { AdminComunicacao } from "@/components/admin/admin-comunicacao";

export default async function AdminComunicacaoPage() {
    const [templates, rules, jobStats, recentJobs, meetingDashboard] = await Promise.all([
        db.messageTemplate.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
        getNotificationRules(false),
        getJobStats(),
        getRecentJobs(30),
        getMeetingAutomationDashboard(12),
    ]);

    return (
        <AdminComunicacao
            templates={JSON.parse(JSON.stringify(templates))}
            rules={JSON.parse(JSON.stringify(rules))}
            jobStats={jobStats}
            recentJobs={JSON.parse(JSON.stringify(recentJobs))}
            meetingDashboard={JSON.parse(JSON.stringify(meetingDashboard))}
        />
    );
}
