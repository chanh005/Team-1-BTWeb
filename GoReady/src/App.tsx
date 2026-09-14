import React from 'react';
import { Route, Routes } from 'react-router-dom';
import TrangChu from './pages/TrangChu';
import PlaceholderPage from './pages/PlaceholderPage';
import { NAV_ITEMS } from './components/layout/navItems';

// Route "/" đã có trang thật (TrangChu); 8 route còn lại trong menu dùng
// PlaceholderPage (vẫn có Header/Footer đầy đủ) cho tới khi từng trang được xây.
const OTHER_ROUTES = NAV_ITEMS.filter((item) => item.path !== '/');

function App() {
  return (
    <Routes>
      <Route path="/" element={<TrangChu />} />
      {OTHER_ROUTES.map((item) => (
        <Route key={item.path} path={item.path} element={<PlaceholderPage title={item.label} />} />
      ))}
      <Route path="*" element={<PlaceholderPage title="Không tìm thấy trang" />} />
    </Routes>
  );
}

export default App;
