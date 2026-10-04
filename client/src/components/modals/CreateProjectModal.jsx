import React, { useState, useEffect } from 'react';
import { projectApi, authApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ROLES, formatCurrency } from '../../utils/constants';
import {
  FolderPlus,
  X,
  Building2,
  DollarSign,
  User,
  FileText,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

const CreateProjectModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [allocatedBudget, setAllocatedBudget] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Tải danh sách Trưởng thi công (SITE_MANAGER) để phân công
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    const loadManagers = async () => {
      try {
        const res = await authApi.getUsers({ role: ROLES.SITE_MANAGER });
        if (res.data.success) {
          const list = res.data.data || [];
          setManagers(list);
          if (list.length > 0 && !managerId) {
            setManagerId(list[0]._id);
          }
        }
      } catch (err) {
        console.error('Lỗi tải danh sách trưởng thi công:', err);
      }
    };
    loadManagers();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('Vui lòng nhập mã dự án (VD: DA-CT01)');
      return;
    }
    if (!name.trim()) {
      setError('Vui lòng nhập tên công trình / dự án');
      return;
    }
    const budgetNum = Number(allocatedBudget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      setError('Ngân sách phân bổ ban đầu phải lớn hơn 0 VNĐ');
      return;
    }

    setLoading(true);
    try {
      const res = await projectApi.create({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        allocatedBudget: budgetNum,
        description: description.trim(),
        managerId: managerId || null,
      });

      if (res.data?.success) {
        window.dispatchEvent(new Event('project-created'));
        if (onSuccess) onSuccess(res.data.data);
        onClose();
        // Reset form
        setCode('');
        setName('');
        setAllocatedBudget('');
        setDescription('');
      } else {
        setError(res.data?.message || 'Có lỗi xảy ra khi tạo dự án');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi hệ thống khi tạo dự án');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Khởi Tạo Dự Án Mới</h3>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Cấp Lãnh Đạo / Quản Lý
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Thiết lập thông tin công trình và phê duyệt hạn mức ngân sách phân bổ
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Mã dự án */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mã dự án <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VD: DA-CT04"
                className="w-full px-3 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Tên dự án */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tên Dự án / Công trình <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Tòa nhà hỗn hợp Diamond Plaza"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>
          </div>

          {/* Ngân sách phân bổ (allocatedBudget) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Hạn Mức Ngân Sách Phê Duyệt (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                required
                min="1000000"
                step="1000000"
                value={allocatedBudget}
                onChange={(e) => setAllocatedBudget(e.target.value)}
                placeholder="VD: 5000000000 (5 tỷ VNĐ)"
                className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>
            {allocatedBudget > 0 && (
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                Số tiền bằng chữ/định dạng: {formatCurrency(Number(allocatedBudget))}
              </p>
            )}
          </div>

          {/* Phân công Chỉ huy trưởng (Site Manager) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Chỉ huy trưởng phụ trách công trường
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition cursor-pointer appearance-none"
              >
                <option value="">-- Mở cho tất cả chỉ huy trưởng --</option>
                {managers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.fullName} ({m.email})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
            </div>
          </div>

          {/* Mô tả / Địa điểm */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mô Tả / Vị Trí Công Trình
            </label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Thi công kết cấu bê tông cốt thép giai đoạn hầm và 25 tầng nổi..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
            ></textarea>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
            <Building2 className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              <strong>Lưu ý:</strong> Ngân sách này sẽ là hạn mức tối đa dùng để kiểm soát giải ngân
              (Burn Rate). Khi tổng tiền thanh toán đạt trên 90%, hệ thống sẽ tự động kích hoạt cảnh
              báo tài chính.
            </span>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang khởi tạo...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Tạo Dự Án</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
