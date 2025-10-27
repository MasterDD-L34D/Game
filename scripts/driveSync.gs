/**
 * Apps Script per sincronizzare YAML in Google Sheet.
 * 1) Crea un Apps Script collegato alla cartella Drive che contiene gli YAML.
 * 2) Imposta le Script Properties (DRIVE_SYNC_FOLDER_ID, ecc.) o modifica CONFIG di seguito.
 * 3) Esegui convertYamlToSheets().
 * 4) (Opzionale) Lancia ensureAutoSyncTrigger() per programmare aggiornamenti automatici.
 *
 * Lo script scarica js-yaml da jsDelivr, converte ciascun file YAML in uno Spreadsheet
 * (una tab per ogni chiave di primo livello) e sposta lo Spreadsheet nella cartella sorgente.
 */
const scriptProps = PropertiesService.getScriptProperties();
const CONFIG = {
  folderId:
    scriptProps.getProperty('DRIVE_SYNC_FOLDER_ID') || '1VCLogSheetsSyncHub2025Ops',
  yamlLibraryUrl:
    scriptProps.getProperty('DRIVE_SYNC_YAML_LIB_URL') ||
    'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js',
  sheetNamePrefix:
    scriptProps.getProperty('DRIVE_SYNC_SHEET_PREFIX') || '[VC Logs] ',
  autoSync: {
    enabled: String(scriptProps.getProperty('DRIVE_SYNC_AUTOSYNC_ENABLED') || 'true') === 'true',
    everyHours: Number(scriptProps.getProperty('DRIVE_SYNC_AUTOSYNC_EVERY_HOURS') || 6)
  }
};
CONFIG.sources = getConfiguredSources_();

let currentSheetNamePrefix_ = '';

function convertYamlToSheets() {
  const yamlLib = loadYamlLibrary_();
  const sources = CONFIG.sources && CONFIG.sources.length ? CONFIG.sources : getFallbackSources_();

  sources.forEach(source => {
    processSource_(source, yamlLib, false);
  });
}

function convertYamlToSheetsDryRun() {
  const yamlLib = loadYamlLibrary_();
  const sources = CONFIG.sources && CONFIG.sources.length ? CONFIG.sources : getFallbackSources_();
  const summaries = sources.map(source => processSource_(source, yamlLib, true));
  Logger.log(JSON.stringify(summaries, null, 2));
  return summaries;
}

function processSource_(source, yamlLib, dryRun) {
  const normalizedSource = normalizeSourceConfig_(source, {
    folderId: CONFIG.folderId,
    destinationFolderId: CONFIG.folderId,
    sheetNamePrefix: CONFIG.sheetNamePrefix
  });
  if (!normalizedSource.folderId) {
    throw new Error('Configura una folderId valida per l\'origine della sincronizzazione.');
  }

  const folder = DriveApp.getFolderById(normalizedSource.folderId);
  const destinationFolder = normalizedSource.destinationFolderId
    ? DriveApp.getFolderById(normalizedSource.destinationFolderId)
    : folder;

  applySheetNamePrefix_(normalizedSource.sheetNamePrefix);

  const files = folder.getFilesByType(MimeType.PLAIN_TEXT);
  const processedEntries = [];

  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();
    if (!isYamlCandidate_(fileName, normalizedSource)) {
      continue;
    }

    const baseName = fileName.replace(/\.ya?ml$/i, '');
    try {
      const yamlText = file.getBlob().getDataAsString();
      const parsed = yamlLib.load(yamlText);
      const topLevelEntries = buildTopLevelEntries_(parsed);
      const filterResult = shouldSkipDataset_(parsed, normalizedSource);

      if (filterResult.shouldSkip) {
        processedEntries.push({
          fileName,
          skipped: true,
          reason: filterResult.reason,
          detectedCycle: filterResult.detectedCycle
        });
        continue;
      }

      if (dryRun) {
        processedEntries.push({
          fileName,
          skipped: false,
          detectedCycle: filterResult.detectedCycle,
          targetSpreadsheet: buildSpreadsheetName_(baseName),
          sheets: topLevelEntries.map(entry => entry.sheetName)
        });
        continue;
      }

      const spreadsheet = getOrCreateSpreadsheet_(destinationFolder, baseName);
      populateSpreadsheet_(spreadsheet, parsed, topLevelEntries);
    } catch (error) {
      if (dryRun) {
        processedEntries.push({
          fileName,
          skipped: true,
          error: error && error.message ? error.message : String(error)
        });
        continue;
      }
      throw error;
    }
  }

  if (dryRun) {
    return {
      sourceId: normalizedSource.id || null,
      folderId: normalizedSource.folderId,
      destinationFolderId: normalizedSource.destinationFolderId,
      sheetNamePrefix: stripTrailingSpace_(currentSheetNamePrefix_),
      processedFiles: processedEntries
    };
  }
  return null;
}

