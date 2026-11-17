const SHEET_NAME = 'Quote Requests';
const SETTINGS_SHEET_NAME = 'Settings';
const SETTINGS = {
  recipientEmail: 'B2',
  sendExcelAttachment: 'B3',
  driveFolderId: 'B4'
};
// Optional: Paste a designated Google Drive Folder ID here, or set it in Settings sheet (cell B4)
const DRIVE_FOLDER_ID = '';

const HEADERS = [
  'Date',
  'Full Name',
  'Email',
  'Phone',
  'Address',
  'Coverage Needed',
  'How Did You Find Us',
  'Preferred Contact Method',
  'Message',
  'Attachment Link'
];

const ALLOWED_EXTENSIONS = [
  'pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif',
  'doc', 'docx', 'txt', 'rtf', 'odt', 'csv', 'xlsx', 'xls'
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Quote Form')
    .addItem('Update Sheet Columns', 'updateSheetHeaders')
    .addItem('Open settings', 'openSettings')
    .addItem('Send test email', 'sendTestEmail')
    .addToUi();
}

function updateSheetHeaders() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateQuoteSheet(spreadsheet);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.autoResizeColumns(1, HEADERS.length);
  SpreadsheetApp.getUi().alert('Header columns updated successfully to match form fields!');
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
    email: 'test@example.com',
    phone: '(555) 123-4567',
    address: '123 Test Street, Louisville, KY',
    coverage: 'Auto Insurance, Home Insurance',
    howDidYouFindUs: 'Google Search',
    preferredContactMethod: 'Text, Email',
    message: 'Integration test message'
  }, null);

  SpreadsheetApp.getUi().alert(`Test Excel file sent to ${settings.recipientEmail}.`);
}

