import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  requestApi,
  vendorApi,
  contractApi,
  paymentApi,
  warehouseApi,
  materialRequestApi,
} from '../services/api';
import {
  ROLES,
  ROLE_CONFIG,
  STATUS_LABELS,
  MATERIAL_REQUEST_STATUS,
  formatCurrency,
  formatDate,
} from '../utils/constants';

// Modals
import CreateRequestModal from '../components/modals/CreateRequestModal';
import CreateMaterialRequestModal from '../features/warehouse/CreateMaterialRequestModal';
import CEOApprovalModal from '../components/modals/CEOApprovalModal';
import VendorSelectionModal from '../components/modals/VendorSelectionModal';
import ContractUploadModal from '../components/modals/ContractUploadModal';
import CreatePaymentModal from '../components/modals/CreatePaymentModal';
import PaymentApprovalModal from '../components/modals/PaymentApprovalModal';
import DisbursementModal from '../components/modals/DisbursementModal';
import CreateProjectModal from '../components/modals/CreateProjectModal';

// Project Cost Tracking Components
import ProjectSelect from '../components/common/ProjectSelect';
import ProjectExpenseSummaryCard from '../components/dashboard/ProjectExpenseSummaryCard';
import PaymentProposalList from '../components/dashboard/PaymentProposalList';

