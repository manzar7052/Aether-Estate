import type {
  CommunicationChannel,
  CommunicationRecipientType,
  CommunicationStatus,
  CommunicationLog,
} from "@/types/database";

export interface RecordCommunicationLogInput {
  leadId: string;
  appointmentId?: string | null;
  channel: CommunicationChannel;
  eventType: string;
  recipientType: CommunicationRecipientType;
  recipient: string;
  status: CommunicationStatus;
  template?: string | null;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
  sentAt?: string | null;
}

export interface GetCommunicationLogsOptions {
  page?: number;
  limit?: number;
  channel?: CommunicationChannel | "all";
  status?: CommunicationStatus | "all";
}

export interface PaginatedCommunicationLogs {
  data: CommunicationLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CommunicationPreferences {
  leadId: string;
  email: {
    transactionalOptIn: boolean;
    updatedAt: string | null;
  };
  whatsapp: {
    optIn: boolean;
    optInAt: string | null;
    optOutAt: string | null;
  };
}

export interface UpdateCommunicationPreferencesInput {
  whatsappOptIn?: boolean;
  emailTransactionalOptIn?: boolean;
}
