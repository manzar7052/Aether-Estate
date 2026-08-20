export type UserRole = "admin" | "agent";

export type PropertyType =
  | "house"
  | "apartment"
  | "condo"
  | "townhouse"
  | "land"
  | "commercial";

export type PropertyStatus =
  | "draft"
  | "available"
  | "pending"
  | "sold"
  | "off_market";

export type LeadSource =
  | "website"
  | "property_page"
  | "chatbot"
  | "referral"
  | "manual"
  | "other";

export type LeadStatus =
  | "new"
  | "qualifying"
  | "qualified"
  | "nurturing"
  | "appointment_set"
  | "closed"
  | "lost";

export type LeadIntent = "buy" | "rent" | "sell" | "unknown";

export type MessageRole = "user" | "assistant" | "system" | "agent";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type AppointmentType =
  | "property_viewing"
  | "consultation"
  | "call"
  | "video_call";

export type EmailEventType =
  | "welcome"
  | "follow_up"
  | "appointment_reminder"
  | "nurture";

export type EmailEventStatus = "queued" | "sent" | "failed" | "opened" | "clicked";

export type CommunicationChannel = "email" | "whatsapp";
export type CommunicationRecipientType = "customer" | "agent";
export type CommunicationStatus = "pending" | "sent" | "skipped" | "failed";

export type Profile = {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  whatsapp_notifications_enabled?: boolean;
  created_at: string;
  updated_at: string;
};

export type Property = {
  id: string;
  title: string;
  description: string | null;
  property_type: PropertyType;
  status: PropertyStatus;
  price: number;
  city: string;
  state: string;
  address: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  image_url: string | null;
  images: string[];
  features: string[];
  created_at: string;
  updated_at: string;
};

export type QualificationCategory = "hot" | "warm" | "cold";

export interface QualificationBreakdown {
  budget: number;
  timeline: number;
  engagement: number;
  propertyFit: number;
}

export interface AIExtractedBudget {
  min?: number | null;
  max?: number | null;
  currency?: string | null;
  confidence: number;
  evidence: string[];
}

export interface AIExtractedTimeline {
  value?:
    | "immediate"
    | "within_30_days"
    | "1_3_months"
    | "3_6_months"
    | "6_plus_months"
    | "unknown"
    | null;
  confidence: number;
  evidence: string[];
}

export interface AIExtractedPropertyFit {
  location?: string | null;
  propertyType?: PropertyType | null;
  bedrooms?: number | null;
  confidence: number;
  evidence: string[];
}

export interface AIExtractedIntent {
  level: "low" | "medium" | "high";
  confidence: number;
  evidence: string[];
}

export interface AIQualificationSignals {
  budget?: AIExtractedBudget | null;
  timeline?: AIExtractedTimeline | null;
  propertyFit?: AIExtractedPropertyFit | null;
  intent?: AIExtractedIntent | null;
  missingInformation: string[];
}

export type Lead = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  source: LeadSource;
  status: LeadStatus;
  intent: LeadIntent;
  city: string | null;
  property_type: PropertyType | null;
  budget_min: number | null;
  budget_max: number | null;
  bedrooms: number | null;
  timeline: string | null;
  lead_score: number | null;
  qualification_category: QualificationCategory | null;
  qualification_breakdown: QualificationBreakdown | null;
  qualification_reasons: string[];
  qualified_at: string | null;
  assigned_agent_id: string | null;
  property_id: string | null;
  message: string | null;
  ai_qualification_signals?: AIQualificationSignals | null;
  ai_qualification_model?: string | null;
  ai_qualification_updated_at?: string | null;
  whatsapp_opt_in?: boolean;
  whatsapp_opt_in_at?: string | null;
  whatsapp_opt_out_at?: string | null;
  email_transactional_opt_in?: boolean;
  email_preferences_updated_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadConversation = {
  id: string;
  lead_id: string | null;
  access_token: string;
  lead_capture_confirmed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type LeadMessage = {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
};

export type Appointment = {
  id: string;
  lead_id: string;
  agent_id: string;
  scheduled_at: string;
  duration_minutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ReminderType = "reminder_24h" | "reminder_1h";
export type ReminderStatus =
  | "pending"
  | "processing"
  | "sent"
  | "skipped"
  | "failed";

export type AppointmentReminder = {
  id: string;
  appointment_id: string;
  reminder_type: ReminderType;
  scheduled_for: string;
  status: ReminderStatus;
  attempts: number;
  processed_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailEvent = {
  id: string;
  lead_id: string;
  event_type: EmailEventType;
  status: EmailEventStatus;
  recipient: string;
  sent_at: string | null;
  created_at: string;
};

export type CommunicationLog = {
  id: string;
  lead_id: string;
  appointment_id: string | null;
  channel: CommunicationChannel;
  event_type: string;
  recipient_type: CommunicationRecipientType;
  recipient: string;
  status: CommunicationStatus;
  template: string | null;
  provider_message_id: string | null;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        Profile,
        Partial<Profile> &
          Pick<Profile, "auth_user_id" | "full_name" | "email">,
        Partial<Profile>
      >;
      properties: Table<
        Property,
        Partial<Property> & Pick<Property, "title">,
        Partial<Property>
      >;
      leads: Table<
        Lead,
        Partial<Lead> & Pick<Lead, "full_name" | "email">,
        Partial<Lead>
      >;
      lead_conversations: Table<
        LeadConversation,
        Partial<LeadConversation>,
        Partial<LeadConversation>
      >;
      lead_messages: Table<
        LeadMessage,
        Partial<LeadMessage> & Pick<LeadMessage, "conversation_id" | "role" | "content">,
        Partial<LeadMessage>
      >;
      appointments: Table<
        Appointment,
        Partial<Appointment> &
          Pick<Appointment, "lead_id" | "agent_id" | "scheduled_at">,
        Partial<Appointment>
      >;
      appointment_reminders: Table<
        AppointmentReminder,
        Partial<AppointmentReminder> &
          Pick<AppointmentReminder, "appointment_id" | "reminder_type" | "scheduled_for">,
        Partial<AppointmentReminder>
      >;
      email_events: Table<
        EmailEvent,
        Partial<EmailEvent> &
          Pick<EmailEvent, "lead_id" | "event_type" | "status" | "recipient">,
        Partial<EmailEvent>
      >;
      communication_logs: Table<
        CommunicationLog,
        Partial<CommunicationLog> &
          Pick<CommunicationLog, "lead_id" | "channel" | "event_type" | "recipient_type" | "recipient">,
        Partial<CommunicationLog>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      property_type: PropertyType;
      property_status: PropertyStatus;
      lead_source: LeadSource;
      lead_status: LeadStatus;
      lead_intent: LeadIntent;
      message_role: MessageRole;
      appointment_status: AppointmentStatus;
      appointment_type: AppointmentType;
      email_event_type: EmailEventType;
      email_event_status: EmailEventStatus;
      communication_channel: CommunicationChannel;
      communication_recipient_type: CommunicationRecipientType;
      communication_status: CommunicationStatus;
    };
  };
};
