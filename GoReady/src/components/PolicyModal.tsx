import React from 'react';

export type PolicyTopic = 'booking-guide' | 'payment-refund' | 'terms' | 'privacy' | 'cancellation';

interface PolicyModalProps {
  topic: PolicyTopic;
  onClose: () => void;
}

interface Section {
  heading?: string;
  body?: string;
  list?: string[];
}

interface PolicyContent {
  icon: string;
  title: string;
  updatedAt: string;
  sections: Section[];
}

const CONTENT: Record<PolicyTopic, PolicyContent> = {
  'booking-guide': {
    icon: '📖',
    title: 'Hướng dẫn đặt tour',
    updatedAt: 'Cập nhật lần cuối: 01/2026',
    sections: [
      {
        body:
          'Đặt tour trên GoReady chỉ mất vài phút. Làm theo 6 bước dưới đây để hoàn tất một đơn đặt tour, từ lúc chọn điểm đến cho tới khi nhận được xác nhận.',
      },
      {
        heading: '1. Tìm và chọn tour phù hợp',
        body:
          'Dùng thanh tìm kiếm hoặc bộ lọc (điểm đến, ngân sách, thời gian, phong cách du lịch) để tìm tour ưng ý. Bạn có thể xem trước lịch trình, hình ảnh, đánh giá của khách đã đi và giá theo từng ngày khởi hành.',
      },
      {
        heading: '2. Chọn ngày khởi hành và số lượng khách',
        body:
          'Trong trang chi tiết tour, chọn ngày khởi hành còn chỗ và nhập số lượng người lớn, trẻ em, em bé. Giá tour sẽ tự động cập nhật theo lựa chọn của bạn.',
      },
      {
        heading: '3. Điền thông tin liên hệ',
        body:
          'Nhập họ tên, số điện thoại, email của người đại diện đặt tour — đây là thông tin GoReady dùng để liên hệ xác nhận và gửi các cập nhật về chuyến đi.',
      },
      {
        heading: '4. Chọn dịch vụ thêm (nếu có)',
        body:
          'Bạn có thể chọn thêm phòng đơn, bảo hiểm du lịch, hoặc các dịch vụ nâng cấp khác ngay trong bước đặt tour.',
      },
      {
        heading: '5. Thanh toán',
        body:
          'Chọn phương thức thanh toán phù hợp (xem chi tiết tại mục "Thanh toán & Hoàn tiền") và hoàn tất đặt cọc hoặc thanh toán toàn bộ. Đơn chỉ được giữ chỗ sau khi thanh toán thành công.',
      },
      {
        heading: '6. Nhận xác nhận',
        body:
          'Sau khi thanh toán, bạn nhận được email và SMS xác nhận kèm mã đơn (booking code). Bạn có thể theo dõi trạng thái đơn trong mục "Chuyến đi của tôi" tại trang tài khoản.',
      },
      {
        heading: 'Lưu ý trước ngày khởi hành',
        list: [
          'Chuẩn bị đầy đủ giấy tờ tùy thân (CCCD/hộ chiếu còn hạn theo yêu cầu của từng tour).',
          'Có mặt tại điểm tập trung trước giờ khởi hành ít nhất 30 phút.',
          'Hướng dẫn viên sẽ liên hệ với bạn trước 1–2 ngày để thông báo chi tiết lịch trình.',
        ],
      },
    ],
  },
  'payment-refund': {
    icon: '💳',
    title: 'Thanh toán & Hoàn tiền',
    updatedAt: 'Cập nhật lần cuối: 01/2026',
    sections: [
      {
        heading: 'Phương thức thanh toán',
        list: [
          'Ví điện tử / cổng thanh toán VNPAY (ATM nội địa, QR Code, Internet Banking).',
          'Thẻ quốc tế Visa, Mastercard, JCB.',
          'Chuyển khoản trực tiếp vào tài khoản công ty GoReady.',
          'Thanh toán tại văn phòng/đại lý GoReady gần nhất.',
        ],
      },
      {
        heading: 'Lịch thanh toán',
        list: [
          'Đặt cọc 30–50% giá trị tour để giữ chỗ ngay khi đặt.',
          'Thanh toán đủ 100% chậm nhất 7–15 ngày trước ngày khởi hành (tùy loại tour, thể hiện rõ trong trang chi tiết tour).',
          'Với tour khởi hành trong vòng 7 ngày, yêu cầu thanh toán đủ 100% ngay khi đặt.',
        ],
      },
      {
        heading: 'An toàn thanh toán',
        body:
          'Toàn bộ giao dịch được xử lý qua cổng thanh toán đạt chuẩn bảo mật PCI-DSS. GoReady không lưu trữ số thẻ hay thông tin nhạy cảm của bạn trên hệ thống.',
      },
      {
        heading: 'Quy trình hoàn tiền',
        list: [
          'Yêu cầu hoàn tiền được xử lý trong vòng 7–14 ngày làm việc kể từ khi GoReady xác nhận hủy tour hợp lệ.',
          'Tiền được hoàn về đúng phương thức/tài khoản đã dùng để thanh toán.',
          'Mức hoàn tiền theo thời điểm hủy được quy định chi tiết tại mục "Chính sách hoàn hủy".',
          'Trường hợp GoReady hủy tour do lỗi từ nhà cung cấp dịch vụ, khách hàng được hoàn 100% hoặc chuyển sang tour khác cùng giá trị.',
        ],
      },
    ],
  },
  terms: {
    icon: '📄',
    title: 'Điều khoản sử dụng',
    updatedAt: 'Cập nhật lần cuối: 01/2026',
    sections: [
      {
        body:
          'Khi truy cập và sử dụng website GoReady, bạn đồng ý tuân thủ các điều khoản dưới đây. Vui lòng đọc kỹ trước khi đặt tour.',
      },
      {
        heading: '1. Phạm vi dịch vụ',
        body:
          'GoReady là nền tảng trung gian kết nối khách hàng với các tour du lịch trong nước và quốc tế do GoReady và các đối tác lữ hành cung cấp. Thông tin tour (giá, lịch trình, hình ảnh) có thể được điều chỉnh mà không báo trước tùy tình hình thực tế.',
      },
      {
        heading: '2. Tài khoản người dùng',
        list: [
          'Bạn chịu trách nhiệm cung cấp thông tin chính xác khi đăng ký và cập nhật khi có thay đổi.',
          'Bạn chịu trách nhiệm bảo mật mật khẩu và mọi hoạt động phát sinh từ tài khoản của mình.',
          'GoReady có quyền tạm khóa tài khoản vi phạm điều khoản sử dụng hoặc có dấu hiệu gian lận.',
        ],
      },
      {
        heading: '3. Đặt tour và thanh toán',
        body:
          'Đơn đặt tour chỉ có hiệu lực sau khi GoReady xác nhận đã nhận đủ tiền đặt cọc hoặc thanh toán theo quy định. Giá tour đã bao gồm/không bao gồm các khoản mục được nêu rõ trong phần "Bao gồm/Không bao gồm" của từng tour.',
      },
      {
        heading: '4. Quyền và trách nhiệm của khách hàng',
        list: [
          'Cung cấp giấy tờ tùy thân hợp lệ và tuân thủ lịch trình chung của đoàn.',
          'Tự chịu trách nhiệm về sức khỏe, vật dụng cá nhân trong suốt chuyến đi.',
          'Thông báo cho GoReady các yêu cầu đặc biệt (ăn kiêng, sức khỏe...) trước khi khởi hành.',
        ],
      },
      {
        heading: '5. Giới hạn trách nhiệm',
        body:
          'GoReady không chịu trách nhiệm với các sự cố bất khả kháng (thiên tai, dịch bệnh, đình công, thay đổi chính sách nhà nước...). Trong các trường hợp này, GoReady sẽ hỗ trợ khách hàng tìm phương án thay thế hoặc hoàn tiền theo quy định hiện hành.',
      },
      {
        heading: '6. Sở hữu trí tuệ',
        body:
          'Toàn bộ nội dung, hình ảnh, logo trên website thuộc quyền sở hữu của GoReady hoặc đối tác cung cấp. Nghiêm cấm sao chép, sử dụng cho mục đích thương mại khi chưa được cho phép.',
      },
      {
        heading: '7. Thay đổi điều khoản',
        body:
          'GoReady có thể cập nhật điều khoản sử dụng theo thời gian. Phiên bản mới nhất luôn được đăng tải tại trang này và có hiệu lực kể từ ngày công bố.',
      },
    ],
  },
  privacy: {
    icon: '🔒',
    title: 'Chính sách bảo mật',
    updatedAt: 'Cập nhật lần cuối: 01/2026',
    sections: [
      {
        body:
          'GoReady cam kết bảo vệ thông tin cá nhân của khách hàng. Chính sách này giải thích chúng tôi thu thập, sử dụng và bảo vệ dữ liệu của bạn như thế nào.',
      },
      {
        heading: 'Thông tin được thu thập',
        list: [
          'Thông tin định danh: họ tên, ngày sinh, số điện thoại, email, địa chỉ.',
          'Thông tin đặt tour: lịch sử đặt tour, phương thức thanh toán (không bao gồm số thẻ đầy đủ), yêu cầu đặc biệt.',
          'Thông tin kỹ thuật: địa chỉ IP, loại thiết bị, dữ liệu cookie khi truy cập website.',
        ],
      },
      {
        heading: 'Mục đích sử dụng',
        list: [
          'Xử lý đơn đặt tour, xác nhận và hỗ trợ khách hàng.',
          'Gửi thông báo liên quan tới chuyến đi (lịch trình, thay đổi, nhắc nhở).',
          'Cải thiện chất lượng dịch vụ và trải nghiệm sử dụng website.',
          'Gửi thông tin ưu đãi, khuyến mãi nếu bạn đồng ý nhận thông báo.',
        ],
      },
      {
        heading: 'Chia sẻ thông tin với bên thứ ba',
        body:
          'GoReady chỉ chia sẻ dữ liệu cần thiết với đối tác trực tiếp phục vụ chuyến đi của bạn (khách sạn, hãng vận chuyển, cổng thanh toán) và không bán dữ liệu cá nhân cho bên thứ ba vì mục đích quảng cáo.',
      },
      {
        heading: 'Bảo vệ dữ liệu',
        body:
          'Dữ liệu được mã hóa khi truyền tải và lưu trữ trên hệ thống có kiểm soát truy cập. Mật khẩu tài khoản được mã hóa một chiều, GoReady không thể xem lại mật khẩu gốc của bạn.',
      },
      {
        heading: 'Quyền của bạn',
        list: [
          'Yêu cầu truy cập, chỉnh sửa hoặc xóa thông tin cá nhân đã cung cấp.',
          'Rút lại sự đồng ý nhận thông báo tiếp thị bất kỳ lúc nào.',
          'Liên hệ chanhanh485@gmail.com để thực hiện các quyền trên.',
        ],
      },
      {
        heading: 'Cookie',
        body:
          'Website sử dụng cookie để ghi nhớ đăng nhập, cá nhân hóa nội dung và phân tích lưu lượng truy cập. Bạn có thể tắt cookie trong cài đặt trình duyệt, tuy nhiên một số tính năng có thể hoạt động không đầy đủ.',
      },
    ],
  },
  cancellation: {
    icon: '🔄',
    title: 'Chính sách hoàn hủy',
    updatedAt: 'Cập nhật lần cuối: 01/2026',
    sections: [
      {
        body:
          'Mức phí hủy tour và tỷ lệ hoàn tiền phụ thuộc vào thời điểm bạn yêu cầu hủy so với ngày khởi hành. Thời gian được tính theo ngày làm việc trước ngày khởi hành.',
      },
      {
        heading: 'Mức hoàn tiền theo thời điểm hủy',
        list: [
          'Trước 30 ngày: hoàn 90% giá trị tour (giữ lại 10% phí xử lý).',
          'Từ 15–29 ngày: hoàn 50% giá trị tour.',
          'Từ 7–14 ngày: hoàn 30% giá trị tour.',
          'Dưới 7 ngày hoặc không tham gia (no-show): không hoàn tiền.',
        ],
      },
      {
        heading: 'Trường hợp đặc biệt',
        list: [
          'Nếu GoReady hoặc đối tác cung cấp dịch vụ hủy tour, khách hàng được hoàn 100% hoặc đổi sang tour/ngày khởi hành khác cùng giá trị.',
          'Trường hợp bất khả kháng (thiên tai, dịch bệnh, sự cố an ninh...), GoReady sẽ hỗ trợ dời lịch hoặc hoàn tiền theo chính sách của từng đối tác cụ thể (hãng bay, khách sạn), có thể khác mức hoàn tiêu chuẩn ở trên.',
        ],
      },
      {
        heading: 'Cách yêu cầu hủy tour',
        list: [
          'Gửi yêu cầu qua hotline 0774 353 428 hoặc email chanhanh485@gmail.com, kèm mã đơn đặt tour.',
          'Hoặc liên hệ trực tiếp trong mục "Chuyến đi của tôi" tại trang tài khoản.',
          'GoReady xác nhận yêu cầu hủy trong vòng 24 giờ làm việc và xử lý hoàn tiền trong 7–14 ngày làm việc.',
        ],
      },
      {
        heading: 'Đổi ngày khởi hành',
        body:
          'Bạn có thể yêu cầu đổi sang ngày khởi hành khác của cùng tour nếu còn chỗ trống, chậm nhất 7 ngày trước ngày khởi hành ban đầu. Phụ phí (nếu có) áp dụng khi tour mới có giá cao hơn tour đã đặt.',
      },
    ],
  },
};

const PolicyModal: React.FC<PolicyModalProps> = ({ topic, onClose }) => {
  const content = CONTENT[topic];

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="relative flex h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-slideUp sm:h-[85vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-2xl">{content.icon}</span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-800">{content.title}</h2>
            <p className="text-xs text-slate-400">{content.updatedAt}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg text-slate-500 hover:bg-slate-100 hover:text-primary"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {content.sections.map((s, i) => (
            <div key={i}>
              {s.heading && <h3 className="mb-2 font-bold text-slate-800">{s.heading}</h3>}
              {s.body && <p className="text-sm leading-relaxed text-slate-600">{s.body}</p>}
              {s.list && (
                <ul className="mt-1 space-y-1.5">
                  {s.list.map((item, j) => (
                    <li key={j} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 p-4 text-center text-xs text-slate-400">
          Cần hỗ trợ thêm? Liên hệ hotline <span className="font-semibold text-primary">0774 353 428</span> hoặc{' '}
          <span className="font-semibold text-primary">chanhanh485@gmail.com</span>
        </div>
      </div>
    </div>
  );
};

export default PolicyModal;
