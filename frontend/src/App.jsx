import { useState, useEffect } from 'react';
import './index.css';
import UploadPage from './pages/UploadPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';
import GroupsPage from './pages/GroupsPage';
import AuthPage from './pages/AuthPage';

const TABS = [
  { id: 'upload', label: 'Split Bill', icon: '🧾' },
  { id: 'history', label: 'History', icon: '📊' },
  { id: 'groups', label: 'Groups', icon: '👥' },
];

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [billResult, setBillResult] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    const savedUserName = localStorage.getItem('userName');
    if (savedUserId) {
      setUser({ id: savedUserId, name: savedUserName });
    }
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem('userId', userData.id);
    localStorage.setItem('userName', userData.name);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    setUser(null);
    setActiveTab('upload');
  };

  const handleBillProcessed = (result) => {
    setBillResult(result);
    setActiveTab('result');
  };

  const handleViewBill = (bill) => {
    setBillResult({ bill, summary: null });
    setActiveTab('result');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm shadow-indigo-200">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 4.05493C6.50005 4.55238 3 8.36745 3 13C3 17.9706 7.02944 22 12 22C16.6326 22 20.4476 18.5 20.9451 14H11V4.05493Z" fill="currentColor" className="text-white"/>
                <path d="M21.9451 11C21.4476 6.50005 17.6326 3 13 3V11H21.9451Z" fill="currentColor" className="text-indigo-200"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">SplitBit</h1>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Split bills fairly</p>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4"><AuthPage onLogin={handleLogin} /></main>
      </div>
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'upload':
        return <UploadPage onBillProcessed={handleBillProcessed} />;
      case 'result':
        return <ResultPage result={billResult} onBack={() => setActiveTab('upload')} onNewBill={() => { setBillResult(null); setActiveTab('upload'); }} />;
      case 'history':
        return <HistoryPage onViewBill={handleViewBill} />;
      case 'groups':
        return <GroupsPage />;
      default:
        return <UploadPage onBillProcessed={handleBillProcessed} />;
    }
  };

  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('upload')}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm shadow-indigo-200">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 4.05493C6.50005 4.55238 3 8.36745 3 13C3 17.9706 7.02944 22 12 22C16.6326 22 20.4476 18.5 20.9451 14H11V4.05493Z" fill="currentColor" className="text-white"/>
                  <path d="M21.9451 11C21.4476 6.50005 17.6326 3 13 3V11H21.9451Z" fill="currentColor" className="text-indigo-200"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">SplitBit</h1>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Split bills fairly</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1 sm:gap-2 mr-2 sm:mr-4 border-r pr-2 sm:pr-4 border-slate-200">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`nav-link ${activeTab === tab.id || (tab.id === 'upload' && activeTab === 'result') ? 'active' : ''}`}>
                    <span>{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
                </div>
                <button onClick={handleLogout} className="text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">{renderPage()}</main>
    </div>
  );
}

export default App;
