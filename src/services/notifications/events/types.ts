export type NotificationEventType =
  | "appointment.created"
  | "appointment.rescheduled"
  | "appointment.cancelled"
  | "appointment.reminder_24h"
  | "appointment.reminder_1h";

export interface AppointmentCreatedEvent {
  event: "appointment.created";
  appointmentId: string;
  leadId: string;
  agentId: string;
  version?: string;
}

export interface AppointmentRescheduledEvent {
  event: "appointment.rescheduled";
  appointmentId: string;
  leadId: string;
  agentId: string;
  previousScheduledAt?: string;
  version?: string;
}

export interface AppointmentCancelledEvent {
  event: "appointment.cancelled";
  appointmentId: string;
  leadId: string;
  agentId: string;
  reason?: string;
  version?: string;
}

export interface AppointmentReminderEvent {
  event: "appointment.reminder_24h" | "appointment.reminder_1h";
  appointmentId: string;
  leadId: string;
  agentId: string;
  version?: string;
}

export type NotificationEvent =
  | AppointmentCreatedEvent
  | AppointmentRescheduledEvent
  | AppointmentCancelledEvent
  | AppointmentReminderEvent;

export interface NotificationOutcome {
  event: NotificationEventType;
  appointmentId: string;
  customerEmailSent: boolean;
  agentEmailSent: boolean;
  customerSkippedReason?: string;
  agentSkippedReason?: string;
  customerWhatsAppSent: boolean;
  customerWhatsAppSkippedReason?: string;
  agentWhatsAppSent: boolean;
  agentWhatsAppSkippedReason?: string;
  error?: string;
}
