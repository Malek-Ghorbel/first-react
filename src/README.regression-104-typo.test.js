import fs from 'fs';
import path from 'path';

describe('regression #104 README typo successfull -> successful / trailing newline', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  let content;

  beforeAll(() => {
    content = fs.readFileSync(readmePath, 'utf8');
  });

  it('README does not contain typo "successfull" (double-l) (fix for #104)', () => {
    expect(content).not.toMatch(/successfull/);
    expect(content.toLowerCase()).not.toMatch(/successfull/);
  });

  it('README contains no "successfull" typo, and if it had "successful" would be correct', () => {
    const hasTypo = /successfull/.test(content);
    const hasCorrect = /successful/.test(content);
    expect(hasTypo).toBe(false);
    if (hasCorrect) {
      expect(content).toMatch(/successful/);
      expect(content).not.toMatch(/successfull/);
    }
  });

  it('README ends with trailing newline (fix for #104 fallback)', () => {
    expect(content.endsWith('\n')).toBe(true);
    expect(content.length).toBeGreaterThan(0);
    expect(content[content.length - 1]).toBe('\n');
  });

  it('regression guard: buggy version with "successfull" should fail', () => {
    const buggy = 'Build successfull!';
    const fixed = 'Build successful!';
    expect(buggy).toMatch(/successfull/);
    expect(fixed).not.toMatch(/successfull/);
    expect(fixed).toMatch(/successful/);
    expect(content).not.toMatch(/successfull/);
  });

  it('regression guard: missing trailing newline should fail', () => {
    const withoutNewline = '# Title without newline';
    const withNewline = '# Title with newline\n';
    expect(withoutNewline.endsWith('\n')).toBe(false);
    expect(withNewline.endsWith('\n')).toBe(true);
    expect(content.endsWith('\n')).toBe(true);
  });

  it('README file exists and has expected Create React App content', () => {
    expect(content.length).toBeGreaterThan(0);
    expect(content).toMatch(/Create React App/);
    expect(content).toMatch(/# Getting Started with Create React App\./);
  });
});
