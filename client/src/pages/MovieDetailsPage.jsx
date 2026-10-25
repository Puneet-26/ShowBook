import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, MapPin, AlertCircle } from 'lucide-react';
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
      .then((res) => setMovie(res.data.data.movie))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load movie details.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-slate-800 mb-2">{error || 'Movie not found'}</h2>
        <Link to="/" className="text-rose-600 hover:underline text-xs font-semibold">
          &larr; Back to movies
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 mb-6 font-medium"
      >
        <ChevronLeft className="w-4 h-4" /> Back to movies
      </Link>

      {/* Movie Details Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 flex flex-col sm:flex-row gap-6 items-start">
        <div className="w-36 sm:w-44 aspect-[2/3] rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
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
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">{movie.language}</span>
            <span>&bull;</span>
            <span>{movie.genre}</span>
            <span>&bull;</span>
            <span>{movie.durationMins} mins</span>
            <span>&bull;</span>
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
              {movie.ageRating}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-3">{movie.title}</h1>

          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl mb-4">
            {movie.description}
          </p>

          <div className="text-[11px] text-slate-400">
            Release Date: {new Date(movie.releaseDate).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Theatres and Showtimes */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Select Showtime</h2>
        <p className="text-xs text-slate-500 mb-6">Choose a theatre and screening time.</p>

        {movie.theatres.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500">No scheduled shows available at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {movie.theatres.map((theatre) => (
              <div key={theatre.id} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{theatre.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{theatre.location}, {theatre.city}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
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
                        className="border border-slate-200 hover:border-slate-900 bg-slate-50 hover:bg-white rounded-lg px-3.5 py-2 text-center transition"
                      >
                        <span className="block text-[10px] text-slate-400 font-medium">{dateStr}</span>
                        <span className="block text-xs font-bold text-slate-900 mt-0.5">{timeStr}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">
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
