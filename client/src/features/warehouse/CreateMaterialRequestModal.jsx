import React, { useState } from 'react';
import { materialRequestApi } from '../../services/api';
import {
  X,
  Plus,
  Trash2,
  Send,
  Loader2,
  ClipboardList,
  Building,
  AlertCircle,
} from 'lucide-react';

const CreateMaterialRequestModal = ({ isOpen, onClose, onSuccess }) => {
  const [project, setProject] = useState('');
  const [items, setItems] = useState([
    { materialName: '', unit: '', requestedQty: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [...prev, { materialName: '', unit: '', requestedQty: '' }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!project.trim()) {
      setError('Vui lòng nhập tên công trình / dự án.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.materialName.trim()) {
        setError(`Dòng ${i + 1}: Vui lòng nhập tên vật tư.`);
        return;
      }
      if (!item.unit.trim()) {
        setError(`Dòng ${i + 1}: Vui lòng nhập đơn vị tính.`);
        return;
      }
      const qty = Number(item.requestedQty);
      if (isNaN(qty) || qty <= 0) {
        setError(`Dòng ${i + 1}: Số lượng yêu cầu phải lớn hơn 0.`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        project: project.trim(),
        items: items.map((i) => ({
          materialName: i.materialName.trim(),
          unit: i.unit.trim(),
          requestedQty: Number(i.requestedQty),
        })),
      };

      const res = await materialRequestApi.create(payload);
      if (res.data && res.data.success) {
        if (onSuccess) onSuccess(res.data.data);
        onClose();
      } else {
        setError(res.data?.message || 'Có lỗi xảy ra khi tạo yêu cầu cấp vật tư.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Lỗi khi gửi yêu cầu lên máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Trưởng thi công công trường
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Lập Yêu Cầu Cấp Vật Tư (Gửi Kho)
              </h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Dự án */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Tên Công trình / Dự án (*):
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="VD: Tòa nhà hỗn hợp Flow Complex (Giai đoạn móng)"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Danh sách vật tư */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Danh sách vật tư yêu cầu (*):
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold border border-emerald-200 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm dòng</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                >
                  <span className="w-5 text-center font-mono text-xs text-slate-400 font-bold">
                    {index + 1}
                  </span>

                  <input
                    type="text"
                    required
                    placeholder="Tên vật tư (VD: Thép D16)"
                    value={item.materialName}
                    onChange={(e) => handleItemChange(index, 'materialName', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />

                  <input
                    type="text"
                    required
                    placeholder="ĐVT (VD: Tấn)"
                    value={item.unit}
                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                    className="w-24 px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />

                  <input
                    type="number"
                    required
                    min="0.001"
                    step="any"
                    placeholder="Số lượng"
                    value={item.requestedQty}
                    onChange={(e) => handleItemChange(index, 'requestedQty', e.target.value)}
                    className="w-24 px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-right font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footnotes */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
            💡 Sau khi gửi, đơn sẽ được chuyển trực tiếp cho <strong>Quản lý kho</strong> kiểm tra tồn
            kho và tiến hành xuất cấp vật tư.
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/25 transition active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi yêu cầu...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Gửi tới Quản lý kho</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMaterialRequestModal;
