import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, AlertCircle } from 'lucide-react';
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
      setError(err.response?.data?.error || 'Failed to load seat layout.');
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

  const allSeats = show?.rows.flatMap((r) => r.seats) || [];
  const selectedSeats = allSeats.filter((s) => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  const handleProceedToReserve = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/shows/${showId}/seats` } });
      return;
    }

    if (selectedSeatIds.length === 0) {
      alert('Please select at least 1 seat.');
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
      navigate(`/checkout/${reservation.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reserve seats. Please try again.');
      // Refresh seat layout so user immediately sees taken seats
      await fetchShowData();
      setSelectedSeatIds([]);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <p className="text-slate-800 text-sm font-medium mb-3">{error || 'Show not found'}</p>
        <Link to="/" className="text-rose-600 hover:underline text-xs font-semibold">
          &larr; Return to movies
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
        <div>
          <Link
            to={`/movies/${show.movie.id}`}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 mb-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Movie
          </Link>
          <h1 className="text-xl font-bold text-slate-900">{show.movie.title}</h1>
          <div className="text-xs text-slate-500 mt-0.5">
            {show.theatre.name} &bull; {show.screen.name} &bull;{' '}
            {new Date(show.startTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border border-slate-300 bg-white"></div>
            <span className="text-slate-600">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-rose-600"></div>
            <span className="text-slate-600">Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-amber-400"></div>
            <span className="text-slate-600">Held</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-slate-300"></div>
            <span className="text-slate-400">Booked</span>
          </div>
        </div>
      </div>

      {/* Error / Conflict Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg flex items-center gap-2 text-xs mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Seating Layout Canvas */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 mb-6">
        {/* Screen */}
        <div className="max-w-xs mx-auto mb-10 text-center">
          <div className="w-full h-1.5 bg-slate-400 rounded-full mb-1"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Screen
          </span>
        </div>

        {/* Seat Grid */}
        <div className="space-y-2.5 max-w-md mx-auto">
          {show.rows.map((row) => (
            <div key={row.rowLabel} className="flex items-center justify-center gap-2">
              <span className="w-5 text-center text-xs font-bold text-slate-400">
                {row.rowLabel}
              </span>

              <div className="flex items-center gap-2">
                {row.seats.map((seat) => {
                  const isSelected = selectedSeatIds.includes(seat.id);
                  const isBooked = seat.status === 'BOOKED';
                  const isReserved = seat.status === 'RESERVED';

                  let btnClass = 'bg-white border border-slate-300 text-slate-700 hover:border-slate-800';
                  if (isSelected) {
                    btnClass = 'bg-rose-600 border-rose-600 text-white';
                  } else if (isBooked) {
                    btnClass = 'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed';
                  } else if (isReserved) {
                    btnClass = 'bg-amber-100 border-amber-300 text-amber-700 cursor-not-allowed';
                  }

                  return (
                    <button
                      key={seat.id}
                      onClick={() => handleSeatClick(seat)}
                      disabled={isBooked || isReserved}
                      title={`Seat ${seat.rowLabel}${seat.seatNumber} (${seat.seatType}) - ₹${seat.price}`}
                      className={`w-7 h-7 rounded text-xs font-semibold flex items-center justify-center transition ${btnClass}`}
                    >
                      {seat.seatNumber}
                    </button>
                  );
                })}
              </div>

              <span className="w-5 text-center text-xs font-bold text-slate-400">
                {row.rowLabel}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-center gap-6 text-[11px] text-slate-500">
          <span>Rows A-B: Regular (₹{Math.round(show.basePrice)})</span>
          <span>Rows C-D: Premium (₹{Math.round(show.basePrice * 1.4)})</span>
          <span>Rows E-F: VIP (₹{Math.round(show.basePrice * 1.8)})</span>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs text-slate-400 block">
            {selectedSeats.length > 0
              ? `${selectedSeats.length} seat(s) selected: ${selectedSeats
                  .map((s) => `${s.rowLabel}${s.seatNumber}`)
                  .join(', ')}`
              : 'Select seats on the grid above'}
          </span>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Total</span>
            <span className="text-lg font-bold text-white">₹{totalPrice}</span>
          </div>

          <button
            onClick={handleProceedToReserve}
            disabled={selectedSeats.length === 0 || submitting}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg text-xs font-bold transition"
          >
            {submitting ? 'Holding Seats...' : 'Proceed to Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}
