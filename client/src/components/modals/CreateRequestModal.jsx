import React, { useState } from 'react';
import { materialRequestApi } from '../../services/api';
import ProjectSelect from '../common/ProjectSelect';
import { Plus, Trash2, X, Send, AlertCircle, Building, Warehouse } from 'lucide-react';

const CreateRequestModal = ({ isOpen, onClose, onSuccess }) => {
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState([
    { name: 'Thép Hòa Phát phi 18 (D18)', quantity: 25, unit: 'Tấn', note: 'Chuẩn CB400-V' },
    { name: 'Xi măng Vicem Hà Tiên PCB40', quantity: 600, unit: 'Bao', note: 'Đổ sàn tầng 12' },
    { name: 'Cát vàng sàng sạch hạt trung', quantity: 80, unit: 'Khối (m³)', note: 'Trộn bê tông M300' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: 1, unit: 'Cái', note: '' }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!projectId) {
      setError('Vui lòng chọn dự án / công trình');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].name.trim()) {
        setError(`Vật tư dòng ${i + 1} chưa có tên`);
        return;
      }
      if (!items[i].unit.trim()) {
        setError(`Vật tư dòng ${i + 1} chưa có đơn vị tính`);
        return;
      }
      if (items[i].quantity <= 0) {
        setError(`Số lượng vật tư dòng ${i + 1} phải lớn hơn 0`);
        return;
      }
    }

    setLoading(true);
    try {
      await materialRequestApi.create({
        projectId,
        project: projectName.trim(),
        items: items.map((it) => ({
          materialName: it.name.trim(),
          unit: it.unit.trim(),
          requestedQty: Number(it.quantity),
          note: it.note ? it.note.trim() : '',
        })),
        note: note.trim(),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo yêu cầu cấp vật tư');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Lập Yêu Cầu Cấp Vật Tư (Gửi Kho Kiểm Tra)
              </h3>
              <p className="text-xs text-slate-500">
                Đơn sẽ được chuyển đến Bộ phận Quản lý kho để kiểm tra tồn kho & xuất cấp trước
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Select */}
          <div>
            <ProjectSelect
              label="Dự án / Công trình"
              required
              value={projectId}
              assignedOnly={false}
              showBudget={true}
              onChange={(id, p) => {
                setProjectId(id);
                setProjectName(p ? p.name : '');
              }}
              placeholder="-- Chọn dự án / công trình --"
            />
          </div>

          {/* Items Dynamic Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Danh sách vật tư yêu cầu ({items.length})
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm dòng
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Tên vật tư / Quy cách <span className="text-rose-500">*</span></th>
                    <th className="py-2.5 px-3 w-28">Số lượng <span className="text-rose-500">*</span></th>
                    <th className="py-2.5 px-3 w-24">Đơn vị <span className="text-rose-500">*</span></th>
                    <th className="py-2.5 px-3">Ghi chú</th>
                    <th className="py-2.5 px-3 w-10 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          required
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          placeholder="Tên vật tư..."
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          required
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          placeholder="Kg, Tấn, Bao..."
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.note}
                          onChange={(e) => handleItemChange(idx, 'note', e.target.value)}
                          placeholder="Yêu cầu riêng..."
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          disabled={items.length <= 1}
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 p-1 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* General Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ghi chú tiến độ / Chỉ dẫn công trường
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Cần chuyển gấp trước ngày đổ bê tông sàn tầng 12..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition"
            >
              {loading ? (
                'Đang gửi...'
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Gửi duyệt lên CEO
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRequestModal;
