import { signIn } from '@/lib/auth';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Mi Plataforma</h1>
          <p className="mt-2 text-gray-600">Conecta con proyectos y talentos</p>
        </div>
        
        <form 
          action={async () => {
            'use server';
            await signIn('google');
          }}
          className="mt-8 space-y-6"
        >
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Continuar con Google
          </button>
        </form>
      </div>
    </div>
  );
}