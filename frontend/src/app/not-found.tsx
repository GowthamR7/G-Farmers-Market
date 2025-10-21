import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <div className="text-6xl mb-4">🌾</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Page Not Found
          </h1>
          <h2 className="text-xl text-gray-600 mb-6">
            Oops! The page you&apos;re looking for doesn&apos;t exist.
          </h2>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600">
            The page might have been moved, deleted, or you entered the wrong URL.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/"
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 font-semibold"
            >
              🏠 Go Home
            </Link>
            <Link 
              href="/products"
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-200 font-semibold"
            >
              🛒 Browse Products
            </Link>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>If you think this is a mistake, please contact our support team.</p>
        </div>
      </div>
    </div>
  )
}
