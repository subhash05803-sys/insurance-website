# Insurance website

## Connect the quote form to Google Drive and email

The quote form stores every submission in a Google Sheet in Google Drive, uploads attached documents (PDFs, images, and documents) to a private Google Drive folder, records the file link in Google Sheets, and emails the latest spreadsheet as an Excel (`.xlsx`) attachment along with the uploaded file link.

### 1. Create or Update the Drive Spreadsheet

1. Sign in to the Google account that should own the quote data.
2. Open your existing Google Sheet (or create a new one in Google Drive).
3. Open **Extensions → Apps Script**.
4. Replace the editor contents with the updated `google-apps-script.gs` from this project and save it.
5. Reload the Google Sheet. A **Quote Form** menu and a **Settings** sheet will appear.

### 2. Configure Settings & File Storage

Open the spreadsheet's **Settings** sheet:
- **B2 (Recipient Gmail address):** Enter the Gmail or email address that should receive quote notification emails.
- **B3 (Email Excel file):** Checkbox to enable or disable Excel attachments on each submission.
- **B4 (Uploads Drive Folder ID - optional):** Paste the ID of the Google Drive folder where uploaded files should be stored.
  - *Tip:* To get a folder ID, open the folder in Google Drive and copy the alphanumeric string at the end of the URL (e.g., `drive.google.com/drive/folders/YOUR_FOLDER_ID`).
  - If left blank, the script will automatically create and use a dedicated `"Quote Attachments"` folder next to your spreadsheet in Google Drive.

Do **not** enter or store a Gmail password. Google asks the spreadsheet owner to authorize Drive and email access when the script is first run or deployed. The website never receives the Gmail credentials.

Use **Quote Form → Send test email** to approve permissions and verify the email address.

### 3. Deploy or Redeploy the Web App

When updating an existing Apps Script Web App, Google requires deploying a new version for changes to take effect:

1. In Apps Script, click **Deploy → Manage deployments**.
2. Click the **Edit** (pencil) icon next to your active deployment.
3. Under **Version**, select **New version**.
4. (Optional) Enter a description like `"Added Drive file uploads support"`.
5. Ensure **Execute as** is set to **Me** and **Who has access** is set to **Anyone**.
6. Click **Deploy**.
7. If your Web App URL hasn't changed, `index.html` is already configured. If you created a new deployment, copy the Web App URL and update `GOOGLE_SCRIPT_URL` in `index.html`.

### 4. How It Works

- **Google Drive Storage:** Uploaded files (PDFs, images, Word docs, TXT) are validated on both client and backend (up to 10MB limit), given a unique timestamped filename to prevent overwriting, and saved privately in your Drive folder.
- **Google Sheets:** Each submission appends a row in the **Quote Requests** sheet with form fields plus the uploaded file's original name (`Attachment Name`) and direct link (`Attachment URL`).
- **Email Notifications:** The configured recipient receives an email with the submitted details, the updated Excel spreadsheet attachment, and the direct Google Drive link to the attached document.
