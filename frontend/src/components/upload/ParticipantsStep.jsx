

export default function ParticipantsStep({
  selectedGroup, handleGroupSelect, groups,
  users, participants, handleAddParticipant, handleRemoveParticipant,
  showNewUser, setShowNewUser, newUserName, setNewUserName, newUserEmail, setNewUserEmail, handleCreateUser,
  payerId, setPayerId, handleDietChange, setStep
}) {
  return (
    <div className="glass-card mb-6">
      <h3 className="text-lg font-bold mb-4 text-slate-800">👥 Who's Splitting?</h3>
      
      <div className="mb-4">
        <label className="label">Select Group (optional)</label>
        <select className="input-field" value={selectedGroup} onChange={e => handleGroupSelect(e.target.value)}>
          <option value="">No group — add individually</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.members?.length || 0} members)</option>)}
        </select>
      </div>

      {!selectedGroup && (
        <div className="mb-4">
          <label className="label">Add Participants</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {users.filter(u => !participants.find(p => p.userId === u.id)).map(u => (
              <button key={u.id} onClick={() => handleAddParticipant(u.id)} className="btn-secondary text-sm">+ {u.name}</button>
            ))}
          </div>
          
          {!showNewUser ? (
            <button onClick={() => setShowNewUser(true)} className="text-sm font-medium text-indigo-600 hover:underline">+ Create new user</button>
          ) : (
            <div className="flex flex-wrap gap-2 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex-1 min-w-[120px]">
                <label className="label">Name</label>
                <input className="input-field" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="John" />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="label">Email</label>
                <input className="input-field" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="john@email.com" />
              </div>
              <button onClick={handleCreateUser} className="btn-primary">Add</button>
              <button onClick={() => setShowNewUser(false)} className="btn-secondary">✕</button>
            </div>
          )}
        </div>
      )}

      {participants.length > 0 && (
        <div className="mb-4">
          <label className="label">Participants ({participants.length})</label>
          <div className="space-y-2">
            {participants.map(p => (
              <div key={p.userId} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-indigo-100 text-indigo-700">
                    {p.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-800">{p.name}</span>
                  {payerId === p.userId && <span className="badge badge-shared text-xs">💳 Payer</span>}
                </div>
                <div className="flex items-center gap-2">
                  <select className="input-field py-1.5 px-2 text-sm w-32" value={p.dietType} onChange={e => handleDietChange(p.userId, e.target.value)}>
                    <option value="VEG">🥬 Veg</option>
                    <option value="NON_VEG">🍖 Non-Veg</option>
                  </select>
                  <button onClick={() => setPayerId(p.userId)} className="text-xs btn-secondary py-1.5 px-2" title="Set as payer">💳</button>
                  {!selectedGroup && (
                    <button onClick={() => handleRemoveParticipant(p.userId)} className="text-red-500 font-bold px-2 py-1 hover:bg-red-50 rounded">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex justify-between mt-6">
        <button onClick={() => setStep(1)} className="btn-secondary">← Back</button>
        <button onClick={() => setStep(3)} className="btn-primary" disabled={participants.length === 0}>Next: Configure Split →</button>
      </div>
    </div>
  );
}
