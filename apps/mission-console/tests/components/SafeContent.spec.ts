import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import SafeContent from '../../src/components/common/SafeContent.vue';

describe('SafeContent', () => {
  it('sanitizza il markup HTML rimuovendo script e attributi pericolosi', () => {
    const wrapper = mount(SafeContent, {
      props: {
        source:
          '<p>Ciao <strong>team</strong></p><img src="https://example.com/logo.png" onerror="alert(1)" /><script>alert(1)</script>',
        tag: 'section',
      },
    });

    const html = wrapper.html();
    expect(html).toContain('<p>Ciao <strong>team</strong></p>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
  });

  it('renderizza markdown in modo sicuro rimuovendo URI non validi', () => {
    const wrapper = mount(SafeContent, {
      props: {
        source: '# Titolo\n[malicious](javascript:alert(2))',
        kind: 'markdown',
      },
    });

    const html = wrapper.html();
    expect(html).toContain('<h1>');
    expect(html).toContain('<a');
    expect(html).not.toContain('javascript:');
  });
});
