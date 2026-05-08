import { useEffect, useState } from 'react';
import {
  SignIn,
  UserButton,
  useUser,
  useAuth,
} from '@clerk/clerk-react';
import './index.css';
import { setTokenProvider, authApi } from './api';
import UploadPage from './pages/UploadPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';
import GroupsPage from './pages/GroupsPage';

const TABS = [
  { id: 'upload', label: 'Split Bill', icon: '🧾' },
  { id: 'history', label: 'History', icon: '📊' },
  { id: 'groups', label: 'Groups', icon: '👥' },
];

// ─── Logo SVG ─────────────────────────────────────────────────
function Logo() {
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm shadow-indigo-200">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 4.05493C6.50005 4.55238 3 8.36745 3 13C3 17.9706 7.02944 22 12 22C16.6326 22 20.4476 18.5 20.9451 14H11V4.05493Z" fill="white" />
        <path d="M21.9451 11C21.4476 6.50005 17.6326 3 13 3V11H21.9451Z" fill="#c7d2fe" />
      </svg>
    </div>
  );
}

// ─── Main App (shown to all users) ──────────────────────────
function MainApp() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState('upload');
  const [billResult, setBillResult] = useState(null);
  const [synced, setSynced] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Register Clerk's getToken synchronously so it's available before child components mount
  setTokenProvider(getToken);

  // Sync Clerk user to our PostgreSQL DB on first load
  useEffect(() => {
    if (isSignedIn && user && !synced) {
      const syncUser = async () => {
        try {
          const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress;
          await authApi.sync({
            name: user.fullName || user.firstName || email || 'User',
            email: email,
          });
          setSynced(true);
        } catch (err) {
          console.error('User sync failed:', err);
        }
      };
      syncUser();
    } else if (isLoaded && !isSignedIn) {
      setSynced(true);
    }
  }, [isSignedIn, user, synced, isLoaded]);

  const requireAuth = () => {
    if (!isSignedIn) {
      setShowAuthModal(true);
      return true;
    }
    return false;
  };

  const handleBillProcessed = (result) => {
    setBillResult(result);
    setActiveTab('result');
  };

  const handleViewBill = (bill) => {
    setBillResult({ bill, summary: null });
    setActiveTab('result');
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'upload':
        return <UploadPage onBillProcessed={handleBillProcessed} requireAuth={requireAuth} isSignedIn={isSignedIn} />;
      case 'result':
        return (
          <ResultPage
            result={billResult}
            onBack={() => setActiveTab('upload')}
            onNewBill={() => { setBillResult(null); setActiveTab('upload'); }}
          />
        );
      case 'history':
        return <HistoryPage onViewBill={handleViewBill} isSignedIn={isSignedIn} requireAuth={requireAuth} />;
      case 'groups':
        return <GroupsPage requireAuth={requireAuth} isSignedIn={isSignedIn} />;
      default:
        return <UploadPage onBillProcessed={handleBillProcessed} requireAuth={requireAuth} isSignedIn={isSignedIn} />;
    }
  };

  if (!isLoaded || (isSignedIn && !synced)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium tracking-wide">Loading SplitBit...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('upload')}>
              <Logo />
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">SplitBit</h1>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Split bills fairly</p>
              </div>
            </div>

            {/* Nav + User */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1 sm:gap-2 mr-2 sm:mr-4 border-r pr-2 sm:pr-4 border-slate-200">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`nav-link ${activeTab === tab.id || (tab.id === 'upload' && activeTab === 'result') ? 'active' : ''}`}
                  >
                    <span>{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {isSignedIn ? (
                  <>
                    <div className="hidden sm:block text-right">
                      <p className="text-xs font-semibold text-slate-800 leading-tight">
                        {user?.firstName || user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress}
                      </p>
                    </div>
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: 'w-8 h-8',
                        },
                      }}
                    />
                  </>
                ) : (
                  <button onClick={() => setShowAuthModal(true)} className="btn-primary text-sm px-4 py-2">
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">{renderPage()}</main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col relative transition-all">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 z-10 transition-colors">✕</button>
            <div className="p-6 text-center border-b border-slate-100 bg-slate-50 flex flex-col items-center">
              <Logo />
              <h2 className="text-xl font-bold text-slate-800 mt-4 mb-1">Welcome to SplitBit</h2>
              <p className="text-sm text-slate-500">Log in to split your first bill on SplitBit!</p>
            </div>
            <div className="p-6 flex justify-center">
              <SignIn routing="hash" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────
export default function App() {
  return (
    <MainApp />
  );
}
