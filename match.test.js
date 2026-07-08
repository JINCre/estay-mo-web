const assert = require("assert");
const { normalizePlate, findMatches, parseVehiclesCSV } = require("./match.js");

const vehicles = [
  { dong: "101", ho: "1203", plate: "12가3456" },
  { dong: "102", ho: "803", plate: "34나7890" },
  { dong: "103", ho: "501", plate: "56다3456" }, // 뒷자리 3456으로 101동과 겹침
];

// 1. 전체 번호 완전일치 → 1건
assert.strictEqual(findMatches(vehicles, "12가3456").length, 1);

// 2. 뒷 4자리 입력 → 매칭
assert.strictEqual(findMatches(vehicles, "7890").length, 1);

// 3. 공백 포함 입력도 매칭 (정규화)
assert.strictEqual(findMatches(vehicles, "12가 3456").length, 1);

// 4. 없는 번호 → 0건
assert.strictEqual(findMatches(vehicles, "99하9999").length, 0);

// 5. 서로 다른 세대가 같은 뒷 4자리 → 여러 건
assert.strictEqual(findMatches(vehicles, "3456").length, 2);

assert.strictEqual(normalizePlate(" 12 가 3456 "), "12가3456");

// 6. parseVehiclesCSV: 헤더 제외, 빈 차량번호 줄 제외, 종류 없으면 빈 문자열
const csv = "동,호,차량번호,종류\n101,1203,12가3456,자동차\n102,803,,\n103,501,경기 강북가0283,이륜차\n";
const parsed = parseVehiclesCSV(csv);
assert.strictEqual(parsed.length, 2);
assert.deepStrictEqual(parsed[0], { dong: "101", ho: "1203", plate: "12가3456", type: "자동차" });
assert.strictEqual(parsed[1].type, "이륜차");

console.log("match.test.js: 6개 테스트 통과");
