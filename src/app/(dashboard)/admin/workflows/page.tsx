import { getWorkflowTemplates } from "@/lib/dal/workflow";
import { getFasesProcessuais } from "@/lib/dal/processos";
import { WorkflowManager } from "@/components/admin/workflow-manager";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export default async function WorkflowsPage() {
    const [templates, fases] = await Promise.all([
        getWorkflowTemplates(),
        getFasesProcessuais(),
    ]);

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <AdminPageHeader
                title="Workflows Automaticos"
                description="Crie modelos de workflow que geram tarefas automaticamente ao serem aplicados a um processo."
            />

            <WorkflowManager
                templates={JSON.parse(JSON.stringify(templates))}
                fases={JSON.parse(JSON.stringify(fases))}
            />
        </div>
    );
}
