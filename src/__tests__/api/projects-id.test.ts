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

import { GET, PUT, PATCH, DELETE } from '@/app/api/projects/[id]/route';
import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth';

const mockSql = sql as unknown as ReturnType<typeof vi.fn>;
const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

const mockParams = { params: Promise.resolve({ id: '1' }) };

describe('GET /api/projects/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns project by id', async () => {
    mockSql.mockResolvedValueOnce({
      rows: [{ id: 1, title: 'Test Project', employer_name: 'User' }],
    });

    const request = createRequest('http://localhost:3000/api/projects/1');
    const response = await GET(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.project.title).toBe('Test Project');
  });

  it('returns 404 when project not found', async () => {
    mockSql.mockResolvedValueOnce({ rows: [] });

    const request = createRequest('http://localhost:3000/api/projects/999');
    const response = await GET(request, { params: Promise.resolve({ id: '999' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 400 for invalid id', async () => {
    const request = createRequest('http://localhost:3000/api/projects/abc');
    const response = await GET(request, { params: Promise.resolve({ id: 'abc' }) });

    expect(response.status).toBe(400);
  });
});

describe('PUT /api/projects/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = {
    title: 'Proyecto actualizado',
    description: 'Descripción lo suficientemente larga para validar correctamente',
    category: 'Desarrollo Web',
    budget: 600000,
    skills_required: ['TypeScript', 'Next.js'],
  };

  it('updates project with valid data', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'owner@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // user lookup
      .mockResolvedValueOnce({ rows: [{ employer_id: 1 }] }) // project ownership
      .mockResolvedValueOnce({ rows: [{ id: 1, ...validBody }] }); // update

    const request = createRequest('http://localhost:3000/api/projects/1', {
      method: 'PUT',
      body: JSON.stringify(validBody),
    });
    const response = await PUT(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.project).toBeDefined();
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = createRequest('http://localhost:3000/api/projects/1', {
      method: 'PUT',
      body: JSON.stringify(validBody),
    });
    const response = await PUT(request, mockParams);

    expect(response.status).toBe(401);
  });

  it('returns 403 when not owner', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'other@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // user lookup (different user)
      .mockResolvedValueOnce({ rows: [{ employer_id: 1 }] }); // project belongs to user 1

    const request = createRequest('http://localhost:3000/api/projects/1', {
      method: 'PUT',
      body: JSON.stringify(validBody),
    });
    const response = await PUT(request, mockParams);

    expect(response.status).toBe(403);
  });

  it('returns 400 with invalid data', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'owner@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ employer_id: 1 }] });

    const request = createRequest('http://localhost:3000/api/projects/1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Ab', description: 'Short', budget: -1, skills_required: [] }),
    });
    const response = await PUT(request, mockParams);

    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/projects/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('changes project status', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'owner@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ employer_id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'closed' }] });

    const request = createRequest('http://localhost:3000/api/projects/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'closed' }),
    });
    const response = await PATCH(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 400 with invalid status', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'owner@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ employer_id: 1 }] });

    const request = createRequest('http://localhost:3000/api/projects/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'invalid' }),
    });
    const response = await PATCH(request, mockParams);

    expect(response.status).toBe(400);
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = createRequest('http://localhost:3000/api/projects/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'closed' }),
    });
    const response = await PATCH(request, mockParams);

    expect(response.status).toBe(401);
  });
});

describe('DELETE /api/projects/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes project as owner', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'owner@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ employer_id: 1 }] })
      .mockResolvedValueOnce({ rows: [] }) // delete applications
      .mockResolvedValueOnce({ rows: [] }); // delete project

    const request = createRequest('http://localhost:3000/api/projects/1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = createRequest('http://localhost:3000/api/projects/1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, mockParams);

    expect(response.status).toBe(401);
  });

  it('returns 403 when not owner', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'other@example.com' } });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ employer_id: 1 }] });

    const request = createRequest('http://localhost:3000/api/projects/1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, mockParams);

    expect(response.status).toBe(403);
  });
});
