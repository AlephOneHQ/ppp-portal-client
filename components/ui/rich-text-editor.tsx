"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Typography from "@tiptap/extension-typography"
import { Toolbar } from "@/components/ui/toolbar"
import { cn } from "@/lib/utils"
import { useEffect } from "react"

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    disabled?: boolean
    minHeight?: string
}

export function RichTextEditor({
    value,
    onChange,
    placeholder = "Enter your text here...",
    className,
    disabled = false,
    minHeight = "120px",
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                bulletList: {
                    HTMLAttributes: {
                        class: "list-disc pl-4",
                    },
                },
                orderedList: {
                    HTMLAttributes: {
                        class: "list-decimal pl-4",
                    },
                },
            }),
            Typography,
        ],
        content: value,
        editable: !disabled,
        editorProps: {
            attributes: {
                class: cn(
                    "prose prose-sm dark:prose-invert focus:outline-none max-w-full",
                    "min-h-[120px] p-3"
                ),
                placeholder: placeholder,
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        immediatelyRender: false,
    })

    // Update editor content when value changes externally
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            // Use an options object or remove the second argument
            editor.commands.setContent(value, {
                emitUpdate: false // Prevents infinite update loops
            })
        }
    }, [value, editor])

    // Handle disabled state
    useEffect(() => {
        if (editor) {
            editor.setEditable(!disabled)
        }
    }, [editor, disabled])

    if (!editor) {
        return null
    }

    return (
        <div className={cn("rounded-lg border bg-background", className)}>
            {!disabled && <Toolbar editor={editor} />}
            <div className={cn("border-t", disabled && "cursor-not-allowed opacity-50")}>
                <EditorContent
                    editor={editor}
                    className={cn("min-h-[120px] overflow-y-auto", disabled && "cursor-not-allowed")}
                    style={{ minHeight }}
                />
            </div>
        </div>
    )
}