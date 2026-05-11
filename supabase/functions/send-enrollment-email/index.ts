// Supabase Edge Function — send enrollment notification email via Resend
// Deploy: supabase functions deploy send-enrollment-email --project-ref xuoxkmwtdascazutoaxs

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL    = Deno.env.get("ADMIN_EMAIL")    ?? "itael8@gmail.com";
const FROM_EMAIL     = Deno.env.get("FROM_EMAIL")     ?? "Tene Yoga <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")    return json({ error: "method not allowed" }, 405);
  if (!RESEND_API_KEY)          return json({ error: "RESEND_API_KEY not set" }, 500);

  let body: Record<string, string | null | undefined>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const { name, phone, email, notes, class_info } = body;
  if (!name || !phone) return json({ error: "name and phone required" }, 400);

  const html = `
    <div dir="rtl" lang="he" style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #FBF6E9; padding: 28px; border-radius: 14px; color: #3D2E1F;">
      <h2 style="color: #C44425; margin: 0 0 4px 0; font-size: 22px;">הרשמה חדשה</h2>
      <div style="color: #8B6F47; font-size: 13px; margin-bottom: 18px;">טנא יוגה משמחת · אתר ההרשמה</div>

      <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 10px; overflow: hidden;">
        <tr>
          <td style="padding: 12px 14px; font-weight: 700; color: #6B4E2E; width: 110px;">שם</td>
          <td style="padding: 12px 14px;">${esc(name)}</td>
        </tr>
        <tr style="background: #FAF3E3;">
          <td style="padding: 12px 14px; font-weight: 700; color: #6B4E2E;">טלפון</td>
          <td style="padding: 12px 14px; direction: ltr; text-align: right;"><a href="tel:${esc(phone)}" style="color: #C44425; text-decoration: none;">${esc(phone)}</a></td>
        </tr>
        <tr>
          <td style="padding: 12px 14px; font-weight: 700; color: #6B4E2E;">אימייל</td>
          <td style="padding: 12px 14px; direction: ltr; text-align: right;">${email ? `<a href="mailto:${esc(email)}" style="color: #C44425; text-decoration: none;">${esc(email)}</a>` : '—'}</td>
        </tr>
        <tr style="background: #FAF3E3;">
          <td style="padding: 12px 14px; font-weight: 700; color: #6B4E2E;">שיעור</td>
          <td style="padding: 12px 14px;">${esc(class_info || '—')}</td>
        </tr>
        <tr>
          <td style="padding: 12px 14px; font-weight: 700; color: #6B4E2E; vertical-align: top;">הערות</td>
          <td style="padding: 12px 14px; white-space: pre-wrap;">${esc(notes || '—')}</td>
        </tr>
      </table>

      <p style="color: #8B6F47; font-size: 12px; margin-top: 20px; text-align: center;">
        ההרשמה נשמרה במערכת. לצפייה בכל ההרשמות: <a href="https://tene-yoga-tkoa.hag.ai/admin.html" style="color: #6E7D45;">פאנל ניהול</a>
      </p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:     FROM_EMAIL,
      to:       [ADMIN_EMAIL],
      reply_to: email || undefined,
      subject:  `הרשמה חדשה: ${name}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
    return json({ error: "email send failed", details: err }, 502);
  }

  return json({ ok: true });
});
