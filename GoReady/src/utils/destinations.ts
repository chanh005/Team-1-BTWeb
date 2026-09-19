import type { Tour } from '../types';

// Điểm đến trong dữ liệu chưa thống nhất ("Sapa"/"Sa Pa", "Hà Giang"/"Hà Giang Loop", "Đà Nẵng"/"Đà Nẵng - Hội An"),
// nên mọi so khớp và gom nhóm đều dùng dạng chuẩn hoá dưới đây thay vì so chuỗi gốc. Dữ liệu trong DB không bị sửa.

/** "Đà Nẵng - Hội An" → "da nang hoi an": không dấu, chữ thường, các từ cách nhau một khoảng trắng. */
const normalizeWords = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // "đ" không phân rã theo NFD (là chữ cái riêng, không phải "d" + dấu) nên phải map riêng
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** "Sa Pa" → "sapa": như normalizeWords nhưng bỏ luôn khoảng trắng, để "sa pa" khớp "Sapa". */
export const normalizeText = (s: string): string => normalizeWords(s).replace(/ /g, '');

/** Khớp một phần, không phân biệt hoa/thường và dấu, trên điểm đến và quốc gia của tour. Từ khoá rỗng khớp mọi tour. */
export const matchesDestination = (tour: Tour, query: string): boolean => {
  const q = normalizeText(query);
  if (!q) return true;
  return normalizeText(tour.destination).includes(q) || normalizeText(tour.country).includes(q);
};

export interface DestinationGroup {
  /** Tên hiển thị: cách viết có nhiều tour nhất trong nhóm. */
  label: string;
  /** normalizeText(label): dùng để so sánh với ô tìm kiếm. */
  key: string;
  tours: Tour[];
  count: number;
}

/**
 * Gom các tour theo điểm đến, coi các biến thể là một: cùng dạng chuẩn hoá ("Sa Pa" = "Sapa"), hoặc tên này là phần đầu
 * (theo ranh giới từ) của tên kia ("Hà Giang Loop" thuộc "Hà Giang"). Thứ tự nhóm theo lần xuất hiện đầu tiên trong `tours`.
 */
export const groupDestinations = (tours: Tour[]): DestinationGroup[] => {
  interface Variant {
    label: string;
    words: string;
    firstIndex: number;
    tours: Tour[];
  }

  const variants = new Map<string, Variant>();
  tours.forEach((tour, index) => {
    const label = tour.destination.trim();
    const words = normalizeWords(label);
    if (!words) return;
    const variant = variants.get(label) ?? { label, words, firstIndex: index, tours: [] };
    variant.tours.push(tour);
    variants.set(label, variant);
  });

  // Tên ngắn nhất làm gốc của nhóm; các biến thể dài hơn được nhập vào nhóm có gốc là phần đầu của chúng
  interface Group {
    rootWords: string;
    variants: Variant[];
  }
  const groups: Group[] = [];
  for (const variant of [...variants.values()].sort((a, b) => a.words.length - b.words.length || a.firstIndex - b.firstIndex)) {
    const group = groups.find(
      (g) => g.rootWords.replace(/ /g, '') === variant.words.replace(/ /g, '') || variant.words.startsWith(`${g.rootWords} `),
    );
    if (group) group.variants.push(variant);
    else groups.push({ rootWords: variant.words, variants: [variant] });
  }

  return groups
    .map((g) => {
      const label = [...g.variants].sort((a, b) => b.tours.length - a.tours.length || a.firstIndex - b.firstIndex)[0].label;
      const groupTours = g.variants.flatMap((v) => v.tours);
      return { label, key: normalizeText(label), tours: groupTours, count: groupTours.length, firstIndex: Math.min(...g.variants.map((v) => v.firstIndex)) };
    })
    .sort((a, b) => a.firstIndex - b.firstIndex)
    .map(({ firstIndex: _firstIndex, ...group }): DestinationGroup => group);
};
