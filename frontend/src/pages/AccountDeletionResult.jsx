import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { confirmAccountDeletion } from '../api/auth';
import { authUtils } from '../utils/authUtils';

export default function AccountDeletionResult() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Confirming account deletion...');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const run = async () => {
      const token = searchParams.get('token');
      if (!token) {
        setSuccess(false);
        setMessage('This confirmation link is missing a token.');
        setLoading(false);
        return;
      }

      const result = await confirmAccountDeletion(token);
      setSuccess(Boolean(result.success));
      setMessage(result.success ? 'Your account has been deleted successfully.' : (result.error || 'Unable to confirm account deletion.'));
      if (result.success) {
        authUtils.clearAuth({ clearAllCache: true });
      }
      setLoading(false);
    };

    run();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar loggedIn={false} />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-xl w-full border border-slate-800 bg-slate-900/70 rounded-xl p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Account Deletion</h1>
          <p className="text-slate-300 mb-6">{loading ? 'Please wait...' : message}</p>
          {!loading && (
            <Link
              to="/"
              className={`inline-flex items-center justify-center px-5 py-2.5 rounded-md font-semibold transition ${success ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
              {success ? 'Go to Home' : 'Back'}
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
