
// data/diagnosisFormMapping.ts

// This file provides mappings from diagnosis form answer codes to human-readable labels.
// It helps in displaying user-friendly text in places like the Admin Dashboard.

export const diagnosisFormMapping = {
  age: {
    '20s': '20代 🌱',
    '30s': '30代 🌿',
    '40s': '40代 🌳',
    '50s': '50代 🏔️',
    '60plus': '60代以上 🌅',
  },
  experience: {
    'beginner': '全くの初心者です 🔰',
    'studied': '少し勉強したことがある 📚',
    'experienced': 'ある程度経験あり 💪',
  },
  purpose: {
    'education': '子どもの教育費のため 👶',
    'home': 'マイホーム購入のため 🏡',
    'retirement': '老後の生活のため 🌅',
    'increase_assets': '資産を増やしたい 💰',
  },
  amount: {
    'less_10k': '1万円未満 💳',
    '10k_30k': '1万円〜3万円 💵',
    '30k_50k': '3万円〜5万円 💶',
    '50k_100k': '5万円〜10万円 💷',
    'more_100k': '10万円以上 💴',
  },
  timing: {
    'now': '今すぐ始めたい！ 🚀',
    'month': '1ヶ月以内に 📅',
    'later': 'もう少し考えてから 🤔',
  },
  // phoneNumber doesn't need a mapping as it's a direct value.
};