// Public config — safe to expose in browser.
// Supabase anon key is RLS-protected. Email sending is handled by a
// Supabase Edge Function (RESEND_API_KEY lives as a server-side secret).

window.APP_CONFIG = {
  SUPABASE_URL:      'https://xuoxkmwtdascazutoaxs.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1b3hrbXd0ZGFzY2F6dXRvYXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MjI5MDcsImV4cCI6MjA3NTI5ODkwN30.Cy1W0lXNuP-lXbRyGOPjz2fL6ano-Nzxf7HBoRv9EJM',

  ADMIN_EMAIL: 'itael8@gmail.com',
};
