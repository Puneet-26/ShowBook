import React, { useState, useEffect } from 'react';
import { Plus, Search, AlertCircle, CheckCircle2, Trash2, Ban } from 'lucide-react';
import api from '../services/api';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('SHOWS');
  const [stats, setStats] = useState(null);
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [shows, setShows] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);

  // Simple inline form visibility toggles
  const [showAddMovie, setShowAddMovie] = useState(false);
  const [showAddShow, setShowAddShow] = useState(false);

  // Search in bookings
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingFilter, setBookingFilter] = useState('ALL');

  // Form states
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

  const [showForm, setShowForm] = useState({
    movieId: '',
    screenId: '',
    startTime: '',
    endTime: '',
    basePrice: 250,
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [dashRes, moviesRes, theatresRes, showsRes, bookingsRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/movies?status=ALL'),
        api.get('/theatres'),
        api.get('/shows'),
        api.get('/admin/bookings'),
      ]);

      setStats(dashRes.data.data.stats);
      setMovies(moviesRes.data.data.movies);
      setTheatres(theatresRes.data.data.theatres);
      setShows(showsRes.data.data.shows);
      setAllBookings(bookingsRes.data.data.bookings);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMovie = async (e) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      await api.post('/admin/movies', movieForm);
      setActionMessage({ type: 'success', text: 'Movie added successfully.' });
      setShowAddMovie(false);
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
      fetchAdminData();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to add movie.',
      });
    }
  };

  const handleDeleteMovie = async (movieId) => {
    if (!window.confirm('Archive / remove this movie from catalog?')) return;
    try {
      await api.delete(`/admin/movies/${movieId}`);
      setActionMessage({ type: 'success', text: 'Movie archived/removed.' });
      fetchAdminData();
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
      setShowAddShow(false);
      setShowForm({
        movieId: '',
        screenId: '',
        startTime: '',
        endTime: '',
        basePrice: 250,
      });
      fetchAdminData();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || 'Scheduling conflict or validation error.',
      });
    }
  };

  const handleCancelShow = async (showId) => {
    if (!window.confirm('Cancelling this show will cancel all user bookings for it. Continue?')) {
      return;
    }
    try {
      const res = await api.post(`/admin/shows/${showId}/cancel`);
      setActionMessage({ type: 'success', text: res.data.message });
      fetchAdminData();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to cancel show.',
      });
    }
  };

  const filteredBookings = allBookings.filter((b) => {
    const matchesFilter = bookingFilter === 'ALL' || b.status === bookingFilter;
    const query = bookingSearch.toLowerCase().trim();
    const matchesSearch =
      !query ||
      b.bookingRef.toLowerCase().includes(query) ||
      b.user.email.toLowerCase().includes(query) ||
      b.movie.title.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const allScreens = theatres.flatMap((t) =>
    t.screens.map((s) => ({ ...s, theatreName: t.name }))
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage movies, showtimes, and view bookings.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('SHOWS')}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === 'SHOWS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
            }`}
          >
            Shows ({shows.length})
          </button>
          <button
            onClick={() => setActiveTab('MOVIES')}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === 'MOVIES' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
            }`}
          >
            Movies ({movies.length})
          </button>
          <button
            onClick={() => setActiveTab('BOOKINGS')}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === 'BOOKINGS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
            }`}
          >
            Bookings ({allBookings.length})
          </button>
        </div>
      </div>

      {/* Overview Metric Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-[11px] text-slate-400 block font-semibold uppercase">Total Revenue</span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">₹{stats?.totalRevenue || 0}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-[11px] text-slate-400 block font-semibold uppercase">Confirmed Bookings</span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">{stats?.confirmedBookings || 0}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-[11px] text-slate-400 block font-semibold uppercase">Active Shows</span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">{stats?.activeShows || 0}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-[11px] text-slate-400 block font-semibold uppercase">Cancellations</span>
          <span className="text-xl font-bold text-slate-500 mt-0.5 block">{stats?.cancelledBookings || 0}</span>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg mb-6 flex items-center justify-between text-xs font-medium ${
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
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* TAB 1: SHOWS & SCHEDULING */}
      {activeTab === 'SHOWS' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900">Auditorium Shows</h2>
            <button
              onClick={() => setShowAddShow(!showAddShow)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddShow ? 'Close Form' : 'Schedule Show'}</span>
            </button>
          </div>

          {/* Inline Schedule Show Form */}
          {showAddShow && (
            <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs">
              <h3 className="font-bold text-slate-900 text-xs uppercase mb-3">Schedule a Show</h3>
              <form onSubmit={handleCreateShow} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1">Movie</label>
                  <select
                    required
                    value={showForm.movieId}
                    onChange={(e) => setShowForm({ ...showForm, movieId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  >
                    <option value="">-- Select Movie --</option>
                    {movies.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.language})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">Screen</label>
                  <select
                    required
                    value={showForm.screenId}
                    onChange={(e) => setShowForm({ ...showForm, screenId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  >
                    <option value="">-- Select Screen --</option>
                    {allScreens.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.theatreName} - {s.name} ({s.screenNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={showForm.startTime}
                    onChange={(e) => setShowForm({ ...showForm, startTime: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={showForm.endTime}
                    onChange={(e) => setShowForm({ ...showForm, endTime: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">Base Ticket Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={showForm.basePrice}
                    onChange={(e) => setShowForm({ ...showForm, basePrice: parseFloat(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-xs"
                  >
                    Confirm & Schedule Show
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Shows Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Movie</th>
                    <th className="py-2.5 px-3">Auditorium</th>
                    <th className="py-2.5 px-3">Start Time</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shows.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{s.movie.title}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {s.screen.theatre.name} - {s.screen.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">
                        {new Date(s.startTime).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">₹{s.basePrice}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            s.status === 'OPEN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {s.status === 'OPEN' && (
                          <button
                            onClick={() => handleCancelShow(s.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-800"
                          >
                            <Ban className="w-3 h-3" /> Cancel
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

      {/* TAB 2: MOVIES CATALOG */}
      {activeTab === 'MOVIES' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900">Movie Catalog</h2>
            <button
              onClick={() => setShowAddMovie(!showAddMovie)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddMovie ? 'Close Form' : 'Add Movie'}</span>
            </button>
          </div>

          {showAddMovie && (
            <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs">
              <h3 className="font-bold text-slate-900 text-xs uppercase mb-3">Add Movie</h3>
              <form onSubmit={handleCreateMovie} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={movieForm.title}
                    onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">Genre</label>
                  <input
                    type="text"
                    required
                    placeholder="Action, Sci-Fi..."
                    value={movieForm.genre}
                    onChange={(e) => setMovieForm({ ...movieForm, genre: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">Language</label>
                  <input
                    type="text"
                    required
                    placeholder="English, Hindi..."
                    value={movieForm.language}
                    onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    required
                    value={movieForm.durationMins}
                    onChange={(e) =>
                      setMovieForm({ ...movieForm, durationMins: parseInt(e.target.value, 10) })
                    }
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">Poster URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={movieForm.posterUrl}
                    onChange={(e) => setMovieForm({ ...movieForm, posterUrl: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">Age Rating</label>
                  <input
                    type="text"
                    required
                    value={movieForm.ageRating}
                    onChange={(e) => setMovieForm({ ...movieForm, ageRating: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-600 block mb-1">Description</label>
                  <textarea
                    required
                    rows={2}
                    value={movieForm.description}
                    onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="py-2 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-xs"
                  >
                    Save Movie
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Genre & Language</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movies.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{m.title}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {m.genre} &bull; {m.language}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{m.durationMins}m</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {m.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDeleteMovie(m.id)}
                          className="text-rose-600 hover:text-rose-800 text-[11px] font-medium"
                        >
                          Archive
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BOOKINGS INSPECTION */}
      {activeTab === 'BOOKINGS' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ref, email, movie..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Status:</span>
              <select
                value={bookingFilter}
                onChange={(e) => setBookingFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Ref</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Movie</th>
                    <th className="py-2.5 px-3">Auditorium</th>
                    <th className="py-2.5 px-3">Seats</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{b.bookingRef}</td>
                      <td className="py-2.5 px-3 text-slate-700">
                        <span className="block font-medium">{b.user.name}</span>
                        <span className="text-slate-400 text-[10px]">{b.user.email}</span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{b.movie.title}</td>
                      <td className="py-2.5 px-3 text-slate-600">{b.theatre.name}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{b.seats.join(', ')}</td>
                      <td className="py-2.5 px-3 font-bold text-rose-600">₹{b.totalAmount}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
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
    </div>
  );
}
