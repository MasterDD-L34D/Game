function createMockFs(initialFiles = {}) {
  const files = new Map();

  function storeFile(filePath, content) {
    const payload = typeof content === 'string' ? content : JSON.stringify(content);
    files.set(filePath, {
      content: payload,
      mtimeMs: Date.now(),
    });
  }

  for (const [filePath, content] of Object.entries(initialFiles)) {
    storeFile(filePath, content);
  }

  class MockFileHandle {
    constructor(file) {
      this.file = file;
    }

    async close() {
      return undefined;
    }
  }

  const api = {
    async readFile(filePath, encoding = 'utf8') {
      if (!files.has(filePath)) {
        const error = new Error(`File not found: ${filePath}`);
        error.code = 'ENOENT';
        throw error;
      }
      const entry = files.get(filePath);
      if (encoding === 'utf8') {
        return entry.content;
      }
      return Buffer.from(entry.content, 'utf8');
    },
    async writeFile(filePath, content) {
      storeFile(filePath, typeof content === 'string' ? content : content.toString());
    },
    async mkdir() {
      return undefined;
    },
    async rename(source, target) {
      if (!files.has(source)) {
        const error = new Error(`File not found: ${source}`);
        error.code = 'ENOENT';
        throw error;
      }
      const entry = files.get(source);
      files.set(target, {
        content: entry.content,
        mtimeMs: Date.now(),
      });
      files.delete(source);
    },
    async unlink(filePath) {
      if (!files.delete(filePath)) {
        const error = new Error(`File not found: ${filePath}`);
        error.code = 'ENOENT';
        throw error;
      }
    },
    async stat(filePath) {
      const entry = files.get(filePath);
      if (!entry) {
        const error = new Error(`File not found: ${filePath}`);
        error.code = 'ENOENT';
        throw error;
      }
      return { mtimeMs: entry.mtimeMs };
    },
    async open(filePath, flags) {
      if (flags.includes('x')) {
        if (files.has(filePath)) {
          const error = new Error(`File exists: ${filePath}`);
          error.code = 'EEXIST';
          throw error;
        }
        storeFile(filePath, '');
        return new MockFileHandle(filePath);
      }
      throw new Error(`Unsupported flag combination: ${flags}`);
    },
    __files: files,
  };

  return api;
}

module.exports = { createMockFs };
