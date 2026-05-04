import React from 'react';

export default function SplitMethodStep({
  splitMethod, setSplitMethod, useManualItems, manualItems, file,
  participants, payerId, setStep, handleProceedToAssignment, handleSubmit, analyzing
}) {
  return (
    <div className="glass-card mb-6">
      <h3 className="text-lg font-bold mb-4 text-slate-800">⚖️ Split Method</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { value: 'EQUAL', label: 'Equal Split', icon: '➗', desc: 'Everyone pays the same' },
          { value: 'VEG_NONVEG', label: 'Veg / Non-Veg', icon: '🥬', desc: 'Based on diet preference' },
          { value: 'CUSTOM', label: 'Itemized', icon: '✏️', desc: 'Select who ate what' },
        ].map(method => (
          <div 
            key={method.value} 
            onClick={() => setSplitMethod(method.value)} 
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${splitMethod === method.value ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
          >
            <div className="text-2xl mb-2">{method.icon}</div>
            <div className="font-semibold text-sm text-slate-800">{method.label}</div>
            <div className="text-xs text-slate-500">{method.desc}</div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl mb-6 bg-slate-50 border border-slate-200">
        <h4 className="font-semibold text-sm mb-2 text-slate-700">Summary</h4>
        <p className="text-sm text-slate-800 truncate" title={useManualItems ? '' : file?.name}>
          <span className="text-slate-500 font-medium">Input:</span> {useManualItems ? `${manualItems.filter(i => i.name).length} manual items` : file?.name || 'Bill image'}
        </p>
        <p className="text-sm text-slate-800">
          <span className="text-slate-500 font-medium">Participants:</span> {participants.length} people
        </p>
        <p className="text-sm text-slate-800">
          <span className="text-slate-500 font-medium">Method:</span> {splitMethod.replace('_', '/')}
        </p>
        <p className="text-sm text-slate-800">
          <span className="text-slate-500 font-medium">Payer:</span> {participants.find(p => p.userId === payerId)?.name || 'N/A'}
        </p>
      </div>

      <div className="flex justify-between">
        <button onClick={() => setStep(2)} className="btn-secondary">← Back</button>
        {splitMethod === 'CUSTOM' ? (
          <button onClick={handleProceedToAssignment} className="btn-primary text-lg px-8 py-3" disabled={analyzing}>
            {analyzing ? 'Analyzing...' : 'Next: Assign Items →'}
          </button>
        ) : (
          <button onClick={handleSubmit} className="btn-primary text-lg px-8 py-3">🚀 Split Bill!</button>
        )}
      </div>
    </div>
  );
}
