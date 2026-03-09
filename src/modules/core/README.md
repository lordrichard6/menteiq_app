# Core Modules

Core modules are always enabled for all tenants. They provide the base functionality of MenteIQ.

## Modules

### contacts/
Contact management with pipeline stages, tags, and notes.

**Features:**
- CRUD operations
- Pipeline classification (Lead → Opportunity → Client → Churned)
- Tags and notes
- Search and filter
- Company lookup (Zefix CH)

### projects/
Project management linked to clients.

**Features:**
- CRUD operations
- Client linking
- Status tracking
- Deadline management

### invoicing/
Invoice generation with Swiss QR-Bill and EU IBAN support.

**Features:**
- Swiss QR-Bill generation
- EU IBAN invoices
- PDF export
- Stripe payment tracking

### ai-chat/
Multi-model AI chat with streaming responses.

**Features:**
- Model selection (GPT-4o, Claude 3.5, Gemini Pro)
- Streaming responses
- Conversation history
- Context attachment (contacts, projects)
- Token metering

### rag/
Document embedding and retrieval for AI-powered queries.

**Features:**
- Document upload (PDF, TXT, MD)
- Automatic chunking and embedding
- Vector search (pgvector)
- Source citations
- Visibility scopes (internal/shared)

### tasks/
Task management with priorities and due dates.

**Features:**
- CRUD operations
- Contact/project linking
- Priority levels
- Due dates
- List view
