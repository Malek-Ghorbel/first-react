import fs from 'fs';
import path from 'path';

describe('regression #79 README first line typo', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  let content;
  let firstLine;

  beforeAll(() => {
    content = fs.readFileSync(readmePath, 'utf8');
    firstLine = content.split('\n')[0].trim();
  });

  it('README first line is exactly "# Getting Started with Create React App." (fix for #79)', () => {
    // Tiny typo fix: ensure first line is correct with period
    expect(firstLine).toBe('# Getting Started with Create React App.');
  });

  it('first line starts with "# Getting Started"', () => {
    expect(firstLine).toMatch(/^# Getting Started/);
  });

  it('first line does not contain common typos', () => {
    // Ensure no common typos like Geting, Strated, Creat, Reacat, etc.
    expect(firstLine).not.toMatch(/Geting|Strated|Creat[^e]|Reacat|Ap$/);
    // Should contain Create React App
    expect(firstLine).toMatch(/Create React App/);
  });

  it('regression guard: buggy version without period should fail', () => {
    const buggyFirstLine = '# Getting Started with Create React App';
    expect(buggyFirstLine).not.toBe('# Getting Started with Create React App.');
    // Our fix ensures real file does NOT match buggy
    expect(firstLine).not.toBe(buggyFirstLine);
    expect(firstLine).toBe('# Getting Started with Create React App.');
  });

  it('README file exists and has content', () => {
    expect(content.length).toBeGreaterThan(0);
    expect(content).toMatch(/Create React App/);
  });
});
