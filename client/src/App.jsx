import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeModeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';


const App = () => {
  return (
    <ThemeModeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Toaster position="top-center" toastOptions={{
              duration: 4000,
              style: { borderRadius: '10px', background: '#323232', color: '#fff', fontSize: '14px', padding: '12px 20px' },
            }} />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeModeProvider>
  );
};

export default App;
