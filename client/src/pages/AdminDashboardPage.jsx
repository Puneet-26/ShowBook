import React, { useState, useEffect } from 'react';
import {
  Film,
  Calendar,
  Ticket,
  TrendingUp,
  Search,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
  Trash2,
  Edit,
} from 'lucide-react';
import api from '../services/api';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('STATS');
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [shows, setShows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');

  // Modal states
  const [showAddMovieModal, setShowAddMovieModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // New Movie Form
  const [movieForm, setMovieForm] = useState({
    title: '',
    description: '',
    genre: '',
    language: '',
    durationMins: 120,
    releaseDate: new Date().toISOString().split('T')[0],
    posterUrl: '',
    ageRating: 'UA',
    status: 'NOW_SHOWING',
  });

  // Schedule Show Form
  const [showForm, setShowForm] = useState({
    movieId: '',
    screenId: '',
    startTime: '',
    endTime: '',
    basePrice: 250,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashRes, moviesRes, theatresRes, showsRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/movies?status=ALL'),
        api.get('/theatres'),
        api.get('/shows'),
      ]);

      setStats(dashRes.data.data.stats);
      setRecentBookings(dashRes.data.data.recentBookings);
      setMovies(moviesRes.data.data.movies);
      setTheatres(theatresRes.data.data.theatres);
      setShows(showsRes.data.data.shows);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBookings = async () => {
    try {
      const params = {};
      if (bookingStatusFilter !== 'ALL') params.status = bookingStatusFilter;
      if (bookingSearch.trim()) params.search = bookingSearch.trim();

      const res = await api.get('/admin/bookings', { params });
      setAllBookings(res.data.data.bookings);
    } catch (err) {
      console.error('Error fetching all bookings:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'BOOKINGS') {
      fetchAllBookings();
    }
  }, [activeTab, bookingStatusFilter]);

  const handleSearchBookings = (e) => {
    e.preventDefault();
    fetchAllBookings();
  };

  const handleCreateMovie = async (e) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      await api.post('/admin/movies', movieForm);
      setActionMessage({ type: 'success', text: 'Movie added successfully to catalog.' });
      setShowAddMovieModal(false);
      setMovieForm({
        title: '',
        description: '',
        genre: '',
        language: '',
        durationMins: 120,
        releaseDate: new Date().toISOString().split('T')[0],
        posterUrl: '',
        ageRating: 'UA',
        status: 'NOW_SHOWING',
      });
      fetchDashboardData();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to add movie.',
      });
    }
  };

  const handleDeleteMovie = async (movieId) => {
    if (!window.confirm('Are you sure you want to archive or remove this movie?')) return;
    try {
      await api.delete(`/admin/movies/${movieId}`);
      setActionMessage({ type: 'success', text: 'Movie archived or removed successfully.' });
      fetchDashboardData();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to delete movie.',
      });
    }
  };

  const handleCreateShow = async (e) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      await api.post('/admin/shows', showForm);
      setActionMessage({ type: 'success', text: 'Show scheduled successfully without conflicts.' });
      setShowScheduleModal(false);
      setShowForm({
        movieId: '',
        screenId: '',
        startTime: '',
        endTime: '',
        basePrice: 250,
      });
      fetchDashboardData();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to schedule show.',
      });
    }
  };

  const handleCancelShow = async (showId) => {
    if (
      !window.confirm(
        'Warning: Cancelling this show will immediately cancel all confirmed bookings for it and refund users. Continue?'
      )
    ) {
      return;
    }

    try {
      const res = await api.post(`/admin/shows/${showId}/cancel`);
      setActionMessage({ type: 'success', text: res.data.message });
      fetchDashboardData();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to cancel show.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Flatten screens for show scheduling form
  const allScreens = theatres.flatMap((t) =>
    t.screens.map((s) => ({ ...s, theatreName: t.name, theatreCity: t.city }))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
            System Administration
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Admin Control Center</h1>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('STATS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'STATS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('BOOKINGS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'BOOKINGS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Bookings
          </button>
          <button
            onClick={() => setActiveTab('MOVIES')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'MOVIES'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Movies ({movies.length})
          </button>
          <button
            onClick={() => setActiveTab('SHOWS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'SHOWS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Shows ({shows.length})
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl mb-6 flex items-center justify-between text-xs font-medium ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW & STATS */}
      {activeTab === 'STATS' && (
        <div className="space-y-8">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold block uppercase">
                Total Revenue
              </span>
              <span className="text-2xl font-black text-rose-600 mt-1 block">
                ₹{stats?.totalRevenue || 0}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Simulated intake</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold block uppercase">
                Confirmed Bookings
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {stats?.confirmedBookings || 0}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
                Active seat reservations
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold block uppercase">
                Active Shows
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {stats?.activeShows || 0}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Across {stats?.theatres || 0} theatres
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold block uppercase">
                Cancellations
              </span>
              <span className="text-2xl font-black text-slate-500 mt-1 block">
                {stats?.cancelledBookings || 0}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Released back to pool</span>
            </div>
          </div>

          {/* Recent Bookings Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-base">Recent Confirmed Bookings</h3>
              <button
                onClick={() => setActiveTab('BOOKINGS')}
                className="text-xs text-indigo-600 hover:underline font-semibold"
              >
                View all bookings &rarr;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Ref</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Movie</th>
                    <th className="py-2.5 px-3">Theatre</th>
                    <th className="py-2.5 px-3">Seats</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {b.bookingRef}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        <span className="font-semibold block">{b.user}</span>
                        <span className="text-slate-400 text-[11px]">{b.email}</span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{b.movie}</td>
                      <td className="py-2.5 px-3 text-slate-600">{b.theatre}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {b.seats.join(', ')}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-rose-600">₹{b.amount}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            b.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ALL BOOKINGS INSPECTION */}
      {activeTab === 'BOOKINGS' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <form onSubmit={handleSearchBookings} className="flex-1 min-w-[280px]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Booking Ref, User Name, Email, or Movie..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </form>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Status:</span>
              <select
                value={bookingStatusFilter}
                onChange={(e) => setBookingStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Movie & Showtime</th>
                    <th className="py-3 px-4">Auditorium</th>
                    <th className="py-3 px-4">Seats</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {b.bookingRef}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {new Date(b.createdAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{b.user.name}</span>
                        <span className="text-slate-500 text-[11px]">{b.user.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{b.movie.title}</span>
                        <span className="text-slate-500 text-[11px]">
                          {new Date(b.showTime).toLocaleDateString()} at{' '}
                          {new Date(b.showTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="block font-medium">{b.theatre.name}</span>
                        <span className="text-[11px] text-slate-400">{b.screen}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{b.seats.join(', ')}</td>
                      <td className="py-3 px-4 font-black text-rose-600">₹{b.totalAmount}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            b.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MOVIES MANAGEMENT */}
      {activeTab === 'MOVIES' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Movie Catalog Management</h2>
            <button
              onClick={() => setShowAddMovieModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Movie</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {movies.map((m) => (
              <div
                key={m.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div className="flex gap-4 p-4">
                  <img
                    src={m.posterUrl}
                    alt={m.title}
                    className="w-20 h-28 object-cover rounded-md bg-slate-100 flex-shrink-0"
                  />
                  <div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                      {m.status}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base leading-snug mt-1">
                      {m.title}
                    </h3>
                    <div className="text-xs text-slate-500 mt-1">
                      {m.genre} &bull; {m.language} &bull; {m.durationMins}m
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Rating: {m.ageRating}</div>
                  </div>
                </div>

                <div className="bg-slate-50 border-t border-slate-100 px-4 py-2.5 flex justify-end">
                  <button
                    onClick={() => handleDeleteMovie(m.id)}
                    className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Archive / Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SHOWS MANAGEMENT */}
      {activeTab === 'SHOWS' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Showtimes & Screen Scheduling</h2>
              <p className="text-xs text-slate-500">
                Shows are strictly validated against overlaps on the same screen.
              </p>
            </div>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule New Show</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Movie</th>
                    <th className="py-3 px-4">Theatre & Screen</th>
                    <th className="py-3 px-4">Start Time</th>
                    <th className="py-3 px-4">End Time</th>
                    <th className="py-3 px-4">Base Price</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Emergency Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shows.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">{s.movie.title}</td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="font-semibold block">{s.screen.theatre.name}</span>
                        <span className="text-slate-400 text-[11px]">{s.screen.name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {new Date(s.startTime).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(s.endTime).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-rose-600">₹{s.basePrice}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            s.status === 'OPEN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {s.status === 'OPEN' && (
                          <button
                            onClick={() => handleCancelShow(s.id)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 ml-auto"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Cancel Show</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD MOVIE */}
      {showAddMovieModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-base">Add New Movie</h3>
              <button
                onClick={() => setShowAddMovieModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateMovie} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Movie Title</label>
                <input
                  type="text"
                  required
                  value={movieForm.title}
                  onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={movieForm.description}
                  onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Genre</label>
                  <input
                    type="text"
                    required
                    placeholder="Sci-Fi, Action..."
                    value={movieForm.genre}
                    onChange={(e) => setMovieForm({ ...movieForm, genre: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Language</label>
                  <input
                    type="text"
                    required
                    placeholder="English, Hindi..."
                    value={movieForm.language}
                    onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Duration (m)</label>
                  <input
                    type="number"
                    required
                    value={movieForm.durationMins}
                    onChange={(e) =>
                      setMovieForm({ ...movieForm, durationMins: parseInt(e.target.value, 10) })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Rating</label>
                  <input
                    type="text"
                    required
                    value={movieForm.ageRating}
                    onChange={(e) => setMovieForm({ ...movieForm, ageRating: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Release Date</label>
                  <input
                    type="date"
                    required
                    value={movieForm.releaseDate}
                    onChange={(e) => setMovieForm({ ...movieForm, releaseDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Poster Image URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={movieForm.posterUrl}
                  onChange={(e) => setMovieForm({ ...movieForm, posterUrl: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMovieModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Save Movie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SCHEDULE SHOW */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-base">Schedule New Show</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateShow} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Movie</label>
                <select
                  required
                  value={showForm.movieId}
                  onChange={(e) => setShowForm({ ...showForm, movieId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- Choose a Movie --</option>
                  {movies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.language})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Select Theatre & Screen
                </label>
                <select
                  required
                  value={showForm.screenId}
                  onChange={(e) => setShowForm({ ...showForm, screenId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- Choose Screen --</option>
                  {allScreens.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.theatreName} - {s.name} ({s.screenNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={showForm.startTime}
                    onChange={(e) => setShowForm({ ...showForm, startTime: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={showForm.endTime}
                    onChange={(e) => setShowForm({ ...showForm, endTime: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Base Ticket Price (₹)
                </label>
                <input
                  type="number"
                  required
                  value={showForm.basePrice}
                  onChange={(e) =>
                    setShowForm({ ...showForm, basePrice: parseFloat(e.target.value) })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Schedule Show
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
