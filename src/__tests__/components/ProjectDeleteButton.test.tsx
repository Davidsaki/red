import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockConfirm = vi.fn();
global.confirm = mockConfirm;

import ProjectDeleteButton from '@/components/ProjectDeleteButton';

describe('ProjectDeleteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders button text', () => {
    render(<ProjectDeleteButton projectId={1} />);
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  it('does nothing when confirm is cancelled', () => {
    mockConfirm.mockReturnValue(false);
    render(<ProjectDeleteButton projectId={1} />);

    fireEvent.click(screen.getByText('Eliminar'));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls DELETE and redirects on confirm', async () => {
    mockConfirm.mockReturnValue(true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ProjectDeleteButton projectId={3} />);
    fireEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/projects/3', {
        method: 'DELETE',
      });
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
    expect(mockRefresh).toHaveBeenCalled();
  });
});
