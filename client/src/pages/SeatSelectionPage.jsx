import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, AlertCircle, Info, ShieldAlert, Check } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SeatSelectionPage() {
  const { id: showId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [show, setShow] = useState(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchShowData();
  }, [showId]);

  const fetchShowData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/shows/${showId}`);
      setShow(res.data.data.show);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load auditorium seat layout.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seat) => {
    if (seat.status !== 'AVAILABLE') return;

    if (selectedSeatIds.includes(seat.id)) {
      setSelectedSeatIds(selectedSeatIds.filter((id) => id !== seat.id));
    } else {
      if (selectedSeatIds.length >= 10) {
        alert('You can select a maximum of 10 seats per booking.');
        return;
      }
      setSelectedSeatIds([...selectedSeatIds, seat.id]);
    }
  };

  // Find seat objects for summary
  const allSeats = show?.rows.flatMap((r) => r.seats) || [];
  const selectedSeats = allSeats.filter((s) => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  const handleProceedToReserve = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/shows/${showId}/seats` } });
      return;
    }

    if (selectedSeatIds.length === 0) {
      alert('Please select at least 1 seat to proceed.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post('/reservations', {
        showId,
        seatIds: selectedSeatIds,
      });

      const reservation = res.data.data.reservation;
      // Navigate to checkout with the temporary 5-minute reservation
      navigate(`/checkout/${reservation.id}`);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || 'Could not reserve seats. Please try again.';
      setError(errorMsg);

      // Refresh seat layout so user immediately sees which seats got taken
      await fetchShowData();
      // Remove any seats from selection that are no longer available
      setSelectedSeatIds([]);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <p className="text-slate-700 font-medium mb-4">{error || 'Show not found'}</p>
        <Link to="/" className="text-rose-600 hover:underline text-sm font-semibold">
          &larr; Return to Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header with show details */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
        <div>
          <Link
            to={`/movies/${show.movie.id}`}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 mb-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Movie
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            {show.movie.title}
          </h1>
          <div className="text-xs text-slate-600 mt-0.5">
            <span className="font-semibold text-slate-800">{show.theatre.name}</span> &bull;{' '}
            {show.screen.name} &bull;{' '}
            {new Date(show.startTime).toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}{' '}
            at{' '}
            {new Date(show.startTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border border-slate-300 bg-white shadow-2xs"></div>
            <span className="text-slate-600">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px]">
              <Check className="w-3 h-3" />
            </div>
            <span className="text-slate-600">Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-amber-400 border border-amber-500"></div>
            <span className="text-slate-600">Held (5m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-slate-300 border border-slate-400"></div>
            <span className="text-slate-400">Booked</span>
          </div>
        </div>
      </div>

      {/* Error / Conflict Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 p-4 rounded-xl flex items-start gap-3 mb-6">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div>
            <span className="font-bold text-sm block">Reservation Notice</span>
            <span className="text-xs leading-relaxed">{error}</span>
          </div>
        </div>
      )}

      {/* Seating Layout Canvas */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 mb-8 shadow-xs">
        {/* Screen visual */}
        <div className="max-w-md mx-auto mb-10 text-center">
          <div className="w-full h-2.5 bg-gradient-to-r from-rose-200 via-rose-500 to-rose-200 rounded-t-full shadow-xs mb-1.5"></div>
          <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">
            Auditorium Screen This Way
          </span>
        </div>

        {/* Seats Grid */}
        <div className="space-y-3 max-w-lg mx-auto">
          {show.rows.map((row) => (
            <div key={row.rowLabel} className="flex items-center justify-center gap-2">
              {/* Row Label */}
              <div className="w-6 text-center text-xs font-bold text-slate-400">
                {row.rowLabel}
              </div>

              {/* Seats in Row */}
              <div className="flex items-center gap-2">
                {row.seats.map((seat) => {
                  const isSelected = selectedSeatIds.includes(seat.id);
                  const isBooked = seat.status === 'BOOKED';
                  const isReserved = seat.status === 'RESERVED';

                  let seatStyle =
                    'border border-slate-300 bg-white hover:border-emerald-500 hover:scale-105 text-slate-700 cursor-pointer';

                  if (isSelected) {
                    seatStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105';
                  } else if (isBooked) {
                    seatStyle = 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed';
                  } else if (isReserved) {
                    seatStyle =
                      'bg-amber-100 border-amber-400 text-amber-700 cursor-not-allowed opacity-90';
                  }

                  return (
                    <button
                      key={seat.id}
                      onClick={() => handleSeatClick(seat)}
                      disabled={isBooked || isReserved}
                      title={`Seat ${seat.rowLabel}${seat.seatNumber} (${seat.seatType}) - ₹${seat.price}`}
                      className={`w-8 h-8 rounded-md text-xs font-semibold flex items-center justify-center transition duration-150 ${seatStyle}`}
                    >
                      {seat.seatNumber}
                    </button>
                  );
                })}
              </div>

              {/* Duplicate Row Label on right for easy reading */}
              <div className="w-6 text-center text-xs font-bold text-slate-400">
                {row.rowLabel}
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Category Note */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
          <span>
            <strong className="text-slate-700 font-semibold">Rows A-B:</strong> Regular (₹
            {Math.round(show.basePrice)})
          </span>
          <span>
            <strong className="text-slate-700 font-semibold">Rows C-D:</strong> Premium (₹
            {Math.round(show.basePrice * 1.4)})
          </span>
          <span>
            <strong className="text-slate-700 font-semibold">Rows E-F:</strong> VIP (₹
            {Math.round(show.basePrice * 1.8)})
          </span>
        </div>
      </div>

      {/* Floating / Sticky Order Summary Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400">
            {selectedSeats.length === 0
              ? 'No seats selected yet'
              : `${selectedSeats.length} seat(s) selected:`}
          </div>
          <div className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mt-0.5">
            {selectedSeats.length > 0 ? (
              <span>
                {selectedSeats.map((s) => `${s.rowLabel}${s.seatNumber}`).join(', ')}
              </span>
            ) : (
              <span className="text-slate-500 text-sm">Please tap seats on the layout above</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Total Amount</span>
            <span className="text-xl sm:text-2xl font-black text-rose-400">
              ₹{totalPrice}
            </span>
          </div>

          <button
            onClick={handleProceedToReserve}
            disabled={selectedSeats.length === 0 || submitting}
            className="px-6 py-3 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm shadow-md transition disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Locking Seats...
              </>
            ) : (
              'Proceed to Pay'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
