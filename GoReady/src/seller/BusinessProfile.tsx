import React from 'react';
import { api, type SellerProfile } from '../api';
import { Card, Tag, outlineBtn } from './ui';

interface Props {
  token: string;
  seller: SellerProfile;
  onUnauthorized: () => void;
}

const TYPES: Record<SellerProfile['business_type'], string> = {
  domestic_travel: 'Doanh nghiệp lữ hành nội địa',
  international_travel: 'Doanh nghiệp lữ hành quốc tế',
  tour_organizer: 'Đơn vị tổ chức tour',
};
const dmy = (s: string | null) => (s ? s.split('-').reverse().join('/') : '');

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2.5 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
    <dt className="text-sm text-slate-500">{label}</dt>
    <dd className="text-sm text-slate-900 sm:text-right">{children || '—'}</dd>
  </div>
);

/** Hồ sơ doanh nghiệp (chỉ xem). Hồ sơ chỉ sửa được khi bị Admin từ chối, qua trang Trạng thái hồ sơ. */
const BusinessProfile: React.FC<Props> = ({ token, seller, onUnauthorized }) => {
  const [contact, setContact] = React.useState<{ email: string; phone: string } | null>(null);
  const [fileError, setFileError] = React.useState('');

  React.useEffect(() => {
    api.sellerMe(token).then((r) => setContact({ email: r.user.email, phone: r.user.phone })).catch((err) => {
      if ((err as Error & { status?: number }).status === 401) onUnauthorized();
    });
  }, [token, onUnauthorized]);

  // File giấy phép cần token → tải về rồi mở trong tab mới
  const openFile = async (url: string) => {
    setFileError('');
    const w = window.open('', '_blank');
    try {
      const blob = await api.fetchSellerFile(token, url);
      if (w) w.location.href = URL.createObjectURL(blob);
    } catch (err) {
      w?.close();
      setFileError((err as Error).message || 'Không mở được file');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">Hồ sơ doanh nghiệp</h1>
      <p className="mt-1 text-sm text-slate-500">Thông tin bạn đã đăng ký với GoReady. Thông tin công khai được hiển thị ở trang chi tiết tour.</p>

      <Card className="mt-5 max-w-3xl">
        <div className="flex items-center gap-4">
          {seller.logo_url
            ? <img src={seller.logo_url} alt="Logo" className="h-16 w-16 rounded-xl border border-slate-200 object-cover" />
            : <div className="grid h-16 w-16 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-xs text-slate-400">Logo</div>}
          <div>
            <p className="text-xl font-bold text-slate-900">{seller.business_name}</p>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              {TYPES[seller.business_type]} <Tag tone={seller.status === 'approved' ? 'ok' : seller.status === 'rejected' ? 'bad' : 'warn'}>{seller.status === 'approved' ? 'Đã duyệt' : seller.status === 'rejected' ? 'Cần bổ sung' : 'Chờ duyệt'}</Tag>
            </div>
          </div>
        </div>

        <dl className="mt-4">
          <Row label="Mã số doanh nghiệp">{seller.tax_code}</Row>
          <Row label="Người đại diện pháp luật">{seller.legal_representative}</Row>
          <Row label="Địa chỉ trụ sở">{seller.address}</Row>
          <Row label="Hotline hỗ trợ khách">{seller.hotline}</Row>
          <Row label="Website / Fanpage">{seller.website}</Row>
          <Row label="Email đăng nhập">{contact?.email}</Row>
          <Row label="Số điện thoại">{contact?.phone}</Row>
          <Row label="Số giấy phép lữ hành">{seller.travel_license_number}</Row>
          <Row label="Ngày cấp">{dmy(seller.travel_license_issued_at)}</Row>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          {seller.business_reg_file && <button onClick={() => openFile(seller.business_reg_file!)} className={outlineBtn}>Xem giấy đăng ký kinh doanh</button>}
          {seller.travel_license_file && <button onClick={() => openFile(seller.travel_license_file!)} className={outlineBtn}>Xem giấy phép lữ hành</button>}
        </div>
        {fileError && <p className="mt-2 text-xs font-medium text-red-600">{fileError}</p>}

        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Cần thay đổi thông tin đã được duyệt (tên doanh nghiệp, mã số, giấy phép...)? Hãy liên hệ Admin GoReady để được hỗ trợ cập nhật.
        </p>
      </Card>
    </div>
  );
};

export default BusinessProfile;
