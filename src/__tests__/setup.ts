import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { createElement } from 'react';

// Mock next/link (avoid JSX in .ts file)
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => {
    return createElement('a', { href, ...props }, children as string);
  },
}));

// Mock global fetch
global.fetch = vi.fn();
