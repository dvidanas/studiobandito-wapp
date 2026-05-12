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
  const res = await fetch(`${BASE}/whatsapp/phone-numbers?page=1&limit=10`, {
    headers: { "X-API-Key": apiKey },
  });
  if (!res.ok) throw new Error(`YCloud ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const items: { phoneNumber: string; displayPhoneNumber?: string; qualityRating?: string; status?: string }[] =
    json?.items ?? [];
  const match = items.find(
    (i) => i.phoneNumber === phone || i.displayPhoneNumber === phone
  );
  if (!match)
    throw new Error(
      `Número ${phone} no encontrado. Disponibles: ${items.map((i) => i.phoneNumber).join(", ")}`
    );
  return {
    display_phone_number: match.displayPhoneNumber ?? match.phoneNumber,
    status: match.qualityRating ?? match.status ?? "unknown",
  };
}
