import React from 'react';
import { Card, outlineBtn } from './ui';

/** Trang cho mục chưa làm: không để trống. */
const ComingSoon: React.FC<{ title: string; note?: string }> = ({ title, note }) => (
  <div>
    <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
    <Card className="mt-6 max-w-xl">
      <p className="text-lg font-bold text-slate-900">Sắp có</p>
      <p className="mt-1 text-sm text-slate-500">{note ?? 'Tính năng này đang được phát triển và sẽ sớm có mặt trong Seller Center.'}</p>
      <a href="#/tour-cua-toi" className={`${outlineBtn} mt-4 inline-block`}>Về Tour của tôi</a>
    </Card>
  </div>
);

export default ComingSoon;
