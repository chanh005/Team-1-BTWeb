import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { hasAdminSession, hasNonAdminUserLogin } from '../session';
import '../index.css';

// Tài khoản không phải admin đang đăng nhập ở trang người dùng thì không vào được /admin/.
// Người chưa đăng nhập vẫn thấy form đăng nhập quản trị.
if (!hasAdminSession() && hasNonAdminUserLogin()) {
  window.location.replace('/');
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
