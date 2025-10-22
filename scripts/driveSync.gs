/**
 * Apps Script d'esempio: converte YAML in JSON in una cartella Drive.
 * 1) Crea un nuovo Apps Script collegato alla cartella.
 * 2) Incolla questo codice e aggiorna FOLDER_ID.
 * 3) Esegui `convertYamlToJson()`.
 */
const FOLDER_ID = 'INSERISCI_FOLDER_ID';

function convertYamlToJson() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const files = folder.getFilesByType(MimeType.PLAIN_TEXT);
  while (files.hasNext()) {
    const f = files.next();
    if (!f.getName().endsWith('.yaml') && !f.getName().endsWith('.yml')) continue;
    const yamlText = f.getBlob().getDataAsString();
    const json = YAML_parse(yamlText); // Richiede libreria esterna YAML su Apps Script
    const outName = f.getName().replace(/\.ya?ml$/,'') + '.json';
    const existing = folder.getFilesByName(outName);
    if (existing.hasNext()) existing.next().setTrashed(true);
    folder.createFile(outName, JSON.stringify(json, null, 2), MimeType.PLAIN_TEXT);
  }
}
