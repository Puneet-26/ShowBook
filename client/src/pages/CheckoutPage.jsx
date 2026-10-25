import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function CheckoutPage() {
  const { reservationId } = useParams();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const [paymentSimulationMode, setPaymentSimulationMode] = useState('SUCCESS');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [idempotencyKey] = useState(
    () => `idem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  );

  useEffect(() => {
    fetchReservation();
  }, [reservationId]);

  const fetchReservation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/reservations/${reservationId}`);
      const data = res.data.data.reservation;
      setReservation(data);

      if (data.status !== 'PENDING' || data.isExpired) {
        setError('This reservation is no longer active.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load reservation.');
    } finally {
      setLoading(false);
    }
  };

  // 5-minute Countdown Timer Effect
  useEffect(() => {
    if (!reservation || reservation.status !== 'PENDING') return;

    const expiryTime = new Date(reservation.expiresAt).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = expiryTime - now;

      if (distance <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        setError('Reservation timer expired (5-minute limit). Seats have been released.');
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservation]);

  const handlePayment = async () => {
    if (timeLeft === 0) {
      alert('Reservation expired. Please select seats again.');
      return;
    }

    setPaying(true);
    setError(null);

    try {
      const res = await api.post(`/bookings/reservations/${reservationId}/confirm`, {
        idempotencyKey,
        simulatePaymentStatus: paymentSimulationMode,
      });

      const booking = res.data.data.booking;
      navigate(`/booking-confirmed/${booking.id}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed. Please retry.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!reservation || (error && timeLeft === 0)) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <Clock className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-slate-800 mb-1">Reservation Expired</h2>
        <p className="text-xs text-slate-500 mb-4">
          The 5-minute seat hold ended. Please re-select your seats.
        </p>
        <Link
          to="/"
          className="inline-block px-4 py-2 bg-slate-900 text-white rounded text-xs font-semibold"
        >
          Return to Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner with Timer */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div>
          <span className="text-xs text-slate-500 block">Holding seats for:</span>
          <span className="font-bold text-slate-900 text-sm">{reservation.movie.title}</span>
        </div>

        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
          <Clock className="w-4 h-4 text-amber-600" />
          <span className="font-mono text-sm font-bold text-amber-800">
            {timeLeft !== null ? timeLeft : '05:00'}
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg flex items-center gap-2 text-xs mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Order Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <h3 className="font-bold text-slate-900 text-sm mb-4 border-b border-slate-100 pb-2">
          Booking Summary
        </h3>

        <div className="space-y-2 text-xs text-slate-600 mb-4">
          <div className="flex justify-between">
            <span className="text-slate-400">Theatre:</span>
            <span className="font-medium text-slate-900">
              {reservation.theatre.name} ({reservation.screen})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Time:</span>
            <span className="font-medium text-slate-900">
              {new Date(reservation.startTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Seats:</span>
            <span className="font-medium text-slate-900">
              {reservation.seats.map((s) => s.label).join(', ')} ({reservation.seats.length} tickets)
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-sm font-bold">
          <span className="text-slate-700">Total Payable:</span>
          <span className="text-rose-600 text-base">₹{reservation.totalAmount}</span>
        </div>
      </div>

      {/* Payment Options Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <h3 className="font-bold text-slate-900 text-sm mb-3">Payment Method</h3>

        <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
          {['UPI', 'CARD', 'NETBANKING'].map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`p-2.5 rounded-lg border text-center font-medium transition ${
                paymentMethod === method
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        {/* Evaluation Simulation Mode */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
          <span className="font-semibold text-slate-700 block mb-1">
            Simulate Gateway Result:
          </span>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="radio"
                name="sim"
                value="SUCCESS"
                checked={paymentSimulationMode === 'SUCCESS'}
                onChange={() => setPaymentSimulationMode('SUCCESS')}
              />
              Success
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="radio"
                name="sim"
                value="FAILED"
                checked={paymentSimulationMode === 'FAILED'}
                onChange={() => setPaymentSimulationMode('FAILED')}
              />
              Simulate Failure (Test retry)
            </label>
          </div>
        </div>
      </div>

      {/* Pay Button */}
      <button
        onClick={handlePayment}
        disabled={paying || timeLeft === 0}
        className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-lg transition"
      >
        {paying ? 'Processing Payment...' : `Pay ₹${reservation.totalAmount}`}
      </button>
    </div>
  );
}
