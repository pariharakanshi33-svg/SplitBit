import { useState, useEffect, useRef } from 'react';
import { billApi, userApi, groupApi } from '../api';
import BillInputStep from '../components/upload/BillInputStep';
import ParticipantsStep from '../components/upload/ParticipantsStep';
import SplitMethodStep from '../components/upload/SplitMethodStep';
import AssignItemsStep from '../components/upload/AssignItemsStep';

export default function UploadPage({ onBillProcessed }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [participants, setParticipants] = useState([]);
  const [splitMethod, setSplitMethod] = useState('VEG_NONVEG');
  const [payerId, setPayerId] = useState('');
  const [useManualItems, setUseManualItems] = useState(false);
  const [analyzedItems, setAnalyzedItems] = useState(null);
  const [itemAssignments, setItemAssignments] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [manualMerchantName, setManualMerchantName] = useState('');
  const [manualItems, setManualItems] = useState([{ name: '', price: '', quantity: 1 }]);
  const [manualTax, setManualTax] = useState('');
  const [manualServiceCharge, setManualServiceCharge] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const fileRef = useRef();

  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [u, g] = await Promise.all([userApi.getAll(), groupApi.getAll()]);
      setUsers(u);
      setGroups(g);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleAddParticipant = (userId) => {
    if (participants.find(p => p.userId === userId)) return;
    const user = users.find(u => u.id === userId);
    setParticipants([...participants, { userId, name: user?.name, dietType: 'NON_VEG' }]);
    if (!payerId) setPayerId(userId);
  };

  const handleRemoveParticipant = (userId) => {
    setParticipants(participants.filter(p => p.userId !== userId));
    if (payerId === userId) setPayerId(participants[0]?.userId || '');
  };

  const handleDietChange = (userId, dietType) => {
    setParticipants(participants.map(p => p.userId === userId ? { ...p, dietType } : p));
  };

  const handleGroupSelect = async (groupId) => {
    setSelectedGroup(groupId);
    if (!groupId) { setParticipants([]); return; }
    try {
      const group = await groupApi.getById(groupId);
      const members = group.members.map(m => ({ userId: m.userId, name: m.user.name, dietType: m.dietType }));
      setParticipants(members);
      if (members.length > 0) setPayerId(members[0].userId);
    } catch (e) { setError('Failed to load group members'); }
  };

  const addManualItem = () => setManualItems([...manualItems, { name: '', price: '', quantity: 1 }]);
  const removeManualItem = (i) => setManualItems(manualItems.filter((_, idx) => idx !== i));
  const updateManualItem = (i, field, val) => {
    const updated = [...manualItems];
    updated[i][field] = val;
    setManualItems(updated);
  };

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail) return;
    try {
      await userApi.create({ name: newUserName, email: newUserEmail });
      setNewUserName(''); setNewUserEmail(''); setShowNewUser(false);
      await loadData();
    } catch (e) { setError(e.message); }
  };

  const handleProceedToAssignment = async () => {
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

  const handleSubmit = async () => {
    setError('');
    if (!file && !useManualItems) { setError('Please upload a bill image or enter items manually'); return; }
    if (participants.length === 0) { setError('Please add at least one participant'); return; }
    setLoading(true);

    try {
      const formData = new FormData();
      if (file) formData.append('billImage', file);
      formData.append('splitMethod', splitMethod);
      if (selectedGroup) formData.append('groupId', selectedGroup);
      formData.append('participants', JSON.stringify(participants.map(p => ({ userId: p.userId, dietType: p.dietType }))));

      const uploadResult = await billApi.upload(formData);

      const splitData = {
        billId: uploadResult.bill.id,
        participants: participants.map(p => ({ userId: p.userId, dietType: p.dietType })),
        splitMethod,
        payerId,
      };

      if (splitMethod === 'CUSTOM') {
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

      if (useManualItems) {
        splitData.manualItems = manualItems.filter(i => i.name && i.price).map(i => ({ name: i.name, price: parseFloat(i.price), quantity: parseInt(i.quantity) || 1 }));
        if (manualTax) splitData.manualTax = parseFloat(manualTax);
        if (manualServiceCharge) splitData.manualServiceCharge = parseFloat(manualServiceCharge);
      }
      if (manualMerchantName) splitData.merchantName = manualMerchantName;

      const result = await billApi.split(splitData);
      onBillProcessed(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="spinner mb-6"></div>
        <h2 className="text-xl font-bold mb-2">Processing Your Bill...</h2>
        <p className="text-slate-500">Extracting items, classifying, and splitting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-2xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-slate-800">Split a New Bill</h2>
        <p className="text-slate-500">Upload a bill image or enter items manually</p>
      </div>

      {error && <div className="glass-card mb-6 border-red-500 bg-red-50"><p className="text-red-600">⚠️ {error}</p></div>}


      {step === 1 && (
        <BillInputStep
          useManualItems={useManualItems} setUseManualItems={setUseManualItems}
          manualMerchantName={manualMerchantName} setManualMerchantName={setManualMerchantName}
          file={file} preview={preview} fileRef={fileRef} handleDrop={handleDrop} handleFileChange={handleFileChange}
          manualItems={manualItems} updateManualItem={updateManualItem} removeManualItem={removeManualItem} addManualItem={addManualItem}
          manualTax={manualTax} setManualTax={setManualTax} manualServiceCharge={manualServiceCharge} setManualServiceCharge={setManualServiceCharge}
          setStep={setStep}
        />
      )}

      {step === 2 && (
        <ParticipantsStep
          selectedGroup={selectedGroup} handleGroupSelect={handleGroupSelect} groups={groups}
          users={users} participants={participants} handleAddParticipant={handleAddParticipant} handleRemoveParticipant={handleRemoveParticipant}
          showNewUser={showNewUser} setShowNewUser={setShowNewUser} newUserName={newUserName} setNewUserName={setNewUserName}
          newUserEmail={newUserEmail} setNewUserEmail={setNewUserEmail} handleCreateUser={handleCreateUser}
          payerId={payerId} setPayerId={setPayerId} handleDietChange={handleDietChange} setStep={setStep}
        />
      )}

      {step === 3 && (
        <SplitMethodStep
          splitMethod={splitMethod} setSplitMethod={setSplitMethod} useManualItems={useManualItems} manualItems={manualItems} file={file}
          participants={participants} payerId={payerId} setStep={setStep} handleProceedToAssignment={handleProceedToAssignment}
          handleSubmit={handleSubmit} analyzing={analyzing}
        />
      )}

      {step === 4 && splitMethod === 'CUSTOM' && (
        <AssignItemsStep
          analyzedItems={analyzedItems} participants={participants} itemAssignments={itemAssignments}
          selectAllAssignment={selectAllAssignment} toggleAssignment={toggleAssignment} setStep={setStep} handleSubmit={handleSubmit}
        />
      )}
      </div>
    </div>
  );
}
