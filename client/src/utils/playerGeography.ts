import type { TFunction } from 'i18next';

export interface GeographyOption {
  value: string;
  key: string;
}

export const COUNTRY_OPTIONS: GeographyOption[] = [
  { value: '阿根廷', key: 'argentina' },
  { value: '阿塞拜疆', key: 'azerbaijan' },
  { value: '爱沙尼亚', key: 'estonia' },
  { value: '澳大利亚', key: 'australia' },
  { value: '巴西', key: 'brazil' },
  { value: '白俄罗斯', key: 'belarus' },
  { value: '保加利亚', key: 'bulgaria' },
  { value: '北马其顿', key: 'northMacedonia' },
  { value: '比利时', key: 'belgium' },
  { value: '波黑', key: 'bosniaHerzegovina' },
  { value: '波兰', key: 'poland' },
  { value: '丹麦', key: 'denmark' },
  { value: '德国', key: 'germany' },
  { value: '俄罗斯', key: 'russia' },
  { value: '法国', key: 'france' },
  { value: '芬兰', key: 'finland' },
  { value: '哈萨克斯坦', key: 'kazakhstan' },
  { value: '荷兰', key: 'netherlands' },
  { value: '黑山', key: 'montenegro' },
  { value: '加拿大', key: 'canada' },
  { value: '捷克', key: 'czechia' },
  { value: '拉脱维亚', key: 'latvia' },
  { value: '立陶宛', key: 'lithuania' },
  { value: '罗马尼亚', key: 'romania' },
  { value: '马来西亚', key: 'malaysia' },
  { value: '美国', key: 'unitedStates' },
  { value: '蒙古', key: 'mongolia' },
  { value: '南非', key: 'southAfrica' },
  { value: '挪威', key: 'norway' },
  { value: '葡萄牙', key: 'portugal' },
  { value: '瑞典', key: 'sweden' },
  { value: '瑞士', key: 'switzerland' },
  { value: '塞尔维亚', key: 'serbia' },
  { value: '塞尔维亚科索沃', key: 'kosovo' },
  { value: '斯洛伐克', key: 'slovakia' },
  { value: '土耳其', key: 'turkey' },
  { value: '危地马拉', key: 'guatemala' },
  { value: '乌克兰', key: 'ukraine' },
  { value: '乌拉圭', key: 'uruguay' },
  { value: '乌兹别克斯坦', key: 'uzbekistan' },
  { value: '西班牙', key: 'spain' },
  { value: '新西兰', key: 'newZealand' },
  { value: '匈牙利', key: 'hungary' },
  { value: '以色列', key: 'israel' },
  { value: '印度', key: 'india' },
  { value: '印度尼西亚', key: 'indonesia' },
  { value: '英国', key: 'unitedKingdom' },
  { value: '约旦', key: 'jordan' },
  { value: '智利', key: 'chile' },
  { value: '中国', key: 'china' },
];

export const REGION_OPTIONS: GeographyOption[] = [
  { value: '北美洲', key: 'northAmerica' },
  { value: '大洋洲', key: 'oceania' },
  { value: '独联体', key: 'cis' },
  { value: '非洲与以色列', key: 'africaIsrael' },
  { value: '南美洲', key: 'southAmerica' },
  { value: '欧洲', key: 'europe' },
  { value: '亚太', key: 'asiaPacific' },
];

const countryKeys = new Map(COUNTRY_OPTIONS.map((option) => [option.value, option.key]));
const regionKeys = new Map(REGION_OPTIONS.map((option) => [option.value, option.key]));
const canonicalRegions = new Map(REGION_OPTIONS.map((option) => [option.value, option.value]));
regionKeys.set('北美', 'northAmerica');
regionKeys.set('南美', 'southAmerica');
regionKeys.set('亚洲', 'asiaPacific');
canonicalRegions.set('北美', '北美洲');
canonicalRegions.set('南美', '南美洲');
canonicalRegions.set('亚洲', '亚太');

// Keep this small index local so country suggestions do not need another request or dependency.
const PINYIN: Record<string, string> = {
  阿根廷: 'a gen ting', 阿塞拜疆: 'a sai bai jiang', 爱沙尼亚: 'ai sha ni ya', 澳大利亚: 'ao da li ya',
  巴西: 'ba xi', 白俄罗斯: 'bai e luo si', 保加利亚: 'bao jia li ya', 北马其顿: 'bei ma qi dun',
  比利时: 'bi li shi', 波黑: 'bo hei', 波兰: 'bo lan', 丹麦: 'dan mai', 德国: 'de guo', 俄罗斯: 'e luo si',
  法国: 'fa guo', 芬兰: 'fen lan', 哈萨克斯坦: 'ha sa ke si tan', 荷兰: 'he lan', 黑山: 'hei shan',
  加拿大: 'jia na da', 捷克: 'jie ke', 拉脱维亚: 'la tuo wei ya', 立陶宛: 'li tao wan', 罗马尼亚: 'luo ma ni ya',
  马来西亚: 'ma lai xi ya', 美国: 'mei guo', 蒙古: 'meng gu', 南非: 'nan fei', 挪威: 'nuo wei', 葡萄牙: 'pu tao ya',
  瑞典: 'rui dian', 瑞士: 'rui shi', 塞尔维亚: 'sai er wei ya', 塞尔维亚科索沃: 'sai er wei ya ke suo wo',
  斯洛伐克: 'si luo fa ke', 土耳其: 'tu er qi', 危地马拉: 'wei di ma la', 乌克兰: 'wu ke lan', 乌拉圭: 'wu la gui',
  乌兹别克斯坦: 'wu zi bie ke si tan', 西班牙: 'xi ban ya', 新西兰: 'xin xi lan', 匈牙利: 'xiong ya li',
  以色列: 'yi se lie', 印度: 'yin du', 印度尼西亚: 'yin du ni xi ya', 英国: 'ying guo', 约旦: 'yue dan',
  智利: 'zhi li', 中国: 'zhong guo',
  北美洲: 'bei mei zhou', 北美: 'bei mei', 大洋洲: 'da yang zhou', 独联体: 'du lian ti',
  非洲与以色列: 'fei zhou yu yi se lie', 南美洲: 'nan mei zhou', 南美: 'nan mei', 欧洲: 'ou zhou', 亚太: 'ya tai', 亚洲: 'ya zhou',
};

/** Returns Chinese text, pinyin and pinyin initials for local fuzzy matching. */
export function geographySearchText(value: string): string {
  const trimmed = value.trim();
  const pinyin = PINYIN[trimmed];
  if (!pinyin) return trimmed.toLocaleLowerCase();
  const words = pinyin.split(/\s+/);
  return `${trimmed} ${pinyin} ${words.join('')} ${words.map((word) => word[0]).join('')}`.toLocaleLowerCase();
}

export function countryLabel(t: TFunction, value: string): string {
  const key = countryKeys.get(value.trim());
  return key ? String(t(`geography.countries.${key}`)) : value;
}

export function regionLabel(t: TFunction, value: string): string {
  const key = regionKeys.get(value.trim());
  return key ? String(t(`geography.regions.${key}`)) : value;
}

export function isKnownCountry(value: string): boolean {
  return countryKeys.has(value.trim());
}

export function isKnownRegion(value: string): boolean {
  return regionKeys.has(value.trim());
}

export function canonicalRegionValue(value: string): string {
  const trimmed = value.trim();
  return canonicalRegions.get(trimmed) ?? trimmed;
}
