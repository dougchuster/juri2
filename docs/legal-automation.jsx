import { useState, useEffect, useRef } from "react";

const CATEGORIES = [
  {
    id: "intake",
    label: "Intake de Clientes",
    icon: "👤",
    color: "#2D6A4F",
    desc: "Captação e qualificação automática",
    templates: [
      {
        id: "t1",
        name: "Triagem Inicial",
        desc: "Coleta dados básicos e direciona para área correta",
        steps: 6,
        tags: ["WhatsApp", "Site"],
      },
      {
        id: "t2",
        name: "Qualificação de Lead",
        desc: "Avalia perfil e urgência do caso jurídico",
        steps: 5,
        tags: ["WhatsApp", "E-mail"],
      },
      {
        id: "t3",
        name: "Agendamento de Consulta",
        desc: "Oferece horários e confirma agenda automaticamente",
        steps: 4,
        tags: ["WhatsApp", "SMS"],
      },
    ],
  },
  {
    id: "contracts",
    label: "Contratos",
    icon: "📄",
    color: "#7B2D26",
    desc: "Geração e gestão de documentos",
    templates: [
      {
        id: "t4",
        name: "Geração de NDA",
        desc: "Coleta partes, termos e gera NDA automaticamente",
        steps: 5,
        tags: ["E-mail", "Portal"],
      },
      {
        id: "t5",
        name: "Revisão de Contrato",
        desc: "Fluxo de aprovação com checklist de cláusulas",
        steps: 8,
        tags: ["Portal", "E-mail"],
      },
      {
        id: "t6",
        name: "Renovação Automática",
        desc: "Monitora vencimentos e inicia renovação",
        steps: 6,
        tags: ["E-mail", "WhatsApp"],
      },
    ],
  },
  {
    id: "compliance",
    label: "Compliance",
    icon: "🛡️",
    color: "#4A3F6B",
    desc: "Monitoramento e conformidade",
    templates: [
      {
        id: "t7",
        name: "Due Diligence",
        desc: "Checklist automatizado de verificação de terceiros",
        steps: 10,
        tags: ["Portal", "E-mail"],
      },
      {
        id: "t8",
        name: "Canal de Denúncias",
        desc: "Recepção anônima e encaminhamento seguro",
        steps: 7,
        tags: ["Site", "WhatsApp"],
      },
      {
        id: "t9",
        name: "LGPD - Direito do Titular",
        desc: "Atende requisições de dados pessoais automaticamente",
        steps: 6,
        tags: ["Site", "E-mail"],
      },
    ],
  },
  {
    id: "litigation",
    label: "Contencioso",
    icon: "⚖️",
    color: "#1B4965",
    desc: "Acompanhamento processual",
    templates: [
      {
        id: "t10",
        name: "Atualização de Processo",
        desc: "Notifica cliente sobre movimentações processuais",
        steps: 4,
        tags: ["WhatsApp", "E-mail"],
      },
      {
        id: "t11",
        name: "Cobrança de Honorários",
        desc: "Envia lembretes e boletos automaticamente",
        steps: 5,
        tags: ["WhatsApp", "E-mail", "SMS"],
      },
      {
        id: "t12",
        name: "Prazos Processuais",
        desc: "Alertas inteligentes de prazos com escalonamento",
        steps: 6,
        tags: ["E-mail", "WhatsApp"],
      },
    ],
  },
  {
    id: "labor",
    label: "Trabalhista",
    icon: "🏢",
    color: "#8B6914",
    desc: "Demandas trabalhistas e RH jurídico",
    templates: [
      {
        id: "t13",
        name: "Admissão Digital",
        desc: "Coleta documentos e gera contrato de trabalho",
        steps: 8,
        tags: ["WhatsApp", "Portal"],
      },
      {
        id: "t14",
        name: "Rescisão Automatizada",
        desc: "Calcula verbas e gera documentação de rescisão",
        steps: 7,
        tags: ["E-mail", "Portal"],
      },
    ],
  },
  {
    id: "realestate",
    label: "Imobiliário",
    icon: "🏠",
    color: "#6B4226",
    desc: "Transações e contratos imobiliários",
    templates: [
      {
        id: "t15",
        name: "Análise de Documentação",
        desc: "Checklist de docs para compra e venda de imóveis",
        steps: 9,
        tags: ["Portal", "E-mail"],
      },
      {
        id: "t16",
        name: "Contrato de Locação",
        desc: "Gera contrato com cláusulas customizadas",
        steps: 6,
        tags: ["WhatsApp", "E-mail"],
      },
    ],
  },
];

