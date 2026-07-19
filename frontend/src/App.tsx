import AppRouter from './routes/AppRouter';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <Toaster position="bottom-right" toastOptions={{ style: { background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' } }} />
          <AppRouter />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;