// Data of "Chuyến đi của tôi", as returned by GET /api/chuyen-di (see lib/chuyenDi.js).
// DonDatTour is the existing `Booking`; a ChuyenDi exists only for an order whose payment succeeded (1-1 via maDon).

export interface DiaDiem {
  maDiaDiem: string;
  tenDiaDiem: string;
  loaiDiaDiem: string | null; // airport | hotel | attraction | restaurant | stop
  diaChi: string | null;
  viDo: number | null;
  kinhDo: number | null;
}

export interface LichTrinhChuyenDi {
  maLichTrinh: string;
  ngayThu: number;
  ngay: string; // YYYY-MM-DD
  gio: string | null; // HH:mm
  tieuDe: string;
  moTa: string | null;
  diaDiem: DiaDiem | null;
}

export interface Ve {
  maVe: string;
  loaiVe: string; // Người lớn | Trẻ em | Em bé | Dịch vụ thêm
  tenVe: string;
  maDatVe: string;
  maQR: string;
  giaVe: number | null;
  trangThai: 'hop_le' | 'da_huy';
}

export interface KhachSan {
  maKhachSan: string;
  tenKhachSan: string;
  diaChi: string | null;
  hangSao: number | null;
  viDo: number | null;
  kinhDo: number | null;
}

export interface DonDatTourTomTat {
  maDon: string;
  bookingCode: string;
  tourId: string;
  trangThai: string; // booking status
  tongTien: number;
  phuongThucThanhToan: string;
  soNguoiLon: number;
  soTreEm: number;
  soEmBe: number;
  ngayDat: string;
  tenLienHe: string;
  sdtLienHe: string;
  ghiChu: string | null;
}

export interface ChuyenDi {
  maChuyenDi: string;
  maDon: string;
  tenChuyenDi: string;
  diemDen: string | null;
  anhBia: string | null;
  ngayKhoiHanh: string; // YYYY-MM-DD
  gioKhoiHanh: string | null; // HH:mm
  ngayKetThuc: string; // YYYY-MM-DD
  soNgay: number;
  soDem: number;
  phuongTien: string | null;
  diemDon: string | null;
  gioDon: string | null;
  tenHDV: string | null;
  sdtHDV: string | null;
  ngayNhanPhong: string | null;
  ngayTraPhong: string | null;
  ngayTao: string;
  don: DonDatTourTomTat;
  khachSan: KhachSan | null;
  lichTrinh: LichTrinhChuyenDi[];
  ve: Ve[];
}
