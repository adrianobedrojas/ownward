'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-white">
      <h1 className="text-4xl font-bold mb-6">About & Contact</h1>

      {/* Flex container grouping image and bio */}
      <div className="flex flex-col md:flex-row gap-8 items-center mb-12">
        <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-full border-2 border-cyan-500">
          <Image 
            src="/profile.jpg" 
            alt="Founder Headshot" 
            fill 
            className="object-cover object-top translate-y-1 scale-115" 
          />
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-2">Hi, I'm Adrian</h2>
          <p className="text-slate-300 leading-relaxed">
            Welcome to Ownward Hub. I built this platform to give business owners 
            the tools, knowledge, and confidential deal rooms needed to manage, grow, 
            and sell their companies.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <h3 className="text-2xl font-bold mb-2 text-white">Get in Touch</h3>
        <p className="text-slate-400 mb-6">
          Have questions about listings, deal rooms, or articles? Send a secure message below. Your contact information will be used to review and respond to your message and handled according to our{' '}
          <Link href="/privacy" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Privacy Policy
          </Link>
          .
        </p>

        {status === 'success' ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-emerald-400">
            <h4 className="font-semibold text-lg mb-1">Message Sent Successfully!</h4>
            <p className="text-sm text-emerald-300">Thank you for reaching out. I'll get back to you as soon as possible.</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-4 inline-block bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-medium px-4 py-2 rounded-lg text-sm transition"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Your Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Your Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                placeholder="jane@example.com"
              />
              <p className="mt-1 text-xs text-slate-500">Only used so I can reply directly to you.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                placeholder="How can I help you today?"
              />
            </div>

            {status === 'error' && (
              <p className="text-sm text-rose-400">{errorMessage || 'An error occurred. Please try again.'}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full sm:w-auto bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold px-6 py-3 rounded-lg transition disabled:opacity-50"
            >
              {status === 'loading' ? 'Sending message...' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}