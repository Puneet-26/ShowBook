import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Ban,
  Edit2,
  Eye,
  Film,
  Calendar,
  Clock,
  Archive,
  RefreshCw,
  X,
} from 'lucide-react';
import api from '../services/api';

const DEFAULT_POSTER_FALLBACK =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';

const INITIAL_MOVIE_FORM = {
  title: '',
  description: '',
  genre: '',
  language: '',
  durationMins: 120,
  releaseDate: new Date().toISOString().split('T')[0],
  posterUrl: '',
  ageRating: 'UA',
  status: 'NOW_SHOWING',
};

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('SHOWS');
  const [stats, setStats] = useState(null);
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [shows, setShows] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);

  // Movie management states
  const [showMovieForm, setShowMovieForm] = useState(false);
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [movieForm, setMovieForm] = useState(INITIAL_MOVIE_FORM);
  const [movieFormSubmitting, setMovieFormSubmitting] = useState(false);
  const [viewingMovie, setViewingMovie] = useState(null);

  // Show management states
  const [showAddShow, setShowAddShow] = useState(false);
  const [showFilter, setShowFilter] = useState('ALL');
  const [showFormSubmitting, setShowFormSubmitting] = useState(false);
  const [showForm, setShowForm] = useState({
    movieId: '',
    screenId: '',
    startTime: '',
    endTime: '',
    basePrice: 250,
  });

  // Bookings inspector states
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingFilter, setBookingFilter] = useState('ALL');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      // Note: Passing status=ALL correctly returns all catalog movies including archived
      const [dashRes, moviesRes, theatresRes, showsRes, bookingsRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/movies?status=ALL'),
        api.get('/theatres'),
        api.get('/shows?status=ALL'),
        api.get('/admin/bookings'),
      ]);

      setStats(dashRes.data?.data?.stats || null);
      setMovies(moviesRes.data?.data?.movies || []);
      setTheatres(theatresRes.data?.data?.theatres || []);
      setShows(showsRes.data?.data?.shows || []);
      setAllBookings(bookingsRes.data?.data?.bookings || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to load admin dashboard data. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // --- MOVIE MANAGEMENT HANDLERS ---

  const handleOpenAddMovie = () => {
    setEditingMovieId(null);
    setMovieForm(INITIAL_MOVIE_FORM);
    setShowMovieForm(true);
  };

  const handleOpenEditMovie = (movie) => {
    setEditingMovieId(movie.id);
    setMovieForm({
      title: movie.title,
      description: movie.description,
      genre: movie.genre,
      language: movie.language,
      durationMins: movie.durationMins,
      releaseDate: movie.releaseDate
        ? new Date(movie.releaseDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      posterUrl: movie.posterUrl || '',
      ageRating: movie.ageRating || 'UA',
      status: movie.status || 'NOW_SHOWING',
    });
    setShowMovieForm(true);
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const handleCloseMovieForm = () => {
    setShowMovieForm(false);
    setEditingMovieId(null);
    setMovieForm(INITIAL_MOVIE_FORM);
  };

  const handleMovieFormSubmit = async (e) => {
    e.preventDefault();
    setActionMessage(null);
    setMovieFormSubmitting(true);

    try {
      const payload = {
        title: movieForm.title.trim(),
        description: movieForm.description.trim(),
        genre: movieForm.genre.trim(),
        language: movieForm.language.trim(),
        durationMins: parseInt(movieForm.durationMins, 10),
        releaseDate: movieForm.releaseDate,
        posterUrl: movieForm.posterUrl.trim(),
        ageRating: movieForm.ageRating.trim(),
        status: movieForm.status,
      };

      if (editingMovieId) {
        // Edit existing movie
        await api.patch(`/admin/movies/${editingMovieId}`, payload);
        setActionMessage({
          type: 'success',
          text: `Movie "${payload.title}" updated successfully!`,
        });
      } else {
        // Add new movie
        await api.post('/admin/movies', payload);
        setActionMessage({
          type: 'success',
          text: `Movie "${payload.title}" added to catalog successfully!`,
        });
      }

      handleCloseMovieForm();
      await fetchAdminData();
    } catch (err) {
      const errDetails = err.response?.data?.details;
      let errorMsg = err.response?.data?.error || 'Failed to save movie.';
      if (Array.isArray(errDetails) && errDetails.length > 0) {
        errorMsg += ` (${errDetails.map((d) => d.message).join(', ')})`;
      }
      setActionMessage({ type: 'error', text: errorMsg });
    } finally {
      setMovieFormSubmitting(false);
    }
  };

  const handleArchiveMovie = async (movieId, movieTitle, currentStatus) => {
    const action = currentStatus === 'ARCHIVED' ? 'restore' : 'archive';
    if (!window.confirm(`Are you sure you want to ${action} "${movieTitle}"?`)) {
      return;
    }

    setActionMessage(null);
    try {
      if (currentStatus === 'ARCHIVED') {
        // Restore to NOW_SHOWING
        await api.patch(`/admin/movies/${movieId}`, { status: 'NOW_SHOWING' });
        setActionMessage({
          type: 'success',
          text: `Movie "${movieTitle}" restored to Now Showing.`,
        });
      } else {
        // Soft archive preserving all historical bookings
        await api.delete(`/admin/movies/${movieId}`);
        setActionMessage({
          type: 'success',
          text: `Movie "${movieTitle}" archived safely. Booking history preserved.`,
        });
      }
      await fetchAdminData();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update movie status.',
      });
    }
  };

  // --- SHOW SCHEDULING HANDLERS ---

  // Auto-calculate end time whenever movie or startTime changes
  const handleShowMovieChange = (movieId) => {
    const selected = movies.find((m) => m.id === movieId);
    const updated = { ...showForm, movieId };

    if (selected && showForm.startTime) {
      const start = new Date(showForm.startTime);
      const end = new Date(start.getTime() + (selected.durationMins || 120) * 60 * 1000);
      updated.endTime = formatDateTimeLocal(end);
    }
    setShowForm(updated);
  };

  const handleShowStartTimeChange = (startTimeVal) => {
    const updated = { ...showForm, startTime: startTimeVal };
    const selected = movies.find((m) => m.id === showForm.movieId);

    if (startTimeVal && selected) {
      const start = new Date(startTimeVal);
      const end = new Date(start.getTime() + (selected.durationMins || 120) * 60 * 1000);
      updated.endTime = formatDateTimeLocal(end);
    }
    setShowForm(updated);
  };

  const formatDateTimeLocal = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${y}-${m}-${d}T${hh}:${mm}`;
  };

  const handleCreateShow = async (e) => {
    e.preventDefault();
    setActionMessage(null);
    setShowFormSubmitting(true);

    try {
      const payload = {
        movieId: showForm.movieId,
        screenId: showForm.screenId,
        startTime: new Date(showForm.startTime).toISOString(),
        endTime: showForm.endTime ? new Date(showForm.endTime).toISOString() : undefined,
        basePrice: parseFloat(showForm.basePrice),
      };

      const res = await api.post('/admin/shows', payload);
      setActionMessage({
        type: 'success',
        text: 'Show scheduled successfully! Seat layout and allocations generated without conflicts.',
      });

      setShowAddShow(false);
      setShowForm({
        movieId: '',
        screenId: '',
        startTime: '',
        endTime: '',
        basePrice: 250,
      });

      await fetchAdminData();
    } catch (err) {
      const errDetails = err.response?.data?.details;
      let errorMsg = err.response?.data?.error || 'Failed to schedule show.';
      if (Array.isArray(errDetails) && errDetails.length > 0) {
        errorMsg += ` (${errDetails.map((d) => d.message).join(', ')})`;
      }
      setActionMessage({ type: 'error', text: errorMsg });
    } finally {
      setShowFormSubmitting(false);
    }
  };

  const handleCancelShow = async (showId) => {
    if (
      !window.confirm(
        'Cancelling this show will cancel all active user bookings and release seats. Continue?'
      )
    ) {
      return;
    }
    setActionMessage(null);
    try {
      const res = await api.post(`/admin/shows/${showId}/cancel`);
      setActionMessage({
        type: 'success',
        text: res.data?.message || 'Show cancelled successfully.',
      });
      await fetchAdminData();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to cancel show.',
      });
    }
  };

  // --- FILTERED DATA COMPUTATIONS ---

  const filteredBookings = allBookings.filter((b) => {
    const matchesFilter = bookingFilter === 'ALL' || b.status === bookingFilter;
    const query = bookingSearch.toLowerCase().trim();
    const matchesSearch =
      !query ||
      b.bookingRef?.toLowerCase().includes(query) ||
      b.user?.email?.toLowerCase().includes(query) ||
      b.user?.name?.toLowerCase().includes(query) ||
      b.movie?.title?.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const filteredShows = shows.filter((s) => {
    if (showFilter === 'ALL') return true;
    return s.status === showFilter;
  });

  const allScreens = theatres.flatMap((t) =>
    (t.screens || []).map((s) => ({
      ...s,
      theatreName: t.name,
      theatreLocation: t.location,
    }))
  );

  const activeMovies = movies.filter((m) => m.status !== 'ARCHIVED');

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Control Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage movie catalogue, screen schedules, seat allocations, and booking audit records.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('SHOWS')}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === 'SHOWS' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Shows ({shows.length})
          </button>
          <button
            onClick={() => setActiveTab('MOVIES')}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === 'MOVIES' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Movies ({movies.length})
          </button>
          <button
            onClick={() => setActiveTab('BOOKINGS')}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === 'BOOKINGS' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Bookings ({allBookings.length})
          </button>
        </div>
      </div>

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Total Revenue</span>
          <span className="text-lg font-bold text-slate-900 mt-0.5 block">₹{stats?.totalRevenue || 0}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Confirmed Bookings</span>
          <span className="text-lg font-bold text-emerald-600 mt-0.5 block">{stats?.confirmedBookings || 0}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Cancelled Bookings</span>
          <span className="text-lg font-bold text-rose-500 mt-0.5 block">{stats?.cancelledBookings || 0}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Active Shows</span>
          <span className="text-lg font-bold text-indigo-600 mt-0.5 block">{stats?.activeShows || 0}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Catalogue Movies</span>
          <span className="text-lg font-bold text-slate-900 mt-0.5 block">{stats?.movies || movies.length}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Theatres / Screens</span>
          <span className="text-lg font-bold text-slate-900 mt-0.5 block">
            {stats?.theatres || 2} / {stats?.screens || allScreens.length}
          </span>
        </div>
      </div>

      {/* Global Action Message Alert */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl mb-6 flex items-center justify-between text-xs font-medium transition ${
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
            className="text-slate-400 hover:text-slate-600 font-bold px-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SHOWS & SCREEN SCHEDULING */}
      {/* ========================================================================= */}
      {activeTab === 'SHOWS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900">Scheduled Shows</h2>
              <select
                value={showFilter}
                onChange={(e) => setShowFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
              >
                <option value="ALL">All Shows ({shows.length})</option>
                <option value="OPEN">Open Only</option>
                <option value="CANCELLED">Cancelled Only</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddShow(!showAddShow)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddShow ? 'Close Scheduler' : 'Schedule New Show'}</span>
            </button>
          </div>

          {/* Inline Schedule Show Form */}
          {showAddShow && (
            <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-xs">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-slate-900 text-sm">Schedule a Movie Show</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a movie from the catalogue, auditorium screen, start time, and ticket price. End time is automatically calculated.
                </p>
              </div>

              <form onSubmit={handleCreateShow} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Select Movie <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={showForm.movieId}
                    onChange={(e) => handleShowMovieChange(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">-- Choose Catalogue Movie --</option>
                    {activeMovies.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.language} &bull; {m.durationMins}m)
                      </option>
                    ))}
                  </select>
                  {activeMovies.length === 0 && (
                    <span className="text-[10px] text-amber-600 block mt-1">
                      No active movies found. Please add a movie first in the Movies tab.
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Auditorium Screen <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={showForm.screenId}
                    onChange={(e) => setShowForm({ ...showForm, screenId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">-- Choose Screen --</option>
                    {allScreens.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.theatreName} &mdash; {s.name} ({s.totalSeats} seats)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Base Ticket Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="50"
                    max="5000"
                    step="10"
                    value={showForm.basePrice}
                    onChange={(e) => setShowForm({ ...showForm, basePrice: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Regular: ₹{Math.round(showForm.basePrice || 0)} | Premium: ₹{Math.round((showForm.basePrice || 0) * 1.4)} | VIP: ₹{Math.round((showForm.basePrice || 0) * 1.8)}
                  </span>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Show Start Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={showForm.startTime}
                    onChange={(e) => handleShowStartTimeChange(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Calculated End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={showForm.endTime}
                    onChange={(e) => setShowForm({ ...showForm, endTime: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 focus:ring-1 focus:ring-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Auto-calculated from movie duration. Can be manually adjusted.
                  </span>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={showFormSubmitting || !showForm.movieId || !showForm.screenId}
                    className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition"
                  >
                    {showFormSubmitting ? 'Validating Conflicts...' : 'Confirm & Schedule Show'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Scheduled Shows Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Movie</th>
                    <th className="py-3 px-4">Auditorium Screen</th>
                    <th className="py-3 px-4">Start Time & Date</th>
                    <th className="py-3 px-4">Base Price</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredShows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No scheduled shows matching filter. Click "Schedule New Show" above to add one.
                      </td>
                    </tr>
                  ) : (
                    filteredShows.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            {s.movie?.posterUrl && (
                              <img
                                src={s.movie.posterUrl}
                                alt={s.movie.title}
                                className="w-7 h-10 object-cover rounded bg-slate-100 flex-shrink-0"
                                onError={(e) => {
                                  e.target.src = DEFAULT_POSTER_FALLBACK;
                                }}
                              />
                            )}
                            <div>
                              <span className="block font-bold text-slate-900">{s.movie?.title}</span>
                              <span className="text-[11px] text-slate-400 font-normal">
                                {s.movie?.language} &bull; {s.movie?.genre}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-semibold block">{s.screen?.theatre?.name}</span>
                          <span className="text-slate-400 text-[11px]">{s.screen?.name}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-800">
                          <span className="font-medium block">{new Date(s.startTime).toLocaleDateString()}</span>
                          <span className="text-slate-500 text-[11px]">
                            {new Date(s.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">₹{s.basePrice}</td>
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition"
                              title="Cancel show and release all seat allocations"
                            >
                              <Ban className="w-3.5 h-3.5" /> Cancel Show
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MOVIE CATALOGUE & EDITING */}
      {/* ========================================================================= */}
      {activeTab === 'MOVIES' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Movie Catalogue Manager</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Add, edit details, preview posters, or archive cinematic titles in the platform.
              </p>
            </div>

            <button
              onClick={showMovieForm ? handleCloseMovieForm : handleOpenAddMovie}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              {showMovieForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{showMovieForm ? 'Close Movie Form' : 'Add New Movie'}</span>
            </button>
          </div>

          {/* Inline Add / Edit Movie Form */}
          {showMovieForm && (
            <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingMovieId ? `Edit Movie: ${movieForm.title || 'Details'}` : 'Add New Movie to Catalogue'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingMovieId
                      ? 'Modify title, description, poster URL, duration, or change availability status.'
                      : 'Provide all required metadata and poster image URL to register the movie.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseMovieForm}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-1"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleMovieFormSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Title */}
                  <div className="md:col-span-2">
                    <label className="text-slate-700 font-semibold block mb-1">
                      Movie Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Inception, Interstellar..."
                      value={movieForm.title}
                      onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">
                      Catalogue Status <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={movieForm.status}
                      onChange={(e) => setMovieForm({ ...movieForm, status: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 font-medium"
                    >
                      <option value="NOW_SHOWING">NOW_SHOWING (Active in Listings)</option>
                      <option value="UPCOMING">UPCOMING (Coming Soon)</option>
                      <option value="ARCHIVED">ARCHIVED (Hidden from Booking)</option>
                    </select>
                  </div>

                  {/* Genre */}
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">
                      Genre <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sci-Fi, Action, Drama"
                      value={movieForm.genre}
                      onChange={(e) => setMovieForm({ ...movieForm, genre: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  {/* Language */}
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">
                      Language <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. English, Hindi, Telugu"
                      value={movieForm.language}
                      onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">
                      Duration (Minutes) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="600"
                      value={movieForm.durationMins}
                      onChange={(e) => setMovieForm({ ...movieForm, durationMins: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  {/* Release Date */}
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">
                      Release Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={movieForm.releaseDate}
                      onChange={(e) => setMovieForm({ ...movieForm, releaseDate: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  {/* Age Rating */}
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">
                      Age Rating <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={movieForm.ageRating}
                      onChange={(e) => setMovieForm({ ...movieForm, ageRating: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="U">U (Universal)</option>
                      <option value="UA">UA (Parental Guidance)</option>
                      <option value="A">A (Adults Only)</option>
                      <option value="PG-13">PG-13</option>
                      <option value="R">R (Restricted)</option>
                    </select>
                  </div>

                  {/* Poster URL */}
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">
                      Poster Image URL <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="https://images.unsplash.com/... or /posters/..."
                      value={movieForm.posterUrl}
                      onChange={(e) => setMovieForm({ ...movieForm, posterUrl: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                {/* Poster Live Preview thumbnail if provided */}
                {movieForm.posterUrl && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <img
                      src={movieForm.posterUrl}
                      alt="Poster Preview"
                      className="w-12 h-16 object-cover rounded bg-slate-200 flex-shrink-0"
                      onError={(e) => {
                        e.target.src = DEFAULT_POSTER_FALLBACK;
                      }}
                    />
                    <div className="text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700 block">Poster Live Preview</span>
                      <span>If the image fails to load, a fallback cinematic poster is used automatically.</span>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Synopsis / Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter movie plot, synopsis, and cast overview..."
                    value={movieForm.description}
                    onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                {/* Submit and Cancel Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseMovieForm}
                    className="py-2 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={movieFormSubmitting}
                    className="py-2 px-6 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition"
                  >
                    {movieFormSubmitting
                      ? 'Saving Movie...'
                      : editingMovieId
                      ? 'Update Movie'
                      : 'Add Movie to Catalogue'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Movie Details Modal / Inspection Card */}
          {viewingMovie && (
            <div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-800 flex flex-col sm:flex-row gap-5 items-start">
              <img
                src={viewingMovie.posterUrl}
                alt={viewingMovie.title}
                className="w-24 h-36 object-cover rounded-lg bg-slate-800 flex-shrink-0"
                onError={(e) => {
                  e.target.src = DEFAULT_POSTER_FALLBACK;
                }}
              />
              <div className="flex-1 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">{viewingMovie.title}</h3>
                  <button
                    onClick={() => setViewingMovie(null)}
                    className="text-slate-400 hover:text-white font-bold px-2 py-0.5"
                  >
                    &times; Close
                  </button>
                </div>
                <div className="text-slate-400">
                  {viewingMovie.genre} &bull; {viewingMovie.language} &bull; {viewingMovie.durationMins} mins &bull;{' '}
                  <span className="text-rose-400 font-bold">{viewingMovie.ageRating}</span>
                </div>
                <p className="text-slate-300 leading-relaxed pt-1">{viewingMovie.description}</p>
                <div className="text-slate-400 text-[11px] pt-1">
                  Release Date: {new Date(viewingMovie.releaseDate).toLocaleDateString()} &bull; Status:{' '}
                  <span className="font-semibold text-white">{viewingMovie.status}</span> &bull; Active Shows:{' '}
                  <span className="font-semibold text-white">{viewingMovie.activeShowsCount || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Movie Catalogue Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Poster & Title</th>
                    <th className="py-3 px-4">Genre / Language</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Release Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No movies in catalog. Click "Add New Movie" above.
                      </td>
                    </tr>
                  ) : (
                    movies.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={m.posterUrl}
                              alt={m.title}
                              className="w-8 h-11 object-cover rounded bg-slate-100 flex-shrink-0"
                              onError={(e) => {
                                e.target.src = DEFAULT_POSTER_FALLBACK;
                              }}
                            />
                            <div>
                              <span className="font-bold text-slate-900 block">{m.title}</span>
                              <span className="text-[11px] text-slate-400 font-normal">{m.ageRating}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="font-medium text-slate-800 block">{m.genre}</span>
                          <span className="text-slate-400 text-[11px]">{m.language}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{m.durationMins}m</td>
                        <td className="py-3 px-4 text-slate-600">
                          {m.releaseDate ? new Date(m.releaseDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              m.status === 'NOW_SHOWING'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.status === 'UPCOMING'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => setViewingMovie(m)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                            title="View complete details"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            onClick={() => handleOpenEditMovie(m)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition"
                            title="Edit movie information"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleArchiveMovie(m.id, m.title, m.status)}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded transition ${
                              m.status === 'ARCHIVED'
                                ? 'text-emerald-700 hover:bg-emerald-50'
                                : 'text-rose-600 hover:bg-rose-50'
                            }`}
                            title={m.status === 'ARCHIVED' ? 'Restore movie' : 'Archive movie'}
                          >
                            {m.status === 'ARCHIVED' ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" /> Restore
                              </>
                            ) : (
                              <>
                                <Archive className="w-3.5 h-3.5" /> Archive
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BOOKINGS INSPECTION & AUDITING */}
      {/* ========================================================================= */}
      {activeTab === 'BOOKINGS' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by booking ref, customer name, email, or movie..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={bookingFilter}
                onChange={(e) => setBookingFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium"
              >
                <option value="ALL">All Statuses ({allBookings.length})</option>
                <option value="CONFIRMED">Confirmed Only</option>
                <option value="CANCELLED">Cancelled Only</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Movie & Showtime</th>
                    <th className="py-3 px-4">Auditorium Screen</th>
                    <th className="py-3 px-4">Booked Seats</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No bookings matching current search or filter.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.bookingRef}</td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="block font-semibold text-slate-900">{b.user?.name || 'Customer'}</span>
                          <span className="text-slate-400 text-[10px]">{b.user?.email}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-800">
                          <span className="font-semibold text-slate-900 block">{b.movie?.title}</span>
                          <span className="text-slate-500 text-[11px]">
                            {new Date(b.showTime).toLocaleDateString()} at{' '}
                            {new Date(b.showTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="font-medium text-slate-800 block">{b.theatre?.name}</span>
                          <span className="text-slate-400 text-[11px]">{b.screen}</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{b.seats?.join(', ')}</td>
                        <td className="py-3 px-4 font-bold text-rose-600">₹{b.totalAmount}</td>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