const FLOW_NODE_TYPES = [
  { type: "trigger", label: "Gatilho", icon: "⚡", color: "#2D6A4F" },
  { type: "message", label: "Mensagem", icon: "💬", color: "#1B4965" },
  { type: "condition", label: "Condição", icon: "🔀", color: "#8B6914" },
  { type: "action", label: "Ação", icon: "⚙️", color: "#4A3F6B" },
  { type: "delay", label: "Aguardar", icon: "⏱️", color: "#6B4226" },
  { type: "transfer", label: "Transferir", icon: "👤", color: "#7B2D26" },
  { type: "document", label: "Documento", icon: "📄", color: "#2D6A4F" },
  { type: "api", label: "Integração", icon: "🔗", color: "#1B4965" },
];

const SAMPLE_FLOW = [
  { id: "n1", type: "trigger", label: "Cliente envia mensagem", x: 60, y: 40, config: { channel: "WhatsApp" } },
  { id: "n2", type: "condition", label: "Horário comercial?", x: 60, y: 140, config: {} },
  { id: "n3", type: "message", label: "Saudação + Menu", x: 20, y: 240, config: { text: "Olá! Bem-vindo ao escritório..." } },
  { id: "n4", type: "message", label: "Fora do horário", x: 100, y: 240, config: { text: "No momento estamos fora..." } },
  { id: "n5", type: "condition", label: "Qual área?", x: 20, y: 340, config: {} },
  { id: "n6", type: "action", label: "Coletar dados", x: 20, y: 440, config: {} },
  { id: "n7", type: "transfer", label: "Advogado responsável", x: 20, y: 540, config: {} },
];

const SAMPLE_EDGES = [
  { from: "n1", to: "n2" },
  { from: "n2", to: "n3", label: "Sim" },
  { from: "n2", to: "n4", label: "Não" },
  { from: "n3", to: "n5" },
  { from: "n5", to: "n6" },
  { from: "n6", to: "n7" },
];

const METRICS = [
  { label: "Atendimentos hoje", value: "47", change: "+12%", up: true },
  { label: "Tempo médio resposta", value: "1.2m", change: "-34%", up: true },
  { label: "Taxa de resolução", value: "89%", change: "+5%", up: true },
  { label: "Fluxos ativos", value: "12", change: "+2", up: true },
  { label: "Satisfação", value: "4.7", change: "+0.3", up: true },
];

const ACTIVE_FLOWS = [
  { id: 1, name: "Triagem WhatsApp", category: "intake", status: "active", executions: 234, success: 96 },
  { id: 2, name: "Cobrança de Honorários", category: "litigation", status: "active", executions: 87, success: 91 },
  { id: 3, name: "Recepção Fora do Horário", category: "intake", status: "active", executions: 156, success: 88 },
  { id: 4, name: "Atualização Processual", category: "litigation", status: "paused", executions: 312, success: 94 },
  { id: 5, name: "NDA Automático", category: "contracts", status: "active", executions: 45, success: 100 },
  { id: 6, name: "LGPD - Direitos do Titular", category: "compliance", status: "draft", executions: 0, success: 0 },
];

