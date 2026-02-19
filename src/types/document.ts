// Document types for MenteIQ

export type DocVisibility = 'internal' | 'shared'
export type EmbeddingStatus = 'pending' | 'processing' | 'complete' | 'error'

export interface ProjectDocument {
    id: string
    name: string
    filePath: string
    fileType?: string
    sizeBytes?: number
    visibility: DocVisibility
    embeddingStatus: EmbeddingStatus
    contentSummary?: string
    projectId?: string
    contactId?: string
    createdAt: Date
    updatedAt: Date
}

export interface CreateDocumentInput {
    name: string
    projectId?: string
    contactId?: string
    visibility?: DocVisibility
}
