import React from 'react';

interface CommunityEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const TEMPLATE_HTML = `
<h2>1. Lý do tôi chọn chuyến đi này</h2>
<p>Chia sẻ cảm xúc ban đầu hoặc lý do bạn quyết định đặt chân tới đây (nghỉ dưỡng, khám phá, đi cùng gia đình hay nhóm bạn)...</p>

<h2>2. Lịch trình chi tiết & Trải nghiệm thực tế</h2>
<ul>
  <li><strong>Ngày 1:</strong> Khởi hành, di chuyển và nhận phòng. Buổi chiều ghé thăm các điểm check-in nổi bật.</li>
  <li><strong>Ngày 2:</strong> Trải nghiệm trọn vẹn điểm nhấn của tour, thưởng thức ẩm thực địa phương đặc sắc.</li>
  <li><strong>Ngày 3:</strong> Mua sắm quà lưu niệm, chụp ảnh kỷ niệm và chuẩn bị trở về.</li>
</ul>

<h2>3. Chi phí thực tế & Mẹo tiết kiệm</h2>
<p>Tổng chi phí bao gồm vé máy bay, tour, ăn uống và chi tiêu cá nhân. Một số mẹo nhỏ giúp bạn tiết kiệm chi phí nhưng vẫn đảm bảo trải nghiệm tốt nhất...</p>

<h2>4. Những lưu ý quan trọng cần nhớ</h2>
<blockquote>
  Gợi ý về trang phục, thời tiết, giấy tờ tùy thân và những điều nên/không nên làm để chuyến đi trọn vẹn nhất.
</blockquote>
`.trim();

export const CommunityEditor: React.FC<CommunityEditorProps> = ({
  value,
  onChange,
  placeholder = 'Nhập nội dung bài viết chia sẻ kinh nghiệm...',
}) => {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [activeFormat, setActiveFormat] = React.useState<Record<string, boolean>>({});

  // Sync value from props only if content differs significantly
  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      editorRef.current.focus();
    }
  };

  const handleInsertTemplate = () => {
    if (value && value.trim().length > 20) {
      if (!window.confirm('Chèn mẫu gợi ý sẽ thay thế nội dung hiện tại. Bạn có chắc chắn không?')) {
        return;
      }
    }
    onChange(TEMPLATE_HTML);
    if (editorRef.current) {
      editorRef.current.innerHTML = TEMPLATE_HTML;
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
      {/* Toolbar công cụ soạn thảo */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-1">
          {/* H1 */}
          <button
            type="button"
            onClick={() => exec('formatBlock', '<h1>')}
            className="rounded-lg px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-200"
            title="Tiêu đề lớn (H1)"
          >
            H1
          </button>

          {/* H2 */}
          <button
            type="button"
            onClick={() => exec('formatBlock', '<h2>')}
            className="rounded-lg px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-200"
            title="Tiêu đề mục (H2)"
          >
            H2
          </button>

          {/* Đoạn văn thường */}
          <button
            type="button"
            onClick={() => exec('formatBlock', '<p>')}
            className="rounded-lg px-2 py-1.5 font-medium text-slate-600 hover:bg-slate-200"
            title="Đoạn văn (P)"
          >
            P
          </button>

          <div className="mx-1 h-4 w-px bg-slate-200" />

          {/* In đậm */}
          <button
            type="button"
            onClick={() => exec('bold')}
            className="rounded-lg p-1.5 font-bold text-slate-700 hover:bg-slate-200"
            title="In đậm (Ctrl+B)"
          >
            <span className="font-extrabold text-sm px-1">B</span>
          </button>

          {/* In nghiêng */}
          <button
            type="button"
            onClick={() => exec('italic')}
            className="rounded-lg p-1.5 italic text-slate-700 hover:bg-slate-200"
            title="In nghiêng (Ctrl+I)"
          >
            <span className="font-serif italic text-sm px-1.5">I</span>
          </button>

          <div className="mx-1 h-4 w-px bg-slate-200" />

          {/* Danh sách không thứ tự */}
          <button
            type="button"
            onClick={() => exec('insertUnorderedList')}
            className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-200"
            title="Danh sách gạch đầu dòng"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Danh sách có thứ tự */}
          <button
            type="button"
            onClick={() => exec('insertOrderedList')}
            className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-200"
            title="Danh sách số"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </button>

          {/* Trích dẫn */}
          <button
            type="button"
            onClick={() => exec('formatBlock', '<blockquote>')}
            className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-200"
            title="Khối trích dẫn"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>
        </div>

        {/* Nút Chèn mẫu gợi ý */}
        <button
          type="button"
          onClick={handleInsertTemplate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1 font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
          title="Chèn cấu trúc bài viết mẫu đầy đủ"
        >
          <span>💡</span>
          <span>Chèn mẫu gợi ý</span>
        </button>
      </div>

      {/* Vùng soạn thảo Rich-Text ContentEditable */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="prose prose-slate min-h-[280px] max-w-none p-4 text-sm sm:text-base focus:outline-none leading-relaxed prose-headings:font-heading prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-a:text-primary prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic"
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default CommunityEditor;

