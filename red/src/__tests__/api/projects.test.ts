import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock db module before importing route
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

import { GET, POST } from '@/app/api/projects/route';
import { pool, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';

const mockPool = pool as { query: ReturnType<typeof vi.fn> };
const mockSql = sql as unknown as ReturnType<typeof vi.fn>;
const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('GET /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns projects with pagination', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ total: '5' }] }) // count query
      .mockResolvedValueOnce({
        rows: [
          { id: 1, title: 'Project 1', employer_name: 'User 1' },
          { id: 2, title: 'Project 2', employer_name: 'User 2' },
        ],
      }); // data query

    const request = createRequest('http://localhost:3000/api/projects?page=1&limit=12');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.projects).toHaveLength(2);
    expect(data.totalCount).toBe(5);
    expect(data.totalPages).toBe(1);
    expect(data.currentPage).toBe(1);
  });

  it('applies search filter', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ total: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, title: 'React Project' }] });

    const request = createRequest('http://localhost:3000/api/projects?search=React');
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    // Verify search param was passed (second call arg includes %React%)
    const countCallParams = mockPool.query.mock.calls[0][1];
    expect(countCallParams).toContain('%React%');
  });

  it('applies category filter', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ total: '2' }] })
      .mockResolvedValueOnce({ rows: [] });

    const request = createRequest('http://localhost:3000/api/projects?category=Desarrollo+Web');
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    const countCallParams = mockPool.query.mock.calls[0][1];
    expect(countCallParams).toContain('Desarrollo Web');
  });

  it('limits page size to 50', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    const request = createRequest('http://localhost:3000/api/projects?limit=100');
    await GET(request);

    // The limit param should be capped at 50
    const dataCallParams = mockPool.query.mock.calls[1][1];
    expect(dataCallParams).toContain(50);
  });

  it('returns 500 on database error', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('DB error'));

    const request = createRequest('http://localhost:3000/api/projects');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);
  });
});

describe('POST /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validBody = {
    title: 'Proyecto de prueba',
    description: 'Descripción lo suficientemente larga para validar correctamente el proyecto',
    category: 'Desarrollo Web',
    budget: 500000,
    skills_required: ['JavaScript', 'React'],
  };

  it('creates project with valid data', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    });
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: 1, subscription_tier: 'free' }] }) // user lookup
      .mockResolvedValueOnce({ rows: [{ id: 10, ...validBody }] }); // insert

    const request = createRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.project).toBeDefined();
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = createRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 with invalid data', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    });
    mockSql.mockResolvedValueOnce({ rows: [{ id: 1, subscription_tier: 'free' }] });

    const invalidBody = { title: 'Ab', description: 'Short', budget: -1, skills_required: [] };
    const request = createRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify(invalidBody),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it('returns 404 when user not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'unknown@example.com' },
    });
    mockSql.mockResolvedValueOnce({ rows: [] }); // user not found

    const request = createRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('User not found');
  });
});
