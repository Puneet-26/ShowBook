import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <span>ShowBook &bull; Full Stack Movie Ticket Booking Project &bull; {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
