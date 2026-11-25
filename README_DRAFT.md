# Upshot Insurance Website — Complete Operational & Maintenance Manual

> **Official Live Website:** [https://upshotinsurance.com/](https://upshotinsurance.com/)  
> **Brokerage Office:** 13261 O'Bannon Station Way, Louisville, KY 40223  
> **Office Phone:** (270) 467-1353  
> **Office Email:** [contact@upshotinsurance.com](mailto:contact@upshotinsurance.com)

---

## Table of Contents
1. [Overview & Live Architecture](#1-overview--live-architecture)
2. [Hosting & DNS Setup (GoDaddy + Cloudflare)](#2-hosting--dns-setup-godaddy--cloudflare)
3. [Operational Accounts Reference](#3-operational-accounts-reference)
4. [Quote Request Form System (Jotform)](#4-quote-request-form-system-jotform)
5. [Frontend Components & Structure](#5-frontend-components--structure)
6. [Maintenance & Content Update Guide](#6-maintenance--content-update-guide)
   - [Updating Phone Numbers, Email, and Address](#1-updating-phone-numbers-email-and-address)
   - [Managing Insurance Carrier Logos](#2-managing-insurance-carrier-logos)
   - [Updating Legal Policies & Disclaimers](#3-updating-legal-policies--disclaimers)
   - [Updating or Replacing the Quote Form](#4-updating-or-replacing-the-quote-form)
   - [Publishing Updates to GoDaddy](#5-publishing-updates-to-godaddy)

---

## 1. Overview & Live Architecture

The **Upshot Insurance** website is a modern, responsive, high-performance static web application built for independent commercial and personal insurance brokerage operations.

### Core Stack:
- **Frontend:** Semantic HTML5, CSS3 (Modern Custom Properties, CSS Grid, Flexbox, Fluid Typography), and Vanilla JavaScript (ES6+).
- **Backend & Lead Processing:** **Jotform Cloud Platform** (serverless, secure submission handling, file attachments, and notification routing).
- **Live Infrastructure:** Hosted on **GoDaddy** web hosting and routed through **Cloudflare** for DNS, CDN caching, DDoS protection, and SSL/TLS security.

---

## 2. Hosting & DNS Setup (GoDaddy + Cloudflare)

The production website [https://upshotinsurance.com/](https://upshotinsurance.com/) is live and operational using the following configuration:

1. **Domain & Web Hosting (GoDaddy):**
   - The domain `upshotinsurance.com` and website files reside in the GoDaddy hosting account.
   - All website production files (`index.html`, `images/`, logos, and favicons) are deployed in the **`public_html`** root directory of the cPanel File Manager.
   - A pre-packaged, ready-to-deploy archive (`website-godaddy.zip`) is maintained for quick uploads and backups.

2. **DNS & Network Security (Cloudflare):**
   - **Administrative Account:** `remote.upshot@gmail.com`
   - Cloudflare acts as the authoritative DNS manager and reverse-proxy CDN.
   - Handles global SSL/TLS certificates (HTTPS encryption), web caching, edge routing, and automated security rules.

---

## 3. Operational Accounts Reference

For ongoing management, renewals, and system handovers:

| Service | Account / Administrative Email | Purpose |
| :--- | :--- | :--- |
| **GoDaddy** | Upshot Insurance Account | Primary domain registration and web hosting (`public_html/`) |
| **Cloudflare** | `remote.upshot@gmail.com` | DNS management, SSL/TLS certificates, speed caching, and security rules |
| **Jotform** | `contact@upshotinsurance.com` | Quote request submissions, lead records, uploaded policy files, and alerts |

---

## 4. Quote Request Form System (Jotform)

The quote request workflow is powered by **Jotform** (Form ID: `263255342465054`, Title: *"Get in touch."*).

### Submissions & Leads Dashboard
Every customer inquiry, contact preference, and uploaded policy document is recorded in the secure Jotform Tables database:
👉 **[https://www.jotform.com/tables/263255342465054](https://www.jotform.com/tables/263255342465054)**

From this dashboard, staff can:
- Review incoming leads in real-time with full timestamps.
- View and download uploaded declaration pages or existing policies.
- Filter and search submissions by customer name, phone, or policy type.
- Export records directly to **Excel (.xlsx)** or **CSV** for CRM imports.

### Email Notifications
Instant notifications with lead details and attached files are automatically delivered to `contact@upshotinsurance.com`.
- **To update recipient emails:**
  1. Log into [Jotform Workspace](https://www.jotform.com/workspace/).
  2. Select form `263255342465054` &rarr; click **Edit Form**.
  3. Go to **Settings** &rarr; **Emails** &rarr; **Notification 1**.
  4. Under the **Recipients** tab, add or edit the destination email addresses.

### Embed Code in `index.html`
The form is embedded in the quote modal popup (`#quoteModal`):
```html
<iframe
  id="JotFormIFrame-263255342465054"
  title="Get in touch."
  onload="window.parent.scrollTo(0,0)"
  allowtransparency="true"
  allow="geolocation; microphone; camera; fullscreen; payment"
  src="https://form.jotform.com/263255342465054"
  frameborder="0"
  style="min-width:100%;max-width:100%;height:539px;border:none;"
  scrolling="no"
>
</iframe>
<script src="https://cdn.jotfor.ms/s/umd/latest/for-form-embed-handler.js"></script>
<script>window.jotformEmbedHandler("iframe[id='JotFormIFrame-263255342465054']", "https://form.jotform.com/")</script>
```

---

## 5. Frontend Components & Structure

### 1. Global Quote Modal Triggers
Any element with the class `.open-quote` triggers the quote popup. A delegated event listener handles clicks across the entire page (header, hero, feature cards, and sticky bar):
```javascript
document.addEventListener('click', (event) => {
  const quoteBtn = event.target.closest('.open-quote');
  if (quoteBtn) {
    event.preventDefault();
    openModal(quoteBtn.dataset.service || '');
  }
});
```

### 2. Mobile Quick-Action Sticky Bar
On mobile screens (`<= 768px`), a fixed bottom bar provides instant touch shortcuts:
- **Call:** `tel:+12704671353`
- **Text:** `sms:+12704671353`
- **Quote:** Triggers the Jotform quote modal

### 3. Carrier Partner Logos Carousel
- Located in `#partnersTrack` and powered by `initPartnersCarousel()`.
- Features smooth continuous looping, touch/drag gesture support, pause-on-hover, and fallback initials monograms if any logo image fails to load.

### 4. Legal Modals
Accessible modal overlays for:
- **Privacy Policy** (`#privacyModal`)
- **Terms of Service** (`#termsModal`)
- **24/7 Claims Guide** (`#claimsModal`)

---

## 6. Maintenance & Content Update Guide

### 1. Updating Phone Numbers, Email, and Address
To update agency contact information in `index.html`:
- Search for `(270) 467-1353` and `+12704671353` (found in top bar, hero action badges, footer, and mobile bar).
- Search for `contact@upshotinsurance.com` for email links.
- Search for `13261 O'Bannon Station Way` for the office location.

### 2. Managing Insurance Carrier Logos
1. Place the new logo image into the `images/` directory.
2. In `index.html`, locate the `#partnersTrack` section and add or edit the `<div class="partner-card">` entry:
   ```html
   <div class="partner-card">
     <img src="images/carrier-name.png" alt="Carrier Name Logo" loading="lazy">
   </div>
   ```

### 3. Updating Legal Policies & Disclaimers
Legal texts are contained directly in their respective modal markup near the bottom of `index.html`:
- `#privacyModal` &rarr; Privacy Policy
- `#termsModal` &rarr; Terms of Service
- `#claimsModal` &rarr; Claims procedures and hotline numbers

### 4. Updating or Replacing the Quote Form
If a new form is created on Jotform:
1. Copy the new 15-digit form ID.
2. In `index.html`, replace `263255342465054` in the `<iframe>` id, `src`, and `jotformEmbedHandler` call.
3. Update the Jotform Tables link in this documentation.

### 5. Publishing Updates to GoDaddy
1. Place all updated files (`index.html`, `images/`, etc.) into a zip file, or use the pre-packaged `website-godaddy.zip`.
2. Log into **GoDaddy** &rarr; **My Products** &rarr; **Web Hosting (cPanel)**.
3. Open **File Manager** &rarr; go to **`public_html`**.
4. Upload the zip and click **Extract** (replace existing files).
5. The live website at [https://upshotinsurance.com/](https://upshotinsurance.com/) will reflect the updates immediately.
