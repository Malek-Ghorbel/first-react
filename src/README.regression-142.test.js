import fs from 'fs';
import path from 'path';

// Regression test for issue #142 — "update the readme of the project to reflect its content".
//
// Before the fix the README was the untouched Create React App boilerplate: it
// described CRA scripts but said nothing about what this repository actually is
// (RoboFriends), what it renders, where the data comes from, or how the source
// tree is organised. This suite pins the project-specific documentation so the
// README cannot silently regress to boilerplate-only, while still asserting the
// invariants previous README fixes locked in (#79 first line, #99/#104 trailing
// newline and the "successfull" typo guard).
describe('regression #142 README reflects the project content', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  let content;
  let lower;

  beforeAll(() => {
    content = fs.readFileSync(readmePath, 'utf8');
    lower = content.toLowerCase();
  });

  it('names the app (RoboFriends) and describes what it does', () => {
    expect(content).toMatch(/RoboFriends/);
    expect(lower).toMatch(/robot/);
    // A description of the purpose, not just a title: it renders a directory of
    // robots fetched from an API.
    expect(lower).toMatch(/directory|card|avatar/);
    expect(lower).toMatch(/fetch|jsonplaceholder/);
  });

  it('documents the runtime data sources (JSONPlaceholder users + RoboHash avatars)', () => {
    expect(lower).toMatch(/jsonplaceholder\.typicode\.com/);
    expect(lower).toMatch(/robohash\.org/);
    expect(lower).toMatch(/\/users/);
  });

  it('documents the user-facing features of the app', () => {
    // Each feature string must appear as documentation, not just as a word used
    // incidentally — so we require the feature vocabulary the UI actually exposes.
    expect(lower).toMatch(/search/);
    expect(lower).toMatch(/favou?rites/);
    expect(lower).toMatch(/sort/);
    expect(lower).toMatch(/pagination|\bpage\b/);
    expect(lower).toMatch(/modal/);
    expect(lower).toMatch(/dark|theme/);
    expect(lower).toMatch(/loading/);
    expect(lower).toMatch(/empty state|empty states/);
  });

  it('documents the persisted state keys the app writes', () => {
    expect(content).toMatch(/robofriends:favorites/);
    expect(content).toMatch(/robofriends:theme/);
  });

  it('documents the project structure (src, components, containers)', () => {
    expect(content).toMatch(/Project structure/);
    expect(content).toMatch(/src\//);
    expect(content).toMatch(/components\//);
    expect(content).toMatch(/containers\//);
    // Files that actually exist and matter to a newcomer.
    expect(content).toMatch(/App\.js/);
    expect(content).toMatch(/Card\.js/);
    expect(content).toMatch(/SearchBox\.js/);
    expect(content).toMatch(/RobotModal\.js/);
  });

  it('documents the tech stack of this repository', () => {
    expect(content).toMatch(/React/);
    expect(content).toMatch(/Tachyons/);
    expect(content).toMatch(/react-scripts|Create React App/);
  });

  it('is more than boilerplate: it has project sections the CRA template never had', () => {
    expect(content).toMatch(/## What is RoboFriends\?/);
    expect(content).toMatch(/## Features/);
    expect(content).toMatch(/## Testing/);
    // Substantially longer than the untouched CRA template (~4.4k chars).
    expect(content.length).toBeGreaterThan(5000);
  });

  it('still keeps the Create React App scaffolding documentation and scripts', () => {
    // The project genuinely is CRA-based, so the scaffolding notes remain.
    expect(content).toMatch(/## Available Scripts/);
    expect(content).toMatch(/npm start/);
    expect(content).toMatch(/npm test/);
    expect(content).toMatch(/npm run build/);
    expect(content).toMatch(/# Getting Started with Create React App\./);
  });

  it('preserves the invariants pinned by earlier README regressions (#79, #99, #104)', () => {
    expect(content.split('\n')[0].trim()).toBe('# Getting Started with Create React App.');
    expect(content).not.toMatch(/successfull/);
    expect(content.toLowerCase()).not.toMatch(/successfull/);
    expect(content.endsWith('\n')).toBe(true);
  });

  it('regression guard: a boilerplate-only README would fail these checks', () => {
    const boilerplateOnly = [
      '# Getting Started with Create React App.',
      '',
      'This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).',
      '',
      '## Available Scripts',
      '',
      '### `npm start`',
      '',
    ].join('\n');

    // The CRA template has none of the project-specific sections...
    expect(boilerplateOnly).not.toMatch(/## What is RoboFriends\?/);
    expect(boilerplateOnly).not.toMatch(/robohash\.org/i);
    expect(boilerplateOnly).not.toMatch(/robofriends:favorites/);
    // ...while the real README documents all of them.
    expect(content).toMatch(/## What is RoboFriends\?/);
    expect(lower).toMatch(/robohash\.org/);
    expect(content).toMatch(/robofriends:favorites/);
  });
});
