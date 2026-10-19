const SHEET_NAME = 'Quote Requests';
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

function doPost(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    }

    const data = event.parameter;
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

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function safeCell(value) {
  const text = String(value || '').trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}
