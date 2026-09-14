import type { ChecklistItem } from '../types';

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  // Giấy tờ tùy thân
  { id: 'doc-1', category: 'Giấy tờ tùy thân', label: 'CCCD / Hộ chiếu (còn hạn 6 tháng)', checked: false },
  { id: 'doc-2', category: 'Giấy tờ tùy thân', label: 'Vé máy bay / Booking khách sạn', checked: false },
  { id: 'doc-3', category: 'Giấy tờ tùy thân', label: 'Bảo hiểm du lịch', checked: false },
  { id: 'doc-4', category: 'Giấy tờ tùy thân', label: 'Giấy phép lái xe (nếu cần)', checked: false },
  // Quần áo & Giày dép
  { id: 'cloth-1', category: 'Quần áo & Giày dép', label: 'Trang phục phù hợp thời tiết', checked: false },
  { id: 'cloth-2', category: 'Quần áo & Giày dép', label: 'Giày thể thao / dép đi biển', checked: false },
  { id: 'cloth-3', category: 'Quần áo & Giày dép', label: 'Áo khoác nhẹ / áo mưa', checked: false },
  { id: 'cloth-4', category: 'Quần áo & Giày dép', label: 'Đồ bơi', checked: false },
  { id: 'cloth-5', category: 'Quần áo & Giày dép', label: 'Mũ, nón, kính râm', checked: false },
  // Thuốc men & Y tế
  { id: 'med-1', category: 'Thuốc men & Y tế', label: 'Thuốc cá nhân (nếu có bệnh nền)', checked: false },
  { id: 'med-2', category: 'Thuốc men & Y tế', label: 'Thuốc say xe / say sóng', checked: false },
  { id: 'med-3', category: 'Thuốc men & Y tế', label: 'Kem chống nắng, thuốc chống côn trùng', checked: false },
  { id: 'med-4', category: 'Thuốc men & Y tế', label: 'Băng cá nhân, thuốc giảm đau cơ bản', checked: false },
  // Thiết bị điện tử & Tiền tệ
  { id: 'tech-1', category: 'Thiết bị điện tử & Tiền tệ', label: 'Điện thoại & sạc dự phòng', checked: false },
  { id: 'tech-2', category: 'Thiết bị điện tử & Tiền tệ', label: 'Máy ảnh / Flycam (nếu có)', checked: false },
  { id: 'tech-3', category: 'Thiết bị điện tử & Tiền tệ', label: 'Tiền mặt & thẻ ngân hàng', checked: false },
  { id: 'tech-4', category: 'Thiết bị điện tử & Tiền tệ', label: 'Ổ cắm chuyển đổi (đi nước ngoài)', checked: false },
];
