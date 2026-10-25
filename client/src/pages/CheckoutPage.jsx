import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock, ShieldCheck, CreditCard, AlertCircle, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
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
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [idempotencyKey] = useState(() => `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

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
      setError(err.response?.data?.error || 'Unable to retrieve reservation details.');
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
        setError('Your 5-minute reservation timer has expired. Seats have been automatically released.');
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
      // Navigate to confirmation page
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!reservation || (error && timeLeft === 0)) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Reservation Expired</h2>
        <p className="text-sm text-slate-600 mb-6">
          The 5-minute temporary seat hold has ended. Please choose seats again to complete your booking.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition"
        >
          Return to Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top bar with countdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 mb-8 shadow-xs">
        <div>
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
            Temporary Hold Active
          </span>
          <span className="text-sm text-slate-800">
            Booking Reference: <strong className="font-mono text-slate-900">{reservation.reservationRef}</strong>
          </span>
        </div>

        {/* Live Timer */}
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg self-start sm:self-auto">
          <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
          <div>
            <span className="text-[10px] text-amber-700 font-bold block uppercase tracking-wider">
              Time Remaining
            </span>
            <span className="text-lg font-black font-mono text-amber-800">
              {timeLeft !== null ? timeLeft : '05:00'}
            </span>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 p-4 rounded-xl flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div className="text-xs">
            <strong className="block text-sm">Notice</strong>
            {error}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column: Order Breakdown */}
        <div className="md:col-span-2 space-y-6">
          {/* Movie & Show Info Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-4 border-b border-slate-100 pb-2">
              Order Summary
            </h3>

            <div className="flex gap-4 mb-4">
              <img
                src={reservation.movie.posterUrl}
                alt={reservation.movie.title}
                className="w-16 h-24 object-cover rounded-md bg-slate-100"
              />
              <div>
                <h4 className="font-bold text-slate-900 text-lg leading-tight mb-1">
                  {reservation.movie.title}
                </h4>
                <div className="text-xs text-slate-500 mb-2">
                  {reservation.movie.language} &bull; UA
                </div>
                <div className="text-xs text-slate-700">
                  <strong>{reservation.theatre.name}</strong>, {reservation.theatre.location}
                </div>
                <div className="text-xs text-slate-500">
                  {reservation.screen} &bull;{' '}
                  {new Date(reservation.startTime).toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  at{' '}
                  {new Date(reservation.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>

            {/* Reserved Seats List */}
            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Reserved Seats ({reservation.seats.length})
              </div>
              <div className="space-y-1.5">
                {reservation.seats.map((s) => (
                  <div key={s.seatId} className="flex justify-between text-xs text-slate-700">
                    <span>
                      Seat <strong className="font-semibold">{s.label}</strong> ({s.seatType})
                    </span>
                    <span className="font-semibold">₹{s.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Method Selector (Simulation) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-3 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Select Payment Method</span>
              <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-normal">
                Simulated Gateway
              </span>
            </h3>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`p-3 rounded-lg border text-center transition ${
                  paymentMethod === 'CARD'
                    ? 'border-rose-600 bg-rose-50/50 text-rose-700 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <CreditCard className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs">Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`p-3 rounded-lg border text-center transition ${
                  paymentMethod === 'UPI'
                    ? 'border-rose-600 bg-rose-50/50 text-rose-700 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="w-5 h-5 mx-auto mb-1 font-bold text-xs flex items-center justify-center">
                  UPI
                </div>
                <span className="text-xs">UPI App</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('NETBANKING')}
                className={`p-3 rounded-lg border text-center transition ${
                  paymentMethod === 'NETBANKING'
                    ? 'border-rose-600 bg-rose-50/50 text-rose-700 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <ShieldCheck className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs">NetBanking</span>
              </button>
            </div>

            {/* Demonstration Test Mode: Toggle Success / Failure */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
              <span className="font-bold text-slate-700 block mb-1">
                Project Evaluation: Simulate Payment Outcome
              </span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                  <input
                    type="radio"
                    name="simMode"
                    value="SUCCESS"
                    checked={paymentSimulationMode === 'SUCCESS'}
                    onChange={() => setPaymentSimulationMode('SUCCESS')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Successful Payment
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                  <input
                    type="radio"
                    name="simMode"
                    value="FAILED"
                    checked={paymentSimulationMode === 'FAILED'}
                    onChange={() => setPaymentSimulationMode('FAILED')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Simulate Bank Decline (Test retry)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Final Price & Pay Button */}
        <div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs sticky top-24">
            <h4 className="font-bold text-slate-900 text-sm mb-4 border-b border-slate-100 pb-2">
              Payment Breakdown
            </h4>

            <div className="space-y-2 text-xs mb-4">
              <div className="flex justify-between text-slate-600">
                <span>Tickets Total ({reservation.seats.length})</span>
                <span className="font-medium text-slate-900">₹{reservation.totalAmount}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Convenience Fee (Simulated)</span>
                <span className="font-medium text-emerald-600">FREE</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                <span>Grand Total</span>
                <span className="text-rose-600 text-base">₹{reservation.totalAmount}</span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={paying || timeLeft === 0}
              className="w-full py-3 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
            >
              {paying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing Transaction...
                </>
              ) : (
                `Pay ₹${reservation.totalAmount}`
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Simulated college project checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
