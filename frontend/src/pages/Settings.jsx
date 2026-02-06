import React, { useEffect, useState } from 'react';
import { Bell, Palette, Globe, Lock, Check } from 'lucide-react';
import { getUserSettings, updateUserSettings } from '../api/auth';
import { authUtils } from '../utils/authUtils';
import { tmdbService } from '../api/tmdb';

export default function Settings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    darkMode: true,
    letterboxd: false,
    imdb: false,
    adultContentEnabled: false,
  });
  const [settingsError, setSettingsError] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getUserSettings();
        setSettings((prev) => ({
          ...prev,
          adultContentEnabled: data?.adultContentEnabled ?? false,
        }));
      } catch (err) {
        setSettingsError('Failed to load account settings.');
      }
    };

    loadSettings();
  }, []);

  const handleAdultToggle = async () => {
    const nextValue = !settings.adultContentEnabled;
    setSettings((prev) => ({ ...prev, adultContentEnabled: nextValue }));
    try {
      const updated = await updateUserSettings({ adultContentEnabled: nextValue });
      authUtils.setAdultContentEnabled(updated?.adultContentEnabled ?? nextValue);
      tmdbService.setAdultContentEnabled(updated?.adultContentEnabled ?? nextValue);
      setSettingsError(null);
    } catch (err) {
      setSettings((prev) => ({ ...prev, adultContentEnabled: !nextValue }));
      setSettingsError('Failed to update adult content setting.');
    }
  };

  const settingsSections = [
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          key: 'emailNotifications',
          label: 'Email Notifications',
          description: 'Receive updates via email',
          type: 'toggle'
        }
      ]
    },
    {
      title: 'Appearance',
      icon: Palette,
      items: [
        {
          key: 'darkMode',
          label: 'Dark Mode',
          description: 'Use the dark theme across the entire app',
          type: 'toggle'
        }
      ]
    },
    {
      title: 'Connections',
      icon: Globe,
      items: [
        {
          key: 'letterboxd',
          label: 'Letterboxd',
          description: 'Sync your Letterboxd account',
          type: 'oauth'
        },
        {
          key: 'imdb',
          label: 'IMDb',
          description: 'Sync your IMDb account',
          type: 'oauth'
        }
      ]
    }
  ];

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-slate-400 mb-8">Manage your app preferences</p>

        <div className="space-y-6">
          {settingsSections.map((section) => (
            <div
              key={section.title}
              className="border border-slate-800 rounded-lg p-6 hover:border-purple-500/30 transition"
            >
              <div className="flex items-center gap-3 mb-4">
                <section.icon className="w-5 h-5 text-purple-400" />
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

                    {/* Toggle Type */}
                    {item.type === 'toggle' && (
                      <button
                        onClick={() =>
                          setSettings({
                            ...settings,
                            [item.key]: !settings[item.key]
                          })
                        }
                        className={`relative w-12 h-6 rounded-full transition ${
                          settings[item.key]
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500'
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

                    {/* OAuth Button Type */}
                    {item.type === 'oauth' && (
                      <button
                        onClick={() =>
                          setSettings({
                            ...settings,
                            [item.key]: !settings[item.key]
                          })
                        }
                        className={`px-4 py-1.5 rounded text-sm font-medium transition ${
                          settings[item.key]
                            ? 'bg-green-900/40 border border-green-500/30 text-green-400'
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

          {/* Account Actions */}
          <div className="border border-slate-800 rounded-lg p-6 hover:border-purple-500/30 transition">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-semibold">Account</h2>
            </div>

            {settingsError && (
              <div className="mb-4 rounded-lg border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                {settingsError}
              </div>
            )}

            <div className="flex items-center justify-between py-3 border-b border-slate-800">
              <div className="flex-1">
                <p className="font-medium text-slate-200">Adult Content</p>
                <p className="text-sm text-slate-500">Show adult movies and talent across the app</p>
              </div>
              <button
                onClick={handleAdultToggle}
                className={`relative w-12 h-6 rounded-full transition ${
                  settings.adultContentEnabled
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500'
                    : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.adultContentEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-3">
              <button className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded text-sm font-medium transition text-left">
                Change Password
              </button>

              <button className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded text-sm font-medium transition text-left">
                Export My Data
              </button>

              <button className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded text-sm font-medium transition text-left">
                Reset Library
              </button>

              <button className="w-full px-4 py-2.5 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 rounded text-sm font-medium transition text-left text-red-400">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
