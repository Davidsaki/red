import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
  pool: { query: vi.fn() },
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));

import { POST } from '@/app/api/applications/[id]/review/route';
import { getContractorRatings, reviewSchema } from '@/lib/reviews';
import { sql, pool } from '@/lib/db';
import { getServerSession } from 'next-auth';

const mockSql = sql as unknown as ReturnType<typeof vi.fn>;
const mockPoolQuery = (pool as unknown as { query: ReturnType<typeof vi.fn> }).query as ReturnType<typeof vi.fn>;
const mockSession = getServerSession as ReturnType<typeof vi.fn>;

const params = { params: Promise.resolve({ id: '3' }) };

function req(body: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/applications/3/review'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const finishedApp = { id: 3, status: 'finished', freelancer_id: 5, project_id: 10, employer_id: 1 };

function setup(app: Record<string, unknown> | null = finishedApp, userId = 1): void {
  mockSession.mockResolvedValue({ user: { email: 'owner@example.com' } });
  mockSql
    .mockResolvedValueOnce({ rows: [{ id: userId }] })
    .mockResolvedValueOnce({ rows: app ? [app] : [] });
}

beforeEach(() => vi.resetAllMocks());

describe('POST /api/applications/[id]/review', () => {
  it('creates a review with ids taken from the DB', async () => {
    setup();
    mockSql.mockResolvedValueOnce({ rows: [{ id: 1, rating: 4, comment: 'Bien' }] });

    const res = await POST(req({ rating: 4, comment: '  Bien  ', reviewee_id: 999 }), params);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.review.rating).toBe(4);
    const insertCall = mockSql.mock.calls[2];
    expect(insertCall[0].join('?')).toContain('ON CONFLICT (application_id) DO UPDATE');
    expect(insertCall.slice(1)).toEqual([3, 10, 1, 5, 4, 'Bien']);
  });

  it('updates through the same upsert statement when a review exists', async () => {
    setup();
    mockSql.mockResolvedValueOnce({ rows: [{ id: 1, rating: 2, comment: null }] });

    const res = await POST(req({ rating: 2, comment: '' }), params);

    expect(res.status).toBe(200);
    expect(mockSql.mock.calls[2].slice(1)).toEqual([3, 10, 1, 5, 2, null]);
    expect(mockSql.mock.calls[2][0].join('?')).toContain('updated_at = NOW()');
  });

  it('returns 401 without session', async () => {
    mockSession.mockResolvedValue(null);
    expect((await POST(req({ rating: 4 }), params)).status).toBe(401);
  });

  it('returns 403 for a non-owner', async () => {
    setup(finishedApp, 2);
    expect((await POST(req({ rating: 4 }), params)).status).toBe(403);
    expect(mockSql).toHaveBeenCalledTimes(2);
  });

  it('returns 409 when the application is not finished', async () => {
    setup({ ...finishedApp, status: 'accepted' });
    expect((await POST(req({ rating: 4 }), params)).status).toBe(409);
  });

  it('returns 404 when the application does not exist', async () => {
    setup(null);
    expect((await POST(req({ rating: 4 }), params)).status).toBe(404);
  });

  it.each([0, 6, 3.5, '4'])('returns 400 for invalid rating %s', async (rating) => {
    setup();
    expect((await POST(req({ rating }), params)).status).toBe(400);
    expect(mockSql).toHaveBeenCalledTimes(2);
  });

  it('returns 400 for a comment over 1000 characters', async () => {
    setup();
    const res = await POST(req({ rating: 4, comment: 'a'.repeat(1001) }), params);
    expect(res.status).toBe(400);
  });
});

describe('reviewSchema', () => {
  it('turns a blank comment into null', () => {
    const result = reviewSchema.safeParse({ rating: 5, comment: '   ' });
    expect(result.success && result.data.comment).toBeNull();
  });
});

describe('getContractorRatings', () => {
  it('returns an empty map without querying for empty input', async () => {
    const map = await getContractorRatings([]);
    expect(map.size).toBe(0);
    expect(mockPoolQuery).not.toHaveBeenCalled();
  });

  it('groups ratings per reviewee with one query', async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        { reviewee_id: 5, average: 4.5, count: 2 },
        { reviewee_id: 6, average: 3, count: 1 },
      ],
    });

    const map = await getContractorRatings([5, 6, 7]);

    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
    expect(mockPoolQuery.mock.calls[0][1]).toEqual([[5, 6, 7]]);
    expect(map.get(5)).toEqual({ average: 4.5, count: 2 });
    expect(map.get(6)).toEqual({ average: 3, count: 1 });
    expect(map.has(7)).toBe(false);
  });
});
