import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, Tag, Calendar, MapPin, Film, ChevronRight, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function MovieDetailsPage() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/movies/${id}`)
      .then((res) => {
        setMovie(res.data.data.movie);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load movie details.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">{error || 'Movie not found'}</h2>
        <Link to="/" className="text-rose-600 hover:underline text-sm font-medium">
          &larr; Back to all movies
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
        <Link to="/" className="hover:text-slate-800">
          Movies
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-800 font-medium">{movie.title}</span>
      </div>

      {/* Movie Details Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 mb-10 shadow-xs flex flex-col md:flex-row gap-8 items-start">
        <div className="w-full md:w-64 aspect-[2/3] rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 shadow-sm">
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src =
                'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
            }}
          />
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-0.5 rounded">
              {movie.language}
            </span>
            <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded">
              {movie.ageRating}
            </span>
            <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded">
              {movie.genre}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            {movie.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 mb-6 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{movie.durationMins} minutes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Released {new Date(movie.releaseDate).toLocaleDateString()}</span>
            </div>
          </div>

          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
            Synopsis
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed max-w-3xl">
            {movie.description}
          </p>
        </div>
      </div>

      {/* Available Theatres and Showtimes Section */}
      <div>
        <div className="border-b border-slate-200 pb-4 mb-6">
          <h2 className="text-xl font-bold text-slate-900">Select Theatre & Showtime</h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose an auditorium and scheduled time to proceed to interactive seat selection.
          </p>
        </div>

        {movie.theatres.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-xl p-8">
            <Film className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="text-base font-semibold text-slate-800 mb-1">
              No shows scheduled currently
            </h4>
            <p className="text-xs text-slate-500">
              Please check back soon for upcoming screenings of this movie.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {movie.theatres.map((theatre) => (
              <div
                key={theatre.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{theatre.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{theatre.location}, {theatre.city}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded self-start sm:self-auto">
                    M-Ticket Available
                  </span>
                </div>

                {/* Showtimes buttons grid */}
                <div className="flex flex-wrap gap-3">
                  {theatre.shows.map((show) => {
                    const timeStr = new Date(show.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const dateStr = new Date(show.startTime).toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <Link
                        key={show.id}
                        to={`/shows/${show.id}/seats`}
                        className="group flex flex-col items-center justify-center border border-slate-300 hover:border-rose-500 bg-slate-50 hover:bg-rose-50/40 rounded-lg px-4 py-2.5 transition text-center min-w-[130px]"
                      >
                        <span className="text-xs text-slate-500 group-hover:text-rose-600 font-medium">
                          {dateStr}
                        </span>
                        <span className="text-sm font-bold text-slate-800 group-hover:text-rose-600">
                          {timeStr}
                        </span>
                        <span className="text-[11px] text-slate-400 group-hover:text-slate-600 mt-0.5">
                          {show.screenName} &bull; ₹{show.basePrice}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
