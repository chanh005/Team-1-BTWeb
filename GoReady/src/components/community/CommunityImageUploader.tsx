import React from 'react';
import { COMMUNITY_CONFIG } from '../../config/community';
import { api } from '../../api';

export interface UploadedMediaItem {
  id: string;
  url: string;
  alt: string;
  isCover?: boolean;
}

interface CommunityImageUploaderProps {
  media: UploadedMediaItem[];
  onChange: (media: UploadedMediaItem[]) => void;
  coverImage?: string;
  onCoverChange: (url: string) => void;
}

// Hàm nén ảnh bằng HTML5 Canvas
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDimension = 1600;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Nén chất lượng 82% dạng jpeg hoặc webp
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Không thể đọc file ảnh'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Lỗi khi đọc file'));
    reader.readAsDataURL(file);
  });
}

export const CommunityImageUploader: React.FC<CommunityImageUploaderProps> = ({
  media,
  onChange,
  coverImage,
  onCoverChange,
}) => {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const maxImages = COMMUNITY_CONFIG.UPLOAD.MAX_IMAGES_PER_POST;

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);

    const availableSlots = maxImages - media.length;
    if (availableSlots <= 0) {
      setError(`Bạn chỉ được tải lên tối đa ${maxImages} hình ảnh cho bài viết`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, availableSlots);

    // Validate định dạng và dung lượng
    for (const f of filesToUpload) {
      if (!COMMUNITY_CONFIG.UPLOAD.ALLOWED_MIME_TYPES.includes(f.type)) {
        setError(`Định dạng "${f.name}" không hợp lệ. Chỉ chấp nhận JPG, PNG, WebP, GIF.`);
        return;
      }
      if (f.size > COMMUNITY_CONFIG.UPLOAD.MAX_IMAGE_SIZE_BYTES) {
        setError(`Ảnh "${f.name}" vượt quá giới hạn ${COMMUNITY_CONFIG.UPLOAD.MAX_IMAGE_SIZE_MB}MB.`);
        return;
      }
    }

    setUploading(true);

    try {
      const newItems: UploadedMediaItem[] = [];

      for (const file of filesToUpload) {
        // Nén ảnh trên client trước khi upload
        const dataUrl = await compressImage(file);

        // Upload qua endpoint có sẵn của GoReady
        const res = await api.uploadImage(dataUrl);
        newItems.push({
          id: res.id,
          url: res.url,
          alt: file.name.replace(/\.[^/.]+$/, ''),
        });
      }

      const updated = [...media, ...newItems];
      onChange(updated);

      // Nếu chưa có ảnh bìa, tự động chọn ảnh đầu tiên
      if (!coverImage && updated.length > 0) {
        onCoverChange(updated[0].url);
      }
    } catch (err: any) {
      setError(err.message || 'Tải ảnh lên thất bại');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const itemToRemove = media[index];
    const nextMedia = media.filter((_, i) => i !== index);
    onChange(nextMedia);

    // Nếu xóa đúng ảnh bìa, chọn ảnh đầu tiên còn lại (nếu có)
    if (coverImage === itemToRemove.url) {
      onCoverChange(nextMedia.length > 0 ? nextMedia[0].url : '');
    }
  };

  const handleAltChange = (index: number, alt: string) => {
    const nextMedia = [...media];
    nextMedia[index] = { ...nextMedia[index], alt };
    onChange(nextMedia);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700">
          Hình ảnh bài viết ({media.length}/{maxImages})
        </label>
        <span className="text-[11px] text-slate-400">
          Tối đa 5 ảnh, dung lượng ≤ {COMMUNITY_CONFIG.UPLOAD.MAX_IMAGE_SIZE_MB}MB/ảnh
        </span>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Grid danh sách ảnh đã upload */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {media.map((item, index) => {
          const isCover = coverImage === item.url;
          return (
            <div
              key={item.id || item.url}
              className={`group relative overflow-hidden rounded-xl border-2 bg-slate-50 transition-all ${
                isCover ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'
              }`}
            >
              <div className="aspect-[4/3] w-full overflow-hidden">
                <img src={item.url} alt={item.alt} className="h-full w-full object-cover" />
              </div>

              {/* Tag Ảnh bìa */}
              {isCover && (
                <div className="absolute left-2 top-2 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                  Ảnh bìa
                </div>
              )}

              {/* Nút xóa & chọn bìa */}
              <div className="absolute inset-0 flex flex-col justify-between bg-black/40 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="grid h-6 w-6 place-items-center rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow"
                    title="Xóa ảnh"
                  >
                    ✕
                  </button>
                </div>

                {!isCover && (
                  <button
                    type="button"
                    onClick={() => onCoverChange(item.url)}
                    className="rounded bg-white/90 py-1 text-[11px] font-bold text-slate-800 backdrop-blur hover:bg-white"
                  >
                    Đặt làm ảnh bìa
                  </button>
                )}
              </div>

              {/* Ô nhập Alt Text */}
              <div className="p-1.5 bg-white border-t border-slate-100">
                <input
                  type="text"
                  value={item.alt}
                  onChange={(e) => handleAltChange(index, e.target.value)}
                  placeholder="Mô tả ảnh (Alt)..."
                  className="w-full rounded border-0 p-1 text-[11px] text-slate-600 focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          );
        })}

        {/* Nút thêm ảnh */}
        {media.length < maxImages && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 text-slate-500 hover:border-primary hover:bg-primary-50/20 hover:text-primary transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="text-center text-xs">
                <svg className="mx-auto h-5 w-5 animate-spin text-primary mb-1" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Đang tải...</span>
              </div>
            ) : (
              <>
                <svg className="h-6 w-6 mb-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-semibold">Thêm ảnh</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFiles}
        className="hidden"
      />
    </div>
  );
};

export default CommunityImageUploader;

