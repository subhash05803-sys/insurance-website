# Upshot Insurance Website

Comprehensive documentation, architecture guide, and maintenance manual for the **Upshot Insurance** website.

> **Project Reference & Work Log:** [Gemini Pair Programming Log](https://share.gemini.google/usGwLutWb7sj)  
> **Application Developer & AI Engineer:** **Subhash** (India)  
> **Builder Contact Email:** [subhashtelugu4@gmail.com](mailto:subhashtelugu4@gmail.com)  
> **Official Website:** [https://upshotinsurance.com/](https://upshotinsurance.com/)

---

## 1. Project Overview & Architecture

This application is a modern, responsive website for **Upshot Insurance**, an independent insurance brokerage based in Louisville, Kentucky.

### Core Technology Stack:
- **Frontend:** Pure semantic HTML5, modern CSS3 (Custom Variables, CSS Grid, Flexbox, Fluid Typography via `clamp()`), and Vanilla JavaScript (ES6+).
- **Backend & Form Processing:** **Jotform Cloud Platform** (No dedicated server or database required for form submission).
- **Local Dev Server:** Built-in Node.js static server (`server.js`) running on port `3000`.
- **Hosting & CDN:** GitHub Pages with custom domain `upshotinsurance.com` (plus optional GoDaddy cPanel hosting package).

---

## 2. Jotform Quote Form System

The quote request form on the website is powered by **Jotform** (Form ID: `263255342465054`, Title: *"Get in touch."*).

### Submissions Dashboard
- Every submission, customer detail, contact preference, and uploaded file is stored in your private Jotform Tables:  
  👉 **[https://www.jotform.com/tables/263255342465054](https://www.jotform.com/tables/263255342465054)**
- From Jotform Tables, you can filter, search, manage leads, or export directly to **Excel (.xlsx)** or **CSV**.

### Email Notifications
- Instant email notifications with customer details and file attachments are sent to the brokerage email.
- To add, remove, or change notification recipient emails:
  1. Open [Jotform Workspace](https://www.jotform.com/workspace/).
  2. Select form `263255342465054` &rarr; Click **Edit Form**.
  3. Go to **Settings** &rarr; **Emails** &rarr; Edit **Notification 1**.
  4. Under the **Recipients** tab, add or edit the recipient email addresses.

### How the Embed Works in `index.html`
The form is embedded in the modal popup (`#quoteModal`) using Jotform's responsive embed code:
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

> **Note on Changing Form in the Future:** If you ever build a brand-new form on Jotform with a new Form ID, replace the numbers `263255342465054` in the 3 spots in `index.html` with your new Form ID.

---

## 3. Deployment & Hosting Options

### Option A: GitHub Pages + GoDaddy Domain (Active Production Setup)
The site is hosted for free on GitHub Pages with automatic SSL/HTTPS.

1. **GitHub Repository:** `https://github.com/subhash05803-sys/insurance-website`
2. **Auto-Deployment:** Any push to the `main` branch automatically triggers GitHub Actions (`.github/workflows/pages.yml`) to build and deploy the site within 1–2 minutes.
3. **Custom Domain Configuration:**
   - The file `CNAME` in the root contains `upshotinsurance.com`.
   - In GoDaddy DNS Management for `upshotinsurance.com`:
     - **4 A Records** (Name: `@`):
       - `185.199.108.153`
       - `185.199.109.153`
       - `185.199.110.153`
       - `185.199.111.153`
     - **1 CNAME Record** (Name: `www`):
       - Points to: `subhash05803-sys.github.io`

### Option B: GoDaddy cPanel Web Hosting
If you ever want to host directly on GoDaddy Linux/cPanel Web Hosting instead of GitHub:
1. Open the pre-packaged zip file on your Desktop: `website-godaddy.zip` (also available in `godaddy-deploy/website-godaddy.zip`).
2. Log into GoDaddy &rarr; **My Products** &rarr; **Web Hosting (cPanel)** &rarr; **File Manager**.
3. Open the **`public_html`** directory.
4. Upload `website-godaddy.zip` and click **Extract**.
5. All site assets (`index.html`, `images/`, logos, and favicons) will go live immediately.

---

## 4. Key Interactive Components & Guidelines for Developers

### 1. Quote Modal Trigger System (Desktop & Mobile)
- Any button with class `.open-quote` will trigger the quote modal popup.
- **Event Delegation:** To ensure buttons created anywhere in the DOM (including inside dynamic cards, hero sections, and the mobile sticky action bar) always trigger the modal, a global click listener is registered in `index.html`:
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
- On screens `<= 768px`, a sticky bar appears at the bottom with 3 quick actions:
  - **Call:** Direct `tel:+12704671353` link
  - **Text:** Direct `sms:+12704671353` link
  - **Quote:** Triggers the modal popup with Jotform
- The sticky bar HTML is positioned right before `#quoteModal` in the DOM to ensure proper loading order.
- On mobile devices, `body` has a bottom padding of `60px` to prevent page content from being obscured by the sticky bar.

### 3. Infinite Partner Logos Carousel
- The partner logos section (`#partnersTrack`) uses `initPartnersCarousel()`.
- Logos are duplicated in the track for seamless continuous looping.
- Features:
  - Automatic pause on hover/focus.
  - Touch/pointer drag support for swiping through logos.
  - Smooth `prev` and `next` arrow navigation buttons.
  - Fallback text monogram badges if any carrier logo image fails to load.

### 4. Legal & Info Modals
- The site contains 4 dedicated modal cards:
  - **Privacy Policy** (`#privacyModal`)
  - **Terms of Service** (`#termsModal`)
  - **24/7 Client Claims Guide** (`#claimsModal`)
  - **Application Developer & AI Engineer / Developer Details** (`#builderModal`)
- Managed centrally by `openLegalModal(id)` and `closeLegalModal(id)`.
- Closes automatically on backdrop click or pressing the **Escape** key.

---

## 5. Local Development & Testing

### Running the Site Locally:
1. Ensure Node.js is installed.
2. Open terminal in the project directory:
   ```bash
   node server.js
   ```
3. Open [http://localhost:3000](http://localhost:3000) in any browser.

---

## 6. Project Credits & Maintenance Contact

- **Application Developer & AI Engineer:** **Subhash**
- **Location:** India 🇮🇳
- **Developer Email:** [subhashtelugu4@gmail.com](mailto:subhashtelugu4@gmail.com)
- **Work Trajectory & Log:** [https://share.gemini.google/usGwLutWb7sj](https://share.gemini.google/usGwLutWb7sj)
- **Client Organization:** Upshot Insurance (13261 O'Bannon Station Way, Louisville, KY 40223)

---

## 7. Operational Account Details & Credentials Reference

For system handovers, domain DNS management, and form administration, the following registered accounts are connected to this project:

| Service | Registered / Administrative Email | Purpose |
| :--- | :--- | :--- |
| **Cloudflare** | `remote.upshot@gmail.com` | DNS management, SSL/TLS certificates, CDN caching, and domain routing |
| **Jotform** | `contact@upshotinsurance.com` | Form submissions dashboard, lead tables, file storage, and email notifications |
| **Developer Contact** | `subhashtelugu4@gmail.com` | Application Developer & AI Engineer support |
