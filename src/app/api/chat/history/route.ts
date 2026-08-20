import { NextResponse } from "next/server";
import { getVerifiedConversation, getConversationMessages } from "@/services/leads";
import { AppError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    const accessToken = searchParams.get("accessToken");

    if (!conversationId || !accessToken) {
      return NextResponse.json(
        { error: "conversationId and accessToken query parameters are required." },
        { status: 400 },
      );
    }

    const conversation = await getVerifiedConversation(
      conversationId,
      accessToken,
    );

    const messages = await getConversationMessages(conversationId, 30);

    return NextResponse.json(
      {
        conversationId,
        messages,
        isConsentConfirmed: Boolean(conversation.lead_capture_confirmed_at),
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("[GET /api/chat/history] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve conversation history." },
      { status: 500 },
    );
  }
}
