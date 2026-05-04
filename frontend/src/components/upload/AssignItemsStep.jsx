import React from 'react';

export default function AssignItemsStep({
  analyzedItems, participants, itemAssignments, selectAllAssignment,
  toggleAssignment, setStep, handleSubmit
}) {
  return (
    <div className="glass-card mb-6">
      <h3 className="text-lg font-bold mb-4 text-slate-800">📋 Assign Items</h3>
      <p className="text-sm text-slate-500 mb-6">Select who consumed each item. The cost will be divided equally among selected people.</p>
      
      <div className="space-y-4 mb-6">
        {analyzedItems?.map((item, index) => (
          <div key={index} className="p-4 border border-slate-200 rounded-xl bg-slate-50">
            <div className="flex justify-between items-center mb-3">
              <div className="font-semibold text-slate-800">{item.name}</div>
              <div className="font-bold text-indigo-600">₹{item.price}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => selectAllAssignment(index)} 
                className="text-xs font-medium px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 transition-colors"
              >
                All
              </button>
              {participants.map(p => {
                const isSelected = (itemAssignments[index] || []).includes(p.userId);
                return (
                  <button 
                    key={p.userId} 
                    onClick={() => toggleAssignment(index, p.userId)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'}`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button onClick={() => setStep(3)} className="btn-secondary">← Back</button>
        <button onClick={handleSubmit} className="btn-primary text-lg px-8 py-3">🚀 Split Bill!</button>
      </div>
    </div>
  );
}
