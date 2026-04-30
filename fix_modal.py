import os

file_path = "src/components/SalesHistory.tsx"
new_content = """      {/* \ub9c8\uac10\ud558\uae30 Modal */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsCloseModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <ClipboardCheck size={20} className="text-emerald-600" />
                  {closeModalY}. {parseInt(closeModalM)}. {parseInt(closeModalD)} \ub9c8\uac10\ud558\uae30
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">\ud310\ub9e4\uac74\ubcf4 \ud56d\ubaa9 \uc6d0\uac00 \uc785\ub825 \ud6c4 \uc800\uc7a5\ud558\uc138\uc694.</p>
              </div>
              <button onClick={() => setIsCloseModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
              {closeModalDaySales.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <ShoppingBag size={36} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">\uc774 \ub0a0\uc758 \ud310\ub9e4 \ub0b4\uc5ed\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</p>
                </div>
              ) : closeModalDaySales.map(sale => {
                const isSaved = closeSavedIds.has(sale.id);
                const saleTime = new Date(sale.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                const saleCost = sale.items.reduce((sum, item, idx) => {
                  const product = products.find(p => p.id === item.productId);
                  return sum + getCloseCost(sale.id, idx, product?.factoryPrice || 0, item.purchasePrice || 0) * item.quantity;
                }, 0);
                const saleProfit = sale.totalAmount - saleCost;
                return (
                  <div key={sale.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-bold text-gray-700">{saleTime}</span>
                      <span className="text-sm text-gray-500">{sale.staffName}</span>
                      {sale.vehicleNumber && (
                        <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded font-medium">
                          {sale.vehicleNumber}
                        </span>
                      )}
                      <span className="font-bold text-blue-600 text-sm ml-auto">{formatCurrency(sale.totalAmount)}</span>
                      {isSaved && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <CheckCircle size={10} /> \uc800\uc7a5\ub428
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-gray-50">
                      {sale.items.map((item, idx) => {
                        const product = products.find(p => p.id === item.productId);
                        const category = product?.category || '\uae30\ud0c0';
                        const itemClass = getCloseItemClass(item.productId, category);
                        const factoryPrice = product?.factoryPrice || 0;
                        const edit = closeEdits[sale.id]?.[idx] || {
                          mode: (factoryPrice > 0 ? 'discount' : 'direct') as 'discount' | 'direct',
                          discountRate: '',
                          directCost: item.purchasePrice ? item.purchasePrice.toLocaleString() : '',
                        };
                        const effectiveCost = getCloseCost(sale.id, idx, factoryPrice, item.purchasePrice || 0);
                        const totalRevenue = item.priceAtSale * item.quantity;
                        const totalCost = effectiveCost * item.quantity;
                        const clsColor = itemClass === 'tire' ? 'bg-orange-100 text-orange-600' : itemClass === 'repair' ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-500';
                        const clsLabel = itemClass === 'tire' ? '\ud0c0\uc774\uc5b4' : itemClass === 'repair' ? '\uc815\ube44' : '\uacf5\uc784';
                        return (
                          <div key={idx} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${clsColor}`}>{clsLabel}</span>
                                <span className="text-sm font-semibold text-gray-800">{item.productName}</span>
                                {item.specification && <span className="text-xs text-blue-500">{item.specification}</span>}
                                <span className="text-xs text-gray-400">x {item.quantity}</span>
                              </div>
                              <div className="flex gap-3 text-xs flex-wrap text-gray-500">
                                <span>\ud310\ub9e4 <strong className="text-gray-700">{formatCurrency(totalRevenue)}</strong></span>
                                {factoryPrice > 0 && <span className="text-gray-400">\uacf5\uc7a5\ub3c4\uac00 <strong>{formatCurrency(factoryPrice)}</strong></span>}
                                {effectiveCost > 0 && (
                                  <span className={totalRevenue - totalCost >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                                    \uc218\uc775 {formatCurrency(totalRevenue - totalCost)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
                                {(['discount', 'direct'] as const).map(mode => (
                                  <button
                                    key={mode}
                                    onClick={() => setCloseEdits(prev => ({
                                      ...prev,
                                      [sale.id]: { ...(prev[sale.id] || {}), [idx]: { ...(prev[sale.id]?.[idx] || { discountRate: '', directCost: '' }), mode } }
                                    }))}
                                    className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${edit.mode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                                  >
                                    {mode === 'discount' ? '\ud560\uc778\uc728' : '\uc9c1\uc811\uc785\uc815'}
                                  </button>
                                ))}
                              </div>
                              {edit.mode === 'discount' ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text" inputMode="decimal"
                                    className="w-14 p-2 border border-gray-300 rounded-lg text-sm text-right font-bold focus:ring-2 focus:ring-blue-400 outline-none"
                                    value={edit.discountRate} placeholder="0"
                                    onChange={e => {
                                      const raw = e.target.value.replace(/[^0-9.]/g, '');
                                      setCloseEdits(prev => ({ ...prev, [sale.id]: { ...(prev[sale.id] || {}), [idx]: { ...edit, discountRate: raw } } }));
                                      setCloseSavedIds(prev => { const s = new Set(prev); s.delete(sale.id); return s; });
                                    }}
                                  />
                                  <span className="text-sm text-gray-500">%</span>
                                  {edit.discountRate && factoryPrice > 0 && (
                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                      \u2192 {formatCurrency(Math.round(factoryPrice * (1 - parseFloat(edit.discountRate) / 100)))}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text" inputMode="numeric"
                                    className="w-28 p-2 border border-gray-300 rounded-lg text-sm text-right font-bold focus:ring-2 focus:ring-blue-400 outline-none"
                                    value={edit.directCost} placeholder="0"
                                    onChange={e => {
                                      const raw = e.target.value.replace(/[^0-9]/g, '');
                                      const formatted = raw !== '' ? Number(raw).toLocaleString() : '';
                                      setCloseEdits(prev => ({ ...prev, [sale.id]: { ...(prev[sale.id] || {}), [idx]: { ...edit, directCost: formatted } } }));
                                      setCloseSavedIds(prev => { const s = new Set(prev); s.delete(sale.id); return s; });
                                    }}
                                  />
                                  <span className="text-xs text-gray-400">/\uac1c</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3">
                      <div className="flex gap-3 text-xs text-gray-500">
                        {saleCost > 0 && (
                          <>
                            <span>\uc6d0\uac00 <strong className="text-gray-700">{formatCurrency(saleCost)}</strong></span>
                            <span className={`font-bold ${saleProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              \uc218\uc775 {formatCurrency(saleProfit)}
                            </span>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => handleCloseSaveSale(sale)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${isSaved ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                      >
                        {isSaved ? <><CheckCircle size={14} /> \uc800\uc7a5\ub428</> : <><Save size={14} /> \uc6d0\uac00 \uc800\uc7a5</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {closeModalDaySales.length > 0 && (
                  <button
                    onClick={() => {
                      onSaveReport(buildDailyCloseReport(closeModalDateStr, closeModalDaySales));
                      setCloseReported(true);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors ${closeReported ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'}`}
                  >
                    {closeReported ? <><CheckCircle size={14} /> \ubcf4\uace0\uc11c \uc62c\ub9bc</> : <><Upload size={14} /> \ubcf4\uace0\uc11c \uc62c\ub9ac\uae30</>}
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                \ub2eb\uae30
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
"""

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

marker_index = -1
for i, line in enumerate(lines):
    if "MARKER_START" in line:
        marker_index = i
        break

if marker_index != -1:
    content_before = lines[:marker_index]
    full_content = "".join(content_before) + new_content
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(full_content)
    
    with open(file_path, "r", encoding="utf-8") as f:
        final_lines = f.readlines()
    print(f"Done. Total lines: {len(final_lines)}")
else:
    print("MARKER_START not found")
