import React from 'react';
import { Film, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-rose-600 flex items-center justify-center text-white">
              <Film className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-800">
              Show<span className="text-rose-600">Book</span>
            </span>
            <span className="text-slate-400 text-sm">| Full Stack Movie Ticket Booking</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <ShieldCheck className="w-4 h-4" />
              Atomic PostgreSQL Concurrency Guarded
            </span>
            <span>&copy; {new Date().getFullYear()} ShowBook Inc.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
