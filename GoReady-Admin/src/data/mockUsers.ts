export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string; // ISO date
  totalBookings: number;
  status: 'active' | 'locked';
}

export const MOCK_USERS: AdminUser[] = [
  { id: 'usr-01', name: 'Nguyễn Minh Anh', email: 'minhanh.nguyen@gmail.com', phone: '0901234567', joinedAt: '2025-11-02', totalBookings: 3, status: 'active' },
  { id: 'usr-02', name: 'Trần Gia Bảo', email: 'giabao.tran@gmail.com', phone: '0912345678', joinedAt: '2025-12-14', totalBookings: 1, status: 'active' },
  { id: 'usr-03', name: 'Lê Thị Cẩm', email: 'camle@gmail.com', phone: '0923456789', joinedAt: '2026-01-08', totalBookings: 0, status: 'active' },
  { id: 'usr-04', name: 'Phạm Đức Duy', email: 'ducduy.pham@gmail.com', phone: '0934567890', joinedAt: '2026-01-20', totalBookings: 5, status: 'active' },
  { id: 'usr-05', name: 'Hoàng Thu Hà', email: 'thuha.hoang@gmail.com', phone: '0945678901', joinedAt: '2026-02-03', totalBookings: 2, status: 'locked' },
  { id: 'usr-06', name: 'Vũ Anh Khoa', email: 'anhkhoa.vu@gmail.com', phone: '0956789012', joinedAt: '2026-02-19', totalBookings: 1, status: 'active' },
  { id: 'usr-07', name: 'Đặng Ngọc Lan', email: 'ngoclan.dang@gmail.com', phone: '0967890123', joinedAt: '2026-03-11', totalBookings: 4, status: 'active' },
  { id: 'usr-08', name: 'Bùi Quốc Việt', email: 'quocviet.bui@gmail.com', phone: '0978901234', joinedAt: '2026-04-27', totalBookings: 0, status: 'locked' },
];
