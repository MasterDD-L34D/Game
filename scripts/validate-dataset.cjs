#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv/dist/2020');

function usage() {
  console.error('Usage: node scripts/validate-dataset.cjs <schema> <file> [file ...]');
}

function loadJSON(filePath) {
  const data = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(data);
  } catch (err) {
    throw new Error(`Invalid JSON in ${filePath}: ${err.message}`);
  }
}

function registerSiblingSchemas(ajv, schemaPath) {
  const schemaDir = path.dirname(schemaPath);
  const entries = fs.readdirSync(schemaDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }
    const siblingPath = path.join(schemaDir, entry.name);
    if (siblingPath === schemaPath) {
      continue;
    }
    try {
      const siblingSchema = loadJSON(siblingPath);
      ajv.addSchema(siblingSchema);
    } catch (err) {
      console.warn(`Warning: unable to register schema ${siblingPath}: ${err.message}`);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    usage();
    process.exit(1);
  }
  const [schemaPath, ...files] = args;
  const resolvedSchema = path.resolve(schemaPath);
  const schema = loadJSON(resolvedSchema);
  const ajv = new Ajv({ allErrors: true, strict: false });
  registerSiblingSchemas(ajv, resolvedSchema);
  const validate = ajv.compile(schema);
  let hasErrors = false;

  for (const file of files) {
    const resolvedFile = path.resolve(file);
    let payload;
    try {
      payload = loadJSON(resolvedFile);
    } catch (err) {
      console.error(`❌ ${resolvedFile}`);
      console.error(`  ${err.message}`);
      hasErrors = true;
      continue;
    }
    const valid = validate(payload);
    if (!valid) {
      hasErrors = true;
      console.error(`❌ ${resolvedFile}`);
      for (const error of validate.errors || []) {
        console.error(`  [${error.instancePath || '/'}] ${error.message}`);
        if (error.params) {
          console.error(`    Details: ${JSON.stringify(error.params)}`);
        }
      }
    } else {
      console.log(`✅ ${resolvedFile}`);
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
}

main();
