import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { warehouseApi } from '../../services/api';
import WarehouseInspectionModal from './WarehouseInspectionModal';
import { RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react';

const WarehouseInspectionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRequest = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await warehouseApi.getRequestById(id);
      if (res.data && res.data.success) {
        setRequest(res.data.data);
      } else {
        setError(res.data?.message || 'Không tìm thấy đơn yêu cầu.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Lỗi khi tải thông tin đơn kiểm kho.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchRequest();
  }, [id]);

  const handleClose = () => {
    navigate('/warehouse/pending');
  };

  const handleSuccess = () => {
    navigate('/warehouse/pending');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
        <p className="text-xs">Đang tải dữ liệu kiểm kho...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Không thể mở kiểm kho</h3>
        <p className="text-xs text-slate-500">{error || 'Không tìm thấy đơn yêu cầu vật tư.'}</p>
        <button
          onClick={() => navigate('/warehouse/pending')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về danh sách đơn</span>
        </button>
      </div>
    );
  }

  return (
    <WarehouseInspectionModal
      isOpen={true}
      onClose={handleClose}
      request={request}
      onSuccess={handleSuccess}
    />
  );
};

export default WarehouseInspectionPage;
