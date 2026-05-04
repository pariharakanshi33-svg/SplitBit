import re

with open('src/pages/UploadPage.jsx', 'r') as f:
    content = f.read()

# Add states
state_addition = """  const [useManualItems, setUseManualItems] = useState(false);
  const [analyzedItems, setAnalyzedItems] = useState(null);
  const [itemAssignments, setItemAssignments] = useState({});
  const [analyzing, setAnalyzing] = useState(false);"""
content = re.sub(r'  const \[useManualItems, setUseManualItems\] = useState\(false\);', state_addition, content)

# Add handleProceedToAssignment and toggleAssignment
funcs_addition = """  const handleProceedToAssignment = async () => {
    setError('');
    if (useManualItems) {
      setAnalyzedItems(manualItems.filter(i => i.name && i.price).map(i => ({ name: i.name, price: parseFloat(i.price), quantity: parseInt(i.quantity) || 1 })));
      setStep(4);
      return;
    }

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('billImage', file);
      const res = await billApi.analyze(formData);
      setAnalyzedItems(res.items);
      setStep(4);
    } catch (e) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleAssignment = (itemIndex, userId) => {
    setItemAssignments(prev => {
      const current = prev[itemIndex] || [];
      if (current.includes(userId)) {
        return { ...prev, [itemIndex]: current.filter(id => id !== userId) };
      } else {
        return { ...prev, [itemIndex]: [...current, userId] };
      }
    });
  };

  const selectAllAssignment = (itemIndex) => {
    setItemAssignments(prev => ({ ...prev, [itemIndex]: participants.map(p => p.userId) }));
  };

  const handleSubmit = async () => {"""
content = re.sub(r'  const handleSubmit = async \(\) => \{', funcs_addition, content)

# Update handleSubmit for CUSTOM split
submit_addition = """      if (splitMethod === 'CUSTOM') {
        const customAmounts = {};
        analyzedItems.forEach((item, index) => {
          const assigned = itemAssignments[index] || [];
          if (assigned.length > 0) {
            const splitPrice = item.price / assigned.length;
            assigned.forEach(uid => {
              customAmounts[uid] = (customAmounts[uid] || 0) + splitPrice;
            });
          }
        });
        splitData.customAmounts = customAmounts;
      }

      if (useManualItems) {"""
content = re.sub(r'      if \(useManualItems\) \{', submit_addition, content)

# Update Step 3 rendering and Add Step 4
step3_replacement = """      {step === 3 && (
        <div className="glass-card mb-6">
          <h3 className="text-lg font-bold mb-4 text-slate-800">⚖️ Split Method</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              { value: 'EQUAL', label: 'Equal Split', icon: '➗', desc: 'Everyone pays the same' },
              { value: 'VEG_NONVEG', label: 'Veg / Non-Veg', icon: '🥬', desc: 'Based on diet preference' },
              { value: 'CUSTOM', label: 'Itemized', icon: '✏️', desc: 'Select who ate what' },
            ].map(method => (
              <div key={method.value} onClick={() => setSplitMethod(method.value)} className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${splitMethod === method.value ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                <div className="text-2xl mb-2">{method.icon}</div>
                <div className="font-semibold text-sm text-slate-800">{method.label}</div>
                <div className="text-xs text-slate-500">{method.desc}</div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl mb-6 bg-slate-50 border border-slate-200">
            <h4 className="font-semibold text-sm mb-2 text-slate-700">Summary</h4>
            <p className="text-sm text-slate-800 truncate" title={useManualItems ? '' : file?.name}><span className="text-slate-500 font-medium">Input:</span> {useManualItems ? `${manualItems.filter(i => i.name).length} manual items` : file?.name || 'Bill image'}</p>
            <p className="text-sm text-slate-800"><span className="text-slate-500 font-medium">Participants:</span> {participants.length} people</p>
            <p className="text-sm text-slate-800"><span className="text-slate-500 font-medium">Method:</span> {splitMethod.replace('_', '/')}</p>
            <p className="text-sm text-slate-800"><span className="text-slate-500 font-medium">Payer:</span> {participants.find(p => p.userId === payerId)?.name || 'N/A'}</p>
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
      )}

      {step === 4 && splitMethod === 'CUSTOM' && (
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
                  <button onClick={() => selectAllAssignment(index)} className="text-xs font-medium px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 transition-colors">All</button>
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
      )}"""

# We need to replace the entire step === 3 block.
# We'll use a regex that matches from {step === 3 && ( to the end of that block.
# Looking at the file, step 3 is the last step before the closing tags.
import re
content = re.sub(r'\{step === 3 && \(.*?(?=      <\/div>\n    <\/div>\n  \);\n\})', step3_replacement + '\n', content, flags=re.DOTALL)

with open('src/pages/UploadPage.jsx', 'w') as f:
    f.write(content)

