/**
 * ブラウザ拡張機能検出とリスク評価
 */

/**
 * ブラウザ拡張機能の検出用スクリプト（クライアント側で実行）
 */
export const browserExtensionDetectionScript = `
(function() {
  const detectedExtensions = [];
  const startTime = performance.now();
  
  // 既知の拡張機能のリソースチェック
  const extensionChecks = [
    // 広告ブロッカー
    { name: 'AdBlock', resource: 'chrome-extension://gighmmpiobklfepjocnamgkkbiglidom/icons/icon-128.png' },
    { name: 'uBlock Origin', resource: 'chrome-extension://cjpalhdlnbpafiamejdnhcphjbkeiagm/icons/icon-128.png' },
    // パスワードマネージャー
    { name: '1Password', resource: 'chrome-extension://aeblfdkhhhdcdjpifhhbdiojplfjncoa/images/icon-128.png' },
    { name: 'LastPass', resource: 'chrome-extension://hdokiejnpimakedhajhdlcegeplioahd/images/icon-128.png' },
    // 開発者ツール
    { name: 'React DevTools', resource: 'chrome-extension://fmkadmapgofadopljbjfkapdkoienihi/icons/icon-128.png' },
    { name: 'Vue DevTools', resource: 'chrome-extension://nhdogjmejiglipccpnnnanhbledajbpd/icons/icon-128.png' },
    // セキュリティツール
    { name: 'HTTPS Everywhere', resource: 'chrome-extension://gcbommkclmclpchllfjekcdonpmejbdp/icons/icon-128.png' },
    { name: 'Privacy Badger', resource: 'chrome-extension://pkehgijcmpdhfbdbbnkijodmdjhbjlgp/icons/badger-128.png' }
  ];

  // DOM変更の検出
  const domModifications = {
    scriptsInjected: document.scripts.length,
    iframesPresent: document.getElementsByTagName('iframe').length,
    shadowRoots: Array.from(document.querySelectorAll('*')).filter(el => el.shadowRoot).length
  };

  // WebRTC漏洩チェック
  let webRTCLeakDetected = false;
  try {
    const pc = new RTCPeerConnection({iceServers: []});
    pc.createDataChannel('');
    pc.createOffer().then(offer => pc.setLocalDescription(offer));
    pc.onicecandidate = function(ice) {
      if (!ice || !ice.candidate || !ice.candidate.candidate) return;
      const candidate = ice.candidate.candidate;
      if (candidate.includes('srflx') || candidate.includes('relay')) {
        webRTCLeakDetected = true;
      }
    };
  } catch (e) {}

  // タイミングベースの検出
  const timingFingerprint = {
    domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.domContentLoadedEventStart,
    loadComplete: performance.timing.loadEventEnd - performance.timing.loadEventStart,
    resourceCount: performance.getEntriesByType('resource').length
  };

  // Canvas fingerprinting検出
  let canvasFingerprintingDetected = false;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function() {
    canvasFingerprintingDetected = true;
    return originalToDataURL.apply(this, arguments);
  };

  // 結果の収集
  const detectionTime = performance.now() - startTime;
  
  return {
    timestamp: new Date().toISOString(),
    detectedExtensions,
    domModifications,
    webRTCLeakDetected,
    canvasFingerprintingDetected,
    timingFingerprint,
    detectionTime,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory || null,
    screenResolution: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth
    }
  };
})();
`;

/**
 * 拡張機能リスク評価
 */
export interface ExtensionRiskAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedThreats: string[];
  recommendations: string[];
  shouldBlock: boolean;
}

