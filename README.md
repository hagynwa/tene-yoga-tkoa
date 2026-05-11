# Tene Yoga Tkoa — Landing + Admin

Hebrew landing page for טנא יוגה משמחת with backoffice for managing classes and enrollments.

**Live:** https://tene-yoga-tkoa.hag.ai
**Admin:** https://tene-yoga-tkoa.hag.ai/admin.html

## Stack

- Static frontend on GitHub Pages (no build step)
- Tailwind via CDN, GSAP + Lenis for animations
- **Supabase** for database + auth
- **Web3Forms** for email delivery to itael8@gmail.com

## File map

```
├── index.html              ← landing page
├── admin.html              ← backoffice
├── logo.jpg
├── assets/
│   ├── config.js           ← YOUR KEYS GO HERE
│   ├── app.js              ← landing page logic
│   └── admin.js            ← admin logic
├── supabase/
│   └── schema.sql          ← run in Supabase SQL editor
├── CNAME                   ← tene-yoga-tkoa.hag.ai
└── .nojekyll
```

## One-time setup (~10 min)

### 1. Supabase

1. Open your existing Supabase project → **SQL Editor** → New query
2. Paste the contents of `supabase/schema.sql` → **Run**. Creates `classes`, `enrollments`, RLS policies, and seeds the first class.
3. **Authentication → Users → Add user → Create new user**
   - Email: `itael8@gmail.com`
   - Password: `yachadlevav`
   - Tick "Auto Confirm User"
4. **Project Settings → API** → copy:
   - **Project URL** (e.g. `https://abcdefg.supabase.co`)
   - **anon public** key (a long JWT starting `eyJ…`)

### 2. Web3Forms (free email delivery)

1. Go to https://web3forms.com → enter `itael8@gmail.com` → Send Access Key
2. Check that inbox, copy the access key from the email

### 3. Fill in `assets/config.js`

Replace the three placeholder strings with the values from steps 1–2.

### 4. Push

```
cd C:/Users/rettig_h/ItaelLanding
git add assets/config.js
git commit -m "Configure Supabase + Web3Forms"
git push
```

GitHub Pages auto-deploys in ~30 sec.

## Daily use

### Add / edit a class
Open `/admin.html` → log in (`itael8` / `yachadlevav`) → "+ שיעור חדש".

The landing page automatically shows the next upcoming **active** class.

### View enrollments
Admin → "הרשמות" tab. Filter by class, export to CSV, or delete entries.

### When someone registers
- Stored in Supabase `enrollments` table
- Email arrives at itael8@gmail.com via Web3Forms

## DNS (already configured)

| Type  | Host             | Value                 |
|-------|------------------|-----------------------|
| CNAME | `tene-yoga-tkoa` | `hagynwa.github.io`   |

Hosted at Spaceship → Manage `hag.ai` → Advanced DNS.

## Security notes

- The Supabase `anon` key is meant for client use — Row Level Security restricts what it can do.
- Only `itael8@gmail.com` can read enrollments or modify classes (enforced server-side by the `is_admin()` RLS check).
- The admin password lives in Supabase Auth — change it any time from the Supabase dashboard.
