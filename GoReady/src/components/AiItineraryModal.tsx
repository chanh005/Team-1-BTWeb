import React from 'react';
import type { AiPlannerRequest, AiPlannerResult, TravelStyle } from '../types';
import { generateAiItinerary } from '../utils/aiPlanner';
import { formatVND } from '../utils/format';

interface AiItineraryModalProps {
  onClose: () => void;
  onSavePlan: (result: AiPlannerResult) => void;
}

const STYLES: TravelStyle[] = ['Biển đảo nghỉ dưỡng', 'Văn hóa & Lịch sử', 'Khám phá & Trekking', 'Nghỉ dưỡng gia đình', 'Ẩm thực đường phố'];

const AiItineraryModal: React.FC<AiItineraryModalProps> = ({ onClose, onSavePlan }) => {
  const [form, setForm] = React.useState<AiPlannerRequest>({
    destination: '',
    budget: 5000000,
    days: 3,
    style: 'Biển đảo nghỉ dưỡng',
    notes: '',
  });
  const [result, setResult] = React.useState<AiPlannerResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.destination.trim()) return;
    setLoading(true);
    setSaved(false);
    // Simulate AI "thinking" delay for realism
    window.setTimeout(() => {
      setResult(generateAiItinerary(form));
      setLoading(false);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-slideUp sm:h-[85vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-primary to-primary-600 p-4 text-white">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-lg text-primary-800">✨</span>
            <div>
              <h3 className="font-heading text-base font-bold">AI Smart Travel Planner</h3>
              <p className="text-[11px] text-white/80">Lập lịch trình cá nhân hóa chỉ trong vài giây</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-lg hover:bg-white/10">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <form onSubmit={handleGenerate} className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-500">Điểm đến mong muốn</span>
              <input
                required
                value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                placeholder="VD: Đà Lạt, Phú Quốc, Tokyo..."
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">Ngân sách dự kiến (VND)</span>
              <input
                type="number"
                min={500000}
                step={500000}
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) }))}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">Số ngày đi</span>
              <input
                type="number"
                min={1}
                max={20}
                value={form.days}
                onChange={(e) => setForm((f) => ({ ...f, days: Number(e.target.value) }))}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-500">Phong cách du lịch</span>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setForm((f) => ({ ...f, style: s }))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      form.style === s ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-500">Yêu cầu riêng (tùy chọn)</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="VD: đi cùng trẻ nhỏ, thích chụp ảnh, ăn chay..."
                rows={2}
                className="resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="sm:col-span-2 mt-1 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-card transition hover:bg-primary-600 disabled:opacity-60"
            >
              {loading ? 'AI đang lên lịch trình...' : '✨ Tạo lịch trình bằng AI'}
            </button>
          </form>

          {result && (
            <div className="mt-6 space-y-5 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between">
                <h4 className="font-heading text-base font-bold text-slate-900">
                  Lịch trình {result.days} ngày tại {result.destination}
                </h4>
                <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-primary-800">💡 Gợi ý bởi AI</span>
              </div>

              <div className="space-y-3">
                {result.itinerary.map((d) => (
                  <div key={d.day} className="rounded-xl border border-slate-100 p-3.5">
                    <p className="mb-2 text-xs font-bold text-primary-700">Ngày {d.day}</p>
                    <ul className="space-y-1.5 text-sm text-slate-600">
                      <li><span className="font-semibold text-slate-800">🌅 Sáng:</span> {d.morning}</li>
                      <li><span className="font-semibold text-slate-800">☀️ Chiều:</span> {d.afternoon}</li>
                      <li><span className="font-semibold text-slate-800">🌙 Tối:</span> {d.evening}</li>
                    </ul>
                  </div>
                ))}
              </div>

              <div>
                <h5 className="mb-2 text-sm font-bold text-slate-800">💰 Dự toán chi phí</h5>
                <div className="space-y-1.5 rounded-xl bg-slate-50 p-3.5">
                  {result.costBreakdown.map((c) => (
                    <div key={c.label} className="flex justify-between text-sm text-slate-600">
                      <span>{c.label}</span>
                      <span className="font-semibold text-slate-800">{formatVND(c.amount)}</span>
                    </div>
                  ))}
                  <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-1.5 text-sm font-bold text-primary-700">
                    <span>Tổng cộng</span>
                    <span>{formatVND(result.totalCost)}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-accent/10 p-3.5">
                  <h5 className="text-xs font-bold text-primary-800">🗓️ Thời điểm lý tưởng</h5>
                  <p className="mt-1 text-xs text-slate-600">{result.bestTime}</p>
                </div>
                <div className="rounded-xl bg-cream/60 p-3.5">
                  <h5 className="text-xs font-bold text-primary-800">🎎 Lời khuyên văn hóa</h5>
                  <ul className="mt-1 list-disc space-y-0.5 pl-3.5 text-xs text-slate-600">
                    {result.culturalTips.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                </div>
                <div className="sm:col-span-2 rounded-xl bg-emerald-50 p-3.5">
                  <h5 className="text-xs font-bold text-emerald-700">💡 Mẹo tiết kiệm chi phí</h5>
                  <ul className="mt-1 list-disc space-y-0.5 pl-3.5 text-xs text-slate-600">
                    {result.savingTips.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => {
                  onSavePlan(result);
                  setSaved(true);
                }}
                disabled={saved}
                className="w-full rounded-xl border-2 border-primary py-3 text-sm font-bold text-primary transition hover:bg-primary-50 disabled:opacity-60"
              >
                {saved ? '✓ Đã lưu vào chuyến đi của tôi' : '📌 Lưu vào chuyến đi của tôi'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiItineraryModal;
