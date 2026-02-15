import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockConfirm = vi.fn();
global.confirm = mockConfirm;

import ProjectCloseButton from '@/components/ProjectCloseButton';

describe('ProjectCloseButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders button text', () => {
    render(<ProjectCloseButton projectId={1} />);
    expect(screen.getByText('Cerrar')).toBeInTheDocument();
  });

  it('does nothing when confirm is cancelled', async () => {
    mockConfirm.mockReturnValue(false);
    render(<ProjectCloseButton projectId={1} />);

    fireEvent.click(screen.getByText('Cerrar'));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls PATCH on confirm', async () => {
    mockConfirm.mockReturnValue(true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ProjectCloseButton projectId={5} />);
    fireEvent.click(screen.getByText('Cerrar'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/projects/5', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
    });

    expect(mockRefresh).toHaveBeenCalled();
  });
});
