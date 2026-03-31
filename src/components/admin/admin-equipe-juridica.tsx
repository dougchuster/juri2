"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Building2,
    Crown,
    Loader2,
    Pencil,
    Plus,
    Power,
    PowerOff,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import {
    createFuncionarioConta,
    createEquipeJuridica,
    removerAdvogadoDaEquipe,
    toggleAdvogadoAtivo,
    updateAdvogadoConta,
    vincularAdvogadoNaEquipe,
} from "@/actions/admin";

interface AdvogadoItem {
    id: string;
    userId: string;
    oab: string;
    seccional: string;
    especialidades: string | null;
    comissaoPercent: number;
    ativo: boolean;
    user: {
        id: string;
        name: string;
        email: string;
        isActive: boolean;
        role: string;
    };
    timeMembros: Array<{
        timeId: string;
        advogadoId: string | null;
        lider: boolean;
        time: {
            id: string;
            nome: string;
            cor: string | null;
            ativo: boolean;
        };
    }>;
}

interface MembroItem {
    id: string;
    timeId: string;
    userId: string;
    advogadoId: string | null;
    lider: boolean;
    user: {
        id: string;
        name: string;
        email: string;
        isActive: boolean;
    };
}

interface EquipeItem {
    id: string;
    nome: string;
    descricao: string | null;
    cor: string | null;
    ativo: boolean;
    membros: MembroItem[];
}

