import React from 'react';
import { api, type SellerTourStatus } from '../api';
import { Card, Field, inputClass, outlineBtn, primaryBtn } from './ui';
import TourPreview from './TourPreview';
import {
  GROUP_OPTIONS, HOTEL_OPTIONS, SECTION_OF, TRANSPORT_OPTIONS, emptyDay, emptyDeparture, emptyForm, fromTour, mapErrors, toPayload,
  type TourFormState,
} from './tourFormModel';

interface Props {
  token: string;
  /** Có = đang sửa tour này; không có = đăng tour mới. */
  tourId?: string;
  onUnauthorized: () => void;
  navigate: (to: string, replace?: boolean) => void;
}

const SECTIONS = [
  ['basic', '1. Thông tin cơ bản'],
  ['images', '2. Hình ảnh'],
  ['itinerary', '3. Lịch trình'],
  ['price', '4. Giá và lịch khởi hành'],
  ['policy', '5. Chính sách'],
] as const;

const MAX_IMAGE_MB = 5;
const digits = (s: string) => s.replace(/\D/g, '');

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Không đọc được file'));
    r.readAsDataURL(file);
  });

/** Kiểm tra ảnh ở trình duyệt rồi tải lên, trả về đường dẫn ảnh. */
async function uploadImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('Chỉ nhận ảnh JPG hoặc PNG');
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`Ảnh quá lớn (tối đa ${MAX_IMAGE_MB}MB)`);
  return (await api.sellerUpload('tour_image', await readAsDataUrl(file))).url;
}

const checkboxPill = (checked: boolean) =>
  `flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${checked ? 'border-[#3D72BB] bg-primary-50 text-[#3D72BB]' : 'border-slate-300 bg-white text-slate-700'}`;

const STATUS_NOTE: Partial<Record<SellerTourStatus, string>> = {
  pending_review: 'Tour đang chờ Admin duyệt nên không thể sửa lúc này.',
  active: 'Tour đang bán. Nếu bạn sửa giá hoặc lịch trình, tour sẽ quay lại trạng thái Chờ duyệt.',
  hidden: 'Tour đang ẩn. Nếu bạn sửa giá hoặc lịch trình, tour sẽ chuyển sang Chờ duyệt.',
};

