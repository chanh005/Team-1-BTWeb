// Đọc / ghi phiên đăng nhập trong localStorage, dùng để điều hướng giữa trang người dùng (/) và trang quản trị (/admin/).
// Tên khóa và cách lưu (JSON) trùng với useLocalStorage trong App.tsx và admin/App.tsx.

const ADMIN_EMAIL_KEY = 'goready_admin_email';
const ADMIN_TOKEN_KEY = 'goready_admin_token';
const USER_EMAIL_KEY = 'goready_current_user_email';
const USER_ROLE_KEY = 'goready_current_user_role';

const read = (key: string): string => {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? '""');
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
};

const remove = (...keys: string[]) => {
  try {
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // trình duyệt chặn localStorage: bỏ qua
  }
};

/** Đang đăng nhập trang quản trị (có cả email lẫn token). */
export const hasAdminSession = (): boolean => Boolean(read(ADMIN_EMAIL_KEY) && read(ADMIN_TOKEN_KEY));

/** Trang người dùng còn ghi nhận đăng nhập bằng tài khoản admin (phiên tạo trước khi có chuyển hướng này). */
export const hasUserSiteAdminLogin = (): boolean => Boolean(read(USER_EMAIL_KEY)) && read(USER_ROLE_KEY) === 'admin';

/** Đang đăng nhập trang người dùng bằng tài khoản không phải admin (khách hoặc người bán). */
export const hasNonAdminUserLogin = (): boolean => Boolean(read(USER_EMAIL_KEY)) && read(USER_ROLE_KEY) !== 'admin';

/** Xóa dấu đăng nhập admin bên trang người dùng; không đụng tới phiên của khách. */
export const clearUserSiteAdminLogin = (): void => {
  if (read(USER_ROLE_KEY) === 'admin') remove(USER_EMAIL_KEY, USER_ROLE_KEY);
};

/** Tạo phiên trang quản trị khi admin đăng nhập từ trang người dùng (khỏi phải đăng nhập lần hai). */
export const saveAdminSession = (email: string, token: string): void => {
  window.localStorage.setItem(ADMIN_TOKEN_KEY, JSON.stringify(token));
  window.localStorage.setItem(ADMIN_EMAIL_KEY, JSON.stringify(email));
};
