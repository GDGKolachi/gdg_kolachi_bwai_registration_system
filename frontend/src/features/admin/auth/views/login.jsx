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
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--gdg-dark)',
    }}>
      <div className="card" style={{ width: 400, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--gdg-blue)' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--gdg-red)' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--gdg-yellow)' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--gdg-green)' }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Admin Login</h1>
          <p style={{ color: 'var(--gdg-gray)', fontSize: 14, marginTop: 4 }}>GDG Kolachi - Build with AI</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
