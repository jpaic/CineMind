import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { confirmPasswordChange } from '../api/auth';

export default function PasswordChangeResult() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Confirming your password change...');
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

      const result = await confirmPasswordChange(token);
      setSuccess(Boolean(result.success));
      setMessage(result.success ? 'Your password has been changed successfully.' : (result.error || 'Unable to confirm password change.'));
      setLoading(false);
    };

    run();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar loggedIn={false} />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-xl w-full border border-slate-800 bg-slate-900/70 rounded-xl p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Password Change</h1>
          <p className="text-slate-300 mb-6">{loading ? 'Please wait...' : message}</p>
          {!loading && (
            <Link
              to="/login"
              className={`inline-flex items-center justify-center px-5 py-2.5 rounded-md font-semibold transition ${success ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
              Back to Login
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
