import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-gray-800">Reservation System</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.firstName}
              </span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/book"
            className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="text-primary-600 text-4xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Book a Ride
            </h2>
            <p className="text-gray-600">
              Schedule a new chauffeur service reservation
            </p>
          </Link>

          <Link
            to="/reservations"
            className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="text-primary-600 text-4xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              My Reservations
            </h2>
            <p className="text-gray-600">
              View and manage your upcoming and past reservations
            </p>
          </Link>
        </div>

        <div className="mt-12 bg-primary-50 border border-primary-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-primary-900 mb-2">
            Premium Chauffeur Service
          </h3>
          <p className="text-primary-800">
            Experience luxury transportation with our professional chauffeurs.
            Available 24/7 for all your travel needs.
          </p>
        </div>
      </div>
    </div>
  );
}
