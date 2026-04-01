import Navbar from './Navbar';
import Footer from './Footer';
import { authUtils } from '../utils/authUtils';

export default function AppLayout({ children, onLogout }) {
  const demoMode = authUtils.isDemoMode();

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-slate-950 text-slate-50">
      <Navbar loggedIn={true} onLogout={onLogout} />

      {demoMode && (
        <div className="bg-amber-500/20 border-y border-amber-400/50 text-amber-200 text-sm px-4 py-2 text-center">
          Demo Mode (Read-only): changes like ratings/watchlist are disabled.
        </div>
      )}

      <div className="flex-1 w-full overflow-y-auto app-scroll">
        {children}
      </div>

      <Footer />
    </div>
  );
}
