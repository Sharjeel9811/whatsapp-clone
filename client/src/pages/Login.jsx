import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import {
  Box, TextField, Button, Typography, Paper, Alert, CircularProgress, IconButton,
} from '@mui/material';
import { DarkMode, LightMode, Chat } from '@mui/icons-material';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: mode === 'dark' ? 'linear-gradient(135deg, #0f0f1a 0%, #1a2a3a 100%)' : 'linear-gradient(135deg, #d4e4d4 0%, #e8f5e8 100%)',
    }}>
      <IconButton onClick={toggleTheme} sx={{ position: 'absolute', top: 16, right: 16, color: mode === 'dark' ? '#ffb74d' : '#455a64' }}>
        {mode === 'dark' ? <LightMode /> : <DarkMode />}
      </IconButton>
      <Paper elevation={mode === 'dark' ? 4 : 2} sx={{
        p: 4, width: 400, maxWidth: '90%', borderRadius: 3,
        bgcolor: mode === 'dark' ? 'rgba(32,44,51,0.95)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
      }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Chat sx={{ fontSize: 48, color: '#25D366', mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#25D366', letterSpacing: -0.5 }}>
            WhatsApp
          </Typography>
          <Typography variant="body2" sx={{ color: '#8696a0', mt: 0.5 }}>
            Welcome back! Sign in to continue
          </Typography>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Email" type="email" margin="normal" value={email}
            onChange={(e) => setEmail(e.target.value)} required
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField fullWidth label="Password" type="password" margin="normal" value={password}
            onChange={(e) => setPassword(e.target.value)} required
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <Button fullWidth type="submit" variant="contained" sx={{ mt: 2, mb: 2, py: 1.2, borderRadius: 2, bgcolor: '#25D366', color: '#fff', fontWeight: 600, fontSize: 15, textTransform: 'none', '&:hover': { bgcolor: '#20bd5a' } }}
            disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
        </form>
        <Typography align="center" variant="body2" sx={{ color: '#8696a0' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#25D366', fontWeight: 600, textDecoration: 'none' }}>Create one</Link>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;