// ─── Mini Flow Canvas ────────────────────────────────
function MiniFlowPreview({ nodes, edges }) {
  const w = 240, h = 180;
  const scale = 0.28;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ background: "rgba(0,0,0,0.02)", borderRadius: 10 }}>
      {edges.map((e, i) => {
        const from = nodes.find(n => n.id === e.from);
        const to = nodes.find(n => n.id === e.to);
        if (!from || !to) return null;
        const x1 = from.x * scale + 30, y1 = from.y * scale + 18;
        const x2 = to.x * scale + 30, y2 = to.y * scale + 18;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#b8c4ce" strokeWidth={1.5} />;
      })}
      {nodes.map((n) => {
        const nt = FLOW_NODE_TYPES.find(t => t.type === n.type);
        return (
          <g key={n.id}>
            <rect x={n.x * scale + 8} y={n.y * scale + 6} width={44} height={24} rx={6} fill={nt?.color || "#888"} opacity={0.15} />
            <rect x={n.x * scale + 8} y={n.y * scale + 6} width={44} height={24} rx={6} fill="none" stroke={nt?.color || "#888"} strokeWidth={1} opacity={0.4} />
            <text x={n.x * scale + 30} y={n.y * scale + 22} textAnchor="middle" fontSize={7} fill={nt?.color || "#888"} fontWeight={600}>{n.label.slice(0, 12)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Flow Builder Canvas ─────────────────────────────
function FlowBuilder({ template, onClose }) {
  const [nodes, setNodes] = useState(SAMPLE_FLOW);
  const [edges] = useState(SAMPLE_EDGES);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dragging, setDragging] = useState(null);
  const canvasRef = useRef(null);

  const handleDragStart = (id, e) => {
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    setDragging({ id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setNodes(prev => prev.map(n => n.id === dragging.id ? { ...n, x: Math.max(0, x - 70), y: Math.max(0, y - 20) } : n));
  };

  const handleMouseUp = () => setDragging(null);

  const addNode = (type) => {
    const nt = FLOW_NODE_TYPES.find(t => t.type === type);
    const newNode = {
      id: `n${Date.now()}`,
      type,
      label: nt.label,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 300,
      config: {},
    };
    setNodes(prev => [...prev, newNode]);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#0f1419", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", background: "#1a2029", borderBottom: "1px solid #2a3444" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8899aa", cursor: "pointer", fontSize: 20, padding: 4 }}>←</button>
          <div>
            <div style={{ color: "#e8ecf0", fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{template?.name || "Novo Fluxo"}</div>
            <div style={{ color: "#667788", fontSize: 12 }}>{template?.desc || "Construtor visual de automação"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #2a3444", background: "transparent", color: "#8899aa", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>Testar</button>
          <button style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#2D6A4F", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Publicar</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Toolbox */}
        <div style={{ width: 220, background: "#151c24", borderRight: "1px solid #2a3444", padding: "20px 16px", overflowY: "auto" }}>
          <div style={{ color: "#667788", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>Componentes</div>
          {FLOW_NODE_TYPES.map(nt => (
            <button key={nt.type} onClick={() => addNode(nt.type)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", marginBottom: 6, borderRadius: 8,
              border: "1px solid #2a3444", background: "#1a2029", color: "#c8d0d8", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = nt.color; e.currentTarget.style.background = "#1e2733"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a3444"; e.currentTarget.style.background = "#1a2029"; }}
            >
              <span style={{ fontSize: 16 }}>{nt.icon}</span>
              <span>{nt.label}</span>
            </button>
          ))}

          <div style={{ color: "#667788", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 28, marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>Variáveis</div>
          {["{{nome_cliente}}", "{{cpf}}", "{{email}}", "{{area_direito}}", "{{numero_processo}}"].map(v => (
            <div key={v} style={{ padding: "6px 10px", marginBottom: 4, borderRadius: 6, background: "#1e2733", color: "#6fa87a", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{v}</div>
          ))}
        </div>

        {/* Canvas */}
        <div ref={canvasRef} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} style={{
          flex: 1, position: "relative", overflow: "auto",
          background: `
            radial-gradient(circle at 50% 50%, #1a2029 0%, #0f1419 100%),
            repeating-linear-gradient(0deg, transparent, transparent 19px, #1e2733 19px, #1e2733 20px),
            repeating-linear-gradient(90deg, transparent, transparent 19px, #1e2733 19px, #1e2733 20px)
          `,
          backgroundSize: "100% 100%, 20px 20px, 20px 20px",
        }}>
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4a5a6a" /></marker>
            </defs>
            {edges.map((e, i) => {
              const from = nodes.find(n => n.id === e.from);
              const to = nodes.find(n => n.id === e.to);
              if (!from || !to) return null;
              const x1 = from.x + 80, y1 = from.y + 38;
              const x2 = to.x + 80, y2 = to.y + 2;
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
              return (
                <g key={i}>
                  <path d={`M ${x1} ${y1} Q ${x1} ${my} ${mx} ${my} Q ${x2} ${my} ${x2} ${y2}`} fill="none" stroke="#3a4a5a" strokeWidth={2} markerEnd="url(#arrowhead)" />
                  {e.label && <text x={mx + 8} y={my - 4} fontSize={10} fill="#667788" fontFamily="'DM Sans', sans-serif">{e.label}</text>}
                </g>
              );
            })}
          </svg>

          {nodes.map(n => {
            const nt = FLOW_NODE_TYPES.find(t => t.type === n.type);
            const isSelected = selectedNode === n.id;
            return (
              <div key={n.id} onMouseDown={(e) => handleDragStart(n.id, e)} onClick={() => setSelectedNode(n.id)} style={{
                position: "absolute", left: n.x, top: n.y, width: 160, padding: "10px 14px", borderRadius: 10,
                background: isSelected ? "#1e2733" : "#1a2029",
                border: `1.5px solid ${isSelected ? nt?.color : "#2a3444"}`,
                cursor: "grab", userSelect: "none", transition: "border-color 0.15s, box-shadow 0.15s",
                boxShadow: isSelected ? `0 0 20px ${nt?.color}22` : "0 2px 8px rgba(0,0,0,0.3)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{nt?.icon}</span>
                  <span style={{ fontSize: 11, color: nt?.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif" }}>{nt?.label}</span>
                </div>
                <div style={{ marginTop: 6, color: "#c8d0d8", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{n.label}</div>
              </div>
            );
          })}
        </div>

        {/* Properties */}
        {selectedNode && (() => {
          const node = nodes.find(n => n.id === selectedNode);
          const nt = FLOW_NODE_TYPES.find(t => t.type === node?.type);
          return (
            <div style={{ width: 300, background: "#151c24", borderLeft: "1px solid #2a3444", padding: 20, overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ color: "#e8ecf0", fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Propriedades</div>
                <button onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", color: "#667788", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "12px 14px", borderRadius: 10, background: `${nt?.color}15`, border: `1px solid ${nt?.color}30` }}>
                <span style={{ fontSize: 20 }}>{nt?.icon}</span>
                <div>
                  <div style={{ color: nt?.color, fontSize: 12, fontWeight: 700, textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>{nt?.label}</div>
                  <div style={{ color: "#c8d0d8", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{node?.label}</div>
                </div>
              </div>

              <label style={{ display: "block", color: "#667788", fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'DM Sans', sans-serif" }}>Nome do nó</label>
              <input value={node?.label || ""} onChange={e => setNodes(prev => prev.map(n => n.id === selectedNode ? { ...n, label: e.target.value } : n))} style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #2a3444", background: "#1a2029", color: "#e8ecf0", fontSize: 13, marginBottom: 16, fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
              }} />

              {node?.type === "message" && (
                <>
                  <label style={{ display: "block", color: "#667788", fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'DM Sans', sans-serif" }}>Mensagem</label>
                  <textarea rows={4} placeholder="Digite a mensagem..." style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #2a3444", background: "#1a2029", color: "#e8ecf0", fontSize: 13, resize: "vertical", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
                  }} defaultValue={node?.config?.text || ""} />
                  <div style={{ marginTop: 12, color: "#667788", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>Dica: use {"{{variáveis}}"} para personalizar</div>
                </>
              )}

              {node?.type === "condition" && (
                <>
                  <label style={{ display: "block", color: "#667788", fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'DM Sans', sans-serif" }}>Tipo de condição</label>
                  <select style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #2a3444", background: "#1a2029", color: "#e8ecf0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }}>
                    <option>Horário comercial</option>
                    <option>Palavra-chave</option>
                    <option>Área do direito</option>
                    <option>Status do processo</option>
                    <option>Valor da causa</option>
                  </select>
                </>
              )}

              {node?.type === "trigger" && (
                <>
                  <label style={{ display: "block", color: "#667788", fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'DM Sans', sans-serif" }}>Canal</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["WhatsApp", "E-mail", "Site", "SMS", "Telegram"].map(ch => (
                      <button key={ch} style={{
                        padding: "6px 14px", borderRadius: 20, border: "1px solid #2a3444", background: node?.config?.channel === ch ? "#2D6A4F" : "#1a2029",
                        color: node?.config?.channel === ch ? "#fff" : "#8899aa", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      }}>{ch}</button>
                    ))}
                  </div>
                </>
              )}

              <div style={{ marginTop: 30, paddingTop: 16, borderTop: "1px solid #2a3444" }}>
                <button onClick={() => {
                  setNodes(prev => prev.filter(n => n.id !== selectedNode));
                  setSelectedNode(null);
                }} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #7B2D2633", background: "#7B2D2615", color: "#c0504d", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                  Excluir nó
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── Template Card ───────────────────────────────────
function TemplateCard({ template, catColor, onUse }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onUse} style={{
      padding: 20, borderRadius: 14, cursor: "pointer",
      background: hovered ? "#faf8f5" : "#fff",
      border: `1px solid ${hovered ? catColor + "40" : "#eae5de"}`,
      boxShadow: hovered ? `0 8px 30px ${catColor}12` : "0 1px 3px rgba(0,0,0,0.04)",
      transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
      transform: hovered ? "translateY(-2px)" : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#2c2418", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.3 }}>{template.name}</div>
        <div style={{
          padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, color: catColor,
          background: catColor + "12", fontFamily: "'DM Sans', sans-serif",
        }}>{template.steps} etapas</div>
      </div>
      <div style={{ marginTop: 8, fontSize: 13, color: "#7a6f60", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>{template.desc}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
        {template.tags.map(tag => (
          <span key={tag} style={{
            padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 500,
            background: "#f3efe8", color: "#8a7e6e", fontFamily: "'DM Sans', sans-serif",
          }}>{tag}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────
export default function LegalAutomation() {
  const [view, setView] = useState("dashboard"); // dashboard | templates | builder
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("fluxos"); // fluxos | templates | metricas

  const filteredFlows = ACTIVE_FLOWS.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (view === "builder") {
    return <FlowBuilder template={selectedTemplate} onClose={() => setView("dashboard")} />;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#faf8f5",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      {/* ─── Header ───────────────────────────── */}
      <div style={{
        padding: "28px 40px 0",
        background: "linear-gradient(180deg, #f5f0e8 0%, #faf8f5 100%)",
        borderBottom: "1px solid #eae5de",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#a89880", textTransform: "uppercase", letterSpacing: 2 }}>Operação Jurídica</div>
            <h1 style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 800, color: "#2c2418", letterSpacing: -0.5 }}>Automação & Fluxos</h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#8a7e6e", maxWidth: 500 }}>Construa fluxos inteligentes de atendimento e automação para sua operação jurídica</p>
          </div>
          <button onClick={() => { setSelectedTemplate(null); setView("builder"); }} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 24px", borderRadius: 12, border: "none",
            background: "#2c2418", color: "#faf8f5", fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 4px 16px rgba(44,36,24,0.2)",
            transition: "all 0.2s",
          }}>
            <span style={{ fontSize: 18 }}>+</span> Novo Fluxo
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginTop: 24 }}>
          {[
            { key: "fluxos", label: "Meus Fluxos", count: ACTIVE_FLOWS.length },
            { key: "templates", label: "Templates Jurídicos", count: CATEGORIES.reduce((a, c) => a + c.templates.length, 0) },
            { key: "metricas", label: "Métricas" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "12px 24px", border: "none", background: "none", cursor: "pointer",
              fontSize: 14, fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? "#2c2418" : "#a89880",
              borderBottom: activeTab === tab.key ? "2.5px solid #2c2418" : "2.5px solid transparent",
              fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
            }}>
              {tab.label}
              {tab.count !== undefined && (
                <span style={{
                  marginLeft: 8, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                  background: activeTab === tab.key ? "#2c2418" : "#e8e2d8",
                  color: activeTab === tab.key ? "#faf8f5" : "#8a7e6e",
                }}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content ──────────────────────────── */}
      <div style={{ padding: "28px 40px 60px" }}>

        {/* ═══ FLUXOS TAB ═══ */}
        {activeTab === "fluxos" && (
          <>
            {/* Metrics Strip */}
            <div style={{ display: "flex", gap: 16, marginBottom: 28, overflowX: "auto", paddingBottom: 4 }}>
              {METRICS.map((m, i) => (
                <div key={i} style={{
                  flex: "1 0 160px", padding: "18px 20px", borderRadius: 14,
                  background: "#fff", border: "1px solid #eae5de",
                }}>
                  <div style={{ fontSize: 11, color: "#a89880", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{m.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: "#2c2418" }}>{m.value}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: m.up ? "#2D6A4F" : "#c0504d" }}>{m.change}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: 20 }}>
              <input placeholder="Buscar fluxos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{
                width: 340, padding: "12px 18px", borderRadius: 12, border: "1px solid #e0dbd2",
                background: "#fff", fontSize: 14, color: "#2c2418", fontFamily: "'DM Sans', sans-serif",
                outline: "none", boxSizing: "border-box",
              }} />
            </div>

            {/* Flow List */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
              {filteredFlows.map(flow => {
                const cat = CATEGORIES.find(c => c.id === flow.category);
                return (
                  <div key={flow.id} onClick={() => { setSelectedTemplate({ name: flow.name, desc: "Editar fluxo existente" }); setView("builder"); }} style={{
                    padding: 24, borderRadius: 16, background: "#fff", border: "1px solid #eae5de",
                    cursor: "pointer", transition: "all 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)"; e.currentTarget.style.transform = "none"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 22 }}>{cat?.icon || "⚙️"}</span>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#2c2418" }}>{flow.name}</div>
                          <div style={{ fontSize: 12, color: "#a89880", marginTop: 2 }}>{cat?.label}</div>
                        </div>
                      </div>
                      <div style={{
                        padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: flow.status === "active" ? "#2D6A4F15" : flow.status === "paused" ? "#8B691415" : "#eae5de",
                        color: flow.status === "active" ? "#2D6A4F" : flow.status === "paused" ? "#8B6914" : "#8a7e6e",
                      }}>
                        {flow.status === "active" ? "● Ativo" : flow.status === "paused" ? "◌ Pausado" : "Rascunho"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 24, marginTop: 18 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#a89880", fontWeight: 600 }}>Execuções</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#2c2418", marginTop: 4 }}>{flow.executions}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#a89880", fontWeight: 600 }}>Sucesso</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#2D6A4F", marginTop: 4 }}>{flow.success}%</div>
                      </div>
                      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                        <MiniFlowPreview nodes={SAMPLE_FLOW} edges={SAMPLE_EDGES} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ═══ TEMPLATES TAB ═══ */}
        {activeTab === "templates" && (
          <>
            {/* Category Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 32 }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)} style={{
                  padding: "18px 20px", borderRadius: 14, border: `1.5px solid ${selectedCategory === cat.id ? cat.color + "50" : "#eae5de"}`,
                  background: selectedCategory === cat.id ? cat.color + "08" : "#fff",
                  cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                  boxShadow: selectedCategory === cat.id ? `0 4px 20px ${cat.color}15` : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>{cat.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#2c2418", fontFamily: "'DM Sans', sans-serif" }}>{cat.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#8a7e6e", fontFamily: "'DM Sans', sans-serif" }}>{cat.desc}</div>
                  <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: cat.color, fontFamily: "'DM Sans', sans-serif" }}>{cat.templates.length} templates</div>
                </button>
              ))}
            </div>

            {/* Templates Grid */}
            {(selectedCategory ? CATEGORIES.filter(c => c.id === selectedCategory) : CATEGORIES).map(cat => (
              <div key={cat.id} style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 20 }}>{cat.icon}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#2c2418" }}>{cat.label}</span>
                  <div style={{ flex: 1, height: 1, background: "#eae5de", marginLeft: 12 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                  {cat.templates.map(t => (
                    <TemplateCard key={t.id} template={t} catColor={cat.color} onUse={() => { setSelectedTemplate(t); setView("builder"); }} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ═══ METRICAS TAB ═══ */}
        {activeTab === "metricas" && (
          <div style={{ maxWidth: 900 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
              {/* Top Automações */}
              <div style={{ padding: 28, borderRadius: 16, background: "#fff", border: "1px solid #eae5de" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#2c2418", marginBottom: 20 }}>Top Automações por Execução</div>
                {[
                  { name: "Atualização Processual", val: 312, pct: 100 },
                  { name: "Triagem WhatsApp", val: 234, pct: 75 },
                  { name: "Recepção Fora do Horário", val: 156, pct: 50 },
                  { name: "Cobrança de Honorários", val: 87, pct: 28 },
                  { name: "NDA Automático", val: 45, pct: 14 },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: "#5a5044" }}>{item.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#2c2418" }}>{item.val}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "#f3efe8", overflow: "hidden" }}>
                      <div style={{ width: `${item.pct}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #2D6A4F, #4a9a6f)", transition: "width 1s ease" }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Canais */}
              <div style={{ padding: 28, borderRadius: 16, background: "#fff", border: "1px solid #eae5de" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#2c2418", marginBottom: 20 }}>Distribuição por Canal</div>
                {[
                  { name: "WhatsApp", pct: 62, color: "#2D6A4F" },
                  { name: "E-mail", pct: 24, color: "#1B4965" },
                  { name: "Portal/Site", pct: 10, color: "#4A3F6B" },
                  { name: "SMS", pct: 4, color: "#8B6914" },
                ].map((ch, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 46, textAlign: "right", fontSize: 20, fontWeight: 800, color: ch.color }}>{ch.pct}%</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#2c2418", marginBottom: 4 }}>{ch.name}</div>
                      <div style={{ height: 8, borderRadius: 4, background: "#f3efe8", overflow: "hidden" }}>
                        <div style={{ width: `${ch.pct}%`, height: "100%", borderRadius: 4, background: ch.color, opacity: 0.7 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumo de Performance */}
            <div style={{ padding: 28, borderRadius: 16, background: "#fff", border: "1px solid #eae5de" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#2c2418", marginBottom: 20 }}>Resumo de Performance Semanal</div>
              <div style={{ display: "flex", gap: 0 }}>
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day, i) => {
                  const vals = [45, 62, 58, 71, 84, 23, 12];
                  return (
                    <div key={day} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ position: "relative", height: 140, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 4 }}>
                        <div style={{
                          width: 28, borderRadius: "6px 6px 0 0",
                          height: `${(vals[i] / 84) * 120}px`,
                          background: i < 5 ? "linear-gradient(180deg, #2D6A4F, #2D6A4F88)" : "#e8e2d8",
                          transition: "height 0.6s ease",
                        }} />
                        <div style={{ position: "absolute", top: `${140 - (vals[i] / 84) * 120 - 20}px`, fontSize: 11, fontWeight: 700, color: "#5a5044" }}>{vals[i]}</div>
                      </div>
                      <div style={{ fontSize: 11, color: "#a89880", fontWeight: 600, marginTop: 6 }}>{day}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
