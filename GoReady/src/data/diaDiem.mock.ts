// ==========================================================================
// Mock "bảng" DiaDiem — đúng schema đã thống nhất: MaDiaDiem, TenDiaDiem, ThanhPho.
// Dùng cho section "Điểm đến nổi bật" và làm bảng tra cứu khi join với Tour.
// ==========================================================================

export interface DiaDiem {
  MaDiaDiem: string;
  TenDiaDiem: string;
  ThanhPho: string;
}

export const MOCK_DIADIEM: DiaDiem[] = [
  { MaDiaDiem: 'DD001', TenDiaDiem: 'Bãi biển Mỹ Khê', ThanhPho: 'Đà Nẵng' },
  { MaDiaDiem: 'DD002', TenDiaDiem: 'Vịnh Hạ Long', ThanhPho: 'Hạ Long' },
  { MaDiaDiem: 'DD003', TenDiaDiem: 'Phố cổ Hội An', ThanhPho: 'Hội An' },
  { MaDiaDiem: 'DD004', TenDiaDiem: 'Đảo Ngọc Phú Quốc', ThanhPho: 'Phú Quốc' },
  { MaDiaDiem: 'DD005', TenDiaDiem: 'Đồi chè Cầu Đất', ThanhPho: 'Đà Lạt' },
  { MaDiaDiem: 'DD006', TenDiaDiem: 'Vịnh Nha Trang', ThanhPho: 'Nha Trang' },
];
