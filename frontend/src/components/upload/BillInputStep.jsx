

export default function BillInputStep({
  useManualItems, setUseManualItems, manualMerchantName, setManualMerchantName,
  file, preview, fileRef, handleDrop, handleFileChange,
  manualItems, updateManualItem, removeManualItem, addManualItem,
  manualTax, setManualTax, manualServiceCharge, setManualServiceCharge,
  setStep
}) {
  return (
    <div className="glass-card mb-6">
      <h3 className="text-lg font-bold mb-4 text-slate-800">📷 Bill Input</h3>
      
      <div className="mb-4">
        <label className="label">Restaurant / Merchant Name (Optional)</label>
        <input className="input-field" placeholder="e.g., The Cheesecake Factory" value={manualMerchantName} onChange={e => setManualMerchantName(e.target.value)} />
      </div>

      <div className="flex gap-4 mb-4">
        <button onClick={() => setUseManualItems(false)} className={!useManualItems ? 'btn-primary' : 'btn-secondary'}>📸 Upload Image</button>
        <button onClick={() => setUseManualItems(true)} className={useManualItems ? 'btn-primary' : 'btn-secondary'}>✏️ Enter Manually</button>
      </div>

      {!useManualItems ? (
        <div className={`upload-zone ${file ? 'has-file' : ''}`} onClick={() => fileRef.current?.click()} onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          {preview ? (
            <div className="w-full overflow-hidden">
              <img src={preview} alt="Bill" className="max-h-48 mx-auto rounded-lg mb-3 shadow-md" />
              <p className="text-sm font-medium text-green-600 truncate px-4" title={file.name}>✅ {file.name}</p>
            </div>
          ) : (
            <div>
              <p className="text-4xl mb-3">📄</p>
              <p className="font-medium mb-1 text-slate-700">Drop bill image here</p>
              <p className="text-sm text-slate-500">or click to browse (JPEG, PNG, WebP)</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {manualItems.map((item, i) => (
            <div key={i} className="flex flex-wrap gap-3 mb-3 items-end">
              <div className="flex-1 min-w-[150px]">
                <label className="label">Item Name</label>
                <input className="input-field" placeholder="e.g., Butter Chicken" value={item.name} onChange={e => updateManualItem(i, 'name', e.target.value)} />
              </div>
              <div className="w-24">
                <label className="label">Price (₹)</label>
                <input className="input-field" type="number" placeholder="0" value={item.price} onChange={e => updateManualItem(i, 'price', e.target.value)} />
              </div>
              <div className="w-20">
                <label className="label">Qty</label>
                <input className="input-field" type="number" min="1" value={item.quantity} onChange={e => updateManualItem(i, 'quantity', e.target.value)} />
              </div>
              {manualItems.length > 1 && (
                <button onClick={() => removeManualItem(i)} className="btn-danger mb-0.5">✕</button>
              )}
            </div>
          ))}
          <button onClick={addManualItem} className="btn-secondary mb-4">+ Add Item</button>
          
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[120px]">
              <label className="label">Tax (₹)</label>
              <input className="input-field" type="number" placeholder="0" value={manualTax} onChange={e => setManualTax(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="label">Service Charge (₹)</label>
              <input className="input-field" type="number" placeholder="0" value={manualServiceCharge} onChange={e => setManualServiceCharge(e.target.value)} />
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-6 flex justify-end">
        <button onClick={() => setStep(2)} className="btn-primary" disabled={!file && !useManualItems}>Next: Add People →</button>
      </div>
    </div>
  );
}
