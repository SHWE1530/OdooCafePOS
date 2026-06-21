import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const SelfOrderRedirect = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (token) {
        const decoded = window.atob(token);
        if (decoded.startsWith('table_id=')) {
          const tableId = decoded.split('=')[1];
          navigate(`/self-order?table_id=${tableId}`, { replace: true });
        } else if (decoded.startsWith('table_')) {
          const tableId = decoded.split('_')[1];
          navigate(`/self-order?table_id=${tableId}`, { replace: true });
        } else {
          // Fallback if token is just the table ID number
          navigate(`/self-order?table_id=${decoded}`, { replace: true });
        }
      } else {
        navigate('/', { replace: true });
      }
    } catch (e) {
      console.error('Failed to decode self-order token', e);
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mb-4"></div>
      <p className="text-sm font-medium">Entering Restaurant Portal...</p>
    </div>
  );
};

export default SelfOrderRedirect;
