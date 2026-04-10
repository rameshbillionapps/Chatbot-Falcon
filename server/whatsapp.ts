import { storage } from "./storage";

const GRAPH_API_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

async function getCredentials() {
  const [accessToken, phoneNumberId] = await Promise.all([
    storage.getSetting("meta_access_token"),
    storage.getSetting("meta_phone_number_id"),
  ]);
  if (!accessToken || !phoneNumberId) {
    throw new Error("Meta WhatsApp credentials not configured (meta_access_token, meta_phone_number_id)");
  }
  return { accessToken, phoneNumberId };
}

/**
 * Send a pre-approved template message.
 * Used for the first outbound message to a new lead (required by WhatsApp policy).
 *
 * @param phone   E.164 format without '+', e.g. "919876543210"
 * @param name    Lead's first name — injected as {{1}} in the template body
 */
export async function sendWhatsAppTemplate(phone: string, name: string): Promise<void> {
  const { accessToken, phoneNumberId } = await getCredentials();
  const [templateName, languageCode] = await Promise.all([
    storage.getSetting("meta_welcome_template"),
    storage.getSetting("meta_template_language"),
  ]);

  const payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName || "lead_welcome",
      language: { code: languageCode || "en_US" },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: name || "there" }],
        },
      ],
    },
  };

  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp template send failed: ${err}`);
  }
}

/**
 * Send a free-form text message.
 * Only valid within the 24-hour reply window after the user has messaged first.
 */
export async function sendWhatsAppText(phone: string, text: string): Promise<void> {
  const { accessToken, phoneNumberId } = await getCredentials();

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    type: "text",
    text: { body: text },
  };

  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp text send failed: ${err}`);
  }
}

/**
 * Fetch full lead details from Meta Graph API using the leadgen_id.
 * Returns normalized name + phone extracted from field_data.
 */
export async function fetchMetaLead(
  leadgenId: string,
  accessToken: string,
): Promise<{ name: string; phone: string; formId: string }> {
  const url = `${GRAPH_BASE}/${leadgenId}?fields=id,created_time,field_data,form_id&access_token=${accessToken}`;
  const res = await fetch(url);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch Meta lead ${leadgenId}: ${err}`);
  }

  const data = await res.json() as {
    id: string;
    form_id: string;
    field_data: Array<{ name: string; values: string[] }>;
  };

  let name = "";
  let phone = "";

  for (const field of data.field_data || []) {
    const key = field.name.toLowerCase();
    const value = field.values?.[0] || "";

    if (key === "full_name" || key === "name") {
      name = value;
    } else if (key === "phone_number" || key === "phone" || key === "mobile") {
      // Normalize: strip +, spaces, dashes
      phone = value.replace(/[\s\-\+]/g, "");
    }
  }

  return { name, phone, formId: data.form_id || "" };
}
