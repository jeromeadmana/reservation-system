import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reservationAPI } from '../lib/api';
import { format } from 'date-fns';

interface Reservation {
  id: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDatetime: string;
  status: string;
  totalPrice: number;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await reservationAPI.list();
      setReservations(response.data.data.reservations);
    } catch (err: any) {
      setError('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }

    try {
      await reservationAPI.cancel(id);
      fetchReservations();
    } catch (err: any) {
      alert('Failed to cancel reservation');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading reservations...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="text-2xl font-bold text-gray-800">
              Reservation System
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">My Reservations</h2>
          <Link
            to="/book"
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            New Booking
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {reservations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No reservations yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start by booking your first chauffeur service
            </p>
            <Link
              to="/book"
              className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Book Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map((reservation) => (
              <div
                key={reservation.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          reservation.status
                        )}`}
                      >
                        {reservation.status}
                      </span>
                      <span className="text-sm text-gray-600">
                        {format(new Date(reservation.pickupDatetime), 'PPp')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-green-600 font-semibold">From:</span>
                        <span className="text-gray-700">{reservation.pickupLocation}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-red-600 font-semibold">To:</span>
                        <span className="text-gray-700">{reservation.dropoffLocation}</span>
                      </div>
                    </div>

                    {reservation.totalPrice && (
                      <div className="mt-3 text-lg font-bold text-primary-600">
                        ${reservation.totalPrice.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {(reservation.status === 'PENDING' ||
                      reservation.status === 'CONFIRMED') && (
                      <button
                        onClick={() => handleCancel(reservation.id)}
                        className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
