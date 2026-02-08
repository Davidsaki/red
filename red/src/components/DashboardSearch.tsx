'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface DashboardSearchProps {
  categories: Category[];
}

export default function DashboardSearch({ categories }: DashboardSearchProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const MAX_CHIPS = 8;
  const visibleCategories = categories.slice(0, MAX_CHIPS);
  const hasMore = categories.length > MAX_CHIPS;

  function handleSearch(e: React.FormEvent): void {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    router.push(`/projects?${params.toString()}`);
  }

  function handleCategoryClick(slug: string): void {
    router.push(`/projects?category=${slug}`);
  }

  function handleViewAll(): void {
    router.push('/projects');
  }

  return (
    <div>
      {/* Search input */}
      <form onSubmit={handleSearch} className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar proyectos..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </form>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleViewAll}
          className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
        >
          Todos
        </button>
        {visibleCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleCategoryClick(cat.slug)}
            className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
          >
            {cat.name}
          </button>
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={handleViewAll}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            + Más →
          </button>
        )}
      </div>
    </div>
  );
}
