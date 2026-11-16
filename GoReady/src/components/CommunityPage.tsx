import React from 'react';
import {
  COMMUNITY_SECTIONS,
  communitySectionHref,
  readCommunitySection,
  type CommunitySectionId,
} from '../config/communityRoute';
import CommunityFeed from './community/CommunityFeed';
import CommunityReviewDetail from './community/CommunityReviewDetail';
import CommunityComposer from './community/CommunityComposer';
import CommunityProfile from './community/CommunityProfile';

const SECTION_VIEWS: Record<CommunitySectionId, React.ReactNode> = {
  feed: <CommunityFeed />,
  review: <CommunityReviewDetail />,
  'soan-bai': <CommunityComposer />,
  'ho-so': <CommunityProfile />,
};

export const CommunityPage: React.FC = () => {
  const [active, setActive] = React.useState<CommunitySectionId>(() => readCommunitySection(window.location.hash));

  React.useEffect(() => {
    const sync = () => setActive(readCommunitySection(window.location.hash));
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  return (
    <main className="container-px mx-auto py-6 sm:py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Thanh mục bên trái (trên điện thoại: thanh cuộn ngang phía trên) */}
        <aside className="lg:w-64 lg:shrink-0">
          <nav
            aria-label="Các mục Cộng đồng"
            className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-24 lg:flex-col lg:gap-1 lg:overflow-visible lg:rounded-2xl lg:border lg:border-slate-100 lg:bg-white lg:p-3 lg:shadow-soft"
          >
            <div className="hidden px-3 pb-2 pt-1 font-heading text-xs font-bold uppercase tracking-wide text-slate-400 lg:block">
              Cộng đồng
            </div>
            {COMMUNITY_SECTIONS.map((s) => {
              const isActive = s.id === active;
              return (
                <a
                  key={s.id}
                  href={communitySectionHref(s.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-primary text-white shadow-soft'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary lg:border-transparent'
                  }`}
                >
                  <span aria-hidden="true">{s.icon}</span>
                  <span>{s.label}</span>
                </a>
              );
            })}
          </nav>
        </aside>

        {/* Nội dung mục đang chọn */}
        <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-white p-5 shadow-soft sm:p-8">
          {SECTION_VIEWS[active]}
        </div>
      </div>
    </main>
  );
};

export default CommunityPage;
