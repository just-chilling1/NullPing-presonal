# Supabase dashboard steps (manual)

Complete these in the Supabase project for your product. You can also run `npm run setup:supabase-auth` to apply most of this automatically (see [DEVELOPER-SETUP.md](./DEVELOPER-SETUP.md) Step 5).

## Site URL

**Authentication → URL Configuration → Site URL**

Set this to your production domain (same as `NEXT_PUBLIC_APP_URL`), **not** `http://localhost:3000`:

```
https://yourdomain.com
```

If Site URL stays on localhost, password-reset emails will send users to `localhost:3000` even from production.

You can also run:

```bash
PROJECT_REF=your-project-ref APP_URL=https://yourdomain.com npm run setup:supabase-auth
```

That script updates Site URL, redirect allow list, and email templates.

## Redirect URLs

**Authentication → URL Configuration → Redirect URLs**

Add your app URLs (keep any existing entries for other apps on the same project):

```
https://yourdomain.com/**
http://localhost:3000/**
http://localhost:3001/**
```

Use the same domain as `NEXT_PUBLIC_APP_URL` in production.

## Reset Password email template

**Authentication → Email Templates → Reset Password**

Use `{{ .ConfirmationURL }}` in the reset link so `redirectTo` from the app controls the domain:

```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your account:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

NullPing calls `resetPasswordForEmail` from the client with `https://nullpingmembersarea.com/auth/callback?next=/reset-password` (via `buildPasswordResetCallbackUrl()`).

## Confirm signup (if enabled)

Prefer `{{ .ConfirmationURL }}` in the confirm template as well so signups redirect to the correct domain.
