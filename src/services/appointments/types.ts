import { z } from "zod";
import type {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  AppointmentReminder,
  ReminderType,
  ReminderStatus,
  LeadStatus,
  LeadSource,
  QualificationCategory,
  PropertyType,
  UserRole,
} from "@/types/database";

// ─── Centralized Appointment Constants ───────────────────────────────────────

/**
 * Application timezone for all slot generation, calendar grids & display.
 * Stored timestamps use timestamptz (UTC internally); this is for business logic.
 */
export const APPLICATION_TIMEZONE = "America/Chicago";

/** Default appointment duration in minutes. */
export const DEFAULT_DURATION = 30;

/** Allowed durations (must match database CHECK constraint). */
export const ALLOWED_DURATIONS = [15, 30, 45, 60] as const;

/** Working hours in APPLICATION_TIMEZONE (24h format). */
export const WORKING_HOURS = { start: 9, end: 17 } as const;

/** Working days: 1=Monday .. 5=Friday (ISO weekday). */
export const WORKING_DAYS = [1, 2, 3, 4, 5] as const;

// ─── Status Model & Transitions ──────────────────────────────────────────────

export const APPOINTMENT_STATUSES: {
  status: AppointmentStatus;
  label: string;
}[] = [
  { status: "scheduled", label: "Scheduled" },
  { status: "confirmed", label: "Confirmed" },
  { status: "completed", label: "Completed" },
  { status: "cancelled", label: "Cancelled" },
  { status: "no_show", label: "No Show" },
];

export const VALID_APPOINTMENT_STATUSES = new Set<string>(
  APPOINTMENT_STATUSES.map((s) => s.status),
);

/**
 * Canonical status transition map for Phase 5B / 5C.
 * Supported lifecycle transitions:
 * scheduled -> confirmed | cancelled
 * confirmed -> completed | no_show | cancelled
 * Terminal: completed, cancelled, no_show
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  scheduled: ["confirmed", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

/** Statuses eligible for rescheduling. */
export const RESCHEDULE_ALLOWED_STATUSES = new Set<AppointmentStatus>([
  "scheduled",
  "confirmed",
]);

/** Statuses eligible for cancellation. */
export const CANCEL_ALLOWED_STATUSES = new Set<AppointmentStatus>([
  "scheduled",
  "confirmed",
]);

// ─── Type Model ──────────────────────────────────────────────────────────────

export const APPOINTMENT_TYPES: {
  type: AppointmentType;
  label: string;
}[] = [
  { type: "property_viewing", label: "Property Viewing" },
  { type: "consultation", label: "Consultation" },
  { type: "call", label: "Phone Call" },
  { type: "video_call", label: "Video Call" },
];

export const VALID_APPOINTMENT_TYPES = new Set<string>(
  APPOINTMENT_TYPES.map((t) => t.type),
);

// ─── View & Sort Options ─────────────────────────────────────────────────────

export type AppointmentViewMode = "day" | "week" | "list";

export const APPOINTMENT_SORT_OPTIONS = [
  { value: "soonest", label: "Soonest First" },
  { value: "latest", label: "Latest First" },
  { value: "newest", label: "Recently Created" },
] as const;

export type AppointmentSortOption =
  (typeof APPOINTMENT_SORT_OPTIONS)[number]["value"];

// ─── Extended Appointment Model with Joined Details ──────────────────────────

export interface AppointmentWithDetails extends Appointment {
  lead: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    status: LeadStatus;
    lead_score: number | null;
    qualification_category: QualificationCategory | null;
    source: LeadSource;
    city: string | null;
    property_type: PropertyType | null;
    budget_min: number | null;
    budget_max: number | null;
    property_id: string | null;
  } | null;
  agent: {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
  } | null;
  property?: {
    id: string;
    title: string;
    city: string;
    price: number;
  } | null;
}

// ─── Zod Validation Schemas ──────────────────────────────────────────────────

export const bookAppointmentSchema = z.object({
  leadId: z.string().uuid("Invalid Lead ID format."),
  scheduledAt: z.string().min(1, "Scheduled time is required."),
  type: z.enum(
    ["property_viewing", "consultation", "call", "video_call"],
    { message: "Invalid appointment type." },
  ),
  duration: z
    .number()
    .int()
    .refine(
      (v) => (ALLOWED_DURATIONS as readonly number[]).includes(v),
      { message: `Duration must be one of: ${ALLOWED_DURATIONS.join(", ")} minutes.` },
    )
    .optional()
    .default(DEFAULT_DURATION),
  notes: z.string().max(500).optional(),
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(
    ["scheduled", "confirmed", "completed", "cancelled", "no_show"],
    { message: "Invalid appointment status." },
  ),
});

export type UpdateAppointmentStatusInput = z.infer<
  typeof updateAppointmentStatusSchema
>;

export const rescheduleAppointmentSchema = z.object({
  scheduledAt: z.string().min(1, "Target scheduled time is required."),
});

export type RescheduleAppointmentInput = z.infer<
  typeof rescheduleAppointmentSchema
>;

export const cancelAppointmentSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CancelAppointmentInput = z.infer<
  typeof cancelAppointmentSchema
>;

export const calendarAppointmentsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z
    .enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"])
    .optional(),
  agentId: z.string().uuid().optional(),
  sort: z.enum(["soonest", "latest", "newest"]).optional().default("soonest"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CalendarAppointmentsQueryParams = {
  from?: string;
  to?: string;
  status?: AppointmentStatus;
  agentId?: string;
  sort?: AppointmentSortOption;
  page?: number;
  pageSize?: number;
};

export interface AvailableSlot {
  time: string; // Display time e.g. "09:00 AM"
  datetime: string; // ISO 8601 timestamp for booking
}

export interface CalendarAppointmentsResult {
  appointments: AppointmentWithDetails[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type { AppointmentReminder, ReminderType, ReminderStatus };
