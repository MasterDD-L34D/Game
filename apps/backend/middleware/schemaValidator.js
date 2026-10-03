'use strict';

let Ajv;
try {
  Ajv = require('ajv/dist/2020');
} catch (error) {
  if (error && error.code !== 'MODULE_NOT_FOUND') {
    throw error;
  }
  Ajv = require('ajv');
}

let draft7MetaSchema;
try {
  draft7MetaSchema = require('ajv/dist/refs/json-schema-draft-07.json');
} catch (error) {
  if (error && error.code !== 'MODULE_NOT_FOUND') {
    throw error;
  }
  draft7MetaSchema = require('ajv/lib/refs/json-schema-draft-07.json');
}

class SchemaValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'SchemaValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

function createSchemaValidator(options = {}) {
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    ...options.ajv,
  });
  ajv.addFormat('date-time', true);
  ajv.addMetaSchema(draft7MetaSchema);
  const validators = new Map();

  function registerSchema(id, schema) {
    const schemaId = id || schema.$id;
    if (!schemaId) {
      throw new Error('ID schema richiesto per la registrazione');
    }
    ajv.removeSchema(schemaId);
    ajv.addSchema(schema, schemaId);
    const validator = ajv.getSchema(schemaId);
    if (!validator) {
      throw new Error(`Schema non valido o non registrato: ${schemaId}`);
    }
    validators.set(schemaId, validator);
    return schemaId;
  }

  function validate(schemaId, payload) {
    const validator = validators.get(schemaId);
    if (!validator) {
      throw new Error(`Validator non registrato per schema: ${schemaId}`);
    }
    const valid = validator(payload);
    if (!valid) {
      throw new SchemaValidationError('Payload non valido', validator.errors || []);
    }
    return true;
  }

  function createMiddleware(schemaId) {
    return (req, res, next) => {
      try {
        validate(schemaId, req.body);
        next();
      } catch (error) {
        if (error instanceof SchemaValidationError) {
          res.status(error.statusCode).json({ error: error.message, details: error.details });
          return;
        }
        next(error);
      }
    };
  }

  return {
    registerSchema,
    validate,
    createMiddleware,
  };
}

module.exports = {
  createSchemaValidator,
  SchemaValidationError,
};
