const BASE = "https://api.ycloud.com/v2";

export async function sendTextMessage(
  phone: string,
  body: string
): Promise<{ wa_message_id: string }> {
  const apiKey = process.env.YCLOUD_API_KEY!;
  const from = process.env.YCLOUD_PHONE_NUMBER!;
  const res = await fetch(`${BASE}/whatsapp/messages`, {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: `+${phone}`,
      type: "text",
      text: { body },
    }),
  });
  if (!res.ok) throw new Error(`YCloud ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const id = json?.id;
  if (!id) throw new Error(`YCloud sin id: ${JSON.stringify(json)}`);
  return { wa_message_id: id };
}

export async function getPhoneNumberInfo(): Promise<{
  display_phone_number: string;
  status: string;
}> {
  const apiKey = process.env.YCLOUD_API_KEY!;
  const phone = process.env.YCLOUD_PHONE_NUMBER!;
  // Usamos /contacts como health-check: cualquier respuesta que no sea 401/403
  // indica que el API key es válido.
  const res = await fetch(`${BASE}/contacts?page=1&limit=1`, {
    headers: { "X-API-Key": apiKey },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(`YCloud ${res.status}: API key inválido. ${await res.text()}`);
  }
  return {
    display_phone_number: phone,
    status: "active",
  };
}
