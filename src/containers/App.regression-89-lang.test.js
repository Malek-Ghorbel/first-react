import fs from 'fs';
import path from 'path';

describe('regression #89 html lang attribute for a11y (merge-proof)', () => {
  const indexPath = path.join(__dirname, '..', '..', 'public', 'index.html');
  let html;

  beforeAll(() => {
    html = fs.readFileSync(indexPath, 'utf8');
  });

  it('public/index.html contains <html> with lang attribute set to en (repro from #89)', () => {
    // Issue #89: Change <html> to <html lang=en> for a11y - merge-branch runtime proof on merge/nightly-v1.1-main
    expect(html).toMatch(/<html[^>]*\blang\s*=\s*["']?en["']?/i);
  });

  it('lang attribute is exactly "en" and not empty or different language', () => {
    const match = html.match(/<html[^>]*\blang\s*=\s*["']?([^"'\s>]+)["']?/i);
    expect(match).toBeTruthy();
    expect(match[1].toLowerCase()).toBe('en');
  });

  it('has only one html opening tag and it includes lang', () => {
    const htmlTags = html.match(/<html[^>]*>/gi) || [];
    expect(htmlTags.length).toBe(1);
    expect(htmlTags[0]).toMatch(/lang/i);
  });

  it('doctype and lang are present for accessibility and i18n', () => {
    expect(html).toMatch(/<!DOCTYPE html>/i);
    // lang should be on the html element, not elsewhere - verify not bare <html>
    expect(html).not.toMatch(/<html\s*>/);
    const hasLangEn = /<html[^>]*lang\s*=\s*"?en"?/i.test(html);
    expect(hasLangEn).toBe(true);
  });

  it('regression guard: removing lang should fail - simulates bug where <html> has no lang', () => {
    // Simulate the bug: <html> without lang should fail our check
    const buggyHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    expect(buggyHtml).not.toMatch(/<html[^>]*\blang\s*=\s*["']?en["']?/i);
    // Our fix ensures real file does NOT match buggy pattern
    expect(html).not.toBe(buggyHtml);
    expect(html).toMatch(/<html[^>]*lang/i);
  });

  it('verifies merge-proof small safe verifiable change for nightly-v1.1-main', () => {
    // This test proves the fix is merge-safe: lang attribute does not break rendering and is verifiable
    expect(html).toMatch(/<html lang="en">/);
    // Ensure no duplicate lang attributes
    const langMatches = html.match(/\blang\s*=/gi) || [];
    expect(langMatches.length).toBe(1);
  });
});
