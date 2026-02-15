import Link from 'next/link';
import Header from '@/components/Header';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Conecta con los mejores{' '}
            <span className="text-blue-600">talentos</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            La plataforma donde empresas encuentran freelancers y freelancers encuentran proyectos increíbles.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 font-medium text-lg"
            >
              Comenzar Gratis
            </Link>
            <Link
              href="/projects"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-50 font-medium text-lg border border-blue-200"
            >
              Ver Proyectos
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
