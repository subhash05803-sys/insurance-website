# Insurance website

## Connect the quote form to Google Drive and email

The quote form stores every submission in a Google Sheet in Google Drive and can email the latest sheet as an Excel (`.xlsx`) attachment.

### 1. Create the Drive spreadsheet

1. Sign in to the Google account that should own the quote data.
2. Create a new Google Sheet in Google Drive.
3. Open **Extensions → Apps Script**.
4. Replace the editor contents with `google-apps-script.gs` from this project and save it.
5. Reload the Google Sheet. A **Quote Form** menu and a **Settings** sheet will appear.

### 2. Enter the recipient Gmail address

Open the spreadsheet's **Settings** sheet and enter the recipient Gmail/email address in cell **B2**. Use the checkbox in **B3** to enable or disable Excel attachments.

Do **not** enter or store a Gmail password. Google asks the spreadsheet owner to authorize Drive and email access when the script is first run or deployed. The website never receives the Gmail credentials.

Use **Quote Form → Send test email** to approve permissions and verify the address. The test sends the current spreadsheet as an Excel attachment.

### 3. Publish the form endpoint

1. In Apps Script, select **Deploy → New deployment → Web app**.
2. Set **Execute as** to **Me**.
3. Choose who can access the web app according to the website's needs (a public website normally requires **Anyone**).
4. Deploy and complete Google's authorization prompts.
5. Copy the web app URL.
6. In `index.html`, replace `PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` with that URL.

The Google Sheet is already stored in and connected to Google Drive. New requests are appended to the **Quote Requests** sheet; when enabled, the configured recipient receives an updated Excel copy after each request.
