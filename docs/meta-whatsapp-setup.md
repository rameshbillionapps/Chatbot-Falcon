# Meta Ads + WhatsApp Business API Setup Guide

This guide covers connecting Meta Lead Ads and WhatsApp Business to the chatbot.

## How It Works

```
Meta Lead Ad form submitted
        ↓
Meta webhook → POST /api/webhooks/meta (leadgen event)
        ↓
Fetch lead details from Graph API
        ↓
Save lead to DB (Admin → Leads)
        ↓
Send WhatsApp template message to lead's phone
        ↓
Lead replies on WhatsApp
        ↓
Meta webhook → POST /api/webhooks/meta (messages event)
        ↓
AI processes reply via RAG → sends response back on WhatsApp
```

---

## Prerequisites

- Meta Business Account — business.facebook.com
- WhatsApp Business number (can be a new number or existing)
- Chatbot deployed on Coolify with a valid HTTPS domain
- Admin access to the chatbot backend

---

## Step 1 — Create a Meta App

1. Go to **developers.facebook.com** → My Apps → **Create App**
2. App type: **Business**
3. Fill in app name → Create
4. Under "Add Products", add:
   - **WhatsApp**
   - **Webhooks**

---

## Step 2 — Get Your Credentials

### WhatsApp → API Setup
| Value | Where to find it |
|---|---|
| Phone Number ID | Meta App Dashboard → WhatsApp → API Setup |
| Access Token | Same page — generate a permanent token via System User (see note below) |

> **Permanent Access Token:** Go to Business Manager → System Users → Create System User → Assign WhatsApp app → Generate Token. Temporary tokens expire in 24h and will break the integration.

### App Dashboard → Settings → Basic
| Value | Where to find it |
|---|---|
| App Secret | Meta App Dashboard → Settings → Basic → App Secret |

---

## Step 3 — Configure Admin Settings

Go to **Admin → Settings → Meta & WhatsApp** and fill in:

| Field | Value |
|---|---|
| Access Token | Permanent token from Step 2 |
| App Secret | App Secret from Step 2 |
| Phone Number ID | Phone Number ID from Step 2 |
| Webhook Verify Token | Any random string, e.g. `chatbot_verify_2025` — you choose this |
| Welcome Template Name | `lead_welcome` (must match the template you create in Step 5) |
| Template Language Code | `en_US` (or your language, e.g. `en`, `hi`, `ta`) |

---

## Step 4 — Register Webhooks in Meta

### For WhatsApp inbound messages:
1. Meta App Dashboard → **WhatsApp → Configuration**
2. **Callback URL:** `https://your-coolify-domain.com/api/webhooks/meta`
3. **Verify Token:** same value you set in Admin Settings above
4. Click **Verify and Save**
5. Under Webhook fields, click **Subscribe** on **messages**

### For Lead Ads form submissions:
1. Meta App Dashboard → **Webhooks → Facebook Page**
2. Click **Subscribe to this object**
3. Same Callback URL and Verify Token
4. Subscribe to field: **leadgen**

---

## Step 5 — Create WhatsApp Message Template

WhatsApp policy requires the first outbound message to be a pre-approved template.

1. **Meta Business Manager → WhatsApp Manager → Message Templates → Create Template**
2. Settings:

| Field | Value |
|---|---|
| Template name | `lead_welcome` |
| Category | Marketing or Utility |
| Language | English (US) or your language |

3. Body text (copy exactly — `{{1}}` is replaced with the lead's name):
```
Hi {{1}}! Thanks for your interest. I'm your AI assistant — what would you like to know?
```

4. Submit for approval
5. **Wait 24–48 hours** for Meta to approve

> Until the template is approved, leads are still saved to the DB — only the WhatsApp message fails silently.

---

## Step 6 — Connect WhatsApp Number

1. Meta App Dashboard → WhatsApp → API Setup
2. Under "To", add your actual WhatsApp Business phone number
3. Send a test message to verify the number is active

---

## Step 7 — Verify the Setup

### Test webhook verification:
```bash
curl "https://your-domain.com/api/webhooks/meta\
?hub.mode=subscribe\
&hub.verify_token=chatbot_verify_2025\
&hub.challenge=test123"
# Expected response: test123
```

### Simulate a Meta Lead Ad submission:
```bash
curl -X POST https://your-domain.com/api/webhooks/meta \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "changes": [{
        "field": "leadgen",
        "value": {
          "leadgen_id": "TEST_LEADGEN_ID_123",
          "ad_name": "Test Campaign"
        }
      }]
    }]
  }'
# Check Admin → Leads — new lead should appear with source "Meta Ads"
```

### Simulate an inbound WhatsApp reply:
```bash
curl -X POST https://your-domain.com/api/webhooks/meta \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "field": "messages",
        "value": {
          "messages": [{
            "from": "919876543210",
            "type": "text",
            "text": { "body": "What products do you offer?" }
          }]
        }
      }]
    }]
  }'
# Check Admin → Chat History — session should appear with source domain "whatsapp"
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Webhook verification fails (403) | Verify token mismatch | Ensure Admin Settings verify token exactly matches Meta Dashboard value |
| Template message not sending | Template not approved yet | Check status in WhatsApp Manager → Message Templates |
| "Credentials not configured" error | Missing Phone Number ID or Access Token | Fill in all fields in Admin → Settings → Meta & WhatsApp |
| Lead saved but no WhatsApp sent | Phone number missing from Meta form | Ensure your Lead Ad form includes a phone number field |
| Inbound message not replied | Server not reachable or webhook not subscribed | Check Coolify logs; verify webhook subscription is active in Meta Dashboard |
| Access token expired | Using temporary token | Regenerate via System User for a permanent token (no expiry) |
| Meta webhook not reaching local server | Can't use localhost | Use ngrok for local testing: `ngrok http 3000` → use the ngrok URL as Callback URL |

---

## Local Development Testing with ngrok

Meta requires a public HTTPS URL. For local testing:

```bash
# Install ngrok: https://ngrok.com
ngrok http 3000

# Copy the HTTPS URL, e.g. https://abc123.ngrok.io
# Use as: https://abc123.ngrok.io/api/webhooks/meta
```

---

## Lead Flow Summary

| Event | What happens in the app |
|---|---|
| Lead Ad form submitted | Lead saved with `source: meta_ads`, `status: new` |
| Template message sent | Lead status → `contacted` |
| Lead replies on WhatsApp | Lead status → `replied`; AI takes over conversation |
| Admin marks as converted | Lead status → `converted` (manual, via Admin → Leads) |

---

## Files Reference

| File | Purpose |
|---|---|
| `server/whatsapp.ts` | Meta Cloud API client — send template, send text, fetch lead |
| `server/routes.ts` | Webhook endpoints: `GET/POST /api/webhooks/meta` |
| `shared/schema.ts` | `leads` table definition |
| `server/storage.ts` | Lead CRUD methods |
| `client/src/pages/admin/leads.tsx` | Admin Leads dashboard |
| `client/src/pages/admin/settings.tsx` | Meta & WhatsApp credentials section |