import {
  ClipboardList,
  Building2,
  FileText,
  Receipt,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  ArrowRight,
  Clock,
  Eye,
  Send,
  Banknote,
  DollarSign,
  TrendingUp,
  Warehouse,
  Truck,
  PackageCheck,
  FolderGit2,
  LayoutGrid,
  ListOrdered,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Project Filter state
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Data states
  const [requests, setRequests] = useState([]);
  const [vendorQuotes, setVendorQuotes] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [pendingWarehouseCount, setPendingWarehouseCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Modal active states
  const [openCreateProject, setOpenCreateProject] = useState(false);
  const [openCreatePR, setOpenCreatePR] = useState(false);
  const [openCreateMR, setOpenCreateMR] = useState(false);
  const [activeCeoPR, setActiveCeoPR] = useState(null);
  const [activeVendorModal, setActiveVendorModal] = useState(null);
  const [activeContractModal, setActiveContractModal] = useState(null);
  const [activeCreatePayment, setActiveCreatePayment] = useState(null);
  const [activePaymentApproval, setActivePaymentApproval] = useState(null);
  const [activeDisbursement, setActiveDisbursement] = useState(null);

  // Filter & Tabs
  const [activeTab, setActiveTab] = useState('KANBAN'); // KANBAN or PAYMENTS
  const [searchTerm, setSearchTerm] = useState('');

  const loadAllData = async (projId = selectedProjectId) => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (projId && projId !== 'ALL') {
        params.projectId = projId;
      }

      const [reqRes, vqRes, ctRes, payRes, mrRes, whRes] = await Promise.allSettled([
        requestApi.getAll(params),
        vendorApi.getAll({ limit: 50 }),
        contractApi.getAll(params),
        paymentApi.getAll(params),
        materialRequestApi.getAll(params),
        warehouseApi.getPendingRequests(),
      ]);

      if (reqRes.status === 'fulfilled') setRequests(reqRes.value.data.data || []);
      if (vqRes.status === 'fulfilled') setVendorQuotes(vqRes.value.data.data || []);
      if (ctRes.status === 'fulfilled') setContracts(ctRes.value.data.data || []);
      if (payRes.status === 'fulfilled') setPayments(payRes.value.data.data || []);
      if (mrRes.status === 'fulfilled') setMaterialRequests(mrRes.value.data.data || []);
      if (whRes.status === 'fulfilled') setPendingWarehouseCount(whRes.value.data.data?.length || 0);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData(selectedProjectId);
  }, [user, selectedProjectId]);

  const handleDataRefresh = () => {
    loadAllData(selectedProjectId);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Thống kê nhanh
  const stats = {
    totalRequests: requests.length + materialRequests.length,
    pendingWarehouse: materialRequests.filter((m) => m.status === 'PENDING_WAREHOUSE').length,
    pendingCeoPR: requests.filter((r) => r.status === 'PENDING_CEO_APPROVAL').length,
    pendingVendorApproval: vendorQuotes.filter((v) => v.status === 'PENDING_APPROVAL').length,
    totalContracts: contracts.length,
    pendingPayments: payments.filter((p) => p.status === 'PENDING_CEO_APPROVAL' || p.status === 'PENDING_CHAIRMAN').length,
    readyToPay: payments.filter((p) => p.status === 'APPROVED_READY_TO_PAY').length,
    totalPaidAmount: payments
      .filter((p) => p.disbursement?.status === 'PAID')
      .reduce((sum, p) => sum + (p.proposedAmount || 0), 0),
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* TOP BANNER / ROLE CONTEXT BAR */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Bảng Điều Hành Tiến Độ Mua Sắm & Thanh Toán
                </span>
                <span className="text-xs bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded-full border border-slate-200">
                  Live DB
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Theo dõi vòng đời từ <strong>Yêu cầu vật tư</strong>-<strong>Báo giá NCC</strong>-<strong>Hợp đồng</strong>-<strong>Đề xuất thanh toán</strong>-<strong>Chi quỹ</strong>.
              </p>
            </div>

            {/* Quick action theo Role & Dropdown Chọn Dự Án */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-56 sm:w-64">
                <ProjectSelect
                  value={selectedProjectId}
                  onChange={(id) => setSelectedProjectId(id)}
                  allowAll={true}
                  placeholder="-- Tất cả dự án --"
                />
              </div>

              <button
                onClick={handleDataRefresh}
                disabled={loading}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition flex items-center gap-1.5"
                title="Làm mới dữ liệu"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </button>

              {/* Thêm Dự Án chỉ dành cho Ban Giám Đốc (CEO, CHAIRMAN) */}
              {(user?.role === ROLES.CEO || user?.role === ROLES.CHAIRMAN) && (
                <button
                  onClick={() => setOpenCreateProject(true)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition"
                  title="Khởi tạo dự án công trình mới & phê duyệt hạn mức ngân sách"
                >
                  <Plus className="w-4 h-4" /> Thêm Dự Án
                </button>
              )}

              {user?.role === ROLES.WAREHOUSE_MANAGER && (
                <button
                  onClick={() => navigate('/warehouse/pending')}
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 active:scale-95 rounded-xl shadow-md shadow-cyan-500/25 flex items-center gap-1.5 transition"
                >
                  <Warehouse className="w-4 h-4" /> Bàn Làm Việc Kho ({pendingWarehouseCount} Chờ)
                </button>
              )}

              {user?.role === ROLES.SITE_MANAGER && (
                <button
                  onClick={() => setOpenCreatePR(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition"
                >
                  <Warehouse className="w-4 h-4" /> Lập Yêu Cầu Cấp Vật Tư (Gửi Kho)
                </button>
              )}
            </div>
          </div>

          {/* SITE MANAGER NOTIFICATION BANNER (WAITING CONFIRMATION) */}
          {user?.role === ROLES.SITE_MANAGER &&
            materialRequests.filter((mr) => mr.status === 'WAITING_SITE_CONFIRMATION').length > 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                    <Truck className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">
                      Thông báo công trường:{' '}
                      {
                        materialRequests.filter((mr) => mr.status === 'WAITING_SITE_CONFIRMATION')
                          .length
                      }{' '}
                      đơn vật tư đã được Quản lý kho xuất cấp!
                    </span>
                    <span className="text-[11px] text-blue-700">
                      Vui lòng kiểm đếm hàng thực nhận tại công trường và bấm xác nhận để hoàn tất.
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const firstWaiting = materialRequests.find(
                      (mr) => mr.status === 'WAITING_SITE_CONFIRMATION'
                    );
                    if (firstWaiting) navigate(`/material-requests/${firstWaiting._id}`);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 shrink-0"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Xác nhận nhận hàng ngay</span>
                </button>
              </div>
            )}

          {/* WAREHOUSE MANAGER QUICK ALERT BANNER */}
          {user?.role === ROLES.WAREHOUSE_MANAGER && pendingWarehouseCount > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 text-cyan-950 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-sm">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold block">
                    Có {pendingWarehouseCount} phiếu yêu cầu cấp vật tư đang chờ kho kiểm tra & tách đơn!
                  </span>
                  <span className="text-[11px] text-cyan-800">
                    Đối soát tồn kho thực tế, xuất kho phần có sẵn và tự động chuyển phần thiếu cho CEO duyệt.
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate('/warehouse/pending')}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>Kiểm tra tồn kho</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-5">
            <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Yêu cầu vật tư</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{stats.totalRequests}</div>
              <span className="text-[11px] text-amber-600 font-medium">
                {stats.pendingWarehouse > 0 ? `${stats.pendingWarehouse} chờ kho | ` : ''}
                {stats.pendingCeoPR} chờ CEO
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Khảo sát NCC</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{vendorQuotes.length}</div>
              <span className="text-[11px] text-blue-600 font-medium">{stats.pendingVendorApproval} chờ duyệt NCC</span>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Hợp đồng đã ký</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{stats.totalContracts}</div>
              <span className="text-[11px] text-indigo-600 font-medium">Bàn giao kế toán</span>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Đề xuất TT chờ duyệt</span>
              <div className="text-lg font-bold text-orange-600 mt-0.5">{stats.pendingPayments}</div>
              <span className="text-[11px] text-slate-500">CEO / Chủ tịch</span>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Sẵn sàng chi</span>
              <div className="text-lg font-bold text-emerald-600 mt-0.5">{stats.readyToPay}</div>
              <span className="text-[11px] text-emerald-700 font-medium">Thủ quỹ xử lý</span>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 p-3 rounded-xl">
              <span className="text-[11px] font-bold text-teal-800 uppercase">Tổng tiền đã chi</span>
              <div className="text-sm font-black text-teal-900 mt-1 truncate">
                {formatCurrency(stats.totalPaidAmount)}
              </div>
              <span className="text-[11px] text-teal-700">Đã xuất ủy nhiệm chi</span>
            </div>
          </div>
        </div>
      </div>

      {/* PROJECT EXPENSE SUMMARY & COST TRACKING */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <ProjectExpenseSummaryCard
          projectId={selectedProjectId}
          onRefresh={handleDataRefresh}
        />

        {/* VIEW TABS & SWITCHER */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('KANBAN')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'KANBAN'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tiến Độ 5 Giai Đoạn (Kanban)</span>
            </button>
            <button
              onClick={() => setActiveTab('PAYMENTS')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'PAYMENTS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Bảng Đề Xuất Thanh Toán ({payments.length})</span>
            </button>
          </div>
        </div>

        {activeTab === 'PAYMENTS' ? (
          <PaymentProposalList
            projectId={selectedProjectId}
            onApprove={(pm) => setActivePaymentApproval(pm)}
            onDisburse={(pm) => setActiveDisbursement(pm)}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          /* KANBAN BOARD 5 GIAI ĐOẠN */
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {/* CỘT 1: YÊU CẦU VẬT TƯ (SITE_MANAGER) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ClipboardList className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  1. Yêu cầu vật tư
                </h4>
              </div>
              <span className="text-xs font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full">
                {materialRequests.length + requests.length}
              </span>
            </div>

            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[680px]">
              {materialRequests.length === 0 && requests.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">Chưa có yêu cầu nào</div>
              ) : (
                <>
                  {/* DANH SÁCH YÊU CẦU CẤP KHO (MATERIAL REQUESTS) */}
                  {materialRequests.map((mr) => {
                    const statusInfo = STATUS_LABELS[mr.status] || {
                      label: mr.status,
                      color: 'bg-amber-100 text-amber-800 border-amber-200',
                    };
                    const isWarehouse = user?.role === ROLES.WAREHOUSE_MANAGER;
                    const isSiteManager = user?.role === ROLES.SITE_MANAGER;

                    return (
                      <div
                        key={`mr-${mr._id}`}
                        className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 hover:border-emerald-300 hover:shadow-sm transition space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {mr.requestCode}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-1 py-0.5 rounded">
                              Cấp kho
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>

                        <div className="font-bold text-xs text-slate-900 line-clamp-2">
                          {mr.projectId?.name || mr.project || 'Dự án công trình'}
                        </div>

                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          <div>
                            Vật tư: <strong>{mr.items?.length || 0} mục</strong> (
                            {mr.items?.[0]?.materialName}...)
                          </div>
                          <div>Người lập: {mr.requestedBy?.fullName || 'Trưởng thi công'}</div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                          {isWarehouse && mr.status === 'PENDING_WAREHOUSE' ? (
                            <button
                              onClick={() => navigate(`/warehouse/requests/${mr._id}`)}
                              className="w-full py-1.5 text-[11px] font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition flex items-center justify-center gap-1 shadow-sm"
                            >
                              <Warehouse className="w-3.5 h-3.5" /> Kiểm tra tồn kho
                            </button>
                          ) : isSiteManager && mr.status === 'WAITING_SITE_CONFIRMATION' ? (
                            <button
                              onClick={() => navigate(`/material-requests/${mr._id}`)}
                              className="w-full py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center justify-center gap-1 shadow-sm"
                            >
                              <PackageCheck className="w-3.5 h-3.5" /> Xác nhận nhận hàng
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                navigate(
                                  isWarehouse
                                    ? `/warehouse/requests/${mr._id}`
                                    : `/material-requests/${mr._id}`
                                )
                              }
                              className="w-full py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition flex items-center justify-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Chi tiết cấp kho
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* DANH SÁCH YÊU CẦU MUA SẮM NGOÀI (PURCHASE REQUESTS) */}
                  {requests.map((req) => {
                    const statusInfo = STATUS_LABELS[req.status] || {
                      label: req.status,
                      color: 'bg-slate-100 text-slate-700',
                    };
                    const isCeo = user?.role === ROLES.CEO;
                    const isProcurement = user?.role === ROLES.PROCUREMENT;
                    const hasQuote = vendorQuotes.some(
                      (vq) =>
                        vq.purchaseRequest?._id === req._id || vq.purchaseRequest === req._id
                    );

                    return (
                      <div
                        key={`pr-${req._id}`}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {req.code}
                            </span>
                            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1 py-0.5 rounded border border-purple-200">
                              Mua ngoài
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>

                        <div className="font-bold text-xs text-slate-900 line-clamp-2">
                          {req.projectName}
                        </div>

                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          <div>
                            Vật tư: <strong>{req.items?.length || 0} mục</strong> (
                            {req.items?.[0]?.name}...)
                          </div>
                          <div>Người lập: {req.createdBy?.fullName || 'Trưởng thi công'}</div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                          {/* CEO Duyệt PR */}
                          {isCeo && req.status === 'PENDING_CEO_APPROVAL' && (
                            <button
                              onClick={() => setActiveCeoPR(req)}
                              className="w-full py-1.5 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition flex items-center justify-center gap-1 shadow-sm"
                            >
                              CEO Phê Duyệt
                            </button>
                          )}

                          {/* Thu mua chuyển sang khảo sát NCC */}
                          {isProcurement && req.status === 'APPROVED_BY_CEO' && !hasQuote && (
                            <button
                              onClick={() => setActiveVendorModal(req)}
                              className="w-full py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center justify-center gap-1 shadow-sm"
                            >
                              + Khảo sát NCC
                            </button>
                          )}

                          {hasQuote && (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                              ✓ Đã lập báo giá NCC
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* CỘT 2: KHẢO SÁT & BÁO GIÁ NCC (PROCUREMENT, CEO, CHAIRMAN) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. Khảo sát NCC
                </h4>
              </div>
              <span className="text-xs font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full">
                {vendorQuotes.length}
              </span>
            </div>

            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[680px]">
              {vendorQuotes.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">Chưa có bảng báo giá nào</div>
              ) : (
                vendorQuotes.map((vq) => {
                  const statusInfo = STATUS_LABELS[vq.status] || { label: vq.status, color: 'bg-slate-100' };
                  const recommended = vq.vendors?.find((v) => v.isRecommended);
                  const isApprover = user?.role === ROLES.CEO || user?.role === ROLES.CHAIRMAN;
                  const isProcurement = user?.role === ROLES.PROCUREMENT;
                  const hasContract = contracts.some((c) => c.vendorQuote?._id === vq._id || c.vendorQuote === vq._id);

                  return (
                    <div
                      key={vq._id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {vq.purchaseRequest?.code || 'PR-2026'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-400 block">Đề xuất tối ưu:</span>
                        <div className="font-bold text-xs text-slate-900">
                          {recommended?.vendorName || 'Chưa chọn'}
                        </div>
                        <div className="text-xs font-extrabold text-blue-700 mt-0.5">
                          {formatCurrency(recommended?.quotedPrice)}
                        </div>
                      </div>

                      {/* Tiến trình duyệt 2 cấp */}
                      <div className="text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-0.5">
                        <div className="flex justify-between">
                          <span>CEO duyệt:</span>
                          <span className={vq.ceoApprovedBy ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                            {vq.ceoApprovedBy ? '✓ Đã duyệt' : '⏳ Chờ'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Chủ tịch duyệt:</span>
                          <span className={vq.chairmanApprovedBy ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                            {vq.chairmanApprovedBy ? '✓ Đã duyệt' : '⏳ Chờ'}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        {isApprover && vq.status !== 'VENDOR_APPROVED' && (
                          <button
                            onClick={() => setActiveVendorModal(vq.purchaseRequest || { _id: vq.purchaseRequest })}
                            className="w-full py-1.5 text-[11px] font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg transition shadow-sm"
                          >
                            Xem & Thẩm Duyệt NCC
                          </button>
                        )}

                        {isProcurement && vq.status === 'VENDOR_APPROVED' && !hasContract && (
                          <button
                            onClick={() => setActiveContractModal(vq)}
                            className="w-full py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center justify-center gap-1 shadow-sm"
                          >
                            + Ký & Upload Hợp Đồng
                          </button>
                        )}

                        {hasContract && (
                          <span className="text-[10px] text-emerald-600 font-semibold block text-center">
                            ✓ Đã ký hợp đồng
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CỘT 3: HỢP ĐỒNG ĐÃ KÝ (PROCUREMENT & ACCOUNTANT) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  3. Hợp đồng
                </h4>
              </div>
              <span className="text-xs font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full">
                {contracts.length}
              </span>
            </div>

            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[680px]">
              {contracts.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">Chưa có hợp đồng nào</div>
              ) : (
                contracts.map((ct) => {
                  const statusInfo = STATUS_LABELS[ct.status] || { label: ct.status, color: 'bg-slate-100' };
                  const isAccountant = user?.role === ROLES.ACCOUNTANT;

                  return (
                    <div
                      key={ct._id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {ct.code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div>
                        <div className="font-bold text-xs text-slate-900">{ct.vendorName}</div>
                        <div className="text-sm font-extrabold text-blue-700 mt-0.5">
                          {formatCurrency(ct.totalValue)}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <div>File đính kèm: <strong>{ct.files?.length || 1} file (PDF/Ảnh)</strong></div>
                        <div>Bàn giao: {formatDate(ct.handedOverAt || ct.createdAt)}</div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-slate-100">
                        {isAccountant && (
                          <button
                            onClick={() => setActiveCreatePayment(ct)}
                            className="w-full py-1.5 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition flex items-center justify-center gap-1 shadow-sm"
                          >
                            + Lập Đề Xuất Thanh Toán
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CỘT 4: ĐỀ XUẤT THANH TOÁN (ACCOUNTANT, CEO, CHAIRMAN) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  4. Đề xuất TT
                </h4>
              </div>
              <span className="text-xs font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full">
                {payments.length}
              </span>
            </div>

            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[680px]">
              {payments.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">Chưa có đề xuất nào</div>
              ) : (
                payments.map((pm) => {
                  const statusInfo = STATUS_LABELS[pm.status] || { label: pm.status, color: 'bg-slate-100' };
                  const isHighValue = (pm.proposedAmount || 0) >= 50000000;
                  const isApprover = user?.role === ROLES.CEO || user?.role === ROLES.CHAIRMAN;
                  const isTreasurer = user?.role === ROLES.TREASURER;

                  return (
                    <div
                      key={pm._id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          {pm.code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div>
                        <div className="text-base font-extrabold text-slate-900">
                          {formatCurrency(pm.proposedAmount)}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          Đơn vị: {pm.bankAccount?.accountName || pm.contract?.vendorName}
                        </div>
                      </div>

                      {/* BADGE CẢNH BÁO TÀI CHÍNH >= 50TR */}
                      {isHighValue && (
                        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg text-amber-800 text-[10px] font-bold">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Yêu cầu 2 cấp duyệt (CEO + Chủ tịch)</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        {isApprover && pm.status !== 'APPROVED_READY_TO_PAY' && pm.status !== 'REJECTED' && (
                          <button
                            onClick={() => setActivePaymentApproval(pm)}
                            className="w-full py-1.5 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition flex items-center justify-center gap-1 shadow-sm"
                          >
                            Phê Duyệt Thanh Toán
                          </button>
                        )}

                        {isTreasurer && pm.status === 'APPROVED_READY_TO_PAY' && (
                          <button
                            onClick={() => setActiveDisbursement(pm)}
                            className="w-full py-1.5 text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Banknote className="w-3.5 h-3.5" /> Chi Tiền Quỹ (Thủ quỹ)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CỘT 5: CHI QUỸ & HOÀN TẤT (TREASURER) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-teal-50/70 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                  5. Đã Chi Tiền (PAID)
                </h4>
              </div>
              <span className="text-xs font-bold bg-teal-200 text-teal-900 px-2 py-0.5 rounded-full">
                {payments.filter((p) => p.disbursement?.status === 'PAID').length}
              </span>
            </div>

            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[680px]">
              {payments.filter((p) => p.disbursement?.status === 'PAID').length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">Chưa có giao dịch chi tiền nào</div>
              ) : (
                payments
                  .filter((p) => p.disbursement?.status === 'PAID')
                  .map((pm) => (
                    <div
                      key={pm._id}
                      className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/30 hover:shadow-sm transition space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded">
                          {pm.code}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                          ✓ ĐÃ CHI TIỀN
                        </span>
                      </div>

                      <div className="text-base font-black text-teal-900">
                        {formatCurrency(pm.proposedAmount)}
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-0.5 bg-white p-2 rounded-lg border border-teal-100">
                        <div>
                          Mã UNC: <strong className="font-mono text-teal-800">{pm.disbursement?.transactionCode}</strong>
                        </div>
                        <div>Người chi: {pm.disbursement?.paidBy?.fullName || 'Thủ quỹ'}</div>
                        <div className="text-slate-400 text-[10px]">
                          Thời gian: {formatDate(pm.disbursement?.paidAt)}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* ALL MODALS */}
      <CreateRequestModal
        isOpen={openCreatePR}
        onClose={() => setOpenCreatePR(false)}
        onSuccess={handleDataRefresh}
      />

      <CreateMaterialRequestModal
        isOpen={openCreateMR}
        onClose={() => setOpenCreateMR(false)}
        onSuccess={handleDataRefresh}
      />

      <CEOApprovalModal
        isOpen={!!activeCeoPR}
        onClose={() => setActiveCeoPR(null)}
        request={activeCeoPR}
        onSuccess={handleDataRefresh}
      />

      <VendorSelectionModal
        isOpen={!!activeVendorModal}
        onClose={() => setActiveVendorModal(null)}
        request={activeVendorModal}
        onSuccess={handleDataRefresh}
      />

      <ContractUploadModal
        isOpen={!!activeContractModal}
        onClose={() => setActiveContractModal(null)}
        vendorQuote={activeContractModal}
        onSuccess={handleDataRefresh}
      />

      <CreatePaymentModal
        isOpen={!!activeCreatePayment}
        onClose={() => setActiveCreatePayment(null)}
        contract={activeCreatePayment}
        onSuccess={handleDataRefresh}
      />

      <PaymentApprovalModal
        isOpen={!!activePaymentApproval}
        onClose={() => setActivePaymentApproval(null)}
        payment={activePaymentApproval}
        onSuccess={handleDataRefresh}
      />

      <DisbursementModal
        isOpen={!!activeDisbursement}
        onClose={() => setActiveDisbursement(null)}
        payment={activeDisbursement}
        onSuccess={handleDataRefresh}
      />

      <CreateProjectModal
        isOpen={openCreateProject}
        onClose={() => setOpenCreateProject(false)}
        onSuccess={(newProject) => {
          setSelectedProjectId(newProject._id);
          handleDataRefresh();
        }}
      />
    </div>
  );
};

export default Dashboard;
