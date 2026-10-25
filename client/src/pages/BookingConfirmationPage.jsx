import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Printer, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function BookingConfirmationPage() {
  const { id: bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/bookings/${bookingId}`)
      .then((res) => setBooking(res.data.data.booking))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load booking details.'))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-800 mb-2">{error || 'Booking not found'}</h3>
        <Link to="/" className="text-rose-600 hover:underline text-xs font-semibold">
          &larr; Return to Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Success Notice */}
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 mb-6 flex items-center justify-between no-print">
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">Booking Confirmed! Seats reserved permanently.</span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-emerald-300 rounded text-xs font-medium hover:bg-emerald-50"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print</span>
        </button>
      </div>

      {/* Ticket Card */}
      <div id="printable-ticket" className="bg-white border border-slate-300 rounded-xl overflow-hidden p-6">
        <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              E-Ticket
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">{booking.movie.title}</h1>
            <span className="text-xs text-slate-500">
              {booking.movie.language} &bull; {booking.movie.genre}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Booking Ref</span>
            <span className="font-mono text-sm font-bold text-slate-900">{booking.bookingRef}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 mb-6">
          <div>
            <span className="text-slate-400 block text-[11px]">Cinema:</span>
            <span className="font-medium text-slate-900">{booking.theatre.name}</span>
            <span className="text-slate-400 block text-[11px] mt-0.5">{booking.theatre.location}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Auditorium:</span>
            <span className="font-medium text-slate-900">{booking.screen.name}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Showtime:</span>
            <span className="font-medium text-slate-900">
              {new Date(booking.showTime).toLocaleDateString()} at{' '}
              {new Date(booking.showTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Seats ({booking.seats.length}):</span>
            <span className="font-bold text-slate-900">
              {booking.seats.map((s) => s.seatNumber).join(', ')}
            </span>
          </div>
        </div>

        {/* QR Code and Total */}
        <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Total Amount:</span>
            <span className="text-lg font-bold text-rose-600">₹{booking.totalAmount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Ref: {booking.transactionRef}
            </span>
          </div>

          <div className="text-center">
            <QRCodeSVG value={booking.qrData} size={72} level="M" />
            <span className="text-[9px] text-slate-400 block mt-1 font-mono">Scan at entry</span>
          </div>
        </div>
      </div>

      {/* Nav Actions */}
      <div className="mt-6 flex justify-center gap-3 no-print">
        <Link
          to="/my-bookings"
          className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-semibold"
        >
          View My Bookings
        </Link>
        <Link
          to="/"
          className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded text-xs font-semibold"
        >
          Book Another Movie
        </Link>
      </div>
    </div>
  );
}