export class BrowserExtensionAnalyzer {
  /**
   * 検出結果からリスクを評価
   */
  static assessRisk(detectionResult: any): ExtensionRiskAssessment {
    const threats: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // DOM改変の検出
    if (detectionResult.domModifications.scriptsInjected > 10) {
      threats.push('Excessive script injection detected');
      riskScore += 30;
    }

    if (detectionResult.domModifications.shadowRoots > 5) {
      threats.push('Multiple shadow DOM roots detected');
      riskScore += 20;
    }

    // WebRTC漏洩
    if (detectionResult.webRTCLeakDetected) {
      threats.push('WebRTC IP leak detected');
      recommendations.push('Consider using VPN or disabling WebRTC');
      riskScore += 25;
    }

    // Canvas fingerprinting
    if (detectionResult.canvasFingerprintingDetected) {
      threats.push('Canvas fingerprinting attempt detected');
      riskScore += 15;
    }

    // 異常なタイミング
    if (detectionResult.detectionTime > 100) {
      threats.push('Slow extension detection - possible interference');
      riskScore += 10;
    }

    // リスクレベルの決定
    let riskLevel: ExtensionRiskAssessment['riskLevel'];
    if (riskScore >= 70) {
      riskLevel = 'CRITICAL';
      recommendations.push('High-risk browser environment detected. Consider using a clean browser profile.');
    } else if (riskScore >= 50) {
      riskLevel = 'HIGH';
      recommendations.push('Multiple security concerns detected. Review installed extensions.');
    } else if (riskScore >= 30) {
      riskLevel = 'MEDIUM';
      recommendations.push('Some security concerns detected. Monitor for unusual activity.');
    } else {
      riskLevel = 'LOW';
    }

    return {
      riskLevel,
      detectedThreats: threats,
      recommendations,
      shouldBlock: riskLevel === 'CRITICAL'
    };
  }

  /**
   * セキュリティポリシーの適用
   */
  static applySecurityPolicy(assessment: ExtensionRiskAssessment): {
    allowTransaction: boolean;
    additionalVerification: boolean;
    restrictions: string[];
  } {
    const restrictions: string[] = [];

    switch (assessment.riskLevel) {
      case 'CRITICAL':
        return {
          allowTransaction: false,
          additionalVerification: true,
          restrictions: ['All sensitive operations blocked']
        };
      
      case 'HIGH':
        restrictions.push('Limited to read-only operations');
        restrictions.push('Additional SMS verification required');
        return {
          allowTransaction: true,
          additionalVerification: true,
          restrictions
        };
      
      case 'MEDIUM':
        restrictions.push('Transaction limits applied');
        return {
          allowTransaction: true,
          additionalVerification: false,
          restrictions
        };
      
      default:
        return {
          allowTransaction: true,
          additionalVerification: false,
          restrictions: []
        };
    }
  }
}

/**
 * ブラウザ環境検証ミドルウェア
 */
export function browserEnvironmentValidation(strictMode: boolean = false) {
  return async (req: any, res: any, next: any) => {
    const browserData = req.body.browserEnvironment || req.headers['x-browser-environment'];
    
    if (!browserData && strictMode) {
      return res.status(400).json({
        error: 'Browser environment validation required'
      });
    }

    if (browserData) {
      try {
        const detectionResult = JSON.parse(browserData);
        const assessment = BrowserExtensionAnalyzer.assessRisk(detectionResult);
        
        // リスク評価結果をリクエストに追加
        req.browserRiskAssessment = assessment;
        req.securityPolicy = BrowserExtensionAnalyzer.applySecurityPolicy(assessment);

        // 高リスクの場合はログに記録
        if (assessment.riskLevel === 'HIGH' || assessment.riskLevel === 'CRITICAL') {
          console.warn('High-risk browser environment detected:', {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            riskLevel: assessment.riskLevel,
            threats: assessment.detectedThreats
          });
        }

        // クリティカルリスクの場合はリクエストをブロック
        if (assessment.shouldBlock) {
          return res.status(403).json({
            error: 'Request blocked due to security concerns',
            recommendations: assessment.recommendations
          });
        }
      } catch (error) {
        console.error('Browser environment validation error:', error);
        if (strictMode) {
          return res.status(400).json({
            error: 'Invalid browser environment data'
          });
        }
      }
    }

    next();
  };
}