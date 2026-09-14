import { MOCK_DIADIEM } from './diaDiem.mock';

// ==========================================================================
// Mock "bảng" Tour — đúng schema đã thống nhất: MaTour, TenTour, Gia, ThoiGian,
// MaDiaDiem (FK), MaLoaiHinh (FK). Dùng cho section "Tour nổi bật".
// ==========================================================================

export interface TourRow {
  MaTour: string;
  TenTour: string;
  Gia: number; // VNĐ
  ThoiGian: number; // số ngày tour (X ngày => X-1 đêm)
  MaDiaDiem: string;
  MaLoaiHinh: string;
}

export const MOCK_TOUR: TourRow[] = [
  { MaTour: 'T001', TenTour: 'Đà Nẵng biển xanh 3N2Đ', Gia: 3590000, ThoiGian: 3, MaDiaDiem: 'DD001', MaLoaiHinh: 'LH01' },
  { MaTour: 'T002', TenTour: 'Vịnh Hạ Long du thuyền 5 sao', Gia: 5490000, ThoiGian: 2, MaDiaDiem: 'DD002', MaLoaiHinh: 'LH02' },
  { MaTour: 'T003', TenTour: 'Hội An phố cổ đèn lồng', Gia: 2890000, ThoiGian: 2, MaDiaDiem: 'DD003', MaLoaiHinh: 'LH03' },
  { MaTour: 'T004', TenTour: 'Phú Quốc nghỉ dưỡng trọn gói', Gia: 7990000, ThoiGian: 4, MaDiaDiem: 'DD004', MaLoaiHinh: 'LH01' },
  { MaTour: 'T005', TenTour: 'Đà Lạt mộng mơ cuối tuần', Gia: 2490000, ThoiGian: 3, MaDiaDiem: 'DD005', MaLoaiHinh: 'LH03' },
  { MaTour: 'T006', TenTour: 'Nha Trang khám phá đại dương', Gia: 4290000, ThoiGian: 4, MaDiaDiem: 'DD006', MaLoaiHinh: 'LH02' },
];

// Kiểu dữ liệu ĐÃ JOIN — đúng props mà TourCard cần (TenTour, Gia, ThoiGian, TenDiaDiem).
export interface FeaturedTour {
  MaTour: string;
  TenTour: string;
  Gia: number;
  ThoiGian: number;
  TenDiaDiem: string;
  ThanhPho: string; // giữ lại để điều hướng "Xem chi tiết" theo thành phố khi chưa có route chi tiết tour
}

const diaDiemByMa = new Map(MOCK_DIADIEM.map((d) => [d.MaDiaDiem, d]));

/**
 * `featuredTours` mô phỏng kết quả JOIN Tour ⨝ DiaDiem qua MaDiaDiem — đúng những gì
 * một API thật (vd. GET /api/tours/noi-bat) sẽ trả về. Khi có backend thật, chỉ cần thay
 * nguồn dữ liệu này (giữ nguyên tên biến `featuredTours` và shape FeaturedTour) —
 * TourCard/TourNoiBat không cần sửa gì.
 */
export const featuredTours: FeaturedTour[] = MOCK_TOUR.map((t) => {
  const diaDiem = diaDiemByMa.get(t.MaDiaDiem);
  return {
    MaTour: t.MaTour,
    TenTour: t.TenTour,
    Gia: t.Gia,
    ThoiGian: t.ThoiGian,
    TenDiaDiem: diaDiem?.TenDiaDiem ?? 'Đang cập nhật',
    ThanhPho: diaDiem?.ThanhPho ?? '',
  };
});
