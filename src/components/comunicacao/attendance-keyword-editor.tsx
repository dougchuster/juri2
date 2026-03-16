"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
    ATTENDANCE_KEYWORD_MODE_OPTIONS,
    LEGAL_KEYWORD_SUGGESTIONS,
    type AttendanceAutomationKeywordMode,
} from "@/lib/services/attendance-automation-config";
import { evaluateKeywordActivation } from "@/lib/services/attendance-automation-core";

export function AttendanceKeywordEditor({
    keywords,
    keywordMode,
    onChangeKeywords,
    onChangeMode,
}: {
    keywords: string[];
    keywordMode: AttendanceAutomationKeywordMode;
    onChangeKeywords: (keywords: string[]) => void;
    onChangeMode: (mode: AttendanceAutomationKeywordMode) => void;
}) {
    const [draft, setDraft] = useState("");
    const [testInput, setTestInput] = useState("");

    const preview = useMemo(() => {
        if (keywords.length === 0 || testInput.trim().length < 3) return null;
        return evaluateKeywordActivation({
            incomingText: testInput,
            keywords,
            mode: keywordMode,
        });
    }, [keywordMode, keywords, testInput]);

    function pushKeyword(rawValue: string) {
        const keyword = rawValue.trim();
        if (!keyword) return;
        if (keywords.some((item) => item.toLowerCase() === keyword.toLowerCase())) {
            setDraft("");
            return;
        }
        onChangeKeywords([...keywords, keyword]);
        setDraft("");
    }

    function removeKeyword(keyword: string) {
        onChangeKeywords(keywords.filter((item) => item !== keyword));
    }

    return (
        <div className="space-y-4 rounded-[22px] border border-border bg-[var(--surface-soft)] p-4">
            <div>
                <p className="text-sm font-semibold text-text-primary">Ativacao por palavras-chave</p>
                <p className="mt-1 text-xs text-text-muted">
                    Configure termos, frases ou proximidade fuzzy para disparar o fluxo.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {ATTENDANCE_KEYWORD_MODE_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChangeMode(option.value)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                            keywordMode === option.value
                                ? "border-accent/30 bg-accent-subtle text-accent"
                                : "border-border bg-[var(--bg-primary)] text-text-secondary hover:border-border-hover"
                        }`}
                        title={option.description}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <div className="rounded-[18px] border border-border bg-[var(--bg-primary)] p-3">
                <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Keywords do fluxo
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                    {keywords.length === 0 ? (
                        <span className="text-xs text-text-muted">Nenhuma keyword configurada ainda.</span>
                    ) : (
                        keywords.map((keyword) => (
                            <button
                                key={keyword}
                                type="button"
                                onClick={() => removeKeyword(keyword)}
                                className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent-subtle px-2.5 py-1 text-xs font-semibold text-accent"
                            >
                                {keyword}
                                <X size={12} />
                            </button>
                        ))
                    )}
                </div>

                <div className="mt-3 flex gap-2">
                    <input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === ",") {
                                event.preventDefault();
                                pushKeyword(draft);
                            }
                        }}
                        placeholder="Digite uma keyword e pressione Enter"
                        className="h-10 w-full rounded-[14px] border border-border bg-[var(--surface-soft)] px-3 text-sm text-text-primary outline-none transition focus:border-accent"
                    />
                    <button
                        type="button"
                        onClick={() => pushKeyword(draft)}
                        className="rounded-[14px] border border-border bg-[var(--surface-soft)] px-3 text-sm font-semibold text-text-primary transition hover:border-border-hover"
                    >
                        Adicionar
                    </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    {LEGAL_KEYWORD_SUGGESTIONS.map((keyword) => (
                        <button
                            key={keyword}
                            type="button"
                            onClick={() => pushKeyword(keyword)}
                            className="rounded-full border border-border bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-border-hover"
                        >
                            {keyword}
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-[18px] border border-border bg-[var(--bg-primary)] p-3">
                <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Testar ativacao
                </label>
                <input
                    value={testInput}
                    onChange={(event) => setTestInput(event.target.value)}
                    placeholder="Simule uma mensagem do cliente..."
                    className="mt-2 h-10 w-full rounded-[14px] border border-border bg-[var(--surface-soft)] px-3 text-sm text-text-primary outline-none transition focus:border-accent"
                />
                {preview ? (
                    <div className={`mt-3 rounded-[14px] border px-3 py-2 text-xs ${
                        preview.matched
                            ? "border-success/20 bg-success/10 text-success"
                            : "border-danger/20 bg-danger/10 text-danger"
                    }`}>
                        <p className="font-semibold">
                            {preview.matched ? "Fluxo seria ativado" : "Fluxo nao seria ativado"}
                        </p>
                        <p className="mt-1">
                            Score: {Math.round((preview.score || 0) * 100)}%
                            {preview.matchedKeywords.length > 0
                                ? ` · Match: ${preview.matchedKeywords.join(", ")}`
                                : ""}
                        </p>
                    </div>
                ) : (
                    <p className="mt-3 text-xs text-text-muted">
                        Digite uma mensagem de teste para ver como o matching se comporta.
                    </p>
                )}
            </div>
        </div>
    );
}
