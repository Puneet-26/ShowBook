import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Film, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from =
    typeof location.state?.from === 'string'
      ? location.state.from
      : location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail, userPassword) => {
    setEmail(userEmail);
    setPassword(userPassword);
    setError(null);
  };

  return (
    <div className="min-h-[75vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center text-white mx-auto mb-3 shadow-xs">
            <Film className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to access your booked movie tickets and seat reservations.
          </p>
        </div>

        {/* Quick Demo Credentials Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 text-xs">
          <span className="font-semibold text-slate-700 block mb-1.5">
            Quick Project Demo Logins:
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => fillCredentials('user@showbook.com', 'User@12345')}
              className="py-1.5 px-2 bg-white border border-slate-300 rounded font-semibold text-slate-700 hover:bg-slate-100 transition text-[11px] text-center"
            >
              Demo User 1
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('user2@showbook.com', 'User2@12345')}
              className="py-1.5 px-2 bg-white border border-slate-300 rounded font-semibold text-slate-700 hover:bg-slate-100 transition text-[11px] text-center"
            >
              Demo User 2
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('admin@showbook.com', 'Admin@12345')}
              className="py-1.5 px-2 bg-indigo-50 border border-indigo-200 rounded font-bold text-indigo-700 hover:bg-indigo-100 transition text-[11px] text-center"
            >
              Admin
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg flex items-center gap-2 text-xs mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-lg shadow-sm transition disabled:bg-rose-400"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 mt-6 pt-4 border-t border-slate-100">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-rose-600 hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
