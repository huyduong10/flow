import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_CONFIG } from '../../utils/constants';
import { HardHat, LogOut, ShieldCheck, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  const roleConfig = ROLE_CONFIG[user?.role] || {
    label: user?.role,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">FlowBuild</span>
                <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                  ERP Doanh Nghiệp
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Hệ thống Phê duyệt Mua sắm & Đề xuất Thanh toán
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => navigate('/')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/warehouse/pending')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition"
            >
              <span>Quản lý kho</span>
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
            </button>
          </nav>

          {/* User Profile & Logout (RBAC Enforced) */}
          <div className="flex items-center gap-3">
            {/* Role Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-slate-50">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div className="text-left text-xs">
                <span className="text-slate-400 text-[10px] block font-medium">Vai trò tài khoản:</span>
                <span className="font-bold text-slate-900">{roleConfig.label}</span>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="text-right hidden md:block">
                <div className="text-xs font-bold text-slate-800">{user?.fullName}</div>
                <div className="text-[11px] font-mono text-slate-400">{user?.email}</div>
              </div>

              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border ${
                  roleConfig.color
                }`}
                title={`${user?.fullName} - ${roleConfig.label}`}
              >
                {user?.fullName?.charAt(0) || <User className="w-4 h-4" />}
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition ml-1"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
