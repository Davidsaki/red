import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockQuery, mockRelease } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRelease: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
  pool: { connect: vi.fn(async () => ({ query: mockQuery, release: mockRelease })) },
}));

vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendContractorSelectedEmail: vi.fn() }));

import { POST as select } from '@/app/api/applications/[id]/select/route';
import { POST as complete } from '@/app/api/projects/[id]/complete/route';
import { POST as reopen } from '@/app/api/projects/[id]/reopen/route';
import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { sendContractorSelectedEmail } from '@/lib/email';

const mockSql = sql as unknown as ReturnType<typeof vi.fn>;
const mockSession = getServerSession as ReturnType<typeof vi.fn>;
const mockEmail = sendContractorSelectedEmail as ReturnType<typeof vi.fn>;

const params = { params: Promise.resolve({ id: '1' }) };

function req(): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/x'), { method: 'POST' });
}

function statements(): string[] {
  return mockQuery.mock.calls.map((c) => String(c[0]).trim().split(/\s+/)[0]);
}

function asOwner(): void {
  mockSession.mockResolvedValue({ user: { email: 'owner@example.com' } });
  mockSql.mockResolvedValueOnce({ rows: [{ id: 1 }] });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [] });
});

const openProject = { id: 10, title: 'Proyecto', employer_id: 1, status: 'open' };
const pendingApp = { status: 'pending', freelancer_email: 'free@example.com' };

function selectFlow(project: Record<string, unknown>, application: Record<string, unknown> | null): void {
  mockQuery
    .mockResolvedValueOnce({ rows: [] }) // BEGIN
    .mockResolvedValueOnce({ rows: [{ project_id: 10 }] })
    .mockResolvedValueOnce({ rows: [project] })
    .mockResolvedValueOnce({ rows: application ? [application] : [] });
}

describe('POST /api/applications/[id]/select', () => {
  it('selects the applicant and notifies', async () => {
    asOwner();
    selectFlow(openProject, pendingApp);
    mockEmail.mockResolvedValue(undefined);

    const res = await select(req(), params);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true, notified: true });
    expect(statements()).toContain('COMMIT');
    expect(mockQuery.mock.calls.some((c) => String(c[0]).includes("status = 'accepted'"))).toBe(true);
    expect(mockEmail).toHaveBeenCalledWith('free@example.com', 10, 'Proyecto');
    expect(mockRelease).toHaveBeenCalled();
  });

  it('returns 401 without session', async () => {
    mockSession.mockResolvedValue(null);
    expect((await select(req(), params)).status).toBe(401);
  });

  it('returns 403 for a non-owner', async () => {
    asOwner();
    selectFlow({ ...openProject, employer_id: 99 }, pendingApp);

    const res = await select(req(), params);

    expect(res.status).toBe(403);
    expect(statements()).toContain('ROLLBACK');
    expect(statements()).not.toContain('COMMIT');
    expect(mockEmail).not.toHaveBeenCalled();
  });

  it('returns 409 when the project is not open', async () => {
    asOwner();
    selectFlow({ ...openProject, status: 'in_progress' }, pendingApp);

    const res = await select(req(), params);

    expect(res.status).toBe(409);
    expect(mockEmail).not.toHaveBeenCalled();
  });

  it('returns 409 when the application is not pending', async () => {
    asOwner();
    selectFlow(openProject, { ...pendingApp, status: 'finished' });

    const res = await select(req(), params);

    expect(res.status).toBe(409);
    expect(statements()).toContain('ROLLBACK');
  });

  it('maps a unique violation to 409', async () => {
    asOwner();
    selectFlow(openProject, pendingApp);
    mockQuery.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: '23505' }));

    const res = await select(req(), params);

    expect(res.status).toBe(409);
    expect(mockEmail).not.toHaveBeenCalled();
    expect(mockRelease).toHaveBeenCalled();
  });

  it('still succeeds with notified false when the email fails', async () => {
    asOwner();
    selectFlow(openProject, pendingApp);
    mockEmail.mockRejectedValue(new Error('resend down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await select(req(), params);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true, notified: false });
    expect(statements()).toContain('COMMIT');
  });
});

describe.each([
  ['complete', complete, 'completed'],
  ['reopen', reopen, 'open'],
] as const)('POST /api/projects/[id]/%s', (_name, handler, target) => {
  function flow(project: Record<string, unknown>): void {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [project] })
      .mockResolvedValueOnce({ rows: [] }) // finish application
      .mockResolvedValueOnce({ rows: [{ id: 1, status: target }] });
  }

  it('finishes the accepted application and updates the project', async () => {
    asOwner();
    flow({ employer_id: 1, status: 'in_progress' });

    const res = await handler(req(), params);

    expect(res.status).toBe(200);
    const calls = mockQuery.mock.calls;
    expect(String(calls[2][0])).toContain("status = 'finished'");
    expect(String(calls[2][0])).toContain('finished_at = NOW()');
    expect(calls[3][1]).toEqual([1, target]);
    expect(statements()).toContain('COMMIT');
    expect(mockRelease).toHaveBeenCalled();
  });

  it('returns 403 for a non-owner', async () => {
    asOwner();
    flow({ employer_id: 99, status: 'in_progress' });
    expect((await handler(req(), params)).status).toBe(403);
    expect(statements()).not.toContain('COMMIT');
  });

  it('returns 409 when the project is not in progress', async () => {
    asOwner();
    flow({ employer_id: 1, status: 'open' });
    const res = await handler(req(), params);
    expect(res.status).toBe(409);
    expect(statements()).toContain('ROLLBACK');
  });

  it('returns 404 when the project does not exist', async () => {
    asOwner();
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
    expect((await handler(req(), params)).status).toBe(404);
  });
});
