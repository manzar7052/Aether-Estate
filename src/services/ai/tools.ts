import { z } from "zod";
import { type FunctionDeclaration, Type } from "@google/genai";
import { searchProperties } from "@/services/properties";
import { captureLeadFromChat } from "@/services/leads/capture-lead";
import { AppError } from "@/lib/utils/errors";
import type { CompactProperty } from "./types";
import type { PropertyType, PropertyStatus } from "@/types/database";

/**
 * Property search tool declaration for Google Gen AI SDK (@google/genai).
 */
export const SEARCH_PROPERTIES_DECLARATION: FunctionDeclaration = {
  name: "searchProperties",
  description:
    "Searches the real-time Aether Estates luxury property database based on location, budget, bedrooms, property type, and listing status. Use this tool whenever the user asks for specific listings, prices, or homes matching criteria in a particular city or neighborhood.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: {
        type: Type.STRING,
        description:
          "City, neighborhood, or keywords (e.g. 'Austin', 'Miami', 'Denver', 'Seattle', 'Dallas', 'San Francisco', 'Barton Hills', 'South Congress').",
      },
      property_type: {
        type: Type.STRING,
        description:
          "Type of residence: 'house', 'apartment', 'condo', 'townhouse', 'land', or 'commercial'.",
        enum: ["house", "apartment", "condo", "townhouse", "land", "commercial"],
      },
      min_price: {
        type: Type.NUMBER,
        description: "Minimum price in USD (e.g. 500000).",
      },
      max_price: {
        type: Type.NUMBER,
        description: "Maximum price in USD (e.g. 1500000).",
      },
      bedrooms: {
        type: Type.INTEGER,
        description: "Minimum number of bedrooms (e.g. 1, 2, 3, 4, 5).",
      },
      status: {
        type: Type.STRING,
        description:
          "Listing status: 'available' (default for active buying searches), 'pending', 'sold', or 'all'.",
        enum: ["available", "pending", "sold", "all"],
      },
    },
  },
};

/**
 * Lead capture tool declaration for Google Gen AI SDK (@google/genai).
 */
export const CAPTURE_LEAD_DECLARATION: FunctionDeclaration = {
  name: "captureLeadInformation",
  description:
    "Records prospective client contact information and acquisition preferences into the Aether Estates CRM. Call this tool ONLY after the user has explicitly confirmed they want an advisor to contact them and has provided their name and email.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: "Full name of the prospective client (e.g. 'Eleanor Vance').",
      },
      email: {
        type: Type.STRING,
        description: "Valid email address of the client.",
      },
      phone: {
        type: Type.STRING,
        description: "Phone number of the client.",
      },
      timeline: {
        type: Type.STRING,
        description:
          "Expected acquisition timeline: 'immediate', 'within_30_days', '1_3_months', '3_6_months', '6_plus_months', or 'unknown'.",
        enum: [
          "immediate",
          "within_30_days",
          "1_3_months",
          "3_6_months",
          "6_plus_months",
          "unknown",
        ],
      },
      budget_min: {
        type: Type.NUMBER,
        description: "Minimum budget in USD.",
      },
      budget_max: {
        type: Type.NUMBER,
        description: "Maximum budget in USD.",
      },
      location: {
        type: Type.STRING,
        description: "Target market or city of interest (e.g. 'Austin', 'Miami').",
      },
      property_type: {
        type: Type.STRING,
        description: "Preferred property type: 'house', 'condo', 'townhouse', etc.",
        enum: ["house", "apartment", "condo", "townhouse", "land", "commercial"],
      },
      bedrooms: {
        type: Type.INTEGER,
        description: "Desired number of bedrooms.",
      },
      contact_consent: {
        type: Type.BOOLEAN,
        description: "Explicitly true if the visitor confirmed contact intent.",
      },
    },
    required: ["name", "email", "contact_consent"],
  },
};

/**
 * Server-side Zod validation schema for searchProperties tool arguments.
 */
export const searchPropertiesToolSchema = z
  .object({
    location: z.string().trim().max(100).optional(),
    property_type: z
      .enum(["house", "apartment", "condo", "townhouse", "land", "commercial"])
      .optional(),
    min_price: z.number().min(0).max(100_000_000).optional(),
    max_price: z.number().min(0).max(100_000_000).optional(),
    bedrooms: z.number().int().min(1).max(20).optional(),
    status: z.enum(["available", "pending", "sold", "all"]).optional(),
  })
  .refine(
    (data) => {
      if (data.min_price !== undefined && data.max_price !== undefined) {
        return data.min_price <= data.max_price;
      }
      return true;
    },
    {
      message: "min_price must be less than or equal to max_price",
      path: ["min_price"],
    },
  );

/**
 * Server-side Zod validation schema for captureLeadInformation tool arguments.
 */
export const captureLeadToolSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
    email: z.string().trim().email("Invalid email address format.").max(255),
    phone: z.string().trim().max(50).optional(),
    timeline: z
      .enum([
        "immediate",
        "within_30_days",
        "1_3_months",
        "3_6_months",
        "6_plus_months",
        "unknown",
      ])
      .optional(),
    budget_min: z.number().min(0).max(100_000_000).optional(),
    budget_max: z.number().min(0).max(100_000_000).optional(),
    location: z.string().trim().max(100).optional(),
    property_type: z
      .enum(["house", "apartment", "condo", "townhouse", "land", "commercial"])
      .optional(),
    bedrooms: z.number().int().min(1).max(20).optional(),
    contact_consent: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.budget_min !== undefined && data.budget_max !== undefined) {
        return data.budget_min <= data.budget_max;
      }
      return true;
    },
    {
      message: "budget_min must be less than or equal to budget_max",
      path: ["budget_min"],
    },
  );

