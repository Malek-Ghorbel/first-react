import fs from 'fs';
import path from 'path';

describe('regression #99 README typo successfull -> successful / trailing newline', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  let content;

  beforeAll(() => {
    content = fs.readFileSync(readmePath, 'utf8');
  });

  it('README does not contain typo "successfull" (double-l) (fix for #99)', () => {
    expect(content).not.toMatch(/successfull/);
    // ensure no case-variant typo either
    expect(content.toLowerCase()).not.toMatch(/successfull/);
  });

  it('README contains no "successfull" typo, and if it had "successful" would be correct', () => {
    // The correct spelling is "successful" with one l in second part.
    // If README mentions successful, it must be correctly spelled.
    // If it contains the word successfull, that's a bug.
    const hasTypo = /successfull/.test(content);
    const hasCorrect = /successful/.test(content);
    expect(hasTypo).toBe(false);
    // No assertion that hasCorrect must be true — README may not mention the word at all.
    // But if it does, it must not be the typo.
    if (hasCorrect) {
      expect(content).toMatch(/successful/);
      expect(content).not.toMatch(/successfull/);
    }
  });

  it('README ends with trailing newline (fix for #99 fallback)', () => {
    expect(content.endsWith('\n')).toBe(true);
    expect(content.length).toBeGreaterThan(0);
    // exactly one trailing newline is ideal, but at least one is required
    expect(content[content.length - 1]).toBe('\n');
  });

  it('regression guard: buggy version with "successfull" should fail', () => {
    const buggy = 'Build successfull!';
    const fixed = 'Build successful!';
    expect(buggy).toMatch(/successfull/);
    expect(fixed).not.toMatch(/successfull/);
    expect(fixed).toMatch(/successful/);
    // Our real README must match fixed, not buggy
    expect(content).not.toMatch(/successfull/);
  });

  it('regression guard: missing trailing newline should fail', () => {
    const withoutNewline = '# Title without newline';
    const withNewline = '# Title with newline\n';
    expect(withoutNewline.endsWith('\n')).toBe(false);
    expect(withNewline.endsWith('\n')).toBe(true);
    // Real README must pass the withNewline condition
    expect(content.endsWith('\n')).toBe(true);
  });

  it('README file exists and has expected Create React App content', () => {
    expect(content.length).toBeGreaterThan(0);
    expect(content).toMatch(/Create React App/);
    expect(content).toMatch(/# Getting Started with Create React App\./);
  });
});
