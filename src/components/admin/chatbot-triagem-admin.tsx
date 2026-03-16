"use client";

import {
    AlertCircle,
    Bot,
    Check,
    CheckCircle2,
    Code2,
    Copy,
    Loader2,
    RefreshCw,
    Settings,
    Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ChatbotLead {
    id: string;
    nome: string | null;
    email: string | null;
    telefone: string | null;
    area: string | null;
    captadoEm: string;
    convertido: boolean;
}

interface ChatbotStats {
    total: number;
    naoConvertidos: number;
    convertidos: number;
    hoje: number;
}

interface ChatbotConfig {
    nomeEscritorio: string;
    corPrimaria: string;
    mensagemBoasVindas: string;
    coletarNome: boolean;
    coletarEmail: boolean;
    coletarTelefone: boolean;
    mensagemFinal: string;
    habilitado: boolean;
}

const DEFAULT_CONFIG: ChatbotConfig = {
    nomeEscritorio: "Escritório de Advocacia",
    corPrimaria: "#1d4ed8",
    mensagemBoasVindas:
        "Olá! Sou o assistente virtual do escritório. Como posso te ajudar?",
    coletarNome: true,
    coletarEmail: true,
    coletarTelefone: true,
    mensagemFinal:
        "Obrigado pelo contato! Nossa equipe vai entrar em contato em breve.",
    habilitado: true,
};

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
    );
}

