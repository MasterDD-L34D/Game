/**
 * Reads data from stdin and parses it as JSON.
 *
 * @returns {Promise<Object>} A promise that resolves to the parsed JSON object or an empty object.
 */
async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      try {
        resolve(data.trim() ? JSON.parse(data) : {});
      } catch (err) {
        reject(new Error(`Failed to parse stdin JSON: ${err.message}`));
      }
    });
    process.stdin.on('error', reject);
    if (process.stdin.isTTY) resolve({});
  });
}

/**
 * Writes data to stdout as a JSON string.
 *
 * @param {Object} data The data object to be written.
 * @returns {void}
 */
function writeOutput(data) {
  console.log(JSON.stringify(data));
}

/**
 * Outputs a success message to stdout, optionally with additional context.
 *
 * @param {Object|null} [additionalContext=null] Optional additional context for the success message.
 * @returns {void}
 */
function outputSuccess(additionalContext = null) {
  if (additionalContext) {
    writeOutput({
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext },
    });
  } else {
    writeOutput({ continue: true, suppressOutput: true });
  }
}

/**
 * Outputs an error message to stderr and a continuation message to stdout.
 *
 * @param {string} message The error message to log.
 * @returns {void}
 */
function outputError(message) {
  console.error(`Supermemory: ${message}`);
  writeOutput({ continue: true, suppressOutput: true });
}

module.exports = { readStdin, writeOutput, outputSuccess, outputError };
