import { executeTool } from "./tools";
import type { AIResponse, ChatMessage, GenerateOptions, CompactProperty } from "./types";

/**
 * Intelligent high-availability fallback engine.
 * Ensures the Aether Estates Concierge chatbot ALWAYS answers questions,
 * returns rich property cards, and captures leads even if the external Gemini API
 * free-tier quota is reached or network connectivity is degraded.
 */
export async function executeFallbackChat(
  messages: ChatMessage[],
  options?: GenerateOptions,
): Promise<AIResponse> {
  const latestUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const rawText = latestUserMsg?.content?.trim() || "";
  const lowerText = rawText.toLowerCase();

  // 1. Check for Lead Capture / Contact Information in message
  const emailMatch = rawText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const phoneMatch = rawText.match(/(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const nameMatch =
    rawText.match(/(?:my name is|i am|name[:\s]+)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i) ||
    rawText.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);

  if (emailMatch) {
    const email = emailMatch[1];
    const name = nameMatch ? nameMatch[1].trim() : "Prospective Client";
    const phone = phoneMatch ? phoneMatch[0] : undefined;

    try {
      await executeTool(
        "captureLeadInformation",
        {
          name,
          email,
          phone,
          contact_consent: true,
          timeline: "within_30_days",
        },
        options?.toolContext,
      );
    } catch {
      // Ignore tool capture failure in fallback
    }

    return {
      message: {
        role: "assistant",
        content: `Thank you, ${name}! Your contact details (${email}) have been received. A dedicated luxury estate specialist has been assigned and will be in touch shortly to assist with your portfolio requirements.`,
      },
      model: "aether-concierge-v1",
      provider: "aether-concierge",
    };
  }

  // 2. Parse Search Parameters from natural language query
  let location: string | undefined = undefined;
  if (/austin/i.test(lowerText)) location = "Austin";
  else if (/miami/i.test(lowerText)) location = "Miami";
  else if (/denver/i.test(lowerText)) location = "Denver";
  else if (/seattle/i.test(lowerText)) location = "Seattle";
  else if (/dallas/i.test(lowerText)) location = "Dallas";
  else if (/san francisco|sf\b|bay area/i.test(lowerText)) location = "San Francisco";

  let property_type: "house" | "condo" | "apartment" | "townhouse" | undefined = undefined;
  if (/penthouse|condo/i.test(lowerText)) property_type = "condo";
  else if (/loft|apartment/i.test(lowerText)) property_type = "apartment";
  else if (/townhome|townhouse/i.test(lowerText)) property_type = "townhouse";
  else if (/house|villa|estate|chalet|residence|home/i.test(lowerText)) property_type = "house";

  let bedrooms: number | undefined = undefined;
  const bedMatch = lowerText.match(/(\d+)\s*(?:bed|bedroom|bdr|bd)/i);
  if (bedMatch) {
    bedrooms = parseInt(bedMatch[1], 10);
  } else if (/one bed|1-bed/i.test(lowerText)) bedrooms = 1;
  else if (/two bed|2-bed/i.test(lowerText)) bedrooms = 2;
  else if (/three bed|3-bed/i.test(lowerText)) bedrooms = 3;
  else if (/four bed|4-bed/i.test(lowerText)) bedrooms = 4;
  else if (/five bed|5-bed/i.test(lowerText)) bedrooms = 5;

  let max_price: number | undefined = undefined;
  const priceMatchM = lowerText.match(/(?:under|below|max|up to|\$)\s*(\d+(?:\.\d+)?)\s*(?:m|million)/i);
  const priceMatchK = lowerText.match(/(?:under|below|max|up to|\$)\s*(\d+(?:\.\d+)?)\s*(?:k|thousand)/i);
  const priceMatchPlain = lowerText.match(/(?:under|below|max|up to)\s*\$?(\d[\d,]+)/i);

  if (priceMatchM) {
    max_price = parseFloat(priceMatchM[1]) * 1_000_000;
  } else if (priceMatchK) {
    max_price = parseFloat(priceMatchK[1]) * 1_000;
  } else if (priceMatchPlain) {
    max_price = parseFloat(priceMatchPlain[1].replace(/,/g, ""));
  }

  // 3. Execute Property Search
  let collectedProperties: CompactProperty[] = [];

  try {
    const searchRes = await executeTool(
      "searchProperties",
      {
        location,
        property_type,
        bedrooms,
        max_price,
        status: "available",
      },
      options?.toolContext,
    );
    collectedProperties = searchRes.compactProperties;
  } catch (err) {
    console.warn("[Fallback Engine] Search tool execution warning:", err);
  }

  // 4. Generate Natural Contextual Response
  if (collectedProperties.length > 0) {
    const criteriaParts: string[] = [];
    if (bedrooms) criteriaParts.push(`${bedrooms}+ bedroom`);
    if (property_type) criteriaParts.push(property_type);
    if (location) criteriaParts.push(`in ${location}`);
    if (max_price) criteriaParts.push(`under $${(max_price / 1_000_000).toFixed(1)}M`);

    const criteriaText = criteriaParts.length > 0 ? criteriaParts.join(" ") : "our curated portfolio";

    return {
      message: {
        role: "assistant",
        content: `I found ${collectedProperties.length} luxury ${criteriaText} currently available in our portfolio. You can explore the listings below or let me know if you would like to arrange a private walkthrough with an advisor.`,
        properties: collectedProperties,
      },
      model: "aether-concierge-v1",
      provider: "aether-concierge",
      properties: collectedProperties,
    };
  }

  // 5. If no direct match or greeting
  if (/hi\b|hello|hey|good morning|good evening|who are you/i.test(lowerText)) {
    return {
      message: {
        role: "assistant",
        content:
          "Hello! I am the Aether Estates Concierge. I can help you search our live database of luxury residences across Austin, Miami, Denver, Seattle, Dallas, and San Francisco. Let me know what location, property type, or bedroom count you are interested in exploring.",
      },
      model: "aether-concierge-v1",
      provider: "aether-concierge",
    };
  }

  if (/advisor|agent|contact|viewing|tour|showing|call me|schedule/i.test(lowerText)) {
    return {
      message: {
        role: "assistant",
        content:
          "I would be delighted to connect you directly with a dedicated luxury estate specialist for a private showing. Please share your full name and email address, and an advisor will reach out to coordinate your schedule.",
      },
      model: "aether-concierge-v1",
      provider: "aether-concierge",
    };
  }

  // Default helpful search prompt
  const fallbackSearch = await executeTool(
    "searchProperties",
    { status: "available" },
    options?.toolContext,
  ).catch(() => ({ compactProperties: [] }));

  return {
    message: {
      role: "assistant",
      content:
        "We have exceptional luxury estates available across Austin, Miami, Denver, Seattle, Dallas, and San Francisco. Here are a few featured selections from our active catalog. Let me know if you would like to refine by city, bedroom count, or budget!",
      properties: fallbackSearch.compactProperties.slice(0, 3),
    },
    model: "aether-concierge-v1",
    provider: "aether-concierge",
    properties: fallbackSearch.compactProperties.slice(0, 3),
  };
}
