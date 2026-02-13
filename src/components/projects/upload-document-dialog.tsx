'use client'

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useDocumentStore } from '@/stores/document-store'
import { DocVisibility } from '@/types/document'
import { Upload, Loader2, FileUp, X } from 'lucide-react'

interface UploadDocumentDialogProps {
    projectId: string
    contactId?: string
    buttonVariant?: "default" | "outline" | "ghost"
    buttonSize?: "sm" | "default" | "lg"
    buttonClassName?: string
}

export function UploadDocumentDialog({
    projectId,
    contactId,
    buttonVariant = "outline",
    buttonSize = "sm",
    buttonClassName
}: UploadDocumentDialogProps) {
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [name, setName] = useState('')
    const [visibility, setVisibility] = useState<DocVisibility>('internal')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const uploadDocument = useDocumentStore((state) => state.uploadDocument)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            if (!name) setName(selectedFile.name)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file || isSubmitting) return

        setIsSubmitting(true)
        try {
            await uploadDocument(file, {
                name: name || file.name,
                projectId,
                contactId,
                visibility,
            })
            setFile(null)
            setName('')
            setVisibility('internal')
            setOpen(false)
        } catch (error) {
            console.error('Failed to upload document:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const clearFile = () => {
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={buttonVariant} size={buttonSize} className={buttonClassName}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-[#3D4A67]">Upload Document</DialogTitle>
                        <DialogDescription>
                            Select a file to upload and link to this project.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="file">File *</Label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${file ? 'border-[#9EAE8E] bg-green-50/30' : 'border-slate-200 hover:border-slate-300'}`}
                                onClick={() => !file && fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    id="file"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    disabled={isSubmitting}
                                />
                                {file ? (
                                    <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileUp className="h-4 w-4 text-[#9EAE8E] shrink-0" />
                                            <span className="text-sm font-medium truncate">{file.name}</span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                clearFile()
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="mx-auto w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                                            <Upload className="h-5 w-5 text-slate-500" />
                                        </div>
                                        <p className="text-sm font-medium text-[#3D4A67]">Click to select a file</p>
                                        <p className="text-xs text-slate-500">PDF, Images, or Documents</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="doc-name">Display Name</Label>
                            <Input
                                id="doc-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Invoice, Brief, etc."
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="visibility">Visibility</Label>
                            <Select
                                value={visibility}
                                onValueChange={(v) => setVisibility(v as DocVisibility)}
                                disabled={isSubmitting}
                            >
                                <SelectTrigger id="visibility">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="internal">Internal Only</SelectItem>
                                    <SelectItem value="shared">Shared with Client</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-[#3D4A67] hover:bg-[#2D3A57] text-white"
                            disabled={!file || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                'Upload'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
