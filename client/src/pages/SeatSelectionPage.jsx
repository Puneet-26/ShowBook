import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, AlertCircle, RefreshCw, Info, Lock } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SeatSelectionPage() {
  const { id: showId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [show, setShow] = useState(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [syncNotice, setSyncNotice] = useState(null);

  // Keep ref of selectedSeatIds so background interval can inspect current selections without stale closure
  const selectedSeatIdsRef = useRef(selectedSeatIds);
  selectedSeatIdsRef.current = selectedSeatIds;

  useEffect(() => {
    // Initial fetch
    fetchShowData(true);

    // CRITICAL: Live Database-Backed Polling (every 4 seconds)
    // Synchronizes seat availability across all concurrent users directly from PostgreSQL
    const pollInterval = setInterval(() => {
      fetchShowData(false);
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [showId]);

  const fetchShowData = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
      setError(null);
    } else {
      setRefreshing(true);
    }

    try {
      const res = await api.get(`/shows/${showId}`);
      const latestShow = res.data?.data?.show;

      if (latestShow) {
        setShow(latestShow);

        // Verify if any locally selected seats were claimed by another concurrent user in PostgreSQL
        const currentSelected = selectedSeatIdsRef.current;
        if (currentSelected.length > 0) {
          const allLatestSeats = latestShow.rows.flatMap((r) => r.seats);
          const seatMap = new Map(allLatestSeats.map((s) => [s.id, s]));

          const invalidSeats = [];
          const validSelected = [];

          for (const seatId of currentSelected) {
            const seat = seatMap.get(seatId);
            if (seat && seat.status === 'AVAILABLE') {
              validSelected.push(seatId);
            } else if (seat) {
              invalidSeats.push(`${seat.rowLabel}${seat.seatNumber}`);
            }
          }

          if (invalidSeats.length > 0) {
            setSelectedSeatIds(validSelected);
            setSyncNotice(
              `Seat(s) ${invalidSeats.join(', ')} were just reserved or booked by another user.`
            );
          }
        }
      }
    } catch (err) {
      if (isInitial) {
        setError(err.response?.data?.error || 'Failed to load auditorium seat layout.');
      }
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSeatClick = (seat) => {
    if (seat.status !== 'AVAILABLE') return;

    setSyncNotice(null);

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
    setSyncNotice(null);

    try {
      const res = await api.post('/reservations', {
        showId,
        seatIds: selectedSeatIds,
      });

      const reservation = res.data?.data?.reservation;
      navigate(`/checkout/${reservation.id}`);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'One or more selected seats were just taken. Seat layout refreshed.'
      );
      // Immediately refresh layout from database
      await fetchShowData(false);
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

        {/* Legend & Live Sync Status */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-white"></div>
            <span className="text-slate-600">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-rose-600"></div>
            <span className="text-slate-600">Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-amber-400"></div>
            <span className="text-slate-600">Held (5m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-slate-300"></div>
            <span className="text-slate-400">Booked</span>
          </div>

          <button
            onClick={() => fetchShowData(false)}
            disabled={refreshing}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition ml-1"
            title="Force refresh live seat status from PostgreSQL"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-rose-600' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Concurrent User Notification Banner */}
      {syncNotice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-center justify-between text-xs mb-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{syncNotice}</span>
          </div>
          <button
            onClick={() => setSyncNotice(null)}
            className="text-amber-500 hover:text-amber-800 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Error / Conflict Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg flex items-center gap-2 text-xs mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Seating Layout Canvas */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 mb-6 shadow-2xs">
        {/* Cinema Screen Visual Indicator */}
        <div className="max-w-xs mx-auto mb-10 text-center">
          <div className="w-full h-1.5 bg-slate-400 rounded-full mb-1"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Screen This Way
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
                  let title = `Seat ${seat.rowLabel}${seat.seatNumber} (${seat.seatType}) - ₹${seat.price}`;

                  if (isSelected) {
                    btnClass = 'bg-rose-600 border-rose-600 text-white';
                  } else if (isBooked) {
                    btnClass = 'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed';
                    title = `Seat ${seat.rowLabel}${seat.seatNumber} is BOOKED by another user`;
                  } else if (isReserved) {
                    btnClass = 'bg-amber-100 border-amber-300 text-amber-700 cursor-not-allowed';
                    title = `Seat ${seat.rowLabel}${seat.seatNumber} is currently HELD in another checkout session`;
                  }

                  return (
                    <button
                      key={seat.id}
                      onClick={() => handleSeatClick(seat)}
                      disabled={isBooked || isReserved}
                      title={title}
                      className={`w-7 h-7 rounded text-xs font-semibold flex items-center justify-center transition ${btnClass}`}
                    >
                      {isBooked ? (
                        <span className="text-[9px]">✕</span>
                      ) : isReserved ? (
                        <Lock className="w-3 h-3 text-amber-600" />
                      ) : (
                        seat.seatNumber
                      )}
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

        {/* Pricing Tier Legend */}
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
              : 'Select available seats on the auditorium grid'}
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
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            {submitting ? 'Holding Seats...' : 'Proceed to Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}
