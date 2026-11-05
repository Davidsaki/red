import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
  pool: { query: vi.fn() },
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));

import { PUT, DELETE } from '@/app/api/applications/[id]/route';
import { PATCH, DELETE as DELETE_PROJECT } from '@/app/api/projects/[id]/route';
import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth';

const mockSql = sql as unknown as ReturnType<typeof vi.fn>;
const mockSession = getServerSession as ReturnType<typeof vi.fn>;
const params = { params: Promise.resolve({ id: '1' }) };

function createRequest(options?: RequestInit): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/x/1'), options);
}

const validProposal =
  'Propuesta actualizada con suficientes caracteres para pasar la validación del esquema de aplicaciones';

describe('non-pending applications are immutable', () => {
  beforeEach(() => vi.clearAllMocks());

  for (const status of ['accepted', 'finished']) {
    it(`PUT returns 409 when ${status}`, async () => {
      mockSession.mockResolvedValue({ user: { email: 'free@example.com' } });
      mockSql
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce({ rows: [{ freelancer_id: 2, status }] });

      const res = await PUT(createRequest({ method: 'PUT', body: JSON.stringify({ proposal: validProposal }) }), params);

      expect(res.status).toBe(409);
      expect(mockSql).toHaveBeenCalledTimes(2);
    });

    it(`DELETE returns 409 when ${status}`, async () => {
      mockSession.mockResolvedValue({ user: { email: 'free@example.com' } });
      mockSql
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce({ rows: [{ freelancer_id: 2, status }] });

      const res = await DELETE(createRequest({ method: 'DELETE' }), params);

      expect(res.status).toBe(409);
      expect(mockSql).toHaveBeenCalledTimes(2);
    });
  }

  it('PUT returns 409 when selected between the check and the update', async () => {
    mockSession.mockResolvedValue({ user: { email: 'free@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ freelancer_id: 2, status: 'pending' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await PUT(createRequest({ method: 'PUT', body: JSON.stringify({ proposal: validProposal }) }), params);

    expect(res.status).toBe(409);
  });

  it('DELETE returns 409 when selected between the check and the delete', async () => {
    mockSession.mockResolvedValue({ user: { email: 'free@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ freelancer_id: 2, status: 'pending' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await DELETE(createRequest({ method: 'DELETE' }), params);

    expect(res.status).toBe(409);
  });
});

describe('projects in execution', () => {
  beforeEach(() => vi.clearAllMocks());

  function ownerWithStatus(status: string): void {
    mockSession.mockResolvedValue({ user: { email: 'owner@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ employer_id: 1, status }] });
  }

  it('PATCH returns 409 when in_progress', async () => {
    ownerWithStatus('in_progress');
    const res = await PATCH(createRequest({ method: 'PATCH', body: JSON.stringify({ status: 'closed' }) }), params);

    expect(res.status).toBe(409);
    expect(mockSql).toHaveBeenCalledTimes(2);
  });

  it('DELETE returns 409 when in_progress and deletes nothing', async () => {
    ownerWithStatus('in_progress');
    const res = await DELETE_PROJECT(createRequest({ method: 'DELETE' }), params);

    expect(res.status).toBe(409);
    expect(mockSql).toHaveBeenCalledTimes(2);
  });

  it('PATCH returns 409 when a contractor is selected between the check and the update', async () => {
    ownerWithStatus('open');
    mockSql.mockResolvedValueOnce({ rows: [] });
    const res = await PATCH(createRequest({ method: 'PATCH', body: JSON.stringify({ status: 'closed' }) }), params);

    expect(res.status).toBe(409);
  });

  it('PATCH cannot set completed', async () => {
    ownerWithStatus('open');
    const res = await PATCH(createRequest({ method: 'PATCH', body: JSON.stringify({ status: 'completed' }) }), params);

    expect(res.status).toBe(400);
  });
});
