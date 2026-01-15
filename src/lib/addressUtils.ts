/**
 * 住所文字列から市区町村を抽出する
 * 例: "東京都新宿区西新宿1-2-3" → "新宿区"
 * 例: "神奈川県横浜市中区山下町" → "横浜市中区"
 * 例: "千葉県船橋市本町1-1-1" → "船橋市"
 */
export const extractCityDistrict = (address: string): string | null => {
  if (!address) return null;

  // 政令指定都市のパターン（横浜市中区、大阪市北区など）
  const seireichMatch = address.match(/([^\s都道府県]+市[^\s]+区)/);
  if (seireichMatch) return seireichMatch[1];

  // 東京23区のパターン
  const kuMatch = address.match(/([^\s都道府県]+区)/);
  if (kuMatch) return kuMatch[1];

  // 一般市のパターン
  const cityMatch = address.match(/([^\s都道府県]+市)/);
  if (cityMatch) return cityMatch[1];

  // 町村のパターン
  const townMatch = address.match(/([^\s都道府県]+(?:町|村))/);
  if (townMatch) return townMatch[1];

  return null;
};