function doPost(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  let spreadsheet;
  let data;
  let uploadedFile = null;

  try {
    spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateQuoteSheet(spreadsheet);
    data = parseRequestData(event);

    const settings = getSettings(spreadsheet);

    // Save uploaded file to Google Drive if provided
    if (data.fileData && data.fileName) {
      const folder = getUploadsFolder(spreadsheet, settings.driveFolderId);
      uploadedFile = saveUploadedFile(folder, data.fileData, data.fileName, data.fileType);
    }

    const fileInfo = uploadedFile || { name: '', url: '' };
    const fullName = [safeCell(data.firstName), safeCell(data.lastName)].filter(Boolean).join(' ') || safeCell(data.fullName);

    sheet.appendRow([
      data.submittedAt ? new Date(data.submittedAt) : new Date(),
      fullName,
      safeCell(data.email),
      safeCell(data.phone),
      safeCell(data.address),
      safeCell(data.coverage),
      safeCell(data.howDidYouFindUs),
      safeCell(data.preferredContactMethod),
      safeCell(data.message),
      safeCell(fileInfo.url)
    ]);
    SpreadsheetApp.flush();

    if (settings.recipientEmail && settings.sendExcelAttachment) {
      sendExcelEmail(spreadsheet, settings.recipientEmail, data, uploadedFile);
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        fileUrl: uploadedFile ? uploadedFile.url : null
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error processing submission: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message || error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function parseRequestData(event) {
  let data = {};
  if (event && event.postData && event.postData.contents) {
    try {
      data = JSON.parse(event.postData.contents);
    } catch (_) {
      data = event.parameter || {};
    }
  } else if (event && event.parameter) {
    data = event.parameter;
  }
  return data;
}

function saveUploadedFile(folder, fileData, originalFileName, mimeType) {
  if (!fileData || !originalFileName) {
    return null;
  }

  const cleanName = String(originalFileName).replace(/[/\\?%*:|"<>]/g, '_').trim();
  const ext = (cleanName.split('.').pop() || '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error('Unsupported file extension: .' + ext + '. Allowed formats: PDF, images, and documents.');
  }

  let base64String = String(fileData);
  if (base64String.indexOf(',') !== -1) {
    base64String = base64String.split(',')[1];
  }

  const bytes = Utilities.base64Decode(base64String);
  if (bytes.length > MAX_FILE_SIZE_BYTES) {
    throw new Error('File size exceeds the 10MB limit (' + (bytes.length / (1024 * 1024)).toFixed(1) + ' MB).');
  }

  const blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', cleanName);

  // Generate unique filename to prevent accidental overwrites
  const timestamp = Utilities.formatDate(new Date(), 'GMT', 'yyyyMMdd_HHmmss');
  const uniqueId = Utilities.getUuid().slice(0, 8);
  const uniqueFileName = `${timestamp}_${uniqueId}_${cleanName}`;
  blob.setName(uniqueFileName);

  const createdFile = folder.createFile(blob);

  return {
    name: cleanName,
    uniqueName: uniqueFileName,
    url: createdFile.getUrl(),
    id: createdFile.getId()
  };
}

function getUploadsFolder(spreadsheet, folderId) {
  const targetId = folderId || DRIVE_FOLDER_ID;
  if (targetId) {
    try {
      return DriveApp.getFolderById(targetId);
    } catch (err) {
      Logger.log('Could not open folder with ID ' + targetId + ': ' + err.message + '. Falling back to default folder.');
    }
  }

  // Look for "Quote Attachments" folder in the spreadsheet parent directory
  try {
    const sheetFile = DriveApp.getFileById(spreadsheet.getId());
    const parents = sheetFile.getParents();
    if (parents.hasNext()) {
      const parent = parents.next();
      const existing = parent.getFoldersByName('Quote Attachments');
      if (existing.hasNext()) {
        return existing.next();
      }
      return parent.createFolder('Quote Attachments');
    }
  } catch (err) {
    Logger.log('Could not get spreadsheet parent folder: ' + err.message);
  }

  // Fallback to Drive root
  const rootFolders = DriveApp.getFoldersByName('Quote Attachments');
  if (rootFolders.hasNext()) {
    return rootFolders.next();
  }
  return DriveApp.createFolder('Quote Attachments');
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
  } else {
    // Ensure header row matches current HEADERS
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  }

  return sheet;
}

function getOrCreateSettingsSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SETTINGS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SETTINGS_SHEET_NAME);
    sheet.getRange('A1:B1').setValues([['Setting', 'Value']]);
    sheet.getRange('A2:A4').setValues([
      ['Recipient Gmail address'],
      ['Email Excel file after each request'],
      ['Uploads Drive Folder ID (optional)']
    ]);
    sheet.getRange(SETTINGS.recipientEmail).setNote('Enter the Gmail or email address that should receive the Excel file.');
    sheet.getRange(SETTINGS.sendExcelAttachment).insertCheckboxes().setValue(true);
    sheet.getRange(SETTINGS.driveFolderId).setNote('Optional: Google Drive Folder ID to store attachments. Leave blank to auto-create "Quote Attachments" folder.');
    sheet.setFrozenRows(1);
    sheet.getRange('A1:B1').setFontWeight('bold');
    sheet.autoResizeColumns(1, 2);
  } else {
    const folderSettingCell = sheet.getRange('A4');
    if (!folderSettingCell.getValue()) {
      folderSettingCell.setValue('Uploads Drive Folder ID (optional)');
      sheet.getRange(SETTINGS.driveFolderId).setNote('Optional: Google Drive Folder ID to store attachments. Leave blank to auto-create "Quote Attachments" folder.');
    }
  }

  return sheet;
}

function getSettings(spreadsheet) {
  const sheet = getOrCreateSettingsSheet(spreadsheet);
  return {
    recipientEmail: String(sheet.getRange(SETTINGS.recipientEmail).getValue()).trim(),
    sendExcelAttachment: sheet.getRange(SETTINGS.sendExcelAttachment).getValue() === true,
    driveFolderId: String(sheet.getRange(SETTINGS.driveFolderId).getValue() || '').trim()
  };
}

function sendExcelEmail(spreadsheet, recipientEmail, submission, uploadedFile) {
  const fullName = [safeCell(submission.firstName), safeCell(submission.lastName)].filter(Boolean).join(' ') || safeCell(submission.fullName) || 'New Customer';
  const coverage = safeCell(submission.coverage) || 'Insurance';
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheet.getId()}/export?format=xlsx`;
  const excelFile = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` }
  }).getBlob().setName(`${spreadsheet.getName()}.xlsx`);

  let attachmentDetails = '';
  if (uploadedFile && uploadedFile.url) {
    attachmentDetails = `\n\nUploaded Attachment:\n• File Name: ${uploadedFile.name}\n• Google Drive Link: ${uploadedFile.url}`;
  }

  const details = [
    `• Name: ${fullName}`,
    `• Email: ${submission.email || 'N/A'}`,
    `• Phone: ${submission.phone || 'N/A'}`,
    `• Address: ${submission.address || 'N/A'}`,
    `• Coverage Needed: ${coverage}`,
    `• How Did You Find Us: ${submission.howDidYouFindUs || 'N/A'}`,
    `• Preferred Contact Method: ${submission.preferredContactMethod || 'N/A'}`,
    `• Message / Notes: ${submission.message || 'None'}`
  ].join('\n');

  const body = `A new ${coverage} quote request was received and saved to Google Drive. The latest Excel file is attached.\n\nSummary:\n${details}\n\nGoogle Sheet: ${spreadsheet.getUrl()}${attachmentDetails}`;

  MailApp.sendEmail({
    to: recipientEmail,
    subject: `New quote request: ${fullName} (${coverage})`,
    body: body,
    attachments: [excelFile],
    name: 'Upshot Insurance Agency'
  });
}

function safeCell(value) {
  const text = String(value || '').trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}
