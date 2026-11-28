import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { clearUserSiteAdminLogin, hasAdminSession, hasUserSiteAdminLogin } from './session';
import './index.css';

// Admin không dùng trang người dùng: đang đăng nhập admin thì chuyển thẳng sang /admin/ trước khi dựng giao diện
if (hasAdminSession() || hasUserSiteAdminLogin()) {
  // Chỉ còn dấu đăng nhập cũ mà không có phiên quản trị: xóa đi để không bị kẹt, trang /admin/ sẽ yêu cầu đăng nhập
  if (!hasAdminSession()) clearUserSiteAdminLogin();
  window.location.replace('/admin/');
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
