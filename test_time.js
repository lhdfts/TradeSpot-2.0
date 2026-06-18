import { timeToMinutes } from './src/utils/distribution.js';

function test(timeStr, expectedMinutes) {
    const minutes = timeToMinutes(timeStr);
    const result = minutes === expectedMinutes ? 'PASS' : 'FAIL';
    console.log(`[${result}] timeToMinutes("${timeStr}") = ${minutes} (Expected: ${expectedMinutes})`);
}

// 12:00 local time = 12 * 60 = 720 minutes
test("12:00", 720);
test("12:00:00", 720);

// 15:30 UTC time = 12:30 Brasilia time = 12 * 60 + 30 = 750 minutes
test("15:30:00+00", 750);
test("15:30:00Z", 750);
test("15:30+00", 750);

// 15:30 UTC-3 = 15:30 Brasilia time = 15 * 60 + 30 = 930 minutes
test("15:30:00-03:00", 930);
test("15:30-03", 930);

// Edge cases
test("00:00:00+00", 1260); // 00:00 UTC = 21:00 (previous day) local time = 21 * 60 = 1260
test("03:00:00+00", 0); // 03:00 UTC = 00:00 local time = 0
