import { settlementApi } from '../api';
import { useState } from 'react';

export default function ResultPage({ result, onBack, onNewBill }) {
  const [settledIds, setSettledIds] = useState(new Set());

  if (!result) return <div className="empty-state"><p>No result to display</p><button onClick={onBack} className="btn-primary mt-4">← Go Back</button></div>;

  const { bill, summary } = result;
  const items = bill?.items || [];
  const participants = bill?.participants || [];
  const settlements = bill?.settlements || [];
  const itemBreakdown = summary?.itemBreakdown;

  const handleSettle = async (id) => {
    try {
      await settlementApi.settle(id);
      setSettledIds(prev => new Set([...prev, id]));
    } catch (e) { alert(e.message); }
  };

  const formatCurrency = (n) => `₹${(n || 0).toFixed(2)}`;

  return (
    <div>
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-3xl font-bold mb-2 text-slate-800">Bill Split Complete!</h2>
        <p className="text-slate-500">Here's the breakdown</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="glass-card mb-6 border-indigo-200 bg-indigo-50/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800">Bill Summary</h3>
              <span className={`badge badge-status badge-${(bill?.status || 'completed').toLowerCase()}`}>{bill?.status}</span>
            </div>
            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-medium">{formatCurrency(bill?.subtotal || summary?.subtotal)}</span></div>
              {(bill?.taxAmount > 0 || summary?.tax > 0) && <div className="flex justify-between"><span className="text-slate-500">Tax</span><span className="font-medium">{formatCurrency(bill?.taxAmount || summary?.tax)}</span></div>}
              {(bill?.serviceCharge > 0 || summary?.serviceCharge > 0) && <div className="flex justify-between"><span className="text-slate-500">Service Charge</span><span className="font-medium">{formatCurrency(bill?.serviceCharge || summary?.serviceCharge)}</span></div>}
              <div className="border-t border-indigo-200 pt-3 mt-1 flex justify-between">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-xl text-indigo-600">{formatCurrency(bill?.totalAmount || summary?.totalAmount)}</span>
              </div>
            </div>
          </div>

          {itemBreakdown && (
            <div className="glass-card mb-6">
              <h3 className="font-bold mb-4 text-slate-800">📊 Category Breakdown</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-green-50 border border-green-100">
                  <div className="text-2xl mb-1">🥬</div>
                  <div className="text-xs text-slate-500 font-medium">Veg</div>
                  <div className="font-bold text-green-700">{formatCurrency(itemBreakdown.vegTotal)}</div>
                  <div className="text-xs text-slate-500">{itemBreakdown.veg?.length || 0} items</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-red-50 border border-red-100">
                  <div className="text-2xl mb-1">🍖</div>
                  <div className="text-xs text-slate-500 font-medium">Non-Veg</div>
                  <div className="font-bold text-red-700">{formatCurrency(itemBreakdown.nonVegTotal)}</div>
                  <div className="text-xs text-slate-500">{itemBreakdown.nonVeg?.length || 0} items</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="text-2xl mb-1">🍽️</div>
                  <div className="text-xs text-slate-500 font-medium">Shared</div>
                  <div className="font-bold text-amber-700">{formatCurrency(itemBreakdown.sharedTotal)}</div>
                  <div className="text-xs text-slate-500">{itemBreakdown.shared?.length || 0} items</div>
                </div>
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="glass-card mb-6">
              <h3 className="font-bold mb-4 text-slate-800">🧾 Items</h3>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className={`badge badge-${item.category === 'VEG' ? 'veg' : item.category === 'NON_VEG' ? 'nonveg' : 'shared'}`}>{item.category === 'VEG' ? '🥬' : item.category === 'NON_VEG' ? '🍖' : '🍽️'}</span>
                      <span className="text-sm font-medium text-slate-700">{item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}</span>
                    </div>
                    <span className="font-semibold text-sm text-slate-800">{formatCurrency(item.price * (item.quantity || 1))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="glass-card mb-6">
            <h3 className="font-bold mb-4 text-slate-800">👥 Per-Person Split</h3>
            <div className="space-y-3">
              {participants.map((p, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold bg-indigo-100 text-indigo-700">{p.user?.name?.[0]?.toUpperCase() || '?'}</div>
                      <div>
                        <div className="font-semibold text-slate-800">{p.user?.name || 'Unknown'}</div>
                        <span className={`badge badge-${p.dietType === 'VEG' ? 'veg' : 'nonveg'} text-xs mt-1`}>{p.dietType === 'VEG' ? '🥬 Veg' : '🍖 Non-Veg'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-indigo-600">{formatCurrency(p.amountOwed)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {settlements.length > 0 && (
            <div className="glass-card mb-6">
              <h3 className="font-bold mb-4 text-slate-800">💸 Settlements</h3>
              <div className="space-y-3">
                {settlements.map((s, i) => {
                  const isSettled = s.settled || settledIds.has(s.id);
                  return (
                    <div key={i} className={`settlement-card ${isSettled ? 'opacity-60 bg-slate-50' : 'shadow-sm'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-800">{s.fromUser?.name}</span>
                          <span className="settlement-arrow">→</span>
                          <span className="font-medium text-slate-800">{s.toUser?.name}</span>
                        </div>
                        <div className="font-bold text-lg text-slate-900">{formatCurrency(s.amount)}</div>
                      </div>
                      {!isSettled ? (
                        <button onClick={() => handleSettle(s.id)} className="btn-success text-sm">✓ Settle</button>
                      ) : (
                        <span className="badge badge-completed">✓ Paid</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-8">
        <button onClick={onNewBill} className="btn-primary">🧾 Split Another Bill</button>
        <button onClick={onBack} className="btn-secondary">← Back</button>
      </div>
    </div>
  );
}
