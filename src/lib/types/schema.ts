/**
 * OrbitCRM Database Schema Types
 * 
 * Generated from Supabase schema.
 * Keep in sync with supabase/migrations/*.sql
 */

// =====================================================
// ENUMS
// =====================================================

export type UserRole = 'owner' | 'member';
export type ContactStatus = 'lead' | 'opportunity' | 'client' | 'churned';
export type ProjectStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'archived';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type DocVisibility = 'internal' | 'shared';
export type SubscriptionTier = 'free' | 'pro' | 'business';

// =====================================================
// CORE ENTITIES
// =====================================================

export type Organization = {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  // Subscription & Billing
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  token_balance: number;
  token_pack_balance: number;
  enabled_packs: string[];
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
};

// Alias for backward compatibility
export type Tenant = Organization;

export type Profile = {
  id: string;
  tenant_id: string | null;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  tenant_id: string;
  is_company: boolean;
  company_uid: string | null;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  status: ContactStatus;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  deadline: string | null;
  created_at: string;
  updated_at: string;
};

// =====================================================
// ACTION ENTITIES
// =====================================================

export type InvoiceType = 'swiss_qr' | 'eu_sepa';

export type Invoice = {
  id: string;
  tenant_id: string;
  project_id: string | null;
  contact_id: string | null;
  invoice_number: string;
  currency: string;
  amount_total: number;
  subtotal: number | null;
  tax_total: number | null;
  status: InvoiceStatus;
  invoice_type: InvoiceType;
  invoice_date: string | null;
  due_date: string | null;
  paid_at: string | null;
  qr_reference: string | null;
  iban_used: string | null;
  notes: string | null;
  stripe_payment_link: string | null;
  stripe_payment_id: string | null;
  created_at: string;
};

export type InvoiceLineItem = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number; // Computed
  line_total: number; // Computed
  sort_order: number;
  created_at: string;
};

export type Task = {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  tenant_id: string;
  project_id: string | null;
  contact_id: string | null;
  name: string;
  file_path: string;
  file_type: string | null;
  size_bytes: number | null;
  visibility: DocVisibility;
  embedding_status: 'pending' | 'processing' | 'complete' | 'error';
  content_summary: string | null;
  created_at: string;
};

export type DocumentChunk = {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  embedding: number[] | null; // Vector as array
  created_at: string;
};

export type Booking = {
  id: string;
  tenant_id: string;
  project_id: string | null;
  contact_id: string | null;
  external_event_id: string | null;
  start_time: string;
  end_time: string;
  title: string;
  location: string | null;
  status: string;
  created_at: string;
};

// =====================================================
// AI ENTITIES
// =====================================================

export type AIConversation = {
  id: string;
  tenant_id: string;
  user_id: string;
  contact_id: string | null;
  project_id: string | null;
  title: string | null;
  model: string;
  created_at: string;
  updated_at: string;
};

export type AIMessage = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_in: number;
  tokens_out: number;
  created_at: string;
};

// =====================================================
// USAGE & BILLING
// =====================================================

export type UsageLog = {
  id: string;
  tenant_id: string;
  user_id: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  multiplier: number;
  effective_tokens: number;
  conversation_id: string | null;
  created_at: string;
};

// =====================================================
// INSERT TYPES (for creating new records)
// =====================================================

export type OrganizationInsert = Omit<Organization, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

export type ContactInsert = Omit<Contact, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type InvoiceInsert = Omit<Invoice, 'id' | 'created_at' | 'subtotal' | 'tax_total'> & {
  id?: string;
  created_at?: string;
  subtotal?: number | null;
  tax_total?: number | null;
};

export type InvoiceLineItemInsert = Omit<InvoiceLineItem, 'id' | 'created_at' | 'tax_amount' | 'line_total'> & {
  id?: string;
  created_at?: string;
};

export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type AIConversationInsert = Omit<AIConversation, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type AIMessageInsert = Omit<AIMessage, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type UsageLogInsert = Omit<UsageLog, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// =====================================================
// DATABASE TYPE (Supabase generated equivalent)
// =====================================================

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: OrganizationInsert;
        Update: Partial<OrganizationInsert>;
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
      };
      contacts: {
        Row: Contact;
        Insert: ContactInsert;
        Update: Partial<ContactInsert>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>;
      };
      invoices: {
        Row: Invoice;
        Insert: InvoiceInsert;
        Update: Partial<InvoiceInsert>;
      };
      invoice_line_items: {
        Row: InvoiceLineItem;
        Insert: InvoiceLineItemInsert;
        Update: Partial<InvoiceLineItemInsert>;
      };
      tasks: {
        Row: Task;
        Insert: TaskInsert;
        Update: Partial<TaskInsert>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, 'id' | 'created_at'>;
        Update: Partial<Omit<Document, 'id' | 'created_at'>>;
      };
      document_chunks: {
        Row: DocumentChunk;
        Insert: Omit<DocumentChunk, 'id' | 'created_at'>;
        Update: Partial<Omit<DocumentChunk, 'id' | 'created_at'>>;
      };
      bookings: {
        Row: Booking;
        Insert: Omit<Booking, 'id' | 'created_at'>;
        Update: Partial<Omit<Booking, 'id' | 'created_at'>>;
      };
      ai_conversations: {
        Row: AIConversation;
        Insert: AIConversationInsert;
        Update: Partial<AIConversationInsert>;
      };
      ai_messages: {
        Row: AIMessage;
        Insert: AIMessageInsert;
        Update: Partial<AIMessageInsert>;
      };
      usage_logs: {
        Row: UsageLog;
        Insert: UsageLogInsert;
        Update: Partial<UsageLogInsert>;
      };
    };
    Enums: {
      user_role: UserRole;
      contact_status: ContactStatus;
      project_status: ProjectStatus;
      invoice_status: InvoiceStatus;
      invoice_type: InvoiceType;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      doc_visibility: DocVisibility;
    };
  };
}
