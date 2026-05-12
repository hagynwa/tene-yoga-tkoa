// Supabase Edge Function — sends two emails on enrollment:
//   1. Admin notification to itael8@gmail.com (or ADMIN_EMAIL)
//   2. Confirmation to the registrant (only if they supplied an email)

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

function adminHtml(p: Record<string, string>) {
  return `
    <div dir="rtl" lang="he" style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #FBF6E9; padding: 28px; border-radius: 14px; color: #3D2E1F;">
      <h2 style="color: #C44425; margin: 0 0 4px 0; font-size: 22px;">הרשמה חדשה ${p.trial_badge}</h2>
      <div style="color: #8B6F47; font-size: 13px; margin-bottom: 18px;">טנא יוגה משמחת · אתר ההרשמה</div>
      <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 10px; overflow: hidden;">
        <tr>
          <td style="padding: 12px 14px; font-weight: 700; color: #6B4E2E; width: 110px;">שם</td>
          <td style="padding: 12px 14px;">${p.name}</td>
        </tr>
        <tr style="background: #FAF3E3;">
          <td style="padding: 12px 14px; font-weight: 700; color: #6B4E2E;">טלפון</td>
          <td style="padding: 12px 14px; direction: ltr; text-align: right;"><a href="tel:${p.phone}" style="color: #C44425; text-decoration: none;">${p.phone}</a></td>
        </tr>
        <tr>
          <td style="padding: 12px 14px; font-weight: 700; color: #6B4E2E;">אימייל</td>
          <td style="padding: 12px 14px; direction: ltr; text-align: right;">${p.email !== "—" ? `<a href="mailto:${p.email}" style="color: #C44425; text-decoration: none;">${p.email}</a>` : "—"}</td>
        </tr>
        <tr style="background: #FAF3E3;">
          <td style="padding: 12px 14px; font-weight: 700; color: #6B4E2E;">שיעור</td>
          <td style="padding: 12px 14px;">${p.class_info}</td>
        </tr>
        <tr>
          <td style="padding: 12px 14px; font-weight: 700; color: #6B4E2E;">סוג רישום</td>
          <td style="padding: 12px 14px;">${p.is_trial === "true" ? "שיעור ניסיון" : "רגיל"}</td>
        </tr>
        <tr style="background: #FAF3E3;">
          <td style="padding: 12px 14px; font-weight: 700; color: #6B4E2E; vertical-align: top;">הערות</td>
          <td style="padding: 12px 14px; white-space: pre-wrap;">${p.notes}</td>
        </tr>
      </table>
      <p style="color: #8B6F47; font-size: 12px; margin-top: 20px; text-align: center;">
        לצפייה בכל ההרשמות: <a href="https://tene-yoga-tkoa.r-hag.ai/admin.html" style="color: #6E7D45;">פאנל ניהול</a>
      </p>
    </div>
  `;
}

function registrantHtml(p: Record<string, string>) {
  return `
    <div dir="rtl" lang="he" style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #FBF6E9; padding: 32px 28px; border-radius: 14px; color: #3D2E1F;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #3D2E1F; margin: 0 0 6px 0; font-size: 26px; font-weight: 700;">תודה ${p.name}! 🌿</h2>
        <div style="color: #6B4E2E; font-size: 15px;">קיבלנו את ההרשמה שלך לטנא - יוגה משמחת</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(107,78,46,0.08);">
        <tr>
          <td colspan="2" style="padding: 16px 18px; background: linear-gradient(135deg, #F6EAD0, #FAF3E3); font-weight: 700; font-size: 17px; color: #5A4327; text-align: center;">
            ${p.class_info}${p.is_trial === "true" ? " · שיעור ניסיון 💚" : ""}
          </td>
        </tr>
        ${p.location ? `
        <tr>
          <td style="padding: 12px 14px; font-weight: 700; color: #6B4E2E; width: 120px;">מיקום</td>
          <td style="padding: 12px 14px;">${p.location}</td>
        </tr>
        ` : ""}
      </table>

      <p style="margin: 24px 0 8px; color: #3D2E1F; line-height: 1.7; font-size: 15px;">
        אשמח לראותך בשיעור. אם יש שאלות או רוצה לוודא משהו לפני, ניתן לפנות אלי ישירות בוואטסאפ:
      </p>
      <p style="text-align: center; margin: 16px 0;">
        <a href="https://wa.me/972528990312" style="display: inline-block; background: linear-gradient(180deg, #25D366, #128C7E); color: white; text-decoration: none; padding: 10px 24px; border-radius: 999px; font-weight: 600; font-size: 14px;">פתיחת שיחת וואטסאפ</a>
      </p>

      <p style="color: #8B6F47; font-size: 13px; margin-top: 28px; text-align: center; line-height: 1.6;">
        — איתהאל<br/>
        טנא - יוגה משמחת
      </p>
    </div>
  `;
}

async function sendEmail(payload: Record<string, unknown>) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
    return { ok: false, err };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")    return json({ error: "method not allowed" }, 405);
  if (!RESEND_API_KEY)          return json({ error: "RESEND_API_KEY not set" }, 500);

  let body: Record<string, string | boolean | null | undefined>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const { name, phone, email, notes, class_info, location, is_trial } = body;
  if (!name || !phone) return json({ error: "name and phone required" }, 400);

  const params = {
    name:       esc(name),
    phone:      esc(phone),
    email:      email ? esc(email) : "—",
    notes:      notes ? esc(notes) : "—",
    class_info: esc(class_info || "—"),
    location:   esc(location || ""),
    is_trial:   String(!!is_trial),
    trial_badge: is_trial ? `<span style="display:inline-block;background:rgba(217,194,133,0.4);color:#8E6E2D;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;margin-right:6px;">שיעור ניסיון</span>` : "",
  };

  // 1) Admin email
  const adminRes = await sendEmail({
    from:     FROM_EMAIL,
    to:       [ADMIN_EMAIL],
    reply_to: email || undefined,
    subject:  `הרשמה חדשה: ${name}${is_trial ? " (ניסיון)" : ""}`,
    html:     adminHtml(params),
  });
  if (!adminRes.ok) return json({ error: "admin email failed", details: adminRes.err }, 502);

  // 2) Registrant confirmation email (only if email provided)
  if (email && typeof email === "string" && email.includes("@")) {
    const regRes = await sendEmail({
      from:    FROM_EMAIL,
      to:      [email],
      subject: `אישור הרשמה · טנא - יוגה משמחת`,
      html:    registrantHtml(params),
    });
    if (!regRes.ok) {
      // Don't fail the request if confirmation email fails — admin email already sent
      console.warn("Registrant confirmation failed:", regRes.err);
    }
  }

  return json({ ok: true });
});
