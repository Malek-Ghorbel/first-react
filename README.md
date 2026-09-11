# Getting Started with Create React App.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app)
and has since grown into **RoboFriends** — a small React app that renders a searchable, sortable,
favourite-able directory of robot friends.

Everything above "Available Scripts" documents what this repository actually contains today; the
original Create React App notes are kept below for reference.

## What is RoboFriends?

RoboFriends fetches ten users from the public
[JSONPlaceholder](https://jsonplaceholder.typicode.com/) `/users` endpoint and renders each one as a
robot card. Every avatar is generated on the fly by [RoboHash](https://robohash.org/) from the
user's id, so the app needs no bundled image assets — only network access to
`https://jsonplaceholder.typicode.com/users` at runtime.

## Features

| Feature | Behaviour |
| --- | --- |
| Robot directory | Fetches `/users` on mount and renders a card per robot (avatar, name, email). |
| Search | Filters by name **or** email; input is debounced by 300 ms and ships with a clear (×) button. |
| Favourites | Star button on each card; the selection is persisted in `localStorage` and can be filtered with the "Show favorites" toolbar button. |
| Sorting | Sort by name or email, ascending or descending. |
| Pagination | Six cards per page with Prev/Next controls and a "Page x of y" indicator. |
| Robot details modal | Clicking a card (or pressing Enter/Space while it is focused) opens a modal with the robot's avatar, name, email and id. |
| Dark / light theme | Toggle in the header; the choice is persisted and applied through the `data-theme` attribute. |
| Empty states | Friendly messages for "no robots yet", "no robots found for …" and "no favorites yet". |
| Loading & error states | Animated skeleton grid while the API call is in flight, and an `role="alert"` message if it fails. |
| Robustness | An `ErrorBoundry` wraps the card list, and localStorage/fetch access is guarded so a corrupted value can never crash the UI. |
| Accessibility | Labelled controls, `aria-live` status text, keyboard-operable cards and a modal that locks background scroll, moves focus to its close button and closes on Escape or backdrop click. |

## Project structure

```
public/                     Static HTML shell (title: RoboFriends), icons, manifest
src/
  index.js                  Entry point: mounts <App />, loads Tachyons and reportWebVitals
  index.css                 Global styles and dark-mode overrides
  setupTests.js             jest-dom setup + React hardening helpers for the test suite
  reportWebVitals.js        CRA web-vitals reporter
  containers/
    App.js                  Stateful root component (fetch, search, favourites, sort, paging, theme)
    App*.test.js            Unit / e2e / regression suites for the root component
    ErrorBoundry.js         Error boundary around the card list
    app.css                 Application and theme styles
    SEGA.woff               Display font used for the header
  components/
    Card.js                 Single robot card (favourite star, keyboard selection, avatar)
    CardList.js             Grid of cards + empty state
    SearchBox.js            Debounced search input with clear button
    RobotModal.js           Accessible robot detail dialog
    Scroll.js               Scroll container for the card grid
  utils/
    format.js               Shared formatting helpers (e.g. formatCount, DEFAULT_NOUN)
```

## Data and persistence

| What | Where |
| --- | --- |
| Robot data | `GET https://jsonplaceholder.typicode.com/users` |
| Avatars | `https://robohash.org/<id>?size=200x200` |
| Favourites | `localStorage["robofriends:favorites"]` |
| Theme | `localStorage["robofriends:theme"]` (`"light"` or `"dark"`) |

Each storage read/write is wrapped in `try/catch`, so a missing, blocked or corrupted
`localStorage` entry falls back to an empty favourite list and the light theme instead of throwing.

## Tech stack

- **React 17** with a mix of class (`App`, `ErrorBoundry`) and function (`Card`, `CardList`,
  `SearchBox`, `RobotModal`, `Scroll`) components.
- **Create React App** (`react-scripts` 4) for the dev server, build pipeline and Jest runner.
- **Tachyons** utility classes plus custom CSS in `src/index.css` and `src/containers/app.css`.
- **@testing-library/react** + **jest-dom** for the component and end-to-end test suites.

## Testing

Tests live next to the code they cover (`src/**/*.test.js`) and are run by CRA's Jest setup
(`src/setupTests.js`). The suite covers components, containers, end-to-end flows and
issue-specific regression tests.

Run them once, without watch mode, with:

```bash
CI=true npm test
```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
