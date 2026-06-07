// Tiny i18n: flat key dictionary + `translate(locale, key, vars)` with {var}
// interpolation. Korean first, English fallback.

import type { Locale, RecognitionMethod } from './types';

type Dict = Record<string, string>;

const en: Dict = {
  'app.title': 'Caffeine Calculator',

  'tab.home': 'Today',
  'tab.log': 'Log',
  'tab.profile': 'Profile',

  'home.inSystem': 'In your system now',
  'home.today': "Today's intake",
  'home.ofLimit': '{current} / {limit} mg',
  'home.remaining': '{mg} mg left today',
  'home.overLimit': 'Over your daily limit',
  'home.sleepSafe': 'Below 50 mg in ~{hours} h',
  'home.sleepNow': 'Caffeine is low — good for sleep',
  'home.scan': 'Scan a drink',
  'home.empty': 'No caffeine logged yet today.',
  'home.disclaimerShort': 'Estimates only — not medical advice.',

  'log.title': 'History',
  'log.weekly': 'Last 7 days',
  'log.daily': 'Entries',
  'log.empty': 'Nothing logged yet. Scan your first drink!',
  'log.delete': 'Delete',
  'log.limitLine': 'Limit {limit} mg',

  'profile.title': 'Profile',
  'profile.weight': 'Weight (kg)',
  'profile.age': 'Age',
  'profile.pregnant': 'Pregnant or nursing',
  'profile.halfLife': 'Caffeine half-life (hours)',
  'profile.halfLifeHint': 'Default 5 h. Higher = caffeine lingers longer (e.g. older adults, slow metabolisers).',
  'profile.locale': 'Language',
  'profile.save': 'Save',
  'profile.saved': 'Saved',
  'profile.yourLimit': 'Your daily limit',
  'profile.basis.adult': 'Adult: 400 mg/day (single dose ≤200 mg)',
  'profile.basis.pregnancy': 'Pregnancy/nursing: 200 mg/day',
  'profile.basis.minor': 'Under 18: 2.5 mg/kg/day',
  'profile.disclaimer':
    'Official limits are general guidance (식약처/EFSA). The half-life view is informational, not medical advice.',

  'camera.requesting': 'Requesting camera permission…',
  'camera.denied': 'Camera access is needed to scan drinks.',
  'camera.grant': 'Grant permission',
  'camera.hint': 'Point at a label, barcode, or the drink itself.',
  'camera.capture': 'Capture',
  'camera.analyzing': 'Analyzing…',
  'camera.barcode': 'Barcode detected',
  'camera.cancel': 'Cancel',

  'result.title': 'Result',
  'result.caffeine': 'Caffeine',
  'result.confidence': 'Confidence {pct}%',
  'result.source': 'Source: {source}',
  'result.how': 'How we got this',
  'result.edit': 'Edit amount (mg)',
  'result.product': 'Drink',
  'result.add': 'Add to log',
  'result.retake': 'Retake',
  'result.added': 'Added to your log',
  'result.error': "Couldn't analyze that. Try again or enter it manually.",

  'method.barcode': 'Barcode lookup',
  'method.label_ocr': 'Read from label',
  'method.product_recognition': 'Recognized drink',
  'method.estimate': 'Estimated',
  'method.manual': 'Entered manually',

  'common.cancel': 'Cancel',
  'common.loading': 'Loading…',
  'common.mg': 'mg',
};

const ko: Dict = {
  'app.title': '카페인 계산기',

  'tab.home': '오늘',
  'tab.log': '기록',
  'tab.profile': '프로필',

  'home.inSystem': '현재 체내 카페인',
  'home.today': '오늘 섭취량',
  'home.ofLimit': '{current} / {limit} mg',
  'home.remaining': '오늘 {mg} mg 남음',
  'home.overLimit': '일일 권장량 초과',
  'home.sleepSafe': '약 {hours}시간 후 50 mg 이하',
  'home.sleepNow': '카페인이 낮아 수면에 좋아요',
  'home.scan': '음료 스캔하기',
  'home.empty': '오늘 기록된 카페인이 없어요.',
  'home.disclaimerShort': '추정치이며 의학적 조언이 아닙니다.',

  'log.title': '기록',
  'log.weekly': '최근 7일',
  'log.daily': '섭취 내역',
  'log.empty': '아직 기록이 없어요. 첫 음료를 스캔해 보세요!',
  'log.delete': '삭제',
  'log.limitLine': '권장량 {limit} mg',

  'profile.title': '프로필',
  'profile.weight': '몸무게 (kg)',
  'profile.age': '나이',
  'profile.pregnant': '임신/수유 중',
  'profile.halfLife': '카페인 반감기 (시간)',
  'profile.halfLifeHint': '기본 5시간. 값이 클수록 카페인이 오래 남아요 (고령·느린 대사 등).',
  'profile.locale': '언어',
  'profile.save': '저장',
  'profile.saved': '저장됨',
  'profile.yourLimit': '나의 일일 권장량',
  'profile.basis.adult': '성인: 하루 400 mg (1회 200 mg 이하)',
  'profile.basis.pregnancy': '임신/수유: 하루 200 mg',
  'profile.basis.minor': '18세 미만: 체중 1kg당 2.5 mg/일',
  'profile.disclaimer':
    '공식 권장량은 일반 지침입니다 (식약처/EFSA). 반감기 화면은 참고용이며 의학적 조언이 아닙니다.',

  'camera.requesting': '카메라 권한 요청 중…',
  'camera.denied': '음료를 스캔하려면 카메라 권한이 필요해요.',
  'camera.grant': '권한 허용',
  'camera.hint': '라벨, 바코드 또는 음료를 비춰 주세요.',
  'camera.capture': '촬영',
  'camera.analyzing': '분석 중…',
  'camera.barcode': '바코드 감지됨',
  'camera.cancel': '취소',

  'result.title': '결과',
  'result.caffeine': '카페인',
  'result.confidence': '신뢰도 {pct}%',
  'result.source': '출처: {source}',
  'result.how': '계산 방식',
  'result.edit': '함량 수정 (mg)',
  'result.product': '음료',
  'result.add': '기록에 추가',
  'result.retake': '다시 촬영',
  'result.added': '기록에 추가됨',
  'result.error': '분석하지 못했어요. 다시 시도하거나 직접 입력해 주세요.',

  'method.barcode': '바코드 조회',
  'method.label_ocr': '라벨에서 읽음',
  'method.product_recognition': '음료 인식',
  'method.estimate': '추정',
  'method.manual': '직접 입력',

  'common.cancel': '취소',
  'common.loading': '불러오는 중…',
  'common.mg': 'mg',
};

const dicts: Record<Locale, Dict> = { en, ko };

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const dict = dicts[locale] ?? en;
  let str = dict[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

export function methodLabel(locale: Locale, method: RecognitionMethod): string {
  return translate(locale, `method.${method}`);
}
