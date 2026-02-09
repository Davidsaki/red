import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProjectCard from '@/components/ProjectCard';

// Mock the CurrencyDisplay component to avoid its complexity
vi.mock('@/components/CurrencyDisplay', () => ({
  default: ({ amount, currency }: { amount: number; currency: string }) => (
    <span data-testid="currency-display">{currency} {amount}</span>
  ),
}));

const baseProject = {
  id: 1,
  title: 'Proyecto de prueba',
  description: 'Una descripción detallada del proyecto que se muestra en la tarjeta',
  category: 'Desarrollo Web',
  budget: '500000',
  budget_currency: 'COP',
  skills_required: ['JavaScript', 'React', 'TypeScript'],
  created_at: new Date().toISOString(),
  employer_name: 'Juan Pérez',
  status: 'open',
};

describe('ProjectCard', () => {
  it('renders title', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('Proyecto de prueba')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText(baseProject.description)).toBeInTheDocument();
  });

  it('renders category', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('Desarrollo Web')).toBeInTheDocument();
  });

  it('renders skills', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('renders employer name', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument();
  });

  it('shows "Otro (name)" when suggested_category_name is present', () => {
    render(
      <ProjectCard
        project={{
          ...baseProject,
          category: 'Otro',
          suggested_category_name: 'Fotografía',
        }}
      />
    );
    expect(screen.getByText('Otro (Fotografía)')).toBeInTheDocument();
  });

  it('shows category as-is when not "Otro"', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.queryByText(/Otro/)).not.toBeInTheDocument();
    expect(screen.getByText('Desarrollo Web')).toBeInTheDocument();
  });

  it('truncates skills to 5 and shows "+N más"', () => {
    const manySkills = ['Skill1', 'Skill2', 'Skill3', 'Skill4', 'Skill5', 'Skill6', 'Skill7'];
    render(
      <ProjectCard
        project={{ ...baseProject, skills_required: manySkills }}
      />
    );
    // First 5 should be visible
    expect(screen.getByText('Skill1')).toBeInTheDocument();
    expect(screen.getByText('Skill5')).toBeInTheDocument();
    // 6th and 7th should NOT be rendered
    expect(screen.queryByText('Skill6')).not.toBeInTheDocument();
    // "+2 más" badge should appear
    expect(screen.getByText('+2 más')).toBeInTheDocument();
  });

  it('does not show "+N más" when skills are 5 or fewer', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.queryByText(/más$/)).not.toBeInTheDocument();
  });

  it('renders correct link to project detail page', () => {
    render(<ProjectCard project={baseProject} />);
    const links = screen.getAllByRole('link');
    const projectLinks = links.filter((link) =>
      link.getAttribute('href') === '/projects/1'
    );
    expect(projectLinks.length).toBeGreaterThan(0);
  });

  it('renders budget via CurrencyDisplay', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByTestId('currency-display')).toHaveTextContent('COP 500000');
  });
});
