import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('UPCOMING');
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/bookings/my');
      setBookings(res.data.data.bookings);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Cancel this booking and release seats?')) return;

    setCancellingId(bookingId);
    setActionMessage(null);
    try {
      const res = await api.post(`/bookings/${bookingId}/cancel`);
      setActionMessage({ type: 'success', text: res.data.message });
      await fetchBookings();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to cancel booking.',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const upcomingBookings = bookings.filter((b) => b.status === 'CONFIRMED' && !b.isPast);
  const pastBookings = bookings.filter((b) => b.status === 'CONFIRMED' && b.isPast);
  const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED');

  const currentList =
    activeTab === 'UPCOMING'
      ? upcomingBookings
      : activeTab === 'PAST'
      ? pastBookings
      : cancelledBookings;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Bookings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Your ticket history and upcoming shows.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('UPCOMING')}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === 'UPCOMING' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
            }`}
          >
            Upcoming ({upcomingBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('PAST')}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === 'PAST' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
            }`}
          >
            Past ({pastBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('CANCELLED')}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === 'CANCELLED' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
            }`}
          >
            Cancelled ({cancelledBookings.length})
          </button>
        </div>
      </div>

      {/* Notice Message */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg mb-6 flex items-center gap-2 text-xs font-medium ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
          <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-xs font-semibold text-slate-700">No {activeTab.toLowerCase()} bookings</h3>
          <Link to="/" className="text-rose-600 hover:underline text-xs font-semibold mt-2 inline-block">
            Browse Movies &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((b) => (
            <div
              key={b.id}
              className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex gap-3">
                <img
                  src={b.movie.posterUrl}
                  alt={b.movie.title}
                  className="w-12 h-16 object-cover rounded bg-slate-100 flex-shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{b.movie.title}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        b.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 mt-0.5">
                    {b.theatre.name} ({b.screen}) &bull;{' '}
                    {new Date(b.showTime).toLocaleDateString()} at{' '}
                    {new Date(b.showTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>

                  <div className="text-xs text-slate-700 mt-1">
                    Seats: <strong className="font-semibold">{b.seats.join(', ')}</strong> &bull;{' '}
                    <span className="font-mono text-slate-400">{b.bookingRef}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                <span className="font-bold text-slate-900 text-sm">₹{b.totalAmount}</span>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/booking-confirmed/${b.id}`}
                    className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded"
                  >
                    Ticket
                  </Link>
                  {b.isCancellable && (
                    <button
                      onClick={() => handleCancelBooking(b.id)}
                      disabled={cancellingId === b.id}
                      className="px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded"
                    >
                      {cancellingId === b.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
