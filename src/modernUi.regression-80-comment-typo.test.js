import fs from 'fs';
import path from 'path';

describe('regression #80 comment typo dib -> div', () => {
  const filePath = path.join(__dirname, 'modernUi.test.js');
  let content;

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf8');
  });

  it('comment uses "div stack" not "dib stack" (fix for #80)', () => {
    // Correct comment should be "legacy div stack"
    expect(content).toMatch(/legacy div stack/);
    expect(content).not.toMatch(/legacy dib stack/);
  });

  it('regression guard: buggy version with dib should fail', () => {
    const buggy = '// Grid layout instead of legacy dib stack';
    const fixed = '// Grid layout instead of legacy div stack';
    expect(buggy).not.toBe(fixed);
    expect(content).toMatch(/legacy div stack/);
    expect(content).not.toMatch(/legacy dib stack/);
  });

  it('file exists and has content', () => {
    expect(content.length).toBeGreaterThan(0);
    expect(content).toMatch(/Grid layout/);
  });
});
