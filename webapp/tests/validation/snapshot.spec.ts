import { describe, expect, it } from 'vitest';

import { parseFlowSnapshot } from '../../src/validation/snapshot';

describe('parseFlowSnapshot', () => {
  it('sanitizza release notes e notifiche da markup potenzialmente pericoloso', () => {
    const snapshot = parseFlowSnapshot({
      qualityRelease: {
        releaseNotesHtml: '<p>Note</p><script>alert(1)</script>',
      },
      qualityReleaseContext: {
        releaseNotesMarkdown: '# Heading <script>bad()</script>',
        releaseConsole: {
          notifications: [
            { id: '1', channel: 'Ops', message: '<em onclick="doBad()">Check</em>', lastTriggeredAt: '2024-06-01T10:00:00Z' },
          ],
        },
      },
    });

    expect(snapshot.qualityRelease.releaseNotesHtml).toContain('<p>Note</p>');
    expect(snapshot.qualityRelease.releaseNotesHtml).not.toContain('<script');
    expect(snapshot.qualityReleaseContext.releaseNotesHtml).toContain('<h1>Heading');
    expect(snapshot.qualityReleaseContext.releaseNotesHtml).not.toContain('<script');
    expect(snapshot.qualityReleaseContext.releaseConsole.notifications[0].message).toContain('<em>Check</em>');
    expect(snapshot.qualityReleaseContext.releaseConsole.notifications[0].message).not.toContain('onclick');
  });

  it('fornisce valori di fallback coerenti per sezioni mancanti', () => {
    const snapshot = parseFlowSnapshot({});

    expect(snapshot.qualityRelease.checks).toEqual({});
    expect(snapshot.qualityRelease.suggestions).toEqual([]);
    expect(snapshot.qualityRelease.releaseNotesHtml).toBe('');
    expect(snapshot.qualityReleaseContext.releaseConsole.notifications).toEqual([]);
  });
});
