import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  const location = useLocation();
  const isFullScreenApp = ['/pos', '/kitchen'].includes(location.pathname);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 ${isFullScreenApp ? 'overflow-hidden flex flex-col h-full' : 'overflow-y-auto'}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
