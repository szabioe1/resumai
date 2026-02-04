import React, { useState, useEffect } from 'react';
import { Save, Bell, Lock, Palette, FileText, User as UserIcon, LogOut, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from './ui/card';
import { useAuth } from '../contexts/auth';
import { useTheme } from '../contexts/theme';
import { cn } from '../lib/utils';

interface SettingsState {
  notifications: boolean;
  emailAlerts: boolean;
  autoAnalyze: boolean;
  defaultFormat: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function Settings() {
  const { user, signout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsState>({
    notifications: true,
    emailAlerts: true,
    autoAnalyze: false,
    defaultFormat: 'pdf'
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  const handleChange = (key: keyof SettingsState, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setSaveStatus('idle');
  };

  const handleSave = () => {
    setSaveStatus('saving');
    setErrorMessage('');
    
    try {
      // Save to localStorage
      localStorage.setItem('userSettings', JSON.stringify(settings));
      
      // Simulate API call delay
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }, 500);
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage('Failed to save settings');
    }
  };

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      signout();
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Manage your preferences and account settings</p>
      </div>

      {/* Save Status Banner */}
      {saveStatus === 'saved' && (
        <div className={cn(
          "mb-6 p-4 rounded-lg flex items-center gap-3",
          isDarkMode
            ? "bg-green-500/10 border border-green-500/50"
            : "bg-green-100 border border-green-300"
        )}>
          <CheckCircle className={cn("h-5 w-5", isDarkMode ? "text-green-400" : "text-green-600")} />
          <p className={isDarkMode ? "text-green-400" : "text-green-700"}>Settings saved successfully!</p>
        </div>
      )}

      {saveStatus === 'error' && (
        <div className={cn(
          "mb-6 p-4 rounded-lg flex items-center gap-3",
          isDarkMode
            ? "bg-red-500/10 border border-red-500/50"
            : "bg-red-100 border border-red-300"
        )}>
          <AlertCircle className={cn("h-5 w-5", isDarkMode ? "text-red-400" : "text-red-600")} />
          <p className={isDarkMode ? "text-red-400" : "text-red-700"}>{errorMessage}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Section */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <UserIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Profile</h2>
          </div>
          <div className="flex items-center gap-6">
            {user?.picture ? (
              <img 
                src={user.picture} 
                alt={user.name}
                className="h-20 w-20 rounded-full border-2 border-primary"
              />
            ) : (
              <div className={cn(
                "h-20 w-20 rounded-full flex items-center justify-center",
                isDarkMode ? "bg-primary/20" : "bg-primary/10"
              )}>
                <UserIcon className="h-10 w-10 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-1">{user?.name || 'User'}</h3>
              <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>{user?.email || 'user@example.com'}</p>
              <p className={cn("text-sm mt-2", isDarkMode ? "text-gray-500" : "text-gray-600")}>Signed in with Google</p>
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={cn("font-medium", isDarkMode ? "text-white" : "text-gray-900")}>Email Notifications</p>
                <p className={cn("text-sm mt-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>Receive updates about your resume analyses and job matches</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => handleChange('notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className={cn(
                  "w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary",
                  isDarkMode
                    ? "bg-gray-700 peer-checked:after:border-white after:bg-white"
                    : "bg-gray-300 peer-checked:after:border-gray-950 after:bg-gray-950"
                )}></div>
              </label>
            </div>

            <div className={cn(
              "border-t pt-6",
              isDarkMode ? "border-gray-700" : "border-gray-200"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={cn("font-medium", isDarkMode ? "text-white" : "text-gray-900")}>Analysis Complete Alerts</p>
                  <p className={cn("text-sm mt-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>Get notified when resume analysis is done</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={settings.emailAlerts}
                    onChange={(e) => handleChange('emailAlerts', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={cn(
                    "w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary",
                    isDarkMode
                      ? "bg-gray-700 peer-checked:after:border-white after:bg-white"
                      : "bg-gray-300 peer-checked:after:border-gray-950 after:bg-gray-950"
                  )}></div>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Appearance Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Appearance</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className={cn("font-medium mb-4", isDarkMode ? "text-white" : "text-gray-900")}>Theme</p>
              <div className="grid grid-cols-2 gap-4">
                <label className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  isDarkMode
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-300 bg-gray-100 hover:border-gray-400'
                )}>
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={isDarkMode}
                    onChange={toggleTheme}
                    className="w-4 h-4 text-primary"
                  />
                  <div>
                    <span className={cn("font-medium", isDarkMode ? "text-white" : "text-gray-900")}>Dark Mode</span>
                    <p className={cn("text-xs mt-0.5", isDarkMode ? "text-gray-400" : "text-gray-600")}>Easy on the eyes</p>
                  </div>
                </label>
                <label className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  !isDarkMode
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-700 hover:border-gray-600'
                )}>
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={!isDarkMode}
                    onChange={toggleTheme}
                    className="w-4 h-4 text-primary"
                  />
                  <div>
                    <span className={cn("font-medium", isDarkMode ? "text-white" : "text-gray-900")}>Light Mode</span>
                    <p className={cn("text-xs mt-0.5", isDarkMode ? "text-gray-400" : "text-gray-600")}>Bright and clean</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Resume Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Resume Preferences</h2>
          </div>
          <div className="space-y-6">
            <div>
              <label className={cn("block text-sm font-medium mb-3", isDarkMode ? "text-white" : "text-gray-900")}>Default Export Format</label>
              <select
                value={settings.defaultFormat}
                onChange={(e) => handleChange('defaultFormat', e.target.value)}
                className={cn(
                  "w-full px-4 py-3 border rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all",
                  isDarkMode
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-300 text-gray-950"
                )}
              >
                <option value="pdf">PDF Document</option>
                <option value="docx">Word Document (.docx)</option>
                <option value="txt">Plain Text (.txt)</option>
              </select>
            </div>

            <div className={cn(
              "border-t pt-6",
              isDarkMode ? "border-gray-700" : "border-gray-200"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={cn("font-medium", isDarkMode ? "text-white" : "text-gray-900")}>Auto-analyze New Resumes</p>
                  <p className={cn("text-sm mt-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>Automatically analyze resumes when uploading</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={settings.autoAnalyze}
                    onChange={(e) => handleChange('autoAnalyze', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={cn(
                    "w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary",
                    isDarkMode
                      ? "bg-gray-700 peer-checked:after:border-white after:bg-white"
                      : "bg-gray-300 peer-checked:after:border-gray-950 after:bg-gray-950"
                  )}></div>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Account Management */}
        <Card className={cn(
          "p-6",
          isDarkMode ? "border-red-500/20" : "border-red-200"
        )}>
          <div className="flex items-center gap-3 mb-6">
            <Lock className={cn("h-5 w-5", isDarkMode ? "text-red-400" : "text-red-600")} />
            <h2 className="text-xl font-semibold">Account Management</h2>
          </div>
          <div className="space-y-4">
            <button 
              onClick={handleSignOut}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                isDarkMode
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-red-100 hover:bg-red-200 text-red-700"
              )}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
            <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
              Signing out will end your current session. You'll need to sign in again to access your resumes.
            </p>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button 
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Save className="h-4 w-4" />
            {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
