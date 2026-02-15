import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
  pool: { query: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

import { GET, PUT, DELETE } from '@/app/api/applications/[id]/route';
import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth';

const mockSql = sql as unknown as ReturnType<typeof vi.fn>;
const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

const mockParams = { params: Promise.resolve({ id: '1' }) };

describe('GET /api/applications/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns application as applicant', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'freelancer@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // user lookup
      .mockResolvedValueOnce({
        rows: [{ id: 1, freelancer_id: 2, project_employer_id: 1, proposal: 'Test' }],
      });

    const request = createRequest('http://localhost:3000/api/applications/1');
    const response = await GET(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.application).toBeDefined();
  });

  it('returns application as project owner', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'owner@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, freelancer_id: 2, project_employer_id: 1, proposal: 'Test' }],
      });

    const request = createRequest('http://localhost:3000/api/applications/1');
    const response = await GET(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 403 for unauthorized user', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'stranger@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 3 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, freelancer_id: 2, project_employer_id: 1 }],
      });

    const request = createRequest('http://localhost:3000/api/applications/1');
    const response = await GET(request, mockParams);

    expect(response.status).toBe(403);
  });

  it('returns 404 when not found', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] });

    const request = createRequest('http://localhost:3000/api/applications/999');
    const response = await GET(request, { params: Promise.resolve({ id: '999' }) });

    expect(response.status).toBe(404);
  });
});

describe('PUT /api/applications/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  const validUpdate = {
    proposal: 'Propuesta actualizada con suficientes caracteres para pasar la validación del esquema de aplicaciones',
    bid: 400000,
  };

  it('updates own application', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'freelancer@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ freelancer_id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, ...validUpdate }] });

    const request = createRequest('http://localhost:3000/api/applications/1', {
      method: 'PUT',
      body: JSON.stringify(validUpdate),
    });
    const response = await PUT(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = createRequest('http://localhost:3000/api/applications/1', {
      method: 'PUT',
      body: JSON.stringify(validUpdate),
    });
    const response = await PUT(request, mockParams);

    expect(response.status).toBe(401);
  });

  it('returns 403 when not the applicant', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'other@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 3 }] })
      .mockResolvedValueOnce({ rows: [{ freelancer_id: 2 }] });

    const request = createRequest('http://localhost:3000/api/applications/1', {
      method: 'PUT',
      body: JSON.stringify(validUpdate),
    });
    const response = await PUT(request, mockParams);

    expect(response.status).toBe(403);
  });

  it('returns 404 when application not found', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] });

    const request = createRequest('http://localhost:3000/api/applications/999', {
      method: 'PUT',
      body: JSON.stringify(validUpdate),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: '999' }) });

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/applications/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes own application', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'freelancer@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ freelancer_id: 2 }] })
      .mockResolvedValueOnce({ rows: [] });

    const request = createRequest('http://localhost:3000/api/applications/1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = createRequest('http://localhost:3000/api/applications/1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, mockParams);

    expect(response.status).toBe(401);
  });

  it('returns 403 when not the applicant', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'other@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 3 }] })
      .mockResolvedValueOnce({ rows: [{ freelancer_id: 2 }] });

    const request = createRequest('http://localhost:3000/api/applications/1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, mockParams);

    expect(response.status).toBe(403);
  });
});
