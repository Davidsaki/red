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

import { GET, POST } from '@/app/api/categories/route';
import { pool, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';

const mockPool = pool as { query: ReturnType<typeof vi.fn> };
const mockSql = sql as unknown as ReturnType<typeof vi.fn>;
const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('GET /api/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns approved categories', async () => {
    const mockCategories = [
      { id: 1, name: 'Electricidad', slug: 'electricidad', skills: [] },
      { id: 2, name: 'Plomería', slug: 'plomeria', skills: [] },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockCategories });
    mockGetServerSession.mockResolvedValue(null); // no session

    const request = createRequest('http://localhost:3000/api/categories');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.categories).toHaveLength(2);
    expect(data.categories[0].name).toBe('Electricidad');
    expect(data.mySuggestions).toEqual([]);
  });

  it('includes user suggestions when authenticated', async () => {
    const mockCategories = [{ id: 1, name: 'Electricidad', slug: 'electricidad', skills: [] }];
    const mockSuggestions = [{ id: 99, name: 'Mi Categoría', slug: 'mi-categoria', status: 'pending' }];

    mockPool.query
      .mockResolvedValueOnce({ rows: mockCategories }) // categories query
      .mockResolvedValueOnce({ rows: mockSuggestions }); // suggestions query

    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    mockSql.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // user lookup

    const request = createRequest('http://localhost:3000/api/categories');
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.mySuggestions).toHaveLength(1);
    expect(data.mySuggestions[0].name).toBe('Mi Categoría');
  });

  it('returns 500 on database error', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('DB error'));

    const request = createRequest('http://localhost:3000/api/categories');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);
  });
});

describe('POST /api/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates category suggestion with valid session', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    mockSql.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // user lookup
    mockPool.query
      .mockResolvedValueOnce({ rows: [] }) // slug check (no conflict)
      .mockResolvedValueOnce({ rows: [{ id: 50, name: 'Nueva Cat', slug: 'nueva-cat', status: 'pending' }] }); // insert

    const request = createRequest('http://localhost:3000/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Nueva Cat' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.category).toBeDefined();
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = createRequest('http://localhost:3000/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it('returns 400 with invalid name', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    mockSql.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const request = createRequest('http://localhost:3000/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'A' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('returns 409 when category slug already exists', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    mockSql.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // user lookup
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 5 }] }); // slug conflict

    const request = createRequest('http://localhost:3000/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Electricidad' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe('Ya existe una categoría similar');
  });
});
