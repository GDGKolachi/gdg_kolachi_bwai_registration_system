import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../auth-api';
import { saveToken } from '../auth-service';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      saveToken(data.access_token);
      toast.success('Welcome back!');
      navigate('/admin');
    } catch {
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gdg-dark">
      <div className="bg-white rounded-xl p-10 border border-gdg-border w-96">
        <div className="text-center mb-8">
          <div className="flex justify-center gap-1 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-gdg-blue" />
            <span className="w-2.5 h-2.5 rounded-full bg-gdg-red" />
            <span className="w-2.5 h-2.5 rounded-full bg-gdg-yellow" />
            <span className="w-2.5 h-2.5 rounded-full bg-gdg-green" />
          </div>
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-gdg-gray text-sm mt-1">GDG Kolachi - Build with AI</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3.5 py-2.5 border border-gdg-border rounded-lg text-sm focus:outline-none focus:border-gdg-blue focus:ring-2 focus:ring-gdg-blue/15" />
          </div>
          <div className="mb-5">
            <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-3.5 py-2.5 border border-gdg-border rounded-lg text-sm focus:outline-none focus:border-gdg-blue focus:ring-2 focus:ring-gdg-blue/15" />
          </div>
          <button type="submit" className="w-full py-2.5 px-6 bg-gdg-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600 disabled:opacity-60" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