const TourForm: React.FC<Props> = ({ token, tourId, onUnauthorized, navigate }) => {
  const [form, setForm] = React.useState<TourFormState>(emptyForm);
  const [id, setId] = React.useState<string | null>(tourId ?? null);
  const [status, setStatus] = React.useState<SellerTourStatus | 'new'>('new');
  const [rejectReason, setRejectReason] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(Boolean(tourId));
  const [loadError, setLoadError] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<'' | 'save' | 'submit'>('');
  const [message, setMessage] = React.useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [uploadError, setUploadError] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const knownId = React.useRef<string | null>(null); // id vừa được tạo ở form này (khỏi tải lại khi đường dẫn đổi)

  const handleUnauthorized = (err: unknown) => (err as Error & { status?: number }).status === 401 && (onUnauthorized(), true);

  // Mở tour để sửa, hoặc đưa form về trống khi chuyển sang "Đăng tour mới"
  React.useEffect(() => {
    if (tourId && tourId === knownId.current) return;
    setErrors({}); setMessage(null); setLoadError(''); setUploadError('');
    if (!tourId) {
      knownId.current = null; setId(null); setStatus('new'); setRejectReason(null); setForm(emptyForm()); setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.sellerGetTour(token, tourId)
      .then((t) => { if (cancelled) return; knownId.current = t.id; setId(t.id); setForm(fromTour(t)); setStatus(t.status); setRejectReason(t.reject_reason); })
      .catch((err) => { if (!cancelled && !handleUnauthorized(err)) setLoadError((err as Error).message || 'Không mở được tour'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId, token]);

  const readOnly = status === 'pending_review';

  const clearError = (...keys: string[]) => setErrors((p) => (keys.some((k) => p[k]) ? Object.fromEntries(Object.entries(p).filter(([k]) => !keys.includes(k))) : p));
  const set = <K extends keyof TourFormState>(k: K, v: TourFormState[K]) => { setForm((p) => ({ ...p, [k]: v })); clearError(k as string); };

  const setDay = (i: number, patch: Partial<TourFormState['itinerary'][number]>) => {
    setForm((p) => ({ ...p, itinerary: p.itinerary.map((d, j) => (j === i ? { ...d, ...patch } : d)) }));
    clearError('itinerary');
  };
  const setDeparture = (i: number, patch: Partial<TourFormState['departures'][number]>) => {
    setForm((p) => ({ ...p, departures: p.departures.map((d, j) => (j === i ? { ...d, ...patch } : d)) }));
    clearError('departures', `departures[${i}]`, `departures[${i}].departure_date`, `departures[${i}].max_seats`, `departures[${i}].price`, `departures[${i}].booking_deadline`);
  };
  // Tăng số ngày thì tự thêm ngày lịch trình trống cho khớp (không bao giờ tự xóa ngày đã nhập)
  const setDuration = (value: string) => {
    const n = Number(value);
    setForm((p) => ({
      ...p, duration: value,
      itinerary: n > p.itinerary.length && n <= 60 ? [...p.itinerary, ...Array.from({ length: n - p.itinerary.length }, emptyDay)] : p.itinerary,
    }));
    clearError('duration', 'itinerary');
  };

  const scrollToError = (errs: Record<string, string>) => {
    window.setTimeout(() => {
      const nodes = Array.from(formRef.current?.querySelectorAll<HTMLElement>('[data-field]') ?? []);
      (nodes.find((n) => errs[n.dataset.field ?? '']) ?? null)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  /** Lưu tour (tạo mới nếu chưa có id). Trả về tour đã lưu hoặc null nếu lỗi. */
  const persist = async () => {
    const { body, rowIndexes } = toPayload(form);
    try {
      const t = await api.sellerSaveTour(token, id, body);
      const created = !id;
      knownId.current = t.id; setId(t.id); setForm(fromTour(t)); setStatus(t.status); setRejectReason(t.reject_reason); setErrors({});
      if (created) navigate(`/tour/${t.id}/sua`, true);
      return { tour: t, wasStatus: status };
    } catch (err) {
      if (handleUnauthorized(err)) return null;
      const fields = (err as Error & { fields?: Record<string, string> }).fields;
      if (fields) {
        const mapped = mapErrors(fields, rowIndexes);
        setErrors(mapped);
        scrollToError(mapped);
        setMessage({ tone: 'bad', text: 'Có thông tin chưa hợp lệ, vui lòng kiểm tra các ô báo đỏ.' });
      } else {
        setMessage({ tone: 'bad', text: (err as Error).message || 'Không lưu được, vui lòng thử lại.' });
      }
      return null;
    }
  };

  const save = async () => {
    setBusy('save'); setMessage(null);
    const r = await persist();
    setBusy('');
    if (!r) return;
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const wentToReview = (r.wasStatus === 'active' || r.wasStatus === 'hidden') && r.tour.status === 'pending_review';
    setMessage({
      tone: 'ok',
      text: wentToReview ? 'Đã lưu. Vì bạn sửa giá hoặc lịch trình, tour đã chuyển sang Chờ duyệt và tạm thời chưa hiển thị cho khách.'
        : r.tour.status === 'draft' || r.tour.status === 'rejected' ? `Đã lưu nháp lúc ${time}.` : `Đã lưu thay đổi lúc ${time}.`,
    });
  };

  const submit = async () => {
    setBusy('submit'); setMessage(null);
    const r = await persist();
    if (!r) { setBusy(''); return; }
    try {
      await api.sellerTourAction(token, r.tour.id, 'submit');
      navigate('/tour-cua-toi?status=pending_review');
    } catch (err) {
      if (handleUnauthorized(err)) return;
      const fields = (err as Error & { fields?: Record<string, string> }).fields;
      if (fields) {
        // Server báo theo vị trí trong dữ liệu đã lưu; form vừa nạp lại từ server nên vị trí khớp với dòng hiện tại
        const rows = r.tour.departures.map((_, i) => i);
        const mapped = mapErrors(fields, rows);
        setErrors(mapped);
        scrollToError(mapped);
        setMessage({ tone: 'bad', text: 'Tour chưa đủ thông tin để gửi duyệt. Bản nháp đã được lưu, hãy bổ sung các ô báo đỏ rồi gửi lại.' });
      } else {
        setMessage({ tone: 'bad', text: (err as Error).message || 'Không gửi duyệt được, vui lòng thử lại.' });
      }
    } finally {
      setBusy('');
    }
  };

  const addImages = async (files: FileList | null, target: 'cover' | 'gallery') => {
    if (!files?.length) return;
    setUploading(true); setUploadError('');
    try {
      if (target === 'cover') { set('coverImage', await uploadImage(files[0])); }
      else {
        const urls: string[] = [];
        for (const f of Array.from(files)) urls.push(await uploadImage(f));
        setForm((p) => ({ ...p, images: [...p.images, ...urls].slice(0, 20) }));
        clearError('images');
      }
    } catch (err) {
      setUploadError((err as Error).message || 'Tải ảnh thất bại, vui lòng thử lại');
    } finally {
      setUploading(false);
    }
  };

  const e = (k: string) => errors[k];
  const sectionHasError = (s: string) => Object.keys(errors).some((k) => SECTION_OF(k) === s);
  const goTo = (s: string) => document.getElementById(`tf-${s}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (loading) return <p className="text-sm text-slate-400">Đang tải tour...</p>;
  if (loadError) {
    return (
      <div className="max-w-xl rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-600">
        {loadError}
        <div className="mt-3"><a href="#/tour-cua-toi" className={outlineBtn}>Về Tour của tôi</a></div>
      </div>
    );
  }

  const isNew = status === 'new';
  const canSubmit = isNew || status === 'draft' || status === 'rejected';
  const transportOptions = TRANSPORT_OPTIONS.includes(form.transport) ? TRANSPORT_OPTIONS : [form.transport, ...TRANSPORT_OPTIONS];

  return (
    <div>
      <p className="text-sm text-slate-500">
        <a href="#/tong-quan" className="underline">Seller Center</a> / <a href="#/tour-cua-toi" className="underline">Tour của tôi</a> / {isNew ? 'Đăng tour mới' : 'Sửa tour'}
      </p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900">{isNew ? 'Đăng tour mới' : readOnly ? 'Xem tour' : 'Sửa tour'}</h1>
      <p className="mt-1 text-sm text-slate-500">Điền đủ 5 phần rồi gửi duyệt. Tour chỉ hiển thị cho khách sau khi Admin duyệt. Có thể lưu nháp bất kỳ lúc nào.</p>

      {status === 'rejected' && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <b>Admin đã từ chối tour này.</b> {rejectReason && <>Lý do: {rejectReason}</>} Hãy chỉnh sửa rồi gửi lại.
        </div>
      )}
      {STATUS_NOTE[status as SellerTourStatus] && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{STATUS_NOTE[status as SellerTourStatus]}</div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-1">
            {SECTIONS.map(([key, label], i) => (
              <button key={key} type="button" onClick={() => goTo(key)} className={`flex items-center justify-between rounded-full px-4 py-2.5 text-left text-sm font-semibold ${i === 0 ? 'bg-[#3D72BB] text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                {label}
                {sectionHasError(key) && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Có lỗi" />}
              </button>
            ))}
          </div>
        </nav>

        <form ref={formRef} onSubmit={(ev) => ev.preventDefault()} noValidate className="min-w-0">
          <fieldset disabled={readOnly} className="flex flex-col gap-6">
            {/* 1. Thông tin cơ bản */}
            <Card id="tf-basic">
              <h2 className="text-lg font-bold text-slate-900">1. Thông tin cơ bản</h2>
              <p className="text-sm text-slate-500">Các trường này hiển thị trên thẻ tour ở trang Khám phá.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Tên tour" name="name" error={e('name')} className="sm:col-span-3">
                  <input value={form.name} onChange={(ev) => set('name', ev.target.value)} className={inputClass(e('name'))} placeholder="Ví dụ: [Điểm đến]: [Điểm nhấn] 3N2Đ" />
                </Field>
                <Field label="Điểm đến" name="destination" error={e('destination')}>
                  <input value={form.destination} onChange={(ev) => set('destination', ev.target.value)} className={inputClass(e('destination'))} placeholder="Đà Nẵng, Phú Quốc, Sapa..." />
                </Field>
                <Field label="Điểm khởi hành" name="departure" error={e('departure')}>
                  <input value={form.departure} onChange={(ev) => set('departure', ev.target.value)} className={inputClass(e('departure'))} placeholder="Thành phố khởi hành" />
                </Field>
                <Field label="Số ngày" name="duration" error={e('duration')}>
                  <input value={form.duration} onChange={(ev) => setDuration(digits(ev.target.value))} inputMode="numeric" className={inputClass(e('duration'))} placeholder="3" />
                </Field>
                <Field label="Số đêm" name="nights" error={e('nights')}>
                  <input value={form.nights} onChange={(ev) => set('nights', digits(ev.target.value))} inputMode="numeric" className={inputClass(e('nights'))} placeholder="2" />
                </Field>
                <Field label="Phương tiện" name="transport" error={e('transport')}>
                  <select value={form.transport} onChange={(ev) => set('transport', ev.target.value)} className={inputClass(e('transport'))}>
                    {transportOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Hạng khách sạn" name="hotelStars" error={e('hotelStars')}>
                  <select value={form.hotelStars} onChange={(ev) => set('hotelStars', ev.target.value)} className={inputClass(e('hotelStars'))}>
                    {HOTEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Quy mô đoàn phù hợp" name="groupSizeTags" error={e('groupSizeTags')} className="sm:col-span-3">
                  <div className="flex flex-wrap gap-2">
                    {GROUP_OPTIONS.map((o) => {
                      const checked = form.groupSizeTags.includes(o.value);
                      return (
                        <label key={o.value} className={checkboxPill(checked)}>
                          <input type="checkbox" checked={checked} className="hidden"
                            onChange={() => set('groupSizeTags', checked ? form.groupSizeTags.filter((x) => x !== o.value) : [...form.groupSizeTags, o.value])} />
                          {checked ? '✓ ' : ''}{o.label}
                        </label>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Mô tả ngắn (hiển thị trên thẻ tour)" name="shortDescription" error={e('shortDescription')} className="sm:col-span-3">
                  <textarea value={form.shortDescription} onChange={(ev) => set('shortDescription', ev.target.value)} rows={3} className={inputClass(e('shortDescription'))} placeholder="1 đến 2 câu giới thiệu điểm nổi bật" />
                </Field>
              </div>
            </Card>

            {/* 2. Hình ảnh */}
            <Card id="tf-images">
              <h2 className="text-lg font-bold text-slate-900">2. Hình ảnh</h2>
              <p className="text-sm text-slate-500">Ảnh bìa dùng cho thẻ tour. Thư viện ảnh dùng ở trang chi tiết.</p>
              <div className="mt-4 flex flex-col gap-4">
                <Field label="Ảnh bìa" name="coverImage" error={e('coverImage')}>
                  <label className={`relative flex min-h-[160px] cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed bg-slate-100 text-sm text-slate-600 ${e('coverImage') ? 'border-red-400' : 'border-slate-300'}`}>
                    {form.coverImage
                      ? <img src={form.coverImage} alt="Ảnh bìa" className="h-56 w-full object-cover" />
                      : <span className="text-center">{uploading ? 'Đang tải lên...' : <>Ảnh bìa · tỉ lệ 16:9 · JPG/PNG tối đa {MAX_IMAGE_MB}MB<br /><span className="text-xs text-slate-400">bấm để chọn ảnh</span></>}</span>}
                    <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(ev) => { void addImages(ev.target.files, 'cover'); ev.target.value = ''; }} />
                  </label>
                  {form.coverImage && <p className="text-xs text-slate-400">Bấm vào ảnh để đổi ảnh bìa.</p>}
                </Field>
                <Field label="Thư viện ảnh" name="images" error={e('images')}>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {form.images.map((url, i) => (
                      <div key={url + i} className="relative h-24 overflow-hidden rounded-xl border border-slate-200">
                        <img src={url} alt={`Ảnh ${i + 1}`} className="h-full w-full object-cover" />
                        <button type="button" onClick={() => set('images', form.images.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-xs text-white" aria-label={`Xóa ảnh ${i + 1}`}>✕</button>
                      </div>
                    ))}
                    {form.images.length < 20 && (
                      <label className="grid h-24 cursor-pointer place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-xs text-slate-600">
                        {uploading ? 'Đang tải...' : '+ Thêm ảnh'}
                        <input type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={(ev) => { void addImages(ev.target.files, 'gallery'); ev.target.value = ''; }} />
                      </label>
                    )}
                  </div>
                </Field>
                {uploadError && <p className="text-xs font-medium text-red-600">{uploadError}</p>}
              </div>
            </Card>

            {/* 3. Lịch trình */}
            <Card id="tf-itinerary">
              <h2 className="text-lg font-bold text-slate-900">3. Lịch trình chi tiết</h2>
              <p className="text-sm text-slate-500">Thêm từng ngày theo thứ tự. Số ngày nên khớp với phần Thông tin cơ bản.</p>
              <div data-field="itinerary" className="mt-4 flex flex-col gap-4">
                {form.itinerary.map((d, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ngày {i + 1} · Tiêu đề</label>
                      {form.itinerary.length > 1 && (
                        <button type="button" onClick={() => { setForm((p) => ({ ...p, itinerary: p.itinerary.filter((_, j) => j !== i) })); clearError('itinerary'); }} className="text-xs font-semibold text-red-500">Xóa ngày này</button>
                      )}
                    </div>
                    <input value={d.title} onChange={(ev) => setDay(i, { title: ev.target.value })} className={`${inputClass()} mt-1`} placeholder={i === 0 ? 'Ví dụ: [Nơi đi] – [Nơi đến]' : `Tiêu đề ngày ${i + 1}`} />
                    <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Hoạt động trong ngày</label>
                    <textarea value={d.description} onChange={(ev) => setDay(i, { description: ev.target.value })} rows={3} className={`${inputClass()} mt-1`} placeholder="Mô tả các điểm tham quan, thời gian, di chuyển" />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {([['has_breakfast', 'Bữa sáng'], ['has_lunch', 'Bữa trưa'], ['has_dinner', 'Bữa tối']] as const).map(([k, label]) => (
                        <label key={k} className={checkboxPill(d[k])}>
                          <input type="checkbox" checked={d[k]} onChange={(ev) => setDay(i, { [k]: ev.target.checked })} className="hidden" />
                          {d[k] ? '✓ ' : ''}{label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {e('itinerary') && <p className="text-xs font-medium text-red-600">{e('itinerary')}</p>}
                <div>
                  <button type="button" onClick={() => setForm((p) => ({ ...p, itinerary: [...p.itinerary, emptyDay()] }))} disabled={form.itinerary.length >= 60} className={outlineBtn}>+ Thêm ngày</button>
                  <span className="ml-3 text-xs text-slate-400">Hiện có {form.itinerary.length} ngày{form.duration ? ` · tour dài ${form.duration} ngày` : ''}</span>
                </div>
              </div>
            </Card>

            {/* 4. Giá và lịch khởi hành */}
            <Card id="tf-price">
              <h2 className="text-lg font-bold text-slate-900">4. Giá và lịch khởi hành</h2>
              <p className="text-sm text-slate-500">Mỗi ngày khởi hành có số chỗ tối đa riêng. Hệ thống tự trừ chỗ khi bạn xác nhận booking.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Giá người lớn / khách (₫)" name="price" error={e('price')}>
                  <input value={form.price} onChange={(ev) => set('price', digits(ev.target.value))} inputMode="numeric" className={inputClass(e('price'))} placeholder="0" />
                </Field>
                <Field label="Giá trẻ em / khách (₫)" name="childPrice" error={e('childPrice')}>
                  <input value={form.childPrice} onChange={(ev) => set('childPrice', digits(ev.target.value))} inputMode="numeric" className={inputClass(e('childPrice'))} placeholder="0" />
                </Field>
              </div>

              <h3 className="mt-5 text-sm font-bold text-slate-900">Các ngày khởi hành</h3>
              <div data-field="departures" className="mt-2 flex flex-col gap-3">
                <div className="hidden grid-cols-[1fr_1fr_100px_1fr_70px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid">
                  <span>Ngày khởi hành</span><span>Giá riêng (nếu khác)</span><span>Số chỗ tối đa</span><span>Chốt nhận booking</span><span />
                </div>
                {form.departures.map((d, i) => (
                  <div key={d.id ?? `new-${i}`} className="grid gap-2 md:grid-cols-[1fr_1fr_100px_1fr_70px] md:items-start">
                    <div data-field={`departures[${i}].departure_date`}>
                      <input type="date" value={d.departure_date} onChange={(ev) => setDeparture(i, { departure_date: ev.target.value })} className={inputClass(e(`departures[${i}].departure_date`))} aria-label="Ngày khởi hành" />
                      {e(`departures[${i}].departure_date`) && <p className="mt-1 text-xs font-medium text-red-600">{e(`departures[${i}].departure_date`)}</p>}
                    </div>
                    <div data-field={`departures[${i}].price`}>
                      <input value={d.price} onChange={(ev) => setDeparture(i, { price: digits(ev.target.value) })} inputMode="numeric" className={inputClass(e(`departures[${i}].price`))} placeholder="Để trống = giá chung" aria-label="Giá riêng" />
                      {e(`departures[${i}].price`) && <p className="mt-1 text-xs font-medium text-red-600">{e(`departures[${i}].price`)}</p>}
                    </div>
                    <div data-field={`departures[${i}].max_seats`}>
                      <input value={d.max_seats} onChange={(ev) => setDeparture(i, { max_seats: digits(ev.target.value) })} inputMode="numeric" className={inputClass(e(`departures[${i}].max_seats`))} placeholder="20" aria-label="Số chỗ tối đa" />
                      {d.booked_seats > 0 && <p className="mt-1 text-xs text-slate-500">Đã đặt {d.booked_seats}</p>}
                      {e(`departures[${i}].max_seats`) && <p className="mt-1 text-xs font-medium text-red-600">{e(`departures[${i}].max_seats`)}</p>}
                    </div>
                    <div data-field={`departures[${i}].booking_deadline`}>
                      <input type="date" value={d.booking_deadline} onChange={(ev) => setDeparture(i, { booking_deadline: ev.target.value })} className={inputClass(e(`departures[${i}].booking_deadline`))} aria-label="Chốt nhận booking" />
                      {e(`departures[${i}].booking_deadline`) && <p className="mt-1 text-xs font-medium text-red-600">{e(`departures[${i}].booking_deadline`)}</p>}
                    </div>
                    <button type="button" disabled={d.booked_seats > 0} title={d.booked_seats > 0 ? 'Đã có người đặt, không thể xóa' : undefined}
                      onClick={() => { setForm((p) => ({ ...p, departures: p.departures.filter((_, j) => j !== i) })); clearError('departures'); }}
                      className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-red-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40">Xóa</button>
                  </div>
                ))}
                {e('departures') && <p className="text-xs font-medium text-red-600">{e('departures')}</p>}
                <div>
                  <button type="button" onClick={() => setForm((p) => ({ ...p, departures: [...p.departures, emptyDeparture()] }))} className={outlineBtn}>+ Thêm ngày khởi hành</button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Giá đã bao gồm" name="includes" error={e('includes')}>
                  <textarea value={form.includes} onChange={(ev) => set('includes', ev.target.value)} rows={4} className={inputClass(e('includes'))} placeholder="Mỗi dòng một mục: xe, khách sạn, bữa ăn, vé tham quan..." />
                </Field>
                <Field label="Giá chưa bao gồm" name="excludes" error={e('excludes')}>
                  <textarea value={form.excludes} onChange={(ev) => set('excludes', ev.target.value)} rows={4} className={inputClass(e('excludes'))} placeholder="Mỗi dòng một mục: chi phí cá nhân, phụ thu..." />
                </Field>
              </div>
            </Card>

            {/* 5. Chính sách */}
            <Card id="tf-policy">
              <h2 className="text-lg font-bold text-slate-900">5. Chính sách</h2>
              <p className="text-sm text-slate-500">Hiển thị ở trang chi tiết tour và làm căn cứ khi khách hủy hoặc đổi tour.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Chính sách hủy và hoàn tiền" name="cancellationPolicy" error={e('cancellationPolicy')} className="sm:col-span-2">
                  <textarea value={form.cancellationPolicy} onChange={(ev) => set('cancellationPolicy', ev.target.value)} rows={3} className={inputClass(e('cancellationPolicy'))} placeholder="Hủy trước bao nhiêu ngày được hoàn bao nhiêu phần trăm" />
                </Field>
                <Field label="Chính sách trẻ em" name="child_policy" error={e('child_policy')}>
                  <textarea value={form.child_policy} onChange={(ev) => set('child_policy', ev.target.value)} rows={3} className={inputClass(e('child_policy'))} placeholder="Độ tuổi, mức giá, điều kiện" />
                </Field>
                <Field label="Lưu ý và giấy tờ cần mang" name="notes" error={e('notes')}>
                  <textarea value={form.notes} onChange={(ev) => set('notes', ev.target.value)} rows={3} className={inputClass(e('notes'))} placeholder="CCCD/Hộ chiếu, trang phục, sức khỏe..." />
                </Field>
              </div>
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                Điều khoản hoàn hủy cần khớp với mô hình thanh toán GoReady sẽ chốt (thu hộ hay doanh nghiệp tự thu). Tạm thời chỉ lưu dạng văn bản.
              </p>
            </Card>
          </fieldset>

          {/* Thanh hành động */}
          <Card className="mt-6">
            {message && (
              <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${message.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-600'}`}>{message.text}</div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {canSubmit && (
                <button type="button" onClick={submit} disabled={busy !== '' || uploading} className={primaryBtn}>
                  {busy === 'submit' ? 'Đang gửi...' : status === 'rejected' ? 'Gửi lại Admin duyệt' : 'Gửi Admin duyệt'}
                </button>
              )}
              <button type="button" onClick={() => setPreview(true)} className={outlineBtn}>Xem trước như khách</button>
              {!readOnly && (
                <button type="button" onClick={save} disabled={busy !== '' || uploading} className={canSubmit ? outlineBtn : primaryBtn}>
                  {busy === 'save' ? 'Đang lưu...' : canSubmit ? 'Lưu nháp' : 'Lưu thay đổi'}
                </button>
              )}
              {canSubmit && <p className="text-xs text-slate-500">Gửi duyệt: tour chuyển sang Chờ duyệt. Admin duyệt xong tour sẽ hiện ở trang Khám phá.</p>}
            </div>
          </Card>
        </form>
      </div>

      {preview && <TourPreview form={form} onClose={() => setPreview(false)} />}
    </div>
  );
};

export default TourForm;
