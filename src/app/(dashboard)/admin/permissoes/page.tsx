import { KeyRound, ShieldCheck, Users } from "lucide-react";
import {
    getPermissionCatalog,
    getRoleTemplateSnapshots,
    getUserEffectivePermissions,
    listUsersForPermissions,
} from "@/actions/permissoes";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PermissoesManager } from "@/components/admin/permissoes/permissoes-manager";
import { PERMISSION_DEFINITIONS } from "@/lib/rbac/permissions";

export default async function AdminPermissoesPage() {
    const [sections, templates, users] = await Promise.all([
        getPermissionCatalog(),
        getRoleTemplateSnapshots(),
        listUsersForPermissions(),
    ]);
    const initialUserId = users[0]?.id ?? "";
    const initialUserPermissions = initialUserId
        ? (await getUserEffectivePermissions(initialUserId)).permissions
        : [];

    const kpis = [
        { label: "Roles", value: templates.length, icon: ShieldCheck },
        { label: "Usuarios", value: users.length, icon: Users },
        {
            label: "Permissoes catalogadas",
            value: PERMISSION_DEFINITIONS.length,
            icon: KeyRound,
        },
    ];

    return (
        <div className="animate-fade-in space-y-6 px-4 py-4 md:px-6 md:py-6">
            <AdminPageHeader
                title="Permissoes"
                description="Templates por role, overrides por usuario e governanca do RBAC do escritorio."
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className="glass-card kpi-card p-5">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{kpi.label}</span>
                            <div className="adv-icon-badge flex h-8 w-8 items-center justify-center rounded-lg">
                                <kpi.icon size={15} className="text-text-primary" />
                            </div>
                        </div>
                        <p className="font-mono text-2xl font-bold text-text-primary">{kpi.value}</p>
                    </div>
                ))}
            </div>

            <PermissoesManager
                sections={sections}
                templates={templates}
                users={users}
                initialUserId={initialUserId}
                initialUserPermissions={initialUserPermissions}
            />
        </div>
    );
}
