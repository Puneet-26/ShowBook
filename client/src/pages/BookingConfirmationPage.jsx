import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Printer, Ticket, Calendar, Clock, MapPin, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function BookingConfirmationPage() {
  const { id: bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/bookings/${bookingId}`)
      .then((res) => {
        setBooking(res.data.data.booking);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Unable to load booking details.');
      })
      .finally(() => setLoading(false));
  }, [bookingId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">{error || 'Booking not found'}</h3>
        <Link to="/" className="text-rose-600 hover:underline text-sm font-semibold">
          &larr; Return to Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Success notification banner */}
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 sm:p-5 mb-8 flex items-center justify-between gap-4 no-print shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-emerald-900">Booking Confirmed!</h2>
            <p className="text-xs text-emerald-700">
              Your tickets have been reserved permanently. A confirmation has been logged in your account.
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 text-xs font-semibold shadow-2xs transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print Ticket</span>
        </button>
      </div>

      {/* Printable Ticket Card */}
      <div
        id="printable-ticket"
        className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm relative"
      >
        {/* Ticket Header */}
        <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs text-rose-400 font-semibold uppercase tracking-wider block">
              Official Movie Pass
            </span>
            <span className="text-xl font-bold tracking-tight">ShowBook E-Ticket</span>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] text-slate-400 block uppercase">Booking Reference</span>
            <span className="font-mono text-base font-bold text-white tracking-wider">
              {booking.bookingRef}
            </span>
          </div>
        </div>

        {/* Ticket Body */}
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-8 items-start">
          {/* Movie Poster */}
          <div className="w-24 sm:w-32 aspect-[2/3] rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 shadow-xs">
            <img
              src={booking.movie.posterUrl}
              alt={booking.movie.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded">
                  {booking.movie.language}
                </span>
                <span className="text-[11px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                  {booking.movie.ageRating}
                </span>
                <span className="text-[11px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                  {booking.movie.genre}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900">{booking.movie.title}</h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>
                  <strong>{booking.theatre.name}</strong>, {booking.theatre.location}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>Auditorium: <strong>{booking.screen.name}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>
                  {new Date(booking.showTime).toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>
                  {new Date(booking.showTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {/* Confirmed Seats & Total */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">
                  Confirmed Seats ({booking.seats.length})
                </span>
                <span className="text-lg font-bold text-slate-900 tracking-wide">
                  {booking.seats.map((s) => s.seatNumber).join(', ')}
                </span>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">
                  Total Paid
                </span>
                <span className="text-lg font-black text-rose-600">₹{booking.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl text-center self-center sm:self-start">
            <QRCodeSVG value={booking.qrData} size={96} level="M" />
            <span className="text-[10px] text-slate-400 font-mono mt-2 block">Scan at gate</span>
          </div>
        </div>

        {/* Ticket Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex justify-between items-center text-[11px] text-slate-500">
          <span>Transaction ID: {booking.transactionRef}</span>
          <span>Status: <strong className="text-emerald-700 uppercase">{booking.status}</strong></span>
        </div>
      </div>

      {/* Action Navigation */}
      <div className="mt-8 flex justify-center gap-4 no-print">
        <Link
          to="/my-bookings"
          className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-semibold transition"
        >
          View All Bookings
        </Link>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition"
        >
          Book Another Movie
        </Link>
      </div>
    </div>
  );
}
