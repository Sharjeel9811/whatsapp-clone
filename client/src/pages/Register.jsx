import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import API from '../utils/axios';
import {
  Box, TextField, Button, Typography, Paper, Alert, CircularProgress, Avatar, IconButton,
} from '@mui/material';
import { DarkMode, LightMode, Chat, CloudUpload } from '@mui/icons-material';

const Register = () => {
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirmPassword: '' });
  const [profileFile, setProfileFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setProfileFile(file); setPreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => formData.append(key, val));
      if (profileFile) formData.append('profilePic', profileFile);
      const { data } = await API.post('/auth/register', formData);
      localStorage.setItem('userInfo', JSON.stringify(data));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: mode === 'dark' ? 'linear-gradient(135deg, #0f0f1a 0%, #1a2a3a 100%)' : 'linear-gradient(135deg, #d4e4d4 0%, #e8f5e8 100%)',
    }}>
      <IconButton onClick={toggleTheme} sx={{ position: 'absolute', top: 16, right: 16, color: mode === 'dark' ? '#ffb74d' : '#455a64' }}>
        {mode === 'dark' ? <LightMode /> : <DarkMode />}
      </IconButton>
      <Paper elevation={mode === 'dark' ? 4 : 2} sx={{
        p: 4, width: 440, maxWidth: '90%', borderRadius: 3, maxHeight: '95vh', overflow: 'auto',
        bgcolor: mode === 'dark' ? 'rgba(32,44,51,0.95)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
      }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Chat sx={{ fontSize: 48, color: '#25D366', mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#25D366', letterSpacing: -0.5 }}>WhatsApp</Typography>
          <Typography variant="body2" sx={{ color: '#8696a0', mt: 0.5 }}>Create your account</Typography>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Avatar src={preview} onClick={() => fileInputRef.current?.click()}
              sx={{ width: 80, height: 80, cursor: 'pointer', border: '2px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
              <CloudUpload sx={{ fontSize: 28 }} />
            </Avatar>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
          </Box>
          <TextField fullWidth label="Full Name" name="fullName" margin="normal" value={form.fullName}
            onChange={handleChange} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField fullWidth label="Username" name="username" margin="normal" value={form.username}
            onChange={handleChange} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField fullWidth label="Email" name="email" type="email" margin="normal" value={form.email}
            onChange={handleChange} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField fullWidth label="Password" name="password" type="password" margin="normal" value={form.password}
            onChange={handleChange} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField fullWidth label="Confirm Password" name="confirmPassword" type="password" margin="normal"
            value={form.confirmPassword} onChange={handleChange} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <Button fullWidth type="submit" variant="contained" sx={{ mt: 2, mb: 2, py: 1.2, borderRadius: 2, bgcolor: '#25D366', color: '#fff', fontWeight: 600, fontSize: 15, textTransform: 'none', '&:hover': { bgcolor: '#20bd5a' } }}
            disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Create Account'}
          </Button>
        </form>
        <Typography align="center" variant="body2" sx={{ color: '#8696a0' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#25D366', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Register;
