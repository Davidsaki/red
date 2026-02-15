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

import { POST, GET } from '@/app/api/applications/route';
import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth';

const mockSql = sql as unknown as ReturnType<typeof vi.fn>;
const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('POST /api/applications', () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = {
    project_id: 1,
    proposal: 'Esta es una propuesta de trabajo lo suficientemente larga como para pasar la validación mínima de caracteres',
    bid: 300000,
  };

  it('creates application with valid data', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'freelancer@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // user lookup
      .mockResolvedValueOnce({ rows: [{ id: 1, employer_id: 1, status: 'open' }] }) // project check
      .mockResolvedValueOnce({ rows: [] }) // no existing application
      .mockResolvedValueOnce({ rows: [{ id: 1, ...validBody }] }); // insert

    const request = createRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.application).toBeDefined();
  });

  it('creates application without bid (optional)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'freelancer@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, employer_id: 1, status: 'open' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const bodyNoBid = { project_id: 1, proposal: validBody.proposal };
    const request = createRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: JSON.stringify(bodyNoBid),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('allows applying to own project', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'owner@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // user IS the owner (id: 1)
      .mockResolvedValueOnce({ rows: [{ id: 1, employer_id: 1, status: 'open' }] }) // project owned by user 1
      .mockResolvedValueOnce({ rows: [] }) // no existing application
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // insert

    const request = createRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = createRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('returns 409 for duplicate application', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'freelancer@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, employer_id: 1, status: 'open' }] })
      .mockResolvedValueOnce({ rows: [{ id: 5 }] }); // existing application

    const request = createRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);

    expect(response.status).toBe(409);
  });

  it('returns 400 with invalid data', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'freelancer@example.com' } });
    mockSql.mockResolvedValueOnce({ rows: [{ id: 2 }] });

    const request = createRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: JSON.stringify({ project_id: 1, proposal: 'Too short' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('returns 400 when project is not open', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'freelancer@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, employer_id: 1, status: 'closed' }] });

    const request = createRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});

describe('GET /api/applications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns user applications', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'freelancer@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockResolvedValueOnce({
        rows: [
          { id: 1, project_title: 'Project 1', status: 'pending' },
          { id: 2, project_title: 'Project 2', status: 'accepted' },
        ],
      });

    const request = createRequest('http://localhost:3000/api/applications');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.applications).toHaveLength(2);
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = createRequest('http://localhost:3000/api/applications');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
