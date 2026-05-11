# Tene Yoga Tkoa — Landing + Admin

Hebrew landing page for טנא יוגה משמחת with backoffice for managing classes and enrollments.

**Live:** https://tene-yoga-tkoa.hag.ai
**Admin:** https://tene-yoga-tkoa.hag.ai/admin.html

## Stack

- Static frontend on GitHub Pages (no build step)
- Tailwind via CDN, GSAP + Lenis for animations
- **Supabase** for database + auth
- **Resend** (via Supabase Edge Function) for email delivery to itael8@gmail.com

## File map

```
├── index.html                                  ← landing page
├── admin.html                                  ← backoffice
├── logo.jpg
├── assets/
│   ├── config.js                               ← Supabase URL + anon key
│   ├── app.js                                  ← landing page logic
│   └── admin.js                                ← admin logic
├── supabase/
│   ├── schema.sql                              ← run in SQL editor (one time)
│   └── functions/send-enrollment-email/
│       └── index.ts                            ← email-sending Edge Function
├── CNAME                                       ← tene-yoga-tkoa.hag.ai
└── .nojekyll
```

## One-time setup

### 1. Supabase database

In your Supabase project (`xuoxkmwtdascazutoaxs`):

1. **SQL Editor → New Query** → paste contents of `supabase/schema.sql` → **Run**
2. **Authentication → Users → Add user → Create new user**:
   - Email: `itael8@gmail.com`
   - Password: `yachadlevav`
   - ✅ Auto Confirm User

### 2. Resend API key

1. Log into https://resend.com
2. **API Keys → Create API Key** → name it `tene-yoga` → permission: **Sending access** → copy the `re_...` key

### 3. Deploy the Edge Function

Run from the project folder (requires Node.js):

```
npx supabase login
npx supabase link --project-ref xuoxkmwtdascazutoaxs
npx supabase secrets set RESEND_API_KEY=re_your_key_here --project-ref xuoxkmwtdascazutoaxs
npx supabase functions deploy send-enrollment-email --project-ref xuoxkmwtdascazutoaxs
```

**Alternative (no CLI):** Supabase Dashboard → **Edge Functions → Deploy a new function** → name `send-enrollment-email` → paste the contents of `supabase/functions/send-enrollment-email/index.ts` → **Deploy**.
Then **Project Settings → Edge Functions → Secrets → New secret** → `RESEND_API_KEY` = your key.

### 4. (Optional) Verify your sending domain in Resend

Without verification, emails are sent from `onboarding@resend.dev` and only deliver to the Resend account owner address — which is fine here since we send to `itael8@gmail.com`.

To send from `hag.ai` or another domain, **Resend → Domains → Add Domain** and follow the DNS instructions.
Then set the FROM_EMAIL secret in Supabase:
```
npx supabase secrets set FROM_EMAIL="Tene Yoga <hello@hag.ai>" --project-ref xuoxkmwtdascazutoaxs
```

## Daily use

### Add / edit a class
Open `/admin.html` → log in (`itael8` / `yachadlevav`) → "+ שיעור חדש".

The landing page automatically shows the next upcoming **active** class.

### View enrollments
Admin → "הרשמות" tab. Filter by class, export to CSV, or delete entries.

### When someone registers
- Stored in Supabase `enrollments` table
- Email arrives at itael8@gmail.com

## DNS (already configured)

| Type  | Host             | Value                 |
|-------|------------------|-----------------------|
| CNAME | `tene-yoga-tkoa` | `hagynwa.github.io`   |

Hosted at Spaceship → Manage `hag.ai` → Advanced DNS.

## Security

- The Supabase `anon` key is meant for client use — Row Level Security restricts it to:
  - Read active classes
  - Insert into enrollments
- Only `itael8@gmail.com` (logged in) can read enrollments or modify classes — enforced server-side by the `is_admin()` RLS check.
- Resend API key lives as a Supabase secret, never exposed to the browser.
- The admin password lives in Supabase Auth — change it from the Supabase dashboard at any time.
