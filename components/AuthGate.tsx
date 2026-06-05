'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Loader as Loader2, LogIn, UserPlus, TriangleAlert as AlertTriangle, Eye, EyeOff } from 'lucide-react';

const SERIF = { fontFamily: 'Georgia, "Times New Roman", serif' };

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 size={20} className="text-neutral-500 animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <>
      <div className="fixed top-3 right-4 z-50">
        <button
          onClick={signOut}
          className="text-[10px] tracking-[0.2em] text-neutral-600 hover:text-neutral-300 transition-colors uppercase"
        >
          Sign out
        </button>
      </div>
      {children}
    </>
  );
}

type Mode = 'signin' | 'signup';

function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo('Account created. You are now signed in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message.replace('AuthApiError: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const inp = "w-full bg-neutral-900 border border-neutral-800 rounded-sm px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-300/50 transition-colors";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="text-[10px] tracking-[0.3em] text-neutral-500 mb-3">PIPELINE × MEDDPICC</div>
          <h1 className="text-3xl text-neutral-50" style={SERIF}>Pipeline Planner</h1>
          <p className="text-sm text-neutral-500 mt-2 italic" style={SERIF}>Your private weekly planning space.</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-sm p-6">
          <div className="flex gap-1 mb-6 bg-neutral-950 rounded-sm p-1">
            <TabBtn label="Sign in" active={mode === 'signin'} onClick={() => { setMode('signin'); setError(null); }} />
            <TabBtn label="Create account" active={mode === 'signup'} onClick={() => { setMode('signup'); setError(null); }} />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              autoComplete="email"
              required
              className={inp}
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={mode === 'signup' ? 8 : undefined}
                className={`${inp} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-300 bg-red-950/30 border border-red-900/50 rounded-sm p-3">
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-900/50 rounded-sm p-3">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 bg-amber-300 text-neutral-950 px-4 py-3 rounded-sm text-sm font-medium hover:bg-amber-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" />{mode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
              ) : mode === 'signin' ? (
                <><LogIn size={14} /> Sign in</>
              ) : (
                <><UserPlus size={14} /> Create account</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-neutral-700 mt-6 tracking-wide">
          Private · Local · One person · Cisco FY · MEDDPICC
        </p>
      </div>
    </div>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 text-xs rounded-sm transition-colors tracking-wide ${
        active ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'
      }`}
    >
      {label}
    </button>
  );
}
