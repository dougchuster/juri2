"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    List,
    ListOrdered,
    Undo,
    Redo,
} from "lucide-react";
import React, { useEffect } from "react";

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

function ToolbarButton({
    active,
    disabled,
    onClick,
    title,
    children,
}: {
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={[
                "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-1.5 transition-colors",
                active ? "bg-bg-secondary text-accent" : "text-text-muted hover:bg-bg-secondary",
                disabled ? "cursor-not-allowed opacity-50" : "",
            ].join(" ")}
            title={title}
        >
            {children}
        </button>
    );
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) {
        return null;
    }

    return (
        <div className="overflow-x-auto rounded-t-lg border-b border-border bg-bg-tertiary">
            <div className="flex min-w-max items-center gap-1 p-2">
                <ToolbarButton
                    active={editor.isActive("bold")}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    title="Negrito"
                >
                    <Bold size={16} />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("italic")}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    title="Italico"
                >
                    <Italic size={16} />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("underline")}
                    disabled={!editor.can().chain().focus().toggleUnderline().run()}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    title="Sublinhado"
                >
                    <UnderlineIcon size={16} />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("strike")}
                    disabled={!editor.can().chain().focus().toggleStrike().run()}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    title="Tachado"
                >
                    <Strikethrough size={16} />
                </ToolbarButton>

                <div className="mx-1 h-4 w-px bg-border" />

                <ToolbarButton
                    active={editor.isActive("bulletList")}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    title="Lista"
                >
                    <List size={16} />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("orderedList")}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    title="Lista numerada"
                >
                    <ListOrdered size={16} />
                </ToolbarButton>

                <div className="mx-1 h-4 w-px bg-border" />

                <ToolbarButton
                    disabled={!editor.can().chain().focus().undo().run()}
                    onClick={() => editor.chain().focus().undo().run()}
                    title="Desfazer"
                >
                    <Undo size={16} />
                </ToolbarButton>
                <ToolbarButton
                    disabled={!editor.can().chain().focus().redo().run()}
                    onClick={() => editor.chain().focus().redo().run()}
                    title="Refazer"
                >
                    <Redo size={16} />
                </ToolbarButton>
            </div>
        </div>
    );
};

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [StarterKit, Underline],
        content: value,
        editorProps: {
            attributes: {
                class:
                    "prose prose-sm sm:prose-base dark:prose-invert max-w-none min-h-[300px] p-4 text-text-primary focus:outline-none",
                "data-placeholder": placeholder ?? "",
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    return (
        <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-bg-primary transition-colors focus-within:border-accent">
            <MenuBar editor={editor} />
            <div className="flex-1 overflow-y-auto bg-bg-primary">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
