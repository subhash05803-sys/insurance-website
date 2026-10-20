const SHEET_NAME = 'Quote Requests';
const SETTINGS_SHEET_NAME = 'Settings';
const SETTINGS = {
  recipientEmail: 'B2',
  sendExcelAttachment: 'B3'
};
const HEADERS = [
  'Submitted At',
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Coverage',
  'Message',
  'Source'
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Quote Form')
    .addItem('Open settings', 'openSettings')
    .addItem('Send test email', 'sendTestEmail')
    .addToUi();
}

function openSettings() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = getOrCreateSettingsSheet(spreadsheet);
  spreadsheet.setActiveSheet(settingsSheet);
}

function sendTestEmail() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const settings = getSettings(spreadsheet);

  if (!settings.recipientEmail) {
    throw new Error('Enter the recipient Gmail address in Settings!B2 first.');
  }

  sendExcelEmail(spreadsheet, settings.recipientEmail, {
    firstName: 'Test',
    lastName: 'Submission',
    coverage: 'Integration test'
  });

  SpreadsheetApp.getUi().alert(`Test Excel file sent to ${settings.recipientEmail}.`);
}

function doPost(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  let spreadsheet;
  let data;

  try {
    spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateQuoteSheet(spreadsheet);
    data = event.parameter;

    sheet.appendRow([
      data.submittedAt ? new Date(data.submittedAt) : new Date(),
      safeCell(data.firstName),
      safeCell(data.lastName),
      safeCell(data.email),
      safeCell(data.phone),
      safeCell(data.coverage),
      safeCell(data.message),
      safeCell(data.source)
    ]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  const settings = getSettings(spreadsheet);
  if (settings.recipientEmail && settings.sendExcelAttachment) {
    sendExcelEmail(spreadsheet, settings.recipientEmail, data);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateQuoteSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }

  return sheet;
}

function getOrCreateSettingsSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SETTINGS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SETTINGS_SHEET_NAME);
    sheet.getRange('A1:B1').setValues([['Setting', 'Value']]);
    sheet.getRange('A2:A3').setValues([
      ['Recipient Gmail address'],
      ['Email Excel file after each request']
    ]);
    sheet.getRange(SETTINGS.recipientEmail).setNote('Enter the Gmail or email address that should receive the Excel file.');
    sheet.getRange(SETTINGS.sendExcelAttachment).insertCheckboxes().setValue(true);
    sheet.setFrozenRows(1);
    sheet.getRange('A1:B1').setFontWeight('bold');
    sheet.autoResizeColumns(1, 2);
  }

  return sheet;
}

function getSettings(spreadsheet) {
  const sheet = getOrCreateSettingsSheet(spreadsheet);
  return {
    recipientEmail: String(sheet.getRange(SETTINGS.recipientEmail).getValue()).trim(),
    sendExcelAttachment: sheet.getRange(SETTINGS.sendExcelAttachment).getValue() === true
  };
}

function sendExcelEmail(spreadsheet, recipientEmail, submission) {
  const firstName = safeCell(submission.firstName) || 'New';
  const lastName = safeCell(submission.lastName) || 'customer';
  const coverage = safeCell(submission.coverage) || 'insurance';
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheet.getId()}/export?format=xlsx`;
  const excelFile = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` }
  }).getBlob().setName(`${spreadsheet.getName()}.xlsx`);

  MailApp.sendEmail({
    to: recipientEmail,
    subject: `New quote request: ${firstName} ${lastName}`,
    body: `A new ${coverage} quote request was saved to Google Drive. The latest Excel file is attached.\n\nGoogle Sheet: ${spreadsheet.getUrl()}`,
    attachments: [excelFile],
    name: 'Upshot Insurance Website'
  });
}

function safeCell(value) {
  const text = String(value || '').trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}
