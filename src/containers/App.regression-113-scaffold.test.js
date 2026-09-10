import fs from 'fs';
import path from 'path';

// Issue #113: public/index.html still carried two pieces of untouched Create React App
// scaffold: the stale `<title>React App</title>` and a redundant, broken
// `<link rel="stylesheet" href="../src/index.css" />` that 404s in production.
describe('regression #113 CRA scaffold cleanup in public/index.html', () => {
  const rootDir = path.join(__dirname, '..', '..');
  const indexPath = path.join(rootDir, 'public', 'index.html');
  let html;

  beforeAll(() => {
    html = fs.readFileSync(indexPath, 'utf8');
  });

  it('document title is the real app name RoboFriends, not the CRA default', () => {
    const match = html.match(/<title>([^<]*)<\/title>/i);
    expect(match).toBeTruthy();
    expect(match[1].trim()).toBe('RoboFriends');
  });

  it('public/index.html contains no "React App" string', () => {
    expect(html).not.toMatch(/React App/);
  });

  it('public/index.html contains no ../src/index.css reference', () => {
    expect(html).not.toMatch(/\.\.\/src\/index\.css/);
    // No hand-written stylesheet link to the source tree at all.
    expect(html).not.toMatch(/<link[^>]*\bstylesheet\b[^>]*index\.css/i);
  });

  it('keeps the a11y lang attribute intact (regressions #89 / #90 stay green)', () => {
    expect(html).toMatch(/<html[^>]*\blang\s*=\s*["']?en["']?/i);
  });

  it('does not disturb anything outside scope: %PUBLIC_URL% assets and manifest link remain', () => {
    expect(html).toMatch(/<link rel="icon" href="%PUBLIC_URL%\/favicon\.ico" \/>/);
    expect(html).toMatch(/<link rel="apple-touch-icon" href="%PUBLIC_URL%\/logo192\.png" \/>/);
    expect(html).toMatch(/<link rel="manifest" href="%PUBLIC_URL%\/manifest\.json" \/>/);
    expect(html).toMatch(/<div id="root"><\/div>/);
  });

  it('regression guard: the pre-fix scaffold would fail these assertions', () => {
    const buggyHtml = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '  <head>',
      '    <link rel="stylesheet" type="text/css" href="../src/index.css" />',
      '    <title>React App</title>',
      '  </head>',
      '  <body><div id="root"></div></body>',
      '</html>',
    ].join('\n');

    const buggyTitle = buggyHtml.match(/<title>([^<]*)<\/title>/i);
    expect(buggyTitle[1].trim()).not.toBe('RoboFriends'); // the stale title we removed
    expect(buggyHtml).toMatch(/React App/);
    expect(buggyHtml).toMatch(/\.\.\/src\/index\.css/);
    expect(buggyHtml).toMatch(/<link[^>]*\bstylesheet\b[^>]*index\.css/i);
  });

  it('production build output drops the ../src/index.css stylesheet reference', () => {
    // Only meaningful once `npm run build` has produced build/index.html; the emitted
    // HTML is what actually ships, so verify it when the artifact is present.
    const buildIndex = path.join(rootDir, 'build', 'index.html');
    if (!fs.existsSync(buildIndex)) {
      return;
    }
    const built = fs.readFileSync(buildIndex, 'utf8');
    expect(built).not.toMatch(/\.\.\/src\/index\.css/);
    expect(built).toMatch(/<title>RoboFriends<\/title>/i);
  });
});
