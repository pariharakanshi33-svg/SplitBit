import { useState, useEffect } from 'react';
import { groupApi, userApi } from '../api';

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [error, setError] = useState('');

  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [g, u] = await Promise.all([groupApi.getAll(), groupApi.getAll(), userApi.getAll()]); // Fix: we only need two calls but let's be careful
      const [gData, uData] = await Promise.all([groupApi.getAll(), userApi.getAll()]);
      setGroups(gData); setUsers(uData);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName) return;
    try {
      await groupApi.create({ name: newGroupName, members: selectedMembers.map(m => ({ userId: m.userId, dietType: m.dietType })) });
      setNewGroupName(''); setSelectedMembers([]); setShowCreate(false);
      await loadData();
    } catch (e) { setError(e.message); }
  };

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail) return;
    try {
      await userApi.create({ name: newUserName, email: newUserEmail });
      setNewUserName(''); setNewUserEmail(''); setShowNewUser(false);
      await loadData();
    } catch (e) { setError(e.message); }
  };

  const toggleMember = (userId) => {
    if (selectedMembers.find(m => m.userId === userId)) {
      setSelectedMembers(selectedMembers.filter(m => m.userId !== userId));
    } else {
      const user = users.find(u => u.id === userId);
      setSelectedMembers([...selectedMembers, { userId, name: user.name, dietType: 'NON_VEG' }]);
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!confirm('Delete this group?')) return;
    try { await groupApi.delete(id); await loadData(); } catch (e) { setError(e.message); }
  };

  const handleRemoveMember = async (groupId, userId) => {
    try { await groupApi.removeMember(groupId, userId); await loadData(); } catch (e) { setError(e.message); }
  };

  const handleAddMemberToGroup = async (groupId, userId) => {
    try { await groupApi.addMember(groupId, { userId, dietType: 'NON_VEG' }); await loadData(); } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-slate-800">Groups & Users</h2>
        <p className="text-slate-500">Manage your splitting groups</p>
      </div>

      {error && <div className="glass-card mb-4 bg-red-50 border-red-200"><p className="text-red-600">⚠️ {error}</p></div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">👤 Users ({users.length})</h3>
            <button onClick={() => setShowNewUser(!showNewUser)} className="btn-secondary text-sm">{showNewUser ? '✕ Cancel' : '+ New User'}</button>
          </div>

          {showNewUser && (
            <div className="glass-card mb-4 bg-slate-50">
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[120px]"><label className="label">Name</label><input className="input-field" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Name" /></div>
                <div className="flex-1 min-w-[150px]"><label className="label">Email</label><input className="input-field" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="email@example.com" /></div>
                <button onClick={handleCreateUser} className="btn-primary">Add</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {users.map(u => (
              <div key={u.id} className="glass-card py-3 px-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-indigo-100 text-indigo-700">{u.name[0].toUpperCase()}</div>
                    <div>
                      <div className="font-medium text-slate-800">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{u.groupMemberships?.length || 0} groups</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Groups Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">👥 Groups ({groups.length})</h3>
            <button onClick={() => setShowCreate(!showCreate)} className="btn-secondary text-sm">{showCreate ? '✕ Cancel' : '+ New Group'}</button>
          </div>

          {showCreate && (
            <div className="glass-card mb-4 bg-slate-50">
              <div className="mb-3"><label className="label">Group Name</label><input className="input-field" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Friday Dinner Gang" /></div>
              <div className="mb-4">
                <label className="label">Members</label>
                <div className="flex flex-wrap gap-2">
                  {users.map(u => {
                    const selected = selectedMembers.find(m => m.userId === u.id);
                    return <button key={u.id} onClick={() => toggleMember(u.id)} className={selected ? 'btn-primary text-sm py-1.5 px-3' : 'btn-secondary text-sm py-1.5 px-3'}>{selected ? '✓ ' : ''}{u.name}</button>;
                  })}
                </div>
                {selectedMembers.length > 0 && (
                  <div className="mt-3 space-y-2 bg-white p-3 rounded border border-slate-200">
                    {selectedMembers.map(m => (
                      <div key={m.userId} className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-slate-700">{m.name}</span>
                        <select className="input-field py-1 px-2 text-xs w-28 h-8" value={m.dietType} onChange={e => setSelectedMembers(selectedMembers.map(s => s.userId === m.userId ? {...s, dietType: e.target.value} : s))}>
                          <option value="VEG">🥬 Veg</option><option value="NON_VEG">🍖 Non-Veg</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={handleCreateGroup} className="btn-primary w-full">Create Group</button>
            </div>
          )}

          {loading ? <div className="flex justify-center py-8"><div className="spinner"></div></div> : groups.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">👥</div><p>No groups yet. Create one to get started!</p></div>
          ) : (
            <div className="space-y-3">
              {groups.map(g => (
                <div key={g.id} className="glass-card shadow-sm">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedGroup(expandedGroup === g.id ? null : g.id)}>
                    <div>
                      <div className="font-semibold text-slate-800">{g.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{g.members?.length || 0} members • {g._count?.bills || 0} bills</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-400">{expandedGroup === g.id ? '▼' : '▶'}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id); }} className="text-red-500 text-xs font-medium hover:underline">Delete</button>
                    </div>
                  </div>
                  
                  {expandedGroup === g.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="space-y-2 mb-4">
                        {g.members?.map(m => (
                          <div key={m.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-2">
                              <span>{m.dietType === 'VEG' ? '🥬' : '🍖'}</span>
                              <span className="font-medium text-slate-700">{m.user?.name}</span>
                              <span className={`badge badge-${m.dietType === 'VEG' ? 'veg' : 'nonveg'} text-xs ml-1`}>{m.dietType}</span>
                            </div>
                            <button onClick={() => handleRemoveMember(g.id, m.userId)} className="text-red-500 text-xs hover:underline">Remove</button>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {users.filter(u => !g.members?.find(m => m.userId === u.id)).map(u => (
                          <button key={u.id} onClick={() => handleAddMemberToGroup(g.id, u.id)} className="text-xs btn-secondary py-1 px-2 hover:bg-slate-100">+ Add {u.name}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
