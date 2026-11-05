import { describe, it, expect, vi, beforeEach } from 'vitest';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

import { sendContractorSelectedEmail } from '@/lib/email';

describe('sendContractorSelectedEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('escapes the project title and links to the project', async () => {
    send.mockResolvedValue({ data: { id: 'x' }, error: null });

    await sendContractorSelectedEmail('a@b.co', 7, `<script>alert("x")</script> & 'q'`);

    const arg = send.mock.calls[0][0];
    expect(arg.html).not.toContain('<script>');
    expect(arg.html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39;');
    expect(arg.html).toContain('/projects/7');
    expect(arg.subject).toBe('Te seleccionaron para un proyecto — Red de Contratistas');
    expect(arg.subject).not.toMatch(/[\r\n]/);
  });

  it('throws when Resend returns an error', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'bad', name: 'x' } });
    await expect(sendContractorSelectedEmail('a@b.co', 1, 'T')).rejects.toThrow();
  });
});