function getConfiguredSources_() {
  const raw = scriptProps.getProperty('DRIVE_SYNC_SOURCES');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed
          .map(entry => normalizeSourceConfig_(entry, {
            folderId: CONFIG.folderId,
            destinationFolderId: CONFIG.folderId,
            sheetNamePrefix: CONFIG.sheetNamePrefix
          }))
          .filter(Boolean);
      }
    } catch (error) {
      Logger.log('Impossibile leggere DRIVE_SYNC_SOURCES: ' + error);
    }
  }

  const defaults = buildDefaultSources_();
  return defaults.length ? defaults : getFallbackSources_();
}

function buildDefaultSources_() {
  const baseSource = normalizeSourceConfig_(
    {
      id: 'vc-logs',
      folderId: scriptProps.getProperty('DRIVE_SYNC_FOLDER_ID'),
      destinationFolderId: scriptProps.getProperty('DRIVE_SYNC_DEST_FOLDER_ID'),
      sheetNamePrefix: scriptProps.getProperty('DRIVE_SYNC_SHEET_PREFIX')
    },
    {
      folderId: CONFIG.folderId,
      destinationFolderId: CONFIG.folderId,
      sheetNamePrefix: CONFIG.sheetNamePrefix
    }
  );

  const sources = [baseSource];

  const hubEnabled = String(
    scriptProps.getProperty('DRIVE_SYNC_ENABLE_HUB_SOURCE') || 'true'
  ).toLowerCase() !== 'false';

  if (hubEnabled) {
    const hubSource = normalizeSourceConfig_(
      {
        id: 'hub-ops',
        folderId: scriptProps.getProperty('DRIVE_SYNC_HUB_FOLDER_ID'),
        destinationFolderId: scriptProps.getProperty('DRIVE_SYNC_HUB_DEST_FOLDER_ID'),
        sheetNamePrefix: scriptProps.getProperty('DRIVE_SYNC_HUB_SHEET_PREFIX') || '[Hub Ops] ',
        includeFilePattern:
          scriptProps.getProperty('DRIVE_SYNC_HUB_INCLUDE_REGEX') || 'hub-(ops|cycle)',
        minCycle: Number(scriptProps.getProperty('DRIVE_SYNC_HUB_MIN_CYCLE') || 2)
      },
      {
        folderId: CONFIG.folderId,
        destinationFolderId: CONFIG.folderId,
        sheetNamePrefix: '[Hub Ops] ',
        minCycle: 2
      }
    );

    if (hubSource.includePattern) {
      baseSource.excludePattern = hubSource.includePattern;
    }

    sources.push(hubSource);
  }

  return sources.filter(Boolean);
}

function getFallbackSources_() {
  return [
    normalizeSourceConfig_(
      {
        id: 'fallback',
        folderId: CONFIG.folderId,
        destinationFolderId: CONFIG.folderId,
        sheetNamePrefix: CONFIG.sheetNamePrefix
      },
      {
        folderId: CONFIG.folderId,
        destinationFolderId: CONFIG.folderId,
        sheetNamePrefix: CONFIG.sheetNamePrefix
      }
    )
  ];
}

function normalizeSourceConfig_(source, fallback) {
  const safeSource = source || {};
  const safeFallback = fallback || {};
  const folderId = safeSource.folderId || safeFallback.folderId || CONFIG.folderId;
  const destinationFolderId =
    safeSource.destinationFolderId || safeSource.folderId || safeFallback.destinationFolderId || folderId;
  const sheetNamePrefix =
    safeSource.sheetNamePrefix !== undefined
      ? safeSource.sheetNamePrefix
      : safeFallback.sheetNamePrefix !== undefined
      ? safeFallback.sheetNamePrefix
      : CONFIG.sheetNamePrefix;

  const normalized = {
    id: safeSource.id || safeSource.name || null,
    folderId,
    destinationFolderId,
    sheetNamePrefix,
    minCycle:
      typeof safeSource.minCycle === 'number' && isFinite(safeSource.minCycle)
        ? safeSource.minCycle
        : typeof safeFallback.minCycle === 'number' && isFinite(safeFallback.minCycle)
        ? safeFallback.minCycle
        : null,
    includePattern: buildPattern_(safeSource.includePattern || safeSource.includeFilePattern),
    excludePattern: buildPattern_(safeSource.excludePattern || safeSource.excludeFilePattern)
  };

  return normalized;
}

