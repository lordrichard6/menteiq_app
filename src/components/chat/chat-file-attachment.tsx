'use client'

import { FileText, X, Image as ImageIcon } from 'lucide-react'

export interface AttachedFile {
  id: string
  file: File
  url: string        // object URL for local preview (never sent to server)
  mediaType: string
  filename: string
}

interface ChatFileAttachmentProps {
  attachment: AttachedFile
  onRemove: (id: string) => void
}

export function ChatFileAttachment({ attachment, onRemove }: ChatFileAttachmentProps) {
  const isImage = attachment.mediaType.startsWith('image/')
  const isPdf   = attachment.mediaType === 'application/pdf'

  return (
    <div className="relative inline-flex items-center justify-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden group">
      {isImage ? (
        /* Image thumbnail */
        <div className="w-16 h-14 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.url}
            alt={attachment.filename}
            className="max-w-full max-h-full object-cover rounded"
          />
        </div>
      ) : isPdf ? (
        /* PDF icon + filename */
        <div className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 max-w-[80px]">
          <FileText className="h-7 w-7 text-red-500 flex-shrink-0" />
          <span className="text-[10px] text-slate-500 truncate w-full text-center leading-tight">
            {attachment.filename}
          </span>
        </div>
      ) : (
        /* Generic file fallback */
        <div className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 max-w-[80px]">
          <ImageIcon className="h-7 w-7 text-slate-400 flex-shrink-0" />
          <span className="text-[10px] text-slate-500 truncate w-full text-center leading-tight">
            {attachment.filename}
          </span>
        </div>
      )}

      {/* Remove button — visible on hover */}
      <button
        type="button"
        aria-label={`Remove ${attachment.filename}`}
        onClick={() => onRemove(attachment.id)}
        className="absolute top-0.5 right-0.5 rounded-full bg-slate-700/70 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-900"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  )
}
