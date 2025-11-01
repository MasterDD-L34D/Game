import createDOMPurify from 'dompurify';
import { marked } from 'marked';

let purifier: ReturnType<typeof createDOMPurify> | null = null;

function resolveWindow(): Window | undefined {
  if (typeof window !== 'undefined') {
    return window;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as { window?: Window }).window) {
    return (globalThis as { window?: Window }).window;
  }
  return undefined;
}

function getPurifier(): ReturnType<typeof createDOMPurify> | null {
  if (purifier) {
    return purifier;
  }
  const target = resolveWindow();
  if (!target) {
    return null;
  }
  purifier = createDOMPurify(target);
  purifier.setConfig({ USE_PROFILES: { html: true } });
  return purifier;
}

export function sanitizeHtml(input: string): string {
  if (!input) {
    return '';
  }
  const instance = getPurifier();
  if (!instance) {
    return input.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  }
  return instance.sanitize(input, {
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data:image\/(?:png|jpeg|gif|webp));|[^a-z]|[a-z+.-]+:)/i,
  });
}

marked.use({
  breaks: true,
  gfm: true,
  mangle: false,
  headerIds: false,
});

export function renderMarkdownToSafeHtml(markdown: string): string {
  if (!markdown) {
    return '';
  }
  const raw = marked.parse(markdown, { async: false });
  const html = typeof raw === 'string' ? raw : String(raw);
  return sanitizeHtml(html);
}
