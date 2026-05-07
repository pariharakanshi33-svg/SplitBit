import { useState, useEffect } from 'react';
import { billApi } from '../api';

export default function HistoryPage({ onViewBill }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ groupId: '', startDate: '', endDate: '' });

  const loadBills = async () => {
    setLoading(true);
    try {
      const params = {};
      // userId is derived from auth token on the backend — not sent from frontend
      if (filter.groupId) params.groupId = filter.groupId;
      if (filter.startDate) params.startDate = filter.startDate;
      if (filter.endDate) params.endDate = filter.endDate;
      const result = await billApi.getHistory(params);
      setBills(result.bills || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { loadBills(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this bill?')) return;
    try {
      await billApi.delete(id);
      setBills(bills.filter(b => b.id !== id));
    } catch (e) { alert(e.message); }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatCurrency = (n) => `₹${(n || 0).toFixed(2)}`;

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-slate-800">Expense History</h2>
        <p className="text-slate-500">View all your past bill splits</p>
      </div>

      <div className="glass-card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Start Date</label>
            <input type="date" className="input-field" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">End Date</label>
            <input type="date" className="input-field" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} />
          </div>
          <button onClick={loadBills} className="btn-primary">🔍 Filter</button>
          <button onClick={() => { setFilter({ groupId: '', startDate: '', endDate: '' }); loadBills(); }} className="btn-secondary">Clear</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner"></div></div>
      ) : bills.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧾</div>
          <h3 className="text-xl font-bold mb-2 text-slate-700">No bills yet</h3>
          <p>Split your first bill to see it here!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bills.map(bill => (
            <div key={bill.id} className="glass-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => onViewBill(bill)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-indigo-50 text-indigo-600 border border-indigo-100">🧾</div>
                  <div>
                    <div className="font-semibold text-slate-800">
                      {bill.merchantName ? bill.merchantName : (bill.group?.name || 'Quick Split')}
                    </div>
                    <div className="text-sm text-slate-500">{formatDate(bill.createdAt)} • {bill.participants?.length || 0} people</div>
                    <div className="flex gap-2 mt-1.5">
                      <span className={`badge badge-status badge-${bill.status.toLowerCase()}`}>{bill.status}</span>
                      <span className="badge badge-shared">{bill.splitMethod?.replace('_', '/')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-800">{formatCurrency(bill.totalAmount)}</div>
                  <div className="text-xs mt-1 text-slate-500">{bill.items?.length || 0} items</div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(bill.id); }} className="text-red-500 text-xs mt-2 font-medium hover:underline">Delete</button>
                </div>
              </div>
              
              {bill.participants?.length > 0 && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 flex-wrap">
                  {bill.participants.map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600">
                      <span>{p.dietType === 'VEG' ? '🥬' : '🍖'}</span>
                      <span className="font-medium">{p.user?.name}</span>
                      <span className="font-bold ml-1 text-slate-800">{formatCurrency(p.amountOwed)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
