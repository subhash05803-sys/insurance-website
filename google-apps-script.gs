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
  'Submitted At',
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Coverage',
  'Message',
  'Source',
  'Attachment Name',
  'Attachment URL'
];

const ALLOWED_EXTENSIONS = [
  'pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif',
  'doc', 'docx', 'txt', 'rtf', 'odt', 'csv', 'xlsx', 'xls'
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

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

    sheet.appendRow([
      data.submittedAt ? new Date(data.submittedAt) : new Date(),
      safeCell(data.firstName),
      safeCell(data.lastName),
      safeCell(data.email),
      safeCell(data.phone),
      safeCell(data.coverage),
      safeCell(data.message),
      safeCell(data.source),
      safeCell(fileInfo.name),
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
    // Preserve existing rows and ensure header row has the new attachment columns
    const lastCol = sheet.getLastColumn();
    const existingHeaderValues = sheet.getRange(1, 1, 1, Math.max(lastCol, HEADERS.length)).getValues()[0];
    for (let i = 0; i < HEADERS.length; i++) {
      if (!existingHeaderValues[i] || existingHeaderValues[i].toString().trim() === '') {
        sheet.getRange(1, i + 1).setValue(HEADERS[i]).setFontWeight('bold');
      }
    }
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
  const firstName = safeCell(submission.firstName) || 'New';
  const lastName = safeCell(submission.lastName) || 'customer';
  const coverage = safeCell(submission.coverage) || 'insurance';
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheet.getId()}/export?format=xlsx`;
  const excelFile = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` }
  }).getBlob().setName(`${spreadsheet.getName()}.xlsx`);

  let attachmentDetails = '';
  if (uploadedFile && uploadedFile.url) {
    attachmentDetails = `\n\nUploaded Attachment:\n• File Name: ${uploadedFile.name}\n• Google Drive Link: ${uploadedFile.url}`;
  }

  const body = `A new ${coverage} quote request was saved to Google Drive. The latest Excel file is attached.\n\nGoogle Sheet: ${spreadsheet.getUrl()}${attachmentDetails}`;

  MailApp.sendEmail({
    to: recipientEmail,
    subject: `New quote request: ${firstName} ${lastName}`,
    body: body,
    attachments: [excelFile],
    name: 'Upshot Insurance Website'
  });
}

function safeCell(value) {
  const text = String(value || '').trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}