function buildPattern_(patternLike) {
  if (!patternLike) {
    return null;
  }
  if (patternLike instanceof RegExp) {
    return patternLike;
  }
  try {
    return new RegExp(patternLike, 'i');
  } catch (error) {
    Logger.log('Regex pattern non valido ignorato: ' + patternLike);
    return null;
  }
}

function applySheetNamePrefix_(prefix) {
  currentSheetNamePrefix_ = normalizeSheetPrefix_(
    prefix !== undefined && prefix !== null ? String(prefix) : CONFIG.sheetNamePrefix
  );
}

function normalizeSheetPrefix_(value) {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed + ' ' : '';
}

function stripTrailingSpace_(value) {
  if (!value) {
    return '';
  }
  return value.replace(/\s+$/, '');
}

function buildSpreadsheetName_(baseName) {
  const cleanedBase = String(baseName || '').trim() || 'Sheet';
  return `${currentSheetNamePrefix_}${cleanedBase}`;
}

function isYamlCandidate_(fileName, source) {
  if (!/\.ya?ml$/i.test(fileName)) {
    return false;
  }
  if (source && source.includePattern && !source.includePattern.test(fileName)) {
    return false;
  }
  if (source && source.excludePattern && source.excludePattern.test(fileName)) {
    return false;
  }
  return true;
}

function shouldSkipDataset_(data, source) {
  const result = {
    shouldSkip: false,
    reason: '',
    detectedCycle: null
  };

  if (!source || typeof source.minCycle !== 'number' || !isFinite(source.minCycle)) {
    return result;
  }

  const detectedCycle = extractCycleFromData_(data);
  result.detectedCycle = detectedCycle;

  if (detectedCycle !== null && Number(detectedCycle) <= source.minCycle) {
    result.shouldSkip = true;
    result.reason = `cycle ${detectedCycle} <= soglia ${source.minCycle}`;
  }

  return result;
}

function extractCycleFromData_(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    if (isFinite(value.cycle)) {
      return Number(value.cycle);
    }
    if (value.meta) {
      const nested = extractCycleFromData_(value.meta);
      if (nested !== null) {
        return nested;
      }
    }
    const keysToCheck = ['sessions', 'entries', 'runs', 'cycles'];
    for (let i = 0; i < keysToCheck.length; i++) {
      const key = keysToCheck[i];
      if (Array.isArray(value[key])) {
        for (let j = 0; j < value[key].length; j++) {
          const nested = extractCycleFromData_(value[key][j]);
          if (nested !== null) {
            return nested;
          }
        }
      }
    }
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const nested = extractCycleFromData_(value[i]);
      if (nested !== null) {
        return nested;
      }
    }
  }

  return null;
}

function getOrCreateSpreadsheet_(folder, baseName) {
  const targetName = buildSpreadsheetName_(baseName);
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

function populateSpreadsheet_(spreadsheet, data, topLevelEntries) {
  const entries = topLevelEntries || buildTopLevelEntries_(data);
  const desiredNames = new Set(entries.map(entry => entry.sheetName));

  spreadsheet.getSheets().forEach(sheet => {
    if (!desiredNames.has(sheet.getName())) {
      spreadsheet.deleteSheet(sheet);
    }
  });

  entries.forEach(entry => {
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
  const prefix = currentSheetNamePrefix_;
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

function ensureAutoSyncTrigger() {
  if (!CONFIG.autoSync || CONFIG.autoSync.enabled === false) {
    throw new Error('CONFIG.autoSync deve essere abilitato per creare il trigger.');
  }
  const hours = Number(CONFIG.autoSync.everyHours || 6);
  if (!Number.isFinite(hours) || hours < 1 || hours > 24) {
    throw new Error('CONFIG.autoSync.everyHours deve essere un numero tra 1 e 24.');
  }

  const handlerName = 'convertYamlToSheets';
  const authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  if (authInfo.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) {
    throw new Error('Autorizzazione richiesta: apri ' + authInfo.getAuthorizationUrl('') + ' e riprova.');
  }

  const triggers = ScriptApp.getProjectTriggers();
  if (triggers.length >= 20) {
    throw new Error('Limite massimo di 20 trigger per progetto raggiunto. Rimuovi i trigger inutilizzati.');
  }
  const alreadyExists = triggers.some(trigger => trigger.getHandlerFunction() === handlerName);
  if (alreadyExists) {
    return;
  }

  const builder = ScriptApp.newTrigger(handlerName).timeBased();
  if (hours >= 24) {
    builder.everyDays(Math.max(1, Math.floor(hours / 24))).create();
  } else {
    builder.everyHours(Math.max(1, Math.min(23, Math.floor(hours)))).create();
  }
}

function removeAutoSyncTriggers() {
  const handlerName = 'convertYamlToSheets';
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === handlerName)
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
}
