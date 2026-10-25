import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Film, AlertCircle } from 'lucide-react';
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
    api
      .get('/movies/filters')
      .then((res) => setFilters(res.data.data.filters))
      .catch((err) => console.error('Error loading filters:', err));
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
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Now Showing</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a movie to browse available theatres and book seats.
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-72">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search movies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </form>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-3 mb-8">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Genre:</span>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 rounded px-2 py-1 text-xs focus:outline-none"
            >
              <option value="ALL">All Genres</option>
              {filters.genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Language:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 rounded px-2 py-1 text-xs focus:outline-none"
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
            className="text-xs text-rose-600 hover:underline font-medium"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2 text-xs mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading & Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
          <Film className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No movies found</h3>
          <p className="text-xs text-slate-400 mt-1">Try clearing your filters or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between hover:border-slate-300 transition"
            >
              {/* Poster */}
              <div className="aspect-[2/3] bg-slate-100 overflow-hidden relative">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src =
                      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
                  }}
                />
                <span className="absolute top-1.5 right-1.5 bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {movie.ageRating}
                </span>
              </div>

              {/* Info */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">
                    {movie.title}
                  </h2>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {movie.language} &bull; {movie.genre}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{movie.durationMins} mins</div>
                </div>

                <Link
                  to={`/movies/${movie.id}`}
                  className="mt-3 block text-center py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold transition"
                >
                  Book
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
