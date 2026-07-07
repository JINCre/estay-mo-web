// 순수 함수만: DOM/fetch 의존 없음 → node로 단독 테스트 가능 (match.test.js)

function normalizePlate(str) {
  return (str || "").replace(/\s+/g, "");
}

function lastFourDigits(plate) {
  const digits = (plate || "").replace(/\D/g, "");
  return digits.slice(-4);
}

function findMatches(vehicles, query) {
  const q = normalizePlate(query);
  if (!q) return [];

  const exact = vehicles.filter((v) => normalizePlate(v.plate) === q);
  if (exact.length) return exact;

  if (/^\d{4}$/.test(q)) {
    return vehicles.filter((v) => lastFourDigits(v.plate) === q);
  }

  return [];
}

// 구글시트 '차량' 탭 CSV: 동,호,차량번호,종류(선택)
function parseVehiclesCSV(text) {
  return text
    .split(/\r?\n/)
    .slice(1) // 헤더 행 제외
    .map((line) => line.split(","))
    .filter((cols) => cols.length >= 3 && cols[2] && cols[2].trim())
    .map((cols) => ({
      dong: cols[0].trim(),
      ho: cols[1].trim(),
      plate: cols[2].trim(),
      type: (cols[3] || "").trim(),
    }));
}

// 구글시트 '설정' 탭 CSV에서 4자리 숫자 비밀번호 추출
function extractPassword(text) {
  const m = (text || "").match(/\d{4}/);
  return m ? m[0] : null;
}

if (typeof module !== "undefined") {
  module.exports = { normalizePlate, lastFourDigits, findMatches, parseVehiclesCSV, extractPassword };
}
