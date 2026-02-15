import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from '@/components/Pagination';

// Get the mocked router for assertions
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/projects',
}));

describe('Pagination', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('does not render when totalPages <= 1', () => {
    const { container } = render(<Pagination currentPage={1} totalPages={1} />);
    expect(container.innerHTML).toBe('');
  });

  it('does not render when totalPages is 0', () => {
    const { container } = render(<Pagination currentPage={1} totalPages={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders page buttons when totalPages > 1', () => {
    render(<Pagination currentPage={1} totalPages={3} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders "Anterior" and "Siguiente" buttons', () => {
    render(<Pagination currentPage={2} totalPages={5} />);
    expect(screen.getByText(/Anterior/)).toBeInTheDocument();
    expect(screen.getByText(/Siguiente/)).toBeInTheDocument();
  });

  it('disables "Anterior" on first page', () => {
    render(<Pagination currentPage={1} totalPages={3} />);
    const prevButton = screen.getByText(/Anterior/);
    expect(prevButton).toBeDisabled();
  });

  it('disables "Siguiente" on last page', () => {
    render(<Pagination currentPage={3} totalPages={3} />);
    const nextButton = screen.getByText(/Siguiente/);
    expect(nextButton).toBeDisabled();
  });

  it('enables "Anterior" when not on first page', () => {
    render(<Pagination currentPage={2} totalPages={3} />);
    const prevButton = screen.getByText(/Anterior/);
    expect(prevButton).not.toBeDisabled();
  });

  it('enables "Siguiente" when not on last page', () => {
    render(<Pagination currentPage={1} totalPages={3} />);
    const nextButton = screen.getByText(/Siguiente/);
    expect(nextButton).not.toBeDisabled();
  });

  it('highlights current page', () => {
    render(<Pagination currentPage={2} totalPages={3} />);
    const page2Button = screen.getByText('2');
    expect(page2Button.className).toContain('bg-blue-600');
  });

  it('navigates when clicking "Siguiente"', async () => {
    const user = userEvent.setup();
    render(<Pagination currentPage={1} totalPages={3} />);

    await user.click(screen.getByText(/Siguiente/));
    expect(mockPush).toHaveBeenCalledWith('/projects?page=2');
  });

  it('navigates when clicking "Anterior"', async () => {
    const user = userEvent.setup();
    render(<Pagination currentPage={3} totalPages={5} />);

    await user.click(screen.getByText(/Anterior/));
    expect(mockPush).toHaveBeenCalledWith('/projects?page=2');
  });

  it('navigates when clicking a page number', async () => {
    const user = userEvent.setup();
    render(<Pagination currentPage={1} totalPages={5} />);

    await user.click(screen.getByText('3'));
    expect(mockPush).toHaveBeenCalledWith('/projects?page=3');
  });
});
