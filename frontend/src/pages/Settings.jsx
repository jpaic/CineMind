import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Palette, Globe, Lock, Check, Loader, X } from 'lucide-react';
import { authUtils } from '../utils/authUtils';

const API_URL = import.meta.env.VITE_API_URL;

const authedFetch = async (path, options = {}) => {
  const token = authUtils.getToken();

  if (!token) {
    throw new Error('You need to be logged in to perform this action.');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Request failed');
  }

  return response;
};

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    darkMode: true,
    letterboxd: false,
    imdb: false,
  });

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const settingsSections = [
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          key: 'emailNotifications',
          label: 'Email Notifications',
          description: 'Receive updates via email',
          type: 'toggle',
        },
      ],
    },
    {
      title: 'Appearance',
      icon: Palette,
      items: [
        {
          key: 'darkMode',
          label: 'Dark Mode',
          description: 'Use the dark theme across the entire app',
          type: 'toggle',
        },
      ],
    },
    {
      title: 'Connections',
      icon: Globe,
      items: [
        {
          key: 'letterboxd',
          label: 'Letterboxd',
          description: 'Sync your Letterboxd account',
          type: 'oauth',
        },
        {
          key: 'imdb',
          label: 'IMDb',
          description: 'Sync your IMDb account',
          type: 'oauth',
        },
      ],
    },
  ];

  const handleExportData = async () => {
    setActionError('');
    setActionMessage('');
    setIsExporting(true);

    try {
      const response = await authedFetch('/api/auth/export', {
        method: 'GET',
        headers: {},
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cinemind-letterboxd-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setActionMessage('Your export has been downloaded.');
    } catch (error) {
      setActionError(error.message || 'Failed to export your data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetLibrary = async () => {
    const confirmed = window.confirm('This will remove all rated movies and your entire watchlist. This cannot be undone. Continue?');
    if (!confirmed) {
      return;
    }

    setActionError('');
    setActionMessage('');
    setIsResetting(true);

    try {
      await authedFetch('/api/auth/library', { method: 'DELETE' });
      setActionMessage('Your library and watchlist were reset successfully.');
    } catch (error) {
      setActionError(error.message || 'Failed to reset your library.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('This will permanently delete your account and all data. This cannot be undone. Continue?');
    if (!confirmed) {
      return;
    }

    setActionError('');
    setActionMessage('');
    setIsDeleting(true);

    try {
      await authedFetch('/api/auth/account', { method: 'DELETE' });
      authUtils.clearAuth();
      navigate('/', { replace: true });
    } catch (error) {
      setActionError(error.message || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    setActionError('');
    setActionMessage('');
    setIsSavingPassword(true);

    try {
      await authedFetch('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      setActionMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setIsPasswordModalOpen(false);
    } catch (error) {
      setActionError(error.message || 'Failed to update password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-2 text-slate-50">
          Settings
        </h1>
        <p className="text-slate-400 mb-8">Manage your app preferences</p>

        {(actionMessage || actionError) && (
          <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${actionError ? 'border-blue-500/40 bg-slate-800/40 text-slate-100' : 'border-blue-500/40 bg-slate-800/40 text-slate-100'}`}>
            {actionError || actionMessage}
          </div>
        )}

        <div className="space-y-6">
          {settingsSections.map((section) => (
            <div
              key={section.title}
              className="border border-slate-800 rounded-lg p-6 hover:border-blue-500/30 transition"
            >
              <div className="flex items-center gap-3 mb-4">
                <section.icon className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-semibold">{section.title}</h2>
              </div>

              <div className="space-y-4">
                {section.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-200">{item.label}</p>
                      <p className="text-sm text-slate-500">{item.description}</p>
                    </div>

                    {item.type === 'toggle' && (
                      <button
                        onClick={() =>
                          setSettings({
                            ...settings,
                            [item.key]: !settings[item.key],
                          })
                        }
                        className={`relative w-12 h-6 rounded-full transition ${
                          settings[item.key]
                            ? 'bg-gradient-to-r from-blue-500 to-slate-700'
                            : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                            settings[item.key] ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    )}

                    {item.type === 'oauth' && (
                      <button
                        onClick={() =>
                          setSettings({
                            ...settings,
                            [item.key]: !settings[item.key],
                          })
                        }
                        className={`px-4 py-1.5 rounded text-sm font-medium transition ${
                          settings[item.key]
                            ? 'bg-slate-800 border border-blue-500/30 text-slate-100'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {settings[item.key] ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-4 h-4" /> Connected
                          </span>
                        ) : (
                          <>Connect</>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="border border-slate-800 rounded-lg p-6 hover:border-blue-500/30 transition">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-semibold">Account</h2>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded text-sm font-medium transition text-left"
              >
                Change Password
              </button>

              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed rounded text-sm font-medium transition text-left inline-flex items-center gap-2"
              >
                {isExporting && <Loader className="w-4 h-4 animate-spin" />}
                Export My Data
              </button>

              <button
                onClick={handleResetLibrary}
                disabled={isResetting}
                className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed rounded text-sm font-medium transition text-left inline-flex items-center gap-2"
              >
                {isResetting && <Loader className="w-4 h-4 animate-spin" />}
                Reset Library
              </button>

              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-700 rounded text-sm font-medium transition text-left text-slate-200 inline-flex items-center gap-2"
              >
                {isDeleting && <Loader className="w-4 h-4 animate-spin" />}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button className="absolute inset-0 bg-black/70" onClick={() => setIsPasswordModalOpen(false)} />

          <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Change Password</h3>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-300">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                  minLength={8}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSavingPassword}
                className="w-full rounded bg-gradient-to-r from-blue-500 to-slate-700 py-2 font-medium text-white hover:from-blue-400 hover:to-slate-600 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {isSavingPassword && <Loader className="w-4 h-4 animate-spin" />}
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
