import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CollapsibleSection from '@/components/CollapsibleSection';

describe('CollapsibleSection', () => {
  it('renders title', () => {
    render(
      <CollapsibleSection title="Mi Sección">
        <p>Contenido</p>
      </CollapsibleSection>
    );
    expect(screen.getByText('Mi Sección')).toBeInTheDocument();
  });

  it('renders badge when provided', () => {
    render(
      <CollapsibleSection title="Sección" badge={5}>
        <p>Contenido</p>
      </CollapsibleSection>
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders string badge', () => {
    render(
      <CollapsibleSection title="Sección" badge="nuevo">
        <p>Contenido</p>
      </CollapsibleSection>
    );
    expect(screen.getByText('nuevo')).toBeInTheDocument();
  });

  it('does not render badge when not provided', () => {
    render(
      <CollapsibleSection title="Sección">
        <p>Contenido</p>
      </CollapsibleSection>
    );
    // Badge container shouldn't exist
    const badges = screen.queryByText(/^\d+$/);
    expect(badges).not.toBeInTheDocument();
  });

  it('is closed by default (defaultOpen=false)', () => {
    render(
      <CollapsibleSection title="Sección">
        <p>Contenido oculto</p>
      </CollapsibleSection>
    );
    // Content is always in DOM but container has grid-rows-[0fr]
    const button = screen.getByRole('button');
    const container = button.nextElementSibling;
    expect(container?.className).toContain('grid-rows-[0fr]');
  });

  it('is open when defaultOpen=true', () => {
    render(
      <CollapsibleSection title="Sección" defaultOpen>
        <p>Contenido visible</p>
      </CollapsibleSection>
    );
    const button = screen.getByRole('button');
    const container = button.nextElementSibling;
    expect(container?.className).toContain('grid-rows-[1fr]');
  });

  it('toggles open/closed on click', async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection title="Sección">
        <p>Contenido</p>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button');
    const container = button.nextElementSibling;

    // Initially closed
    expect(container?.className).toContain('grid-rows-[0fr]');

    // Click to open
    await user.click(button);
    expect(container?.className).toContain('grid-rows-[1fr]');

    // Click to close
    await user.click(button);
    expect(container?.className).toContain('grid-rows-[0fr]');
  });

  it('renders children', () => {
    render(
      <CollapsibleSection title="Sección" defaultOpen>
        <p>Contenido interno</p>
      </CollapsibleSection>
    );
    expect(screen.getByText('Contenido interno')).toBeInTheDocument();
  });
});
