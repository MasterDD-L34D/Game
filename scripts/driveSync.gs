/**
 * Apps Script per sincronizzare YAML in Google Sheet.
 * 1) Crea un Apps Script collegato alla cartella Drive che contiene gli YAML.
 * 2) Imposta CONFIG.folderId con l'ID della cartella.
 * 3) Esegui convertYamlToSheets().
 *
 * Lo script scarica js-yaml da jsDelivr, converte ciascun file YAML in uno Spreadsheet
 * (una tab per ogni chiave di primo livello) e sposta lo Spreadsheet nella cartella sorgente.
 */
const CONFIG = {
  folderId: 'INSERISCI_FOLDER_ID',
  yamlLibraryUrl: 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js',
  sheetNamePrefix: '[YAML] '
};

function convertYamlToSheets() {
  if (!CONFIG.folderId || CONFIG.folderId === 'INSERISCI_FOLDER_ID') {
    throw new Error('Configura CONFIG.folderId con l\'ID della cartella Drive.');
  }

  const folder = DriveApp.getFolderById(CONFIG.folderId);
  const files = folder.getFilesByType(MimeType.PLAIN_TEXT);
  const yamlLib = loadYamlLibrary_();

  while (files.hasNext()) {
    const file = files.next();
    if (!/\.ya?ml$/i.test(file.getName())) {
      continue;
    }

    const yamlText = file.getBlob().getDataAsString();
    const parsed = yamlLib.load(yamlText);
    const baseName = file.getName().replace(/\.ya?ml$/i, '');

    const spreadsheet = getOrCreateSpreadsheet_(folder, baseName);
    populateSpreadsheet_(spreadsheet, parsed);
  }
}

function getOrCreateSpreadsheet_(folder, baseName) {
  const targetName = `${CONFIG.sheetNamePrefix}${baseName}`;
  const existing = folder.getFilesByName(targetName);
  while (existing.hasNext()) {
    const candidate = existing.next();
    if (candidate.getMimeType() === MimeType.GOOGLE_SHEETS) {
      return SpreadsheetApp.openById(candidate.getId());
    }
  }

  const spreadsheet = SpreadsheetApp.create(targetName);
  const file = DriveApp.getFileById(spreadsheet.getId());
  folder.addFile(file);
  try {
    DriveApp.getRootFolder().removeFile(file);
  } catch (err) {
    // Ignora se lo spostamento dal root non è permesso.
  }
  return spreadsheet;
}

function populateSpreadsheet_(spreadsheet, data) {
  const topLevelEntries = buildTopLevelEntries_(data);
  const desiredNames = new Set(topLevelEntries.map(entry => entry.sheetName));

  spreadsheet.getSheets().forEach(sheet => {
    if (!desiredNames.has(sheet.getName())) {
      spreadsheet.deleteSheet(sheet);
    }
  });

  topLevelEntries.forEach(entry => {
    const sheet = getOrCreateSheet_(spreadsheet, entry.sheetName);
    writeTableToSheet_(sheet, entry.table);
  });
}

function buildTopLevelEntries_(data) {
  if (Array.isArray(data)) {
    return [createSheetEntry_('root', data)];
  }
  if (data && typeof data === 'object') {
    return Object.keys(data).map(key => createSheetEntry_(key, data[key]));
  }
  return [createSheetEntry_('value', data)];
}

function createSheetEntry_(key, value) {
  const sheetName = sanitizeSheetName_(key);
  const table = buildTableFromValue_(value);
  return { sheetName, table };
}

function getOrCreateSheet_(spreadsheet, name) {
  const existing = spreadsheet.getSheetByName(name);
  if (existing) {
    existing.clearContents();
    existing.clearFormats();
    return existing;
  }
  return spreadsheet.insertSheet(name);
}

function writeTableToSheet_(sheet, table) {
  if (!table.length || !table[0].length) {
    sheet.clearContents();
    return;
  }
  sheet.getRange(1, 1, table.length, table[0].length).setValues(table);
  sheet.setFrozenRows(1);
  const headerRange = sheet.getRange(1, 1, 1, table[0].length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f1f3f4');
  sheet.autoResizeColumns(1, table[0].length);
}

function buildTableFromValue_(value) {
  if (Array.isArray(value)) {
    return buildTableFromArray_(value);
  }
  if (value && typeof value === 'object') {
    return buildTableFromObject_(value);
  }
  return [['value'], [formatCellValue_(value)]];
}

function buildTableFromArray_(arr) {
  if (!arr.length) {
    return [['index', 'value']];
  }

  if (arr.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
    const headers = Array.from(arr.reduce((set, item) => {
      Object.keys(item).forEach(key => set.add(key));
      return set;
    }, new Set()));
    headers.sort();
    const rows = arr.map((item, idx) => {
      return headers.map(header => formatCellValue_(item[header]));
    });
    return [headers, ...rows];
  }

  const rows = arr.map((item, idx) => [idx, formatCellValue_(item)]);
  return [['index', 'value'], ...rows];
}

function buildTableFromObject_(obj) {
  const rows = Object.keys(obj).sort().map(key => [key, formatCellValue_(obj[key])]);
  return [['key', 'value'], ...rows];
}

function formatCellValue_(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

function sanitizeSheetName_(rawName) {
  const cleaned = String(rawName || 'Sheet')
    .replace(/[\\?/\*\[\]]/g, ' ')
    .trim()
    .substring(0, 90);
  const prefix = CONFIG.sheetNamePrefix ? CONFIG.sheetNamePrefix.trim() + ' ' : '';
  return prefix + (cleaned || 'Sheet');
}

function loadYamlLibrary_() {
  if (this.__yamlLib) {
    return this.__yamlLib;
  }
  const cache = CacheService.getScriptCache();
  let source = cache.get('YAML_LIB_SRC');
  if (!source) {
    const response = UrlFetchApp.fetch(CONFIG.yamlLibraryUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      throw new Error(`Impossibile scaricare la libreria YAML (HTTP ${response.getResponseCode()}).`);
    }
    source = response.getContentText();
    cache.put('YAML_LIB_SRC', source, 21600);
  }

  const factory = new Function(
    'const exports = {};\n' +
    'const module = { exports };\n' +
    'var window = {};\n' +
    'var self = {};\n' +
    'var global = window;\n' +
    source +
    '\nreturn module.exports || window.jsyaml || self.jsyaml || this.jsyaml || jsyaml;'
  );

  const yamlLib = factory();
  if (!yamlLib || typeof yamlLib.load !== 'function') {
    throw new Error('Libreria YAML non valida: funzione load mancante.');
  }
  this.__yamlLib = yamlLib;
  return this.__yamlLib;
}
