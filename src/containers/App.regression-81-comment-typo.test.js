import fs from 'fs';
import path from 'path';

describe('regression #81 trivial comment typo (one-word fix)', () => {
  const appPath = path.join(__dirname, 'App.js');
  let content;

  beforeAll(() => {
    content = fs.readFileSync(appPath, 'utf8');
  });

  it('comment typo fixed: corrupt theme comment should contain "to the verifier" with article', () => {
    // Buggy comment: "should not leak to verifier" missing article "the"
    // Fixed comment: "should not leak to the verifier"
    const buggy = 'corrupt theme values should not leak to verifier';
    const fixed = 'corrupt theme values should not leak to the verifier';
    // The file should contain the fixed version
    expect(content).toContain(fixed);
    // And should NOT contain the buggy version without "the" (exact phrase without "the")
    // We check that buggy phrase followed by " (" is not present; fixed has "the verifier"
    // Use regex to ensure "to verifier" without "the" for this specific phrase is absent
    const hasBuggyExact = content.includes(buggy + ' (API call');
    const hasFixedExact = content.includes(fixed + ' (API call');
    expect(hasFixedExact).toBe(true);
    expect(hasBuggyExact).toBe(false);
  });

  it('regression guard: buggy version without "the" should be considered incorrect', () => {
    const buggyComment = '// e2e verifier: guard team spawn edge cases - corrupt theme values should not leak to verifier (API call -> team spawn -> verifier)';
    const fixedComment = '// e2e verifier: guard team spawn edge cases - corrupt theme values should not leak to the verifier (API call -> team spawn -> verifier)';
    expect(buggyComment).not.toBe(fixedComment);
    expect(fixedComment).toContain('to the verifier');
    expect(buggyComment).toContain('to verifier');
    // Real file should match fixed, not buggy
    expect(content).toContain(fixedComment);
    expect(content).not.toContain(buggyComment);
  });

  it('preserves App debounce mount-guard from #73 (critical)', () => {
    // Verify debounce mount guard still present (must not be removed by tiny comment fix)
    // Constructor should initialize _isMounted = false
    expect(content).toMatch(/this\._isMounted\s*=\s*false/);
    // componentDidMount should set _isMounted = true
    expect(content).toMatch(/componentDidMount[\s\S]*?this\._isMounted\s*=\s*true/);
    // debouncedSetSearch should guard with if (!this._isMounted) return;
    expect(content).toMatch(/this\.debouncedSetSearch\s*=\s*debounce\(\(val\)\s*=>\s*\{\s*\/\/ e2e verifier: guard team spawn debounce leakage[\s\S]*?if\s*\(!this\._isMounted\)\s*return;/);
    // componentWillUnmount should set _isMounted = false and cancel
    expect(content).toMatch(/componentWillUnmount\(\)\s*\{\s*this\._isMounted\s*=\s*false/);
    expect(content).toContain('debouncedSetSearch.cancel');
  });

  it('tiny change only: exactly one comment line changed to add "the"', () => {
    // Ensure only one occurrence of the fixed phrase exists (the one we changed)
    const fixedOccurrences = (content.match(/corrupt theme values should not leak to the verifier/g) || []).length;
    expect(fixedOccurrences).toBe(1);
    // Ensure overall verifier comment count unchanged (should still have many verifier guards)
    const verifierMatches = (content.match(/e2e verifier:/g) || []).length;
    // At least 10 verifier comments should still be present (guard against accidental deletion)
    expect(verifierMatches).toBeGreaterThanOrEqual(10);
  });

  it('file still valid JS and App component intact', () => {
    expect(content).toContain('class App extends Component');
    expect(content).toContain('function applyTheme');
    expect(content).toContain('function debounce');
    // Check for fallback logic: globalThis fallback is present
    expect(content).toMatch(/globalThis/);
    expect(content).toMatch(/fetch/);
    expect(content.length).toBeGreaterThan(1000);
  });
});
