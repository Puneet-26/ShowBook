import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Clock, Tag, Film, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function HomePage() {
  const [movies, setMovies] = useState([]);
  const [filters, setFilters] = useState({ genres: [], languages: [] });
  const [selectedGenre, setSelectedGenre] = useState('ALL');
  const [selectedLanguage, setSelectedLanguage] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch filter categories
    api
      .get('/movies/filters')
      .then((res) => {
        setFilters(res.data.data.filters);
      })
      .catch((err) => console.error('Error fetching filters:', err));
  }, []);

  useEffect(() => {
    fetchMovies();
  }, [selectedGenre, selectedLanguage]);

  const fetchMovies = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedGenre !== 'ALL') params.genre = selectedGenre;
      if (selectedLanguage !== 'ALL') params.language = selectedLanguage;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/movies', { params });
      setMovies(res.data.data.movies);
    } catch (err) {
      setError('Unable to load movies. Please check connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMovies();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Banner with Search */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-10 mb-8 text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="max-w-xl">
          <span className="text-rose-400 font-semibold text-xs tracking-wider uppercase mb-1 block">
            Now Showing in Theatres
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Book Movie Tickets with Seamless Reliability
          </h1>
          <p className="text-slate-300 text-sm sm:text-base">
            Explore current blockbusters, select your preferred auditorium, reserve seats in real time, and enjoy a hassle-free booking experience.
          </p>
        </div>

        {/* Quick Search */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-80">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search movie title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
            />
          </div>
        </form>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-8 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">
            <Filter className="w-4 h-4" />
            Filters:
          </div>

          {/* Genre Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-600">Genre:</span>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="ALL">All Genres</option>
              {filters.genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Language Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-600">Language:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="ALL">All Languages</option>
              {filters.languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(selectedGenre !== 'ALL' || selectedLanguage !== 'ALL' || search) && (
          <button
            onClick={() => {
              setSelectedGenre('ALL');
              setSelectedLanguage('ALL');
              setSearch('');
            }}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3 mb-8">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
        </div>
      ) : movies.length === 0 ? (
        /* Empty state */
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Film className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-semibold text-slate-800 mb-1">No movies found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query or clear the active genre/language filters.
          </p>
        </div>
      ) : (
        /* Movie Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col group"
            >
              {/* Poster image */}
              <div className="relative aspect-[2/3] bg-slate-100 overflow-hidden">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  onError={(e) => {
                    e.target.src =
                      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
                  }}
                />
                <div className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded">
                  {movie.ageRating}
                </div>
                <div className="absolute bottom-2.5 left-2.5 bg-rose-600/90 text-white text-[11px] font-semibold px-2 py-0.5 rounded">
                  {movie.language}
                </div>
              </div>

              {/* Movie info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 text-lg leading-snug mb-1 group-hover:text-rose-600 transition">
                    {movie.title}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      {movie.genre}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {movie.durationMins}m
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs line-clamp-2 mb-4 leading-relaxed">
                    {movie.description}
                  </p>
                </div>

                <Link
                  to={`/movies/${movie.id}`}
                  className="w-full block text-center py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-xs transition"
                >
                  Book Tickets
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
