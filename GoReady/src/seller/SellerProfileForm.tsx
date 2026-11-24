import React from 'react';
import { api, type SellerProfile } from '../api';
import { Card, Field, Logo, inputClass, outlineBtn, primaryBtn } from './ui';

const BUSINESS_TYPES = [
  { value: 'domestic_travel', label: 'Doanh nghiệp lữ hành nội địa' },
  { value: 'international_travel', label: 'Doanh nghiệp lữ hành quốc tế' },
  { value: 'tour_organizer', label: 'Đơn vị tổ chức tour' },
];

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Không đọc được file'));
    r.readAsDataURL(file);
  });

/** Ô chọn file: kiểm tra loại và dung lượng ở trình duyệt, rồi tải lên ngay và giữ lại đường dẫn. */
const FileField: React.FC<{
  label: string; name: string; kind: 'logo' | 'business_reg' | 'travel_license'; accept: string; allowed: string[]; maxMB: number;
  value: string; onChange: (url: string) => void; error?: string; hintText: string;
}> = ({ label, name, kind, accept, allowed, maxMB, value, onChange, error, hintText }) => {
  const [fileName, setFileName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [localError, setLocalError] = React.useState('');

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalError('');
    if (!allowed.includes(file.type)) return setLocalError(`Chỉ nhận ${hintText}`);
    if (file.size > maxMB * 1024 * 1024) return setLocalError(`File quá lớn (tối đa ${maxMB}MB)`);
    setBusy(true);
    try {
      const { url } = await api.sellerUpload(kind, await readAsDataUrl(file));
      setFileName(file.name);
      onChange(url);
    } catch (err) {
      setLocalError((err as Error).message || 'Tải file thất bại, vui lòng thử lại');
    } finally {
      setBusy(false);
    }
  };

  const shownError = localError || error;
  return (
    <Field label={label} name={name} error={shownError}>
      <label className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed bg-slate-100 px-4 py-5 text-center text-sm text-slate-600 ${shownError ? 'border-red-400' : 'border-slate-300'}`}>
        <span className="font-medium">{busy ? 'Đang tải lên...' : value ? `✓ Đã tải lên${fileName ? `: ${fileName}` : ''}` : label}</span>
        <span className="text-xs text-slate-400">{hintText} · tối đa {maxMB}MB · {value ? 'bấm để chọn file khác' : 'bấm để chọn file'}</span>
        <input type="file" accept={accept} onChange={pick} className="hidden" />
      </label>
    </Field>
  );
};

type Values = Record<string, string>;
const EMPTY: Values = {
  email: '', phone: '', password: '', password_confirm: '', business_name: '', tax_code: '', business_type: 'domestic_travel',
  legal_representative: '', address: '', hotline: '', website: '', logo_url: '', travel_license_number: '', travel_license_issued_at: '',
  business_reg_file: '', travel_license_file: '',
};

interface Props {
  /** register: tạo tài khoản mới. resubmit: sửa hồ sơ bị từ chối rồi gửi lại. */
  mode: 'register' | 'resubmit';
  token?: string;
  initial?: SellerProfile | null;
  onDone: (token: string | null) => void;
}

const SellerProfileForm: React.FC<Props> = ({ mode, token, initial, onDone }) => {
  const isRegister = mode === 'register';
  const [v, setV] = React.useState<Values>(() => {
    if (!initial) return EMPTY;
    return {
      ...EMPTY,
      business_name: initial.business_name, tax_code: initial.tax_code, business_type: initial.business_type,
      legal_representative: initial.legal_representative, address: initial.address, hotline: initial.hotline,
      website: initial.website ?? '', logo_url: initial.logo_url ?? '', travel_license_number: initial.travel_license_number ?? '',
      travel_license_issued_at: initial.travel_license_issued_at ?? '', business_reg_file: initial.business_reg_file ?? '',
      travel_license_file: initial.travel_license_file ?? '',
    };
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [agree, setAgree] = React.useState(!isRegister);
  const [busy, setBusy] = React.useState(false);
  const [general, setGeneral] = React.useState('');
  const formRef = React.useRef<HTMLFormElement>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setV((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => (p[k] ? { ...p, [k]: '' } : p));
  };
  const setFile = (k: string) => (url: string) => {
    setV((p) => ({ ...p, [k]: url }));
    setErrors((p) => (p[k] ? { ...p, [k]: '' } : p));
  };

  const scrollToFirstError = (errs: Record<string, string>) => {
    window.setTimeout(() => {
      const nodes = Array.from(formRef.current?.querySelectorAll<HTMLElement>('[data-field]') ?? []);
      nodes.find((n) => errs[n.dataset.field ?? ''])?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneral('');
    if (!agree) {
      setErrors({ agree: 'Vui lòng đồng ý với điều khoản để gửi hồ sơ' });
      return;
    }
    setBusy(true);
    try {
      const { email, phone, password, password_confirm, ...profile } = v;
      if (isRegister) {
        const res = await api.sellerRegister({ email, phone, password, password_confirm, ...profile });
        onDone(res.token);
      } else {
        await api.sellerResubmit(token ?? '', profile);
        onDone(null);
      }
    } catch (err) {
      const fields = (err as Error & { fields?: Record<string, string> }).fields;
      if (fields) {
        setErrors(fields);
        scrollToFirstError(fields);
      } else {
        setGeneral((err as Error).message || 'Không thể gửi hồ sơ. Vui lòng thử lại.');
      }
    } finally {
      setBusy(false);
    }
  };

  const needsLicense = v.business_type === 'domestic_travel' || v.business_type === 'international_travel';
  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const steps = isRegister
    ? [['sec-account', 'Tài khoản'], ['sec-business', 'Doanh nghiệp'], ['sec-license', 'Giấy phép'], ['sec-submit', 'Gửi hồ sơ']]
    : [['sec-business', 'Doanh nghiệp'], ['sec-license', 'Giấy phép'], ['sec-submit', 'Gửi hồ sơ']];
  let n = 0;
  const num = () => ++n;

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
        <Logo />
        {isRegister ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">Đã có tài khoản người bán?</span>
            <a href="#/dang-nhap" className={outlineBtn}>Đăng nhập</a>
          </div>
        ) : (
          <a href="#/trang-thai" className="text-sm font-semibold text-[#3D72BB] hover:underline">← Về trạng thái hồ sơ</a>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <h1 className="text-3xl font-bold text-slate-900">{isRegister ? 'Đăng ký tài khoản người bán' : 'Sửa và gửi lại hồ sơ'}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isRegister
            ? 'Dành cho doanh nghiệp lữ hành hoặc đơn vị tổ chức tour. Hồ sơ sẽ được Admin xác minh trước khi bạn được đăng bán.'
            : 'Chỉnh lại các thông tin Admin yêu cầu, rồi gửi lại để được xét duyệt.'}
        </p>
        {!isRegister && initial?.reject_reason && (
          <div className="mt-4 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
            <b>Lý do từ Admin:</b> {initial.reject_reason}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          {steps.map(([id, label], i) => (
            <button key={id} type="button" onClick={() => goTo(id)} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-[#3D72BB] text-xs text-[#3D72BB]">{i + 1}</span>
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
          <form ref={formRef} onSubmit={submit} className="flex flex-col gap-6" noValidate>
            {isRegister && (
              <Card id="sec-account">
                <h2 className="text-lg font-bold text-slate-900">{num()}. Tài khoản đăng nhập</h2>
                <p className="text-sm text-slate-500">Dùng để đăng nhập Seller Center.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Email" name="email" error={errors.email}>
                    <input type="email" value={v.email} onChange={set('email')} className={inputClass(errors.email)} placeholder="email@doanhnghiep.vn" autoComplete="email" />
                  </Field>
                  <Field label="Số điện thoại" name="phone" error={errors.phone}>
                    <input value={v.phone} onChange={set('phone')} className={inputClass(errors.phone)} placeholder="09xx xxx xxx" autoComplete="tel" />
                  </Field>
                  <Field label="Mật khẩu" name="password" error={errors.password}>
                    <input type="password" value={v.password} onChange={set('password')} className={inputClass(errors.password)} placeholder="Tối thiểu 8 ký tự" autoComplete="new-password" />
                  </Field>
                  <Field label="Nhập lại mật khẩu" name="password_confirm" error={errors.password_confirm}>
                    <input type="password" value={v.password_confirm} onChange={set('password_confirm')} className={inputClass(errors.password_confirm)} placeholder="Nhập lại mật khẩu" autoComplete="new-password" />
                  </Field>
                </div>
              </Card>
            )}

            <Card id="sec-business">
              <h2 className="text-lg font-bold text-slate-900">{num()}. Thông tin doanh nghiệp</h2>
              <p className="text-sm text-slate-500">Thông tin này hiển thị công khai ở trang chi tiết tour.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Tên doanh nghiệp" name="business_name" error={errors.business_name}>
                  <input value={v.business_name} onChange={set('business_name')} className={inputClass(errors.business_name)} placeholder="[Tên công ty lữ hành]" />
                </Field>
                <Field label="Mã số doanh nghiệp" name="tax_code" error={errors.tax_code}>
                  <input value={v.tax_code} onChange={set('tax_code')} inputMode="numeric" className={inputClass(errors.tax_code)} placeholder="10 hoặc 13 chữ số" />
                </Field>
                <Field label="Loại hình" name="business_type" error={errors.business_type}>
                  <select value={v.business_type} onChange={set('business_type')} className={inputClass(errors.business_type)}>
                    {BUSINESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Người đại diện pháp luật" name="legal_representative" error={errors.legal_representative}>
                  <input value={v.legal_representative} onChange={set('legal_representative')} className={inputClass(errors.legal_representative)} placeholder="Họ và tên" />
                </Field>
                <Field label="Địa chỉ trụ sở" name="address" error={errors.address} className="sm:col-span-2">
                  <input value={v.address} onChange={set('address')} className={inputClass(errors.address)} placeholder="Số nhà, đường, quận/huyện, tỉnh/thành" />
                </Field>
                <Field label="Hotline hỗ trợ khách" name="hotline" error={errors.hotline}>
                  <input value={v.hotline} onChange={set('hotline')} className={inputClass(errors.hotline)} placeholder="1900 xxxx" />
                </Field>
                <Field label="Website / Fanpage (không bắt buộc)" name="website" error={errors.website}>
                  <input value={v.website} onChange={set('website')} className={inputClass(errors.website)} placeholder="https://" />
                </Field>
                <div className="sm:col-span-2">
                  <FileField label="Logo doanh nghiệp" name="logo_url" kind="logo" accept="image/png,image/jpeg" allowed={['image/png', 'image/jpeg']} maxMB={2}
                    value={v.logo_url} onChange={setFile('logo_url')} error={errors.logo_url} hintText="JPG/PNG" />
                </div>
              </div>
            </Card>

            <Card id="sec-license">
              <h2 className="text-lg font-bold text-slate-900">{num()}. Giấy phép kinh doanh</h2>
              <p className="text-sm text-slate-500">Giấy phép kinh doanh lữ hành chỉ bắt buộc nếu doanh nghiệp thuộc diện phải có (lữ hành nội địa / quốc tế).</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={`Số giấy phép kinh doanh lữ hành${needsLicense ? '' : ' (nếu có)'}`} name="travel_license_number" error={errors.travel_license_number}>
                  <input value={v.travel_license_number} onChange={set('travel_license_number')} className={inputClass(errors.travel_license_number)} placeholder="Số giấy phép" />
                </Field>
                <Field label="Ngày cấp" name="travel_license_issued_at" error={errors.travel_license_issued_at}>
                  <input type="date" value={v.travel_license_issued_at} onChange={set('travel_license_issued_at')} className={inputClass(errors.travel_license_issued_at)} />
                </Field>
                <FileField label="Giấy đăng ký kinh doanh" name="business_reg_file" kind="business_reg" accept="application/pdf,image/png,image/jpeg"
                  allowed={['application/pdf', 'image/png', 'image/jpeg']} maxMB={10} value={v.business_reg_file} onChange={setFile('business_reg_file')}
                  error={errors.business_reg_file} hintText="PDF/JPG/PNG" />
                <FileField label={`Giấy phép kinh doanh lữ hành${needsLicense ? '' : ' (nếu có)'}`} name="travel_license_file" kind="travel_license"
                  accept="application/pdf,image/png,image/jpeg" allowed={['application/pdf', 'image/png', 'image/jpeg']} maxMB={10}
                  value={v.travel_license_file} onChange={setFile('travel_license_file')} error={errors.travel_license_file} hintText="PDF/JPG/PNG" />
              </div>
            </Card>

            <Card id="sec-submit">
              <h2 className="text-lg font-bold text-slate-900">{num()}. Gửi hồ sơ</h2>
              <div data-field="agree" className="mt-3">
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErrors((p) => ({ ...p, agree: '' })); }} className="mt-1" />
                  <span>Tôi cam kết thông tin chính xác và đồng ý với Điều khoản dành cho người bán và Chính sách hoàn hủy của GoReady.</span>
                </label>
                {errors.agree && <p className="mt-1 text-xs font-medium text-red-600">{errors.agree}</p>}
              </div>
              {general && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{general}</p>}
              <div className="mt-4">
                <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Đang gửi...' : isRegister ? 'Gửi hồ sơ xét duyệt' : 'Gửi lại hồ sơ'}</button>
              </div>
            </Card>
          </form>

          <aside className="h-fit">
            <Card>
              <h3 className="font-bold text-slate-900">Quy trình sau khi đăng ký</h3>
              <ol className="mt-2 list-decimal pl-5 text-sm leading-7 text-slate-700">
                <li>Gửi hồ sơ</li>
                <li>Admin xác minh và duyệt</li>
                <li>Đăng tour lên GoReady</li>
                <li>Nhận và xác nhận booking</li>
                <li>Tổ chức tour, hoàn tất đơn</li>
              </ol>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default SellerProfileForm;
