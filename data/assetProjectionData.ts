
// data/assetProjectionData.ts

export type AgeGroup = '20s' | '30s' | '40s' | '50s' | '60plus';
export type InvestmentAmountKey = 'less_10k' | '10k_30k' | '30k_50k' | '50k_100k' | 'more_100k';

export const assetProjectionData: Record<AgeGroup, Record<InvestmentAmountKey, number>> = {
  '20s': { // 20代 🌱
    'less_10k': 86.5,    // 1万円未満
    '10k_30k': 346.2,   // 1～3万円
    '30k_50k': 692.3,   // 3～5万円
    '50k_100k': 1298.1,  // 5～10万円
    'more_100k': 2077.0  // 10万円以上
  },
  '30s': { // 30代 🌿
    'less_10k': 81.9,
    '10k_30k': 327.8,
    '30k_50k': 655.5,
    '50k_100k': 1229.1,
    'more_100k': 1966.6
  },
  '40s': { // 40代 🌳
    'less_10k': 77.6,
    '10k_30k': 310.6,
    '30k_50k': 621.1,
    '50k_100k': 1164.6,
    'more_100k': 1863.4
  },
  '50s': { // 50代 🏔️
    'less_10k': 73.6,
    '10k_30k': 294.5,
    '30k_50k': 589.0,
    '50k_100k': 1104.4,
    'more_100k': 1767.0
  },
  '60plus': { // 60代以上 🌅
    'less_10k': 69.9,
    '10k_30k': 279.5,
    '30k_50k': 559.0,
    '50k_100k': 1048.1,
    'more_100k': 1676.9
  }
};