export function ChatbotTriagemAdmin() {
    const [tab, setTab] = useState<"leads" | "config" | "widget">("leads");
    const [leads, setLeads] = useState<ChatbotLead[]>([]);
    const [stats, setStats] = useState<ChatbotStats | null>(null);
    const [config, setConfig] = useState<ChatbotConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/chatbot-triagem");
            if (!res.ok) throw new Error("Erro ao carregar dados");
            const json = await res.json() as { leads: ChatbotLead[]; stats: ChatbotStats; config: ChatbotConfig | null };
            setLeads(json.leads);
            setStats(json.stats);
            if (json.config) {
                setConfig({ ...DEFAULT_CONFIG, ...json.config });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro desconhecido");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/admin/chatbot-triagem", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            if (!res.ok) throw new Error("Erro ao salvar");
            setSuccessMsg("Configuração salva com sucesso!");
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao salvar");
        } finally {
            setSaving(false);
        }
    };

    const handleConverterLead = async (leadId: string, convertido: boolean) => {
        try {
            await fetch("/api/admin/chatbot-triagem", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leadId, convertido }),
            });
            setLeads((prev) =>
                prev.map((l) => (l.id === leadId ? { ...l, convertido } : l))
            );
        } catch {
            // silently ignore
        }
    };

    const widgetCode = `<!-- Chatbot de Triagem — Cole antes do </body> -->
<script>
(function() {
  var BASE_URL = "${typeof window !== "undefined" ? window.location.origin : "https://seusite.com.br"}";
  var container = document.createElement("div");
  container.id = "adv-chatbot-widget";
  document.body.appendChild(container);
  
  var style = document.createElement("style");
  style.textContent = \`
    #adv-chatbot-btn { position:fixed; bottom:24px; right:24px; width:56px; height:56px;
      border-radius:50%; background:${config.corPrimaria}; border:none; cursor:pointer;
      display:flex; align-items:center; justify-content:center; z-index:9999;
      box-shadow:0 4px 16px rgba(0,0,0,0.2); }
    #adv-chatbot-btn svg { width:28px; height:28px; fill:white; }
    #adv-chatbot-box { position:fixed; bottom:90px; right:24px; width:340px;
      background:white; border-radius:16px; box-shadow:0 8px 40px rgba(0,0,0,0.15);
      display:none; flex-direction:column; overflow:hidden; z-index:9998;
      font-family:system-ui,sans-serif; max-height:520px; }
    #adv-chatbot-header { background:${config.corPrimaria}; color:white; padding:14px 16px;
      font-weight:600; font-size:14px; }
    #adv-chatbot-messages { flex:1; overflow-y:auto; padding:12px; display:flex;
      flex-direction:column; gap:10px; max-height:340px; }
    .adv-msg { max-width:80%; padding:10px 14px; border-radius:16px; font-size:13px;
      line-height:1.4; word-break:break-word; }
    .adv-msg-bot { background:#f1f5f9; color:#1e293b; align-self:flex-start;
      border-bottom-left-radius:4px; }
    .adv-msg-user { background:${config.corPrimaria}; color:white; align-self:flex-end;
      border-bottom-right-radius:4px; }
    #adv-chatbot-input-area { display:flex; padding:10px; gap:8px; border-top:1px solid #e2e8f0; }
    #adv-chatbot-input { flex:1; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px;
      font-size:13px; outline:none; }
    #adv-chatbot-send { background:${config.corPrimaria}; color:white; border:none;
      border-radius:8px; padding:8px 14px; cursor:pointer; font-size:13px; font-weight:600; }
  \`;
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.id = "adv-chatbot-btn";
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  container.appendChild(btn);

  var box = document.createElement("div");
  box.id = "adv-chatbot-box";
  box.innerHTML = \`
    <div id="adv-chatbot-header">${config.nomeEscritorio} — Atendimento</div>
    <div id="adv-chatbot-messages"></div>
    <div id="adv-chatbot-input-area">
      <input id="adv-chatbot-input" placeholder="Digite sua mensagem..." />
      <button id="adv-chatbot-send">Enviar</button>
    </div>
  \`;
  container.appendChild(box);

  var estagio = 0;
  var dadosColetados = {};
  var aberto = false;

  function toggleChat() {
    aberto = !aberto;
    box.style.display = aberto ? "flex" : "none";
    if (aberto && estagio === 0) iniciarConversa();
  }

  function addMensagem(texto, tipo) {
    var msgs = document.getElementById("adv-chatbot-messages");
    var div = document.createElement("div");
    div.className = "adv-msg adv-msg-" + tipo;
    div.textContent = texto;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function iniciarConversa() {
    fetch(BASE_URL + "/api/chatbot-triagem", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ mensagem: "", estagio: 0, dadosColetados: {} })
    }).then(r => r.json()).then(function(data) {
      estagio = data.estagio;
      dadosColetados = data.dadosColetados || {};
      addMensagem(data.resposta, "bot");
    });
  }

  function enviarMensagem() {
    var input = document.getElementById("adv-chatbot-input");
    var texto = input.value.trim();
    if (!texto) return;
    input.value = "";
    addMensagem(texto, "user");
    fetch(BASE_URL + "/api/chatbot-triagem", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ mensagem: texto, estagio: estagio, dadosColetados: dadosColetados })
    }).then(r => r.json()).then(function(data) {
      estagio = data.estagio;
      dadosColetados = data.dadosColetados || {};
      addMensagem(data.resposta, "bot");
      if (data.leadCompleto) {
        document.getElementById("adv-chatbot-input").disabled = true;
        document.getElementById("adv-chatbot-send").disabled = true;
      }
    });
  }

  btn.addEventListener("click", toggleChat);
  document.getElementById("adv-chatbot-send").addEventListener("click", enviarMensagem);
  document.getElementById("adv-chatbot-input").addEventListener("keypress", function(e) {
    if (e.key === "Enter") enviarMensagem();
  });
})();
</script>`;

    const handleCopyWidget = () => {
        navigator.clipboard.writeText(widgetCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <Bot className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Chatbot de Triagem</h2>
                    <p className="text-sm text-gray-500">
                        Widget para captação de leads no site do escritório
                    </p>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-4 gap-4">
                    <StatCard label="Total de Leads" value={stats.total} color="text-blue-600" />
                    <StatCard label="Hoje" value={stats.hoje} color="text-indigo-600" />
                    <StatCard label="Pendentes" value={stats.naoConvertidos} color="text-amber-600" />
                    <StatCard label="Convertidos" value={stats.convertidos} color="text-green-600" />
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b gap-4">
                {(
                    [
                        { id: "leads", label: "Leads Captados", icon: <Users className="w-4 h-4" /> },
                        { id: "config", label: "Configurações", icon: <Settings className="w-4 h-4" /> },
                        { id: "widget", label: "Código do Widget", icon: <Code2 className="w-4 h-4" /> },
                    ] as { id: typeof tab; label: string; icon: React.ReactNode }[]
                ).map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                            tab === t.id
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Tab: Leads */}
            {tab === "leads" && (
                <div className="flex flex-col gap-4">
                    <div className="flex justify-end">
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                            Atualizar
                        </button>
                    </div>

                    {leads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <Bot className="w-10 h-10 mb-3" />
                            <p className="text-sm">Nenhum lead captado ainda.</p>
                            <p className="text-xs">
                                Configure o widget e coloque no seu site para começar a captar leads.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-600 text-xs">
                                    <tr>
                                        <th className="text-left px-4 py-3">Nome</th>
                                        <th className="text-left px-4 py-3">E-mail</th>
                                        <th className="text-left px-4 py-3">Telefone</th>
                                        <th className="text-left px-4 py-3">Área</th>
                                        <th className="text-left px-4 py-3">Captado em</th>
                                        <th className="text-center px-4 py-3">Status</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {leads.map((lead) => (
                                        <tr
                                            key={lead.id}
                                            className={`hover:bg-gray-50 ${lead.convertido ? "opacity-60" : ""}`}
                                        >
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {lead.nome ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {lead.email ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {lead.telefone ?? "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                {lead.area ? (
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                                                        {lead.area}
                                                    </span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">
                                                {new Date(lead.captadoEm).toLocaleString("pt-BR", {
                                                    dateStyle: "short",
                                                    timeStyle: "short",
                                                })}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {lead.convertido ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Convertido
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                                                        Pendente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() =>
                                                        handleConverterLead(lead.id, !lead.convertido)
                                                    }
                                                    className="text-xs text-blue-600 hover:underline"
                                                >
                                                    {lead.convertido ? "Desfazer" : "Marcar convertido"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Config */}
            {tab === "config" && (
                <div className="flex flex-col gap-4 max-w-2xl">
                    {successMsg && (
                        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                            <Check className="w-4 h-4" />
                            {successMsg}
                        </div>
                    )}

                    <div className="bg-white rounded-xl border p-5 flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome do Escritório
                            </label>
                            <input
                                type="text"
                                value={config.nomeEscritorio}
                                onChange={(e) =>
                                    setConfig((c) => ({ ...c, nomeEscritorio: e.target.value }))
                                }
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cor Principal
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={config.corPrimaria}
                                    onChange={(e) =>
                                        setConfig((c) => ({ ...c, corPrimaria: e.target.value }))
                                    }
                                    className="h-9 w-16 rounded border cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={config.corPrimaria}
                                    onChange={(e) =>
                                        setConfig((c) => ({ ...c, corPrimaria: e.target.value }))
                                    }
                                    className="border rounded-lg px-3 py-2 text-sm w-32"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mensagem de Boas-Vindas
                            </label>
                            <textarea
                                value={config.mensagemBoasVindas}
                                onChange={(e) =>
                                    setConfig((c) => ({ ...c, mensagemBoasVindas: e.target.value }))
                                }
                                rows={3}
                                className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mensagem Final (após coleta de dados)
                            </label>
                            <textarea
                                value={config.mensagemFinal}
                                onChange={(e) =>
                                    setConfig((c) => ({ ...c, mensagemFinal: e.target.value }))
                                }
                                rows={3}
                                className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <p className="text-sm font-medium text-gray-700">Dados a coletar</p>
                            {(
                                [
                                    ["coletarNome", "Nome completo"],
                                    ["coletarEmail", "E-mail"],
                                    ["coletarTelefone", "Telefone/WhatsApp"],
                                ] as [keyof ChatbotConfig, string][]
                            ).map(([field, label]) => (
                                <label key={field} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config[field] as boolean}
                                        onChange={(e) =>
                                            setConfig((c) => ({ ...c, [field]: e.target.checked }))
                                        }
                                        className="rounded"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.habilitado}
                                    onChange={(e) =>
                                        setConfig((c) => ({ ...c, habilitado: e.target.checked }))
                                    }
                                    className="rounded"
                                />
                                <span className="font-medium">Chatbot habilitado</span>
                            </label>
                            <button
                                onClick={handleSaveConfig}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Salvar Configuração
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Widget Code */}
            {tab === "widget" && (
                <div className="flex flex-col gap-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                        <strong>Como usar:</strong> Copie o código abaixo e cole antes da tag{" "}
                        <code className="bg-amber-100 px-1 rounded">&lt;/body&gt;</code> no HTML do
                        site do escritório. O widget aparecerá como um botão flutuante no canto
                        inferior direito.
                    </div>

                    <div className="relative">
                        <button
                            onClick={handleCopyWidget}
                            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white border rounded-md text-xs text-gray-600 hover:bg-gray-50 z-10"
                        >
                            {copied ? (
                                <>
                                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                                    Copiado!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3 h-3" />
                                    Copiar
                                </>
                            )}
                        </button>
                        <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs overflow-auto max-h-[500px] leading-relaxed">
                            <code>{widgetCode}</code>
                        </pre>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                        <strong>Dica:</strong> O widget automaticamente detecta a área do direito da
                        conversa, coleta os dados do visitante e salva como lead no sistema. Você pode
                        ver e gerenciar os leads na aba <strong>Leads Captados</strong>.
                    </div>
                </div>
            )}
        </div>
    );
}
