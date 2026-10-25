import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Film, Ticket, Shield, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-rose-600 flex items-center justify-center text-white">
                <Film className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">
                Show<span className="text-rose-600">Book</span>
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                  isActive('/') ? 'text-rose-600 bg-rose-50' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Movies
              </Link>
              {isAuthenticated && (
                <Link
                  to="/my-bookings"
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition ${
                    isActive('/my-bookings')
                      ? 'text-rose-600 bg-rose-50'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>My Bookings</span>
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition ${
                    location.pathname.startsWith('/admin')
                      ? 'text-indigo-600 bg-indigo-50 font-bold'
                      : 'text-indigo-600 hover:text-indigo-800'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </Link>
              )}
            </div>
          </div>

          {/* User Status / Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-slate-700">{user?.name}</span>
                {isAdmin && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold text-[10px]">
                    ADMIN
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-rose-600 rounded transition"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex sm:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-600 hover:text-slate-900"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 text-xs">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 font-semibold text-slate-700"
          >
            Movies
          </Link>
          {isAuthenticated && (
            <Link
              to="/my-bookings"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 font-semibold text-slate-700"
            >
              My Bookings
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 font-bold text-indigo-600"
            >
              Admin Dashboard
            </Link>
          )}
          <div className="border-t border-slate-100 pt-2 mt-2">
            {isAuthenticated ? (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">{user?.name}</span>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-rose-600 font-semibold"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-1.5 border border-slate-200 rounded font-semibold text-slate-700"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-1.5 bg-rose-600 text-white rounded font-semibold"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