export type SearchPropertiesToolArgs = z.infer<
  typeof searchPropertiesToolSchema
>;
export type CaptureLeadToolArgs = z.infer<typeof captureLeadToolSchema>;

export interface ToolExecutionContext {
  conversationId?: string;
  accessToken?: string;
  isConsentConfirmed?: boolean;
}

export interface ToolExecutionResult {
  toolName: string;
  response: Record<string, unknown>;
  compactProperties: CompactProperty[];
}

/**
 * Controlled server-side tool dispatcher.
 * Validates tool name against an allowlist and executes the appropriate service layer.
 */
export async function executeTool(
  name: string,
  rawArgs: Record<string, unknown>,
  context: ToolExecutionContext = {},
): Promise<ToolExecutionResult> {
  // 1. Tool: searchProperties
  if (name === "searchProperties") {
    const validation = searchPropertiesToolSchema.safeParse(rawArgs);

    if (!validation.success) {
      const errorDetails = validation.error.flatten().fieldErrors;
      console.warn(
        `[AI Tool Dispatcher] Invalid arguments for ${name}:`,
        errorDetails,
      );
      throw new AppError(
        "INVALID_TOOL_ARGS",
        `Invalid tool parameters provided for ${name}.`,
        400,
      );
    }

    const args = validation.data;

    try {
      const searchResult = await searchProperties({
        location: args.location,
        property_type: args.property_type as PropertyType,
        min_price: args.min_price,
        max_price: args.max_price,
        bedrooms: args.bedrooms,
        status: (args.status as PropertyStatus) || "available",
        limit: 6,
      });

      const compactProperties: CompactProperty[] = searchResult.properties.map(
        (p) => ({
          id: p.id,
          title: p.title,
          price: Number(p.price),
          city: p.city,
          state: p.state,
          property_type: p.property_type,
          bedrooms: p.bedrooms,
          bathrooms: Number(p.bathrooms),
          area_sqft: p.area_sqft,
          status: p.status,
          image_url: p.image_url || p.images?.[0] || "",
          url: `/properties/${p.id}`,
        }),
      );

      return {
        toolName: name,
        response: {
          total: searchResult.total,
          properties: compactProperties,
          message:
            compactProperties.length > 0
              ? `Found ${searchResult.total} matching properties in the database.`
              : "No properties matched the specified criteria.",
        },
        compactProperties,
      };
    } catch (error) {
      console.error(`[AI Tool Dispatcher] Property service error:`, error);
      throw new AppError(
        "PROPERTY_SERVICE_ERROR",
        "I am having trouble accessing property listings right now. Please try again in a moment.",
        500,
      );
    }
  }

  // 2. Tool: captureLeadInformation
  if (name === "captureLeadInformation") {
    const validation = captureLeadToolSchema.safeParse(rawArgs);

    if (!validation.success) {
      const errorDetails = validation.error.flatten().fieldErrors;
      console.warn(
        `[AI Tool Dispatcher] Invalid arguments for ${name}:`,
        errorDetails,
      );
      throw new AppError(
        "INVALID_LEAD_ARGS",
        `Invalid lead capture parameters provided.`,
        400,
      );
    }

    const args = validation.data;

    if (!context.conversationId || !context.accessToken) {
      throw new AppError(
        "SESSION_REQUIRED",
        "Active verified conversation session required for lead capture.",
        400,
      );
    }

    // Critical Security Check: Independent server-side consent verification
    if (!context.isConsentConfirmed) {
      console.warn(
        `[Security] Rejected model attempt to capture lead without application consent confirmation for conversation ${context.conversationId}`,
      );
      throw new AppError(
        "CONSENT_REQUIRED",
        "Explicit contact confirmation is required before submitting contact details.",
        400,
      );
    }

    try {
      const leadResult = await captureLeadFromChat({
        conversationId: context.conversationId,
        accessToken: context.accessToken,
        name: args.name,
        email: args.email,
        phone: args.phone,
        timeline: args.timeline,
        budget_min: args.budget_min,
        budget_max: args.budget_max,
        location: args.location,
        property_type: args.property_type as PropertyType,
        bedrooms: args.bedrooms,
      });

      return {
        toolName: name,
        response: {
          success: true,
          leadId: leadResult.leadId,
          updated: leadResult.updated,
          message:
            "Lead contact details have been successfully captured and routed to Aether Estates advisors.",
        },
        compactProperties: [],
      };
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      console.error(`[AI Tool Dispatcher] Lead capture error:`, error);
      throw new AppError(
        "LEAD_CAPTURE_ERROR",
        "Failed to record contact details. Please try again.",
        500,
      );
    }
  }

  // Reject unknown tools
  console.warn(`[AI Tool Dispatcher] Rejected unregistered tool: ${name}`);
  throw new AppError(
    "UNKNOWN_TOOL",
    `The requested tool '${name}' is not supported.`,
    400,
  );
}
