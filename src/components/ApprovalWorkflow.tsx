// バルク操作、承認ダッシュボード、自動承認ルール等
interface ApprovalRule {
  id: string;
  name: string;
  conditions: {
    emailDomain?: string[];
    organization?: string[];
    autoApprove: boolean;
  };
  reviewers: string[];
}

// 自動承認ルールの例
const autoApprovalRules: ApprovalRule[] = [
  {
    id: 'trusted-domains',
    name: '信頼ドメイン自動承認',
    conditions: {
      emailDomain: ['company.co.jp', 'partner.com'],
      autoApprove: true
    },
    reviewers: []
  }
]; 