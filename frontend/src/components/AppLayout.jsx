import Navbar from './Navbar';
import Footer from './Footer';
import { authUtils } from '../utils/authUtils';

export default function AppLayout({ children, onLogout }) {
  const demoMode = authUtils.isDemoMode();

export default function AppLayout({ children, onLogout }) {
  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-slate-950 text-slate-50">
      <Navbar loggedIn={true} onLogout={onLogout} />

      <div className="flex-1 w-full overflow-y-auto app-scroll">
        {children}
      </div>

      <Footer />
    </div>
  );
}
