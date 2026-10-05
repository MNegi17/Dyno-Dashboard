import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { doesManualFileCoverDate } from '../src/sync/dateCoverage.js';
const cases = JSON.parse(fs.readFileSync(new URL('./date_coverage_cases.json', import.meta.url)));
for (const [name, day, month, year, uploaded, expected] of cases) {
  test(`${name}: ${day}/${month}/${year}, uploaded ${uploaded}`, () => {
    assert.equal(doesManualFileCoverDate(name, day, month - 1, year, uploaded), expected);
  });
}