interface UserItem {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface Props {
    advogados: AdvogadoItem[];
    equipes: EquipeItem[];
    allUsers: UserItem[];
}

function getActionError(result: unknown, fallback = "Operacao nao concluida.") {
    if (!result || typeof result !== "object") return fallback;
    const payload = result as { error?: unknown };
    if (!payload.error) return null;
    if (typeof payload.error === "string") return payload.error;
    if (typeof payload.error === "object") {
        const firstValue = Object.values(payload.error as Record<string, unknown>)[0];
        if (Array.isArray(firstValue)) return firstValue[0] ? String(firstValue[0]) : fallback;
        if (typeof firstValue === "string") return firstValue;
    }
    return fallback;
}

export function AdminEquipeJuridica({ advogados, equipes, allUsers }: Props) {
    const router = useRouter();
    const [localEquipes, setLocalEquipes] = useState<EquipeItem[]>(equipes);
    const [showCreateFuncionario, setShowCreateFuncionario] = useState(false);
    const [showCreateEquipe, setShowCreateEquipe] = useState(false);
    const [showVincularMembro, setShowVincularMembro] = useState(false);
    const [equipeSelecionadaId, setEquipeSelecionadaId] = useState<string | null>(null);
    const equipeSelecionada = localEquipes.find((e) => e.id === equipeSelecionadaId) ?? null;
    const [advogadoEdicao, setAdvogadoEdicao] = useState<AdvogadoItem | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [criarAdvogado, setCriarAdvogado] = useState(true);

    const kpis = useMemo(() => {
        const ativos = advogados.filter((a) => a.ativo && a.user.isActive).length;
        const inativos = advogados.length - ativos;
        const lideres = localEquipes.reduce(
            (acc, equipe) => acc + equipe.membros.filter((m) => m.lider).length,
            0
        );
        return {
            totalAdvogados: advogados.length,
            ativos,
            inativos,
            totalEquipes: localEquipes.length,
            lideres,
        };
    }, [advogados, localEquipes]);

    const allUsersOptions = useMemo(() => {
        if (!equipeSelecionada) return [];
        const membrosIds = new Set(equipeSelecionada.membros.map((m) => m.userId));
        return allUsers
            .filter((u) => !membrosIds.has(u.id))
            .map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }));
    }, [allUsers, equipeSelecionada]);

    async function handleCreateFuncionario(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const f = new FormData(e.currentTarget);
        const result = await createFuncionarioConta({
            nome: String(f.get("nome") || ""),
            email: String(f.get("email") || ""),
            senha: String(f.get("senha") || ""),
            role: String(f.get("role") || "ADVOGADO") as
                | "ADMIN"
                | "SOCIO"
                | "ADVOGADO"
                | "CONTROLADOR"
                | "ASSISTENTE"
                | "FINANCEIRO"
                | "SECRETARIA",
            perfilProfissional: String(f.get("perfilProfissional") || ""),
            cargo: String(f.get("cargo") || ""),
            nivel: String(f.get("nivel") || ""),
            criarAdvogado: criarAdvogado,
            oab: String(f.get("oab") || ""),
            seccional: String(f.get("seccional") || ""),
            especialidades: String(f.get("especialidades") || ""),
            comissaoPercent: Number(f.get("comissaoPercent") || 0),
        });
        const actionError = getActionError(result, "Erro ao criar funcionario.");
        if (actionError) {
            setError(actionError);
            setLoading(false);
            return;
        }
        setLoading(false);
        setShowCreateFuncionario(false);
        router.refresh();
    }

    async function handleUpdateAdvogado(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!advogadoEdicao) return;
        setLoading(true);
        setError(null);
        const f = new FormData(e.currentTarget);
        const result = await updateAdvogadoConta({
            advogadoId: advogadoEdicao.id,
            nome: String(f.get("nome") || ""),
            email: String(f.get("email") || ""),
            oab: String(f.get("oab") || ""),
            seccional: String(f.get("seccional") || ""),
            especialidades: String(f.get("especialidades") || ""),
            comissaoPercent: Number(f.get("comissaoPercent") || 0),
        });
        const actionError = getActionError(result, "Erro ao atualizar advogado.");
        if (actionError) {
            setError(actionError);
            setLoading(false);
            return;
        }
        setLoading(false);
        setAdvogadoEdicao(null);
        router.refresh();
    }

    async function handleCreateEquipe(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const f = new FormData(e.currentTarget);
        const result = await createEquipeJuridica({
            nome: String(f.get("nome") || ""),
            descricao: String(f.get("descricao") || ""),
            cor: String(f.get("cor") || "#2563EB"),
        });
        const actionError = getActionError(result, "Erro ao criar equipe juridica.");
        if (actionError) {
            setError(actionError);
            setLoading(false);
            return;
        }
        setLoading(false);
        setShowCreateEquipe(false);
        router.refresh();
    }

    async function handleToggleAdvogado(advogadoId: string) {
        setError(null);
        const result = await toggleAdvogadoAtivo(advogadoId);
        const actionError = getActionError(result, "Erro ao alterar status do advogado.");
        if (actionError) {
            setError(actionError);
            return;
        }
        router.refresh();
    }

    async function handleVincularMembro(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!equipeSelecionada) return;
        setLoading(true);
        setError(null);
        const f = new FormData(e.currentTarget);
        const userId = String(f.get("userId") || "");
        const lider = f.get("lider") === "on";

        // Optimistic update
        const userInfo = allUsers.find((u) => u.id === userId);
        if (userInfo) {
            setLocalEquipes((prev) =>
                prev.map((eq) => {
                    if (eq.id !== equipeSelecionada.id) return eq;
                    const existingIndex = eq.membros.findIndex((m) => m.userId === userId);
                    const newMembro: MembroItem = {
                        id: `temp-${userId}`,
                        timeId: eq.id,
                        userId,
                        advogadoId: null,
                        lider,
                        user: {
                            id: userInfo.id,
                            name: userInfo.name,
                            email: userInfo.email,
                            isActive: true,
                        },
                    };
                    if (existingIndex >= 0) {
                        const updated = [...eq.membros];
                        updated[existingIndex] = { ...updated[existingIndex], lider };
                        return { ...eq, membros: updated };
                    }
                    return { ...eq, membros: [...eq.membros, newMembro] };
                })
            );
        }

        const result = await vincularAdvogadoNaEquipe({
            timeId: equipeSelecionada.id,
            userId,
            lider,
        });
        const actionError = getActionError(result, "Erro ao vincular membro na equipe.");
        if (actionError) {
            setError(actionError);
            setLoading(false);
            router.refresh();
            return;
        }
        setLoading(false);
        setShowVincularMembro(false);
        setEquipeSelecionadaId(null);
        router.refresh();
    }

    async function handleRemoverMembro(timeId: string, userId: string) {
        setError(null);
        // Optimistic update
        setLocalEquipes((prev) =>
            prev.map((eq) => {
                if (eq.id !== timeId) return eq;
                return { ...eq, membros: eq.membros.filter((m) => m.userId !== userId) };
            })
        );
        const result = await removerAdvogadoDaEquipe(timeId, userId);
        const actionError = getActionError(result, "Erro ao remover membro da equipe.");
        if (actionError) {
            setError(actionError);
            router.refresh();
            return;
        }
        router.refresh();
    }

    async function handleDefinirLider(timeId: string, userId: string) {
        setError(null);
        // Optimistic update: clear all leaders, set this one
        setLocalEquipes((prev) =>
            prev.map((eq) => {
                if (eq.id !== timeId) return eq;
                return {
                    ...eq,
                    membros: eq.membros.map((m) => ({ ...m, lider: m.userId === userId })),
                };
            })
        );
        const result = await vincularAdvogadoNaEquipe({ timeId, userId, lider: true });
        const actionError = getActionError(result, "Erro ao definir lider da equipe.");
        if (actionError) {
            setError(actionError);
            router.refresh();
            return;
        }
        router.refresh();
    }

    return (
        <>
            {error && (
                <div className="mb-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="glass-card p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Advogados</p>
                    <p className="mt-2 text-2xl font-mono font-bold text-text-primary">{kpis.totalAdvogados}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Ativos</p>
                    <p className="mt-2 text-2xl font-mono font-bold text-success">{kpis.ativos}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Inativos</p>
                    <p className="mt-2 text-2xl font-mono font-bold text-warning">{kpis.inativos}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Equipes</p>
                    <p className="mt-2 text-2xl font-mono font-bold text-text-primary">{kpis.totalEquipes}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Lideres</p>
                    <p className="mt-2 text-2xl font-mono font-bold text-accent">{kpis.lideres}</p>
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 mb-4">
                <Button size="sm" variant="outline" onClick={() => setShowCreateEquipe(true)}>
                    <Building2 size={14} />
                    Nova Equipe
                </Button>
                <Button size="sm" variant="gradient" onClick={() => setShowCreateFuncionario(true)}>
                    <UserPlus size={14} />
                    Novo Funcionario
                </Button>
            </div>

            <div className="grid grid-cols-[1.4fr_1fr] gap-4">
                <div className="glass-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-bg-tertiary/40 flex items-center gap-2">
                        <Users size={15} className="text-accent" />
                        <h3 className="text-sm font-semibold text-text-primary">Advogados Cadastrados</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px]">
                            <thead>
                                <tr className="border-b border-border bg-bg-tertiary/20">
                                    <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-text-muted">Advogado</th>
                                    <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-text-muted">OAB</th>
                                    <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-text-muted">Equipes</th>
                                    <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-text-muted">Status</th>
                                    <th className="px-4 py-2.5 text-right text-[11px] uppercase tracking-wider text-text-muted">Acoes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {advogados.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-sm text-text-muted text-center">
                                            Nenhum advogado cadastrado.
                                        </td>
                                    </tr>
                                ) : (
                                    advogados.map((advogado) => (
                                        <tr key={advogado.id} className="border-b border-border/60 last:border-0 hover:bg-bg-tertiary/20">
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-text-primary">{advogado.user.name}</p>
                                                <p className="text-xs text-text-muted">{advogado.user.email}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-text-secondary font-mono">
                                                {advogado.oab}/{advogado.seccional}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {advogado.timeMembros.length === 0 && (
                                                        <span className="text-xs text-text-muted">Sem equipe</span>
                                                    )}
                                                    {advogado.timeMembros.map((membro) => (
                                                        <span
                                                            key={`${membro.timeId}-${advogado.id}`}
                                                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-white"
                                                            style={{ backgroundColor: membro.time.cor || "#2563EB" }}
                                                        >
                                                            {membro.time.nome}
                                                            {membro.lider && <Crown size={10} />}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant={advogado.ativo && advogado.user.isActive ? "success" : "muted"}
                                                    size="sm"
                                                >
                                                    {advogado.ativo && advogado.user.isActive ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => setAdvogadoEdicao(advogado)}
                                                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                                                        title="Editar advogado"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleAdvogado(advogado.id)}
                                                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                                                        title={advogado.ativo ? "Desativar advogado" : "Ativar advogado"}
                                                    >
                                                        {advogado.ativo ? <PowerOff size={15} /> : <Power size={15} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-3">
                    {localEquipes.length === 0 ? (
                        <div className="glass-card p-6 text-sm text-text-muted text-center">
                            Nenhuma equipe juridica cadastrada.
                        </div>
                    ) : (
                        localEquipes.map((equipe) => (
                            <div key={equipe.id} className="glass-card p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                            <span
                                                className="inline-block h-2.5 w-2.5 rounded-full"
                                                style={{ backgroundColor: equipe.cor || "#2563EB" }}
                                            />
                                            {equipe.nome}
                                        </p>
                                        {equipe.descricao && (
                                            <p className="text-xs text-text-muted mt-0.5">{equipe.descricao}</p>
                                        )}
                                    </div>
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        onClick={() => {
                                            setEquipeSelecionadaId(equipe.id);
                                            setShowVincularMembro(true);
                                        }}
                                    >
                                        <Plus size={12} />
                                        Membro
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {equipe.membros.length === 0 ? (
                                        <p className="text-xs text-text-muted">Sem membros vinculados.</p>
                                    ) : (
                                        equipe.membros
                                            .slice()
                                            .sort((a, b) => {
                                                if (a.lider !== b.lider) return a.lider ? -1 : 1;
                                                return a.user.name.localeCompare(b.user.name);
                                            })
                                            .map((membro) => (
                                                <div
                                                    key={`${membro.timeId}-${membro.userId}`}
                                                    className="rounded-lg border border-border bg-bg-tertiary/30 px-2.5 py-2"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div>
                                                            <p className="text-xs font-medium text-text-primary flex items-center gap-1.5">
                                                                {membro.user.name}
                                                                {membro.lider && (
                                                                    <Crown size={11} className="text-warning" />
                                                                )}
                                                            </p>
                                                            <p className="text-[11px] text-text-muted">
                                                                {membro.user.email}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {!membro.lider && (
                                                                <button
                                                                    onClick={() =>
                                                                        handleDefinirLider(equipe.id, membro.userId)
                                                                    }
                                                                    className="rounded p-1 text-text-muted hover:text-warning transition-colors"
                                                                    title="Definir lider"
                                                                >
                                                                    <Crown size={12} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() =>
                                                                    handleRemoverMembro(equipe.id, membro.userId)
                                                                }
                                                                className="rounded p-1 text-text-muted hover:text-danger transition-colors"
                                                                title="Remover da equipe"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <Modal
                isOpen={showCreateFuncionario}
                onClose={() => setShowCreateFuncionario(false)}
                title="Novo Funcionario"
                size="md"
            >
                <form onSubmit={handleCreateFuncionario} className="space-y-4">
                    <Input id="func-nome" name="nome" label="Nome completo" required />
                    <Input id="func-email" name="email" label="E-mail de acesso" type="email" required />
                    <Input id="func-senha" name="senha" label="Senha inicial" type="password" required />

                    <Select
                        id="func-role"
                        name="role"
                        label="Perfil de acesso"
                        defaultValue="ADVOGADO"
                        options={[
                            { value: "ADMIN", label: "Administrador" },
                            { value: "SOCIO", label: "Socio" },
                            { value: "ADVOGADO", label: "Advogado" },
                            { value: "FINANCEIRO", label: "Financeiro" },
                            { value: "CONTROLADOR", label: "Controladoria" },
                            { value: "SECRETARIA", label: "Administrativo/Secretaria" },
                            { value: "ASSISTENTE", label: "Assistente" },
                        ]}
                    />

                    <Select
                        id="func-perfil-prof"
                        name="perfilProfissional"
                        label="Perfil (area)"
                        defaultValue="ADVOGADO"
                        options={[
                            { value: "ADVOGADO", label: "Advogado" },
                            { value: "FINANCEIRO", label: "Financeiro" },
                            { value: "ADMINISTRATIVO", label: "Administrativo" },
                            { value: "MARKETING", label: "Marketing" },
                        ]}
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label htmlFor="func-cargo" className="text-sm font-medium text-text-secondary">
                                Cargo (funcao)
                            </label>
                            <input
                                id="func-cargo"
                                name="cargo"
                                list="func-cargo-options"
                                className="w-full rounded-lg border border-border bg-bg-tertiary/50 px-3 py-2 text-sm text-text-primary outline-none"
                                placeholder="Ex: Advogado, Financeiro, Marketing..."
                            />
                            <datalist id="func-cargo-options">
                                <option value="Advogado" />
                                <option value="Financeiro" />
                                <option value="Administrativo" />
                                <option value="Marketing" />
                                <option value="Atendimento" />
                                <option value="Controladoria" />
                                <option value="Operacoes" />
                            </datalist>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="func-nivel" className="text-sm font-medium text-text-secondary">
                                Nivel
                            </label>
                            <input
                                id="func-nivel"
                                name="nivel"
                                list="func-nivel-options"
                                className="w-full rounded-lg border border-border bg-bg-tertiary/50 px-3 py-2 text-sm text-text-primary outline-none"
                                placeholder="Ex: Junior, Pleno, Senior..."
                            />
                            <datalist id="func-nivel-options">
                                <option value="Estagiario" />
                                <option value="Junior" />
                                <option value="Pleno" />
                                <option value="Senior" />
                                <option value="Coordenador" />
                                <option value="Gerente" />
                            </datalist>
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-text-secondary">
                        <input
                            type="checkbox"
                            checked={criarAdvogado}
                            onChange={(e) => setCriarAdvogado(e.target.checked)}
                            className="rounded border-border"
                        />
                        Criar perfil de advogado (OAB) para este funcionario
                    </label>

                    {criarAdvogado && (
                        <div className="rounded-xl border border-border bg-bg-tertiary/20 p-3 space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                                <Input id="func-oab" name="oab" label="OAB" required />
                                <Input id="func-seccional" name="seccional" label="UF" defaultValue="DF" required />
                                <Input
                                    id="func-comissao"
                                    name="comissaoPercent"
                                    label="% Comissao"
                                    type="number"
                                    defaultValue="0"
                                    min={0}
                                    max={100}
                                />
                            </div>
                            <Textarea id="func-esp" name="especialidades" label="Especialidades" rows={2} />
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowCreateFuncionario(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="gradient" disabled={loading}>
                            {loading ? <Loader2 size={14} className="animate-spin" /> : "Criar funcionario"}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={!!advogadoEdicao}
                onClose={() => setAdvogadoEdicao(null)}
                title="Editar Advogado"
                size="md"
            >
                <form onSubmit={handleUpdateAdvogado} className="space-y-4">
                    <Input
                        id="edit-adv-nome"
                        name="nome"
                        label="Nome completo"
                        defaultValue={advogadoEdicao?.user.name || ""}
                        required
                    />
                    <Input
                        id="edit-adv-email"
                        name="email"
                        label="E-mail"
                        type="email"
                        defaultValue={advogadoEdicao?.user.email || ""}
                        required
                    />
                    <div className="grid grid-cols-3 gap-3">
                        <Input
                            id="edit-adv-oab"
                            name="oab"
                            label="OAB"
                            defaultValue={advogadoEdicao?.oab || ""}
                            required
                        />
                        <Input
                            id="edit-adv-seccional"
                            name="seccional"
                            label="UF"
                            defaultValue={advogadoEdicao?.seccional || ""}
                            required
                        />
                        <Input
                            id="edit-adv-comissao"
                            name="comissaoPercent"
                            label="% Comissao"
                            type="number"
                            min={0}
                            max={100}
                            defaultValue={advogadoEdicao?.comissaoPercent ?? 0}
                        />
                    </div>
                    <Textarea
                        id="edit-adv-especialidades"
                        name="especialidades"
                        label="Especialidades"
                        rows={2}
                        defaultValue={advogadoEdicao?.especialidades || ""}
                    />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setAdvogadoEdicao(null)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="gradient" disabled={loading}>
                            {loading ? <Loader2 size={14} className="animate-spin" /> : "Salvar alteracoes"}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showCreateEquipe}
                onClose={() => setShowCreateEquipe(false)}
                title="Nova Equipe Juridica"
                size="sm"
            >
                <form onSubmit={handleCreateEquipe} className="space-y-4">
                    <Input id="eq-nome" name="nome" label="Nome da equipe" required placeholder="Ex: Contencioso Civel" />
                    <Textarea id="eq-descricao" name="descricao" label="Descricao" rows={2} />
                    <div className="space-y-1.5">
                        <label htmlFor="eq-cor" className="text-sm font-medium text-text-secondary">
                            Cor da equipe
                        </label>
                        <input
                            id="eq-cor"
                            name="cor"
                            type="color"
                            defaultValue="#2563EB"
                            className="h-10 w-full rounded-lg border border-border bg-bg-tertiary/50 p-1"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowCreateEquipe(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="gradient" disabled={loading}>
                            {loading ? <Loader2 size={14} className="animate-spin" /> : "Criar equipe"}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showVincularMembro}
                onClose={() => {
                    setShowVincularMembro(false);
                    setEquipeSelecionadaId(null);
                }}
                title={`Adicionar membro - ${equipeSelecionada?.nome || ""}`}
                size="sm"
            >
                <form onSubmit={handleVincularMembro} className="space-y-4">
                    <Select
                        id="vinc-usuario"
                        name="userId"
                        label="Funcionario"
                        options={allUsersOptions}
                        placeholder="Selecionar funcionario"
                        required
                    />
                    <label className="flex items-center gap-2 text-sm text-text-secondary">
                        <input type="checkbox" name="lider" className="rounded border-border" />
                        Definir como lider da equipe
                    </label>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={() => {
                                setShowVincularMembro(false);
                                setEquipeSelecionadaId(null);
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" variant="gradient" disabled={loading}>
                            {loading ? <Loader2 size={14} className="animate-spin" /> : "Vincular"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
