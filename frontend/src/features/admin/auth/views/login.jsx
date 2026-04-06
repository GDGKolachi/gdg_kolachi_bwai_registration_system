import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../auth-api';
import { saveToken } from '../auth-service';
import BrandLogo from '../../../../shared/components/BrandLogo';
import { BRAND_NAME, BRAND_TAGLINE_ADMIN } from '../../../../shared/constants/branding';

function EyeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeSlashIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      saveToken(data.access_token);
      toast.success('Welcome back!');
      navigate('/admin');
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error('Too many login attempts. Please try again in a few minutes.');
      } else {
        toast.error('Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen min-h-dvh items-center justify-center overflow-x-hidden overflow-y-auto bg-admin-sidebar px-4 py-10 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% 20%, rgb(66 133 244 / 0.35), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgb(52 168 83 / 0.25), transparent)',
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="ui-card px-8 py-10 shadow-xl shadow-slate-900/20 sm:px-10 sm:py-12">
          <div className="mb-10 text-center">
            <BrandLogo className="isolate mx-auto mb-5 h-20 w-auto max-w-[220px]" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{BRAND_NAME}</h1>
            <p className="mt-2 text-sm text-slate-600">{BRAND_TAGLINE_ADMIN}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="ui-label-sentence" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="ui-input"
              />
            </div>
            <div>
              <label className="ui-label-sentence" htmlFor="login-password">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="ui-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-gdg-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gdg-blue/30"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <button type="submit" className="ui-btn-primary w-full py-3 disabled:opacity-60" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
