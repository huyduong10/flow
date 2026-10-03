import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES, ROLE_CONFIG } from '../utils/constants';
import {
  HardHat,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';

const TEST_USERS = [
  { role: ROLES.SITE_MANAGER, email: 'thicong@flow.vn', password: '123456', label: 'Trưởng thi công', desc: 'Lập PR vật tư' },
  { role: ROLES.WAREHOUSE_MANAGER, email: 'kho@company.com', password: 'Password123!', label: 'Quản lý kho', desc: 'Kiểm kho & Tách đơn' },
  { role: ROLES.PROCUREMENT, email: 'thumua@flow.vn', password: '123456', label: 'Thu mua', desc: 'Báo giá & Ký HĐ' },
  { role: ROLES.CEO, email: 'ceo@flow.vn', password: '123456', label: 'Giám đốc (CEO)', desc: 'Duyệt PR, NCC, Đề xuất TT' },
  { role: ROLES.CHAIRMAN, email: 'chutich@flow.vn', password: '123456', label: 'Chủ tịch', desc: 'Duyệt NCC & Đề xuất TT (≥50tr)' },
  { role: ROLES.ACCOUNTANT, email: 'ketoan@flow.vn', password: '123456', label: 'Kế toán', desc: 'Lập đề xuất thanh toán' },
  { role: ROLES.TREASURER, email: 'thuquy@flow.vn', password: '123456', label: 'Thủ quỹ', desc: 'Chi tiền & Xác nhận UNC' },
];

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        navigate(from, { replace: true });
      } else {
        setError(res.message || 'Email hoặc mật khẩu không chính xác.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Nút hỗ trợ điền nhanh tài khoản để người dùng kiểm thử mà không cần gõ phím
  const handleQuickFill = (userItem) => {
    setEmail(userItem.email);
    setPassword(userItem.password || '123456');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Logo Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/25 ring-4 ring-white/10">
            <HardHat className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            FlowBuild ERP
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Hệ Thống Phê Duyệt Mua Sắm & Đề Xuất Thanh Toán Xây Dựng
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-7 space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Đăng Nhập Hệ Thống</h2>
            <p className="text-xs text-slate-500">
              Nhập tài khoản để trích xuất quyền hạn (Role) từ JWT Token
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Đăng Nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: thicong@flow.vn"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mật Khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <span>Đăng Nhập</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-fill section for easy testing */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                Tài khoản mẫu để test (MK: 123456):
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {TEST_USERS.map((tu) => (
                <button
                  key={tu.role}
                  type="button"
                  onClick={() => handleQuickFill(tu)}
                  className="p-2 text-left bg-slate-50 hover:bg-blue-50/70 hover:border-blue-300 border border-slate-200 rounded-xl transition text-[11px] group"
                >
                  <div className="font-bold text-slate-800 group-hover:text-blue-700 truncate">
                    {tu.label}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{tu.email}</div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 text-center italic">
              * Bấm vào vai trò bất kỳ để điền tự động thông tin đăng nhập thực tế.
            </p>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Bảo mật JWT Bearer & Phân quyền RBAC 6 cấp độ</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
