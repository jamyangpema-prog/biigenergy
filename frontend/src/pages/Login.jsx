import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Loader2, Lock, Mail, ArrowRight } from 'lucide-react';

export const LOGO = 'https://customer-assets-jt897jd0.emergentagent.net/job_equipquote--13ttmu53/artifacts/57e4a1b4741c1c06_LOGO%20BE.png';

export default function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/hub" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      nav('/hub');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="portal-bg min-h-screen text-white flex flex-col" data-testid="login-page">
      <div className="portal-glow" />
      <header className="relative z-10 px-6 sm:px-10 py-6 flex items-center justify-between">
        <img src={LOGO} alt="BIIG ENERGY" className="h-12 w-auto rounded-md" data-testid="login-logo" />
        <span className="text-xs uppercase tracking-[0.25em] text-white/50">Staff portal</span>
      </header>
      <main className="relative z-10 flex-1 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center px-6 sm:px-10 lg:px-20 pb-16">
        <div className="max-w-xl portal-rise">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-red-400 font-semibold mb-6">
            <span className="h-px w-8 bg-red-500" /> BIIG ENERGY
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
            One sign-in.<br /><span className="text-white/40">Every system.</span>
          </h1>
          <p className="mt-6 text-base text-white/60 max-w-md">Costing, document control and employee tracking for the BIIG ENERGY team, all in one place.</p>
        </div>
        <form onSubmit={submit} className="portal-card portal-rise w-full max-w-md lg:justify-self-end p-8 sm:p-10" style={{ animationDelay: '120ms' }} data-testid="login-form">
          <h2 className="text-2xl font-semibold tracking-tight">Log in</h2>
          <p className="text-sm text-white/50 mt-1 mb-8">Use your BIIG ENERGY account.</p>
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-2" htmlFor="email">Email</label>
          <div className="portal-input mb-5"><Mail className="h-4 w-4 text-white/40" />
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" data-testid="login-email" placeholder="you@biigenergy.com.au" />
          </div>
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-2" htmlFor="password">Password</label>
          <div className="portal-input mb-8"><Lock className="h-4 w-4 text-white/40" />
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" data-testid="login-password" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} data-testid="login-submit"
                  className="group w-full h-12 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-60 font-semibold inline-flex items-center justify-center gap-2 transition-colors">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Log in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
          </button>
          <p className="text-xs text-white/40 mt-6 text-center">Accounts are created by your administrator.</p>
        </form>
      </main>
      <footer className="relative z-10 px-6 sm:px-10 py-5 text-xs text-white/30">© {new Date().getFullYear()} BIIG ENERGY</footer>
    </div>
  );
}
