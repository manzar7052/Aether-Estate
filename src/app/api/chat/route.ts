import { NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/validations/chat";
import { generateChatResponse } from "@/services/ai";
import {
  createConversation,
  getVerifiedConversation,
  confirmLeadCapture,
  persistMessage,
} from "@/services/leads";
import { AppError, EnvError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload in request body." },
        { status: 400 },
      );
    }

    const validationResult = chatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          error: "Invalid chat request format.",
          details: fieldErrors,
        },
        { status: 400 },
      );
    }

    const {
      messages,
      conversationId: inputConvId,
      accessToken: inputToken,
      confirmConsent,
    } = validationResult.data;

    let conversationId = inputConvId;
    let accessToken = inputToken;
    let isConsentConfirmed = false;

    // 1. Session Resolution & Verification
    if (conversationId && accessToken) {
      const verified = await getVerifiedConversation(conversationId, accessToken);
      isConsentConfirmed = Boolean(verified.lead_capture_confirmed_at);
    } else {
      // Create new anonymous conversation session
      const newSession = await createConversation();
      conversationId = newSession.id;
      accessToken = newSession.accessToken;
    }

    // 2. Explicit Contact Confirmation Handling
    if (confirmConsent && conversationId && accessToken) {
      await confirmLeadCapture(conversationId, accessToken);
      isConsentConfirmed = true;
    }

    // 3. Persist incoming user message to PostgreSQL
    const latestUserMsg = messages[messages.length - 1];
    if (latestUserMsg && latestUserMsg.role === "user" && conversationId) {
      try {
        await persistMessage(conversationId, "user", latestUserMsg.content);
      } catch (err) {
        console.warn("[POST /api/chat] Failed persisting user message:", err);
      }
    }

    // 4. Generate AI response with tool calling and session context
    const response = await generateChatResponse(messages, {
      toolContext: {
        conversationId,
        accessToken,
        isConsentConfirmed,
      },
    });

    // 5. Persist assistant response to PostgreSQL
    if (response.message.content && conversationId) {
      try {
        await persistMessage(
          conversationId,
          "assistant",
          response.message.content,
        );
      } catch (err) {
        console.warn("[POST /api/chat] Failed persisting assistant message:", err);
      }
    }

    return NextResponse.json(
      {
        message: {
          role: response.message.role,
          content: response.message.content,
          properties: response.properties || response.message.properties,
        },
        conversationId,
        accessToken,
        isConsentConfirmed,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof EnvError) {
      return NextResponse.json(
        {
          error:
            "The AI assistant service is currently unconfigured. Set GEMINI_API_KEY in .env.local to enable conversational AI.",
        },
        { status: 503 },
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Unhandled Chat API error:", error);
    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while communicating with the AI service.",
      },
      { status: 500 },
    );
  }
}
