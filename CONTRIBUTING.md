# Contributing to the Amplitude SDK for Node

🎉 Thanks for your interest in contributing! 🎉

## Ramping Up

Use Node.js 22.12 or later on the 22.x line (see `.nvmrc`) and Yarn Classic
1.22.22 for development and releases. Lerna 9 and Nx 22 require modern Node;
the published SDK's Node.js requirement remains unchanged.

Run `yarn install --frozen-lockfile` to install dependencies, link the Yarn
workspaces, and build packages through the root `prepare` script. CI skips
install scripts and runs `yarn build` explicitly. `lerna bootstrap` and the
`useWorkspaces` setting were removed in newer Lerna versions.

Run `yarn build`, `yarn lint`, and `yarn test` to validate changes. `yarn clean`
removes generated package output; Yarn manages workspace dependency installation.
CI builds and lints on Node 22, then runs each package's Jest suite directly on
Node 14, 16, 22, and 24 to preserve SDK runtime coverage without invoking Lerna
on unsupported Node versions.

Nx is pinned to a release that fixes both SDK-544 command injection and local
socket permission findings. Keep its version within Lerna's supported Nx range
when updating the tooling.

### PR Commit Title Conventions

PR titles should follow [conventional commit standards](https://www.conventionalcommits.org/en/v1.0.0/). This helps automate the [release](#release) process.

#### Commit Types ([related to release conditions](#release))

- **Special Case**: Any commit with `BREAKING CHANGES` in the body: Creates major release
- `feat(<optional scope>)`: New features (minimum minor release)
- `fix(<optional scope>)`: Bug fixes (minimum patch release)
- `perf(<optional scope>)`: Performance improvement
- `docs(<optional scope>)`: Documentation updates
- `test(<optional scope>)`: Test updates
- `refactor(<optional scope>)`: Code change that neither fixes a bug nor adds a feature
- `style(<optional scope>)`: Code style changes (e.g. formatting, commas, semi-colons)
- `build(<optional scope>)`: Changes that affect the build system or external dependencies (e.g. Yarn, Npm)
- `ci(<optional scope>)`: Changes to our CI configuration files and scripts
- `chore(<optional scope>)`: Other changes that don't modify src or test files
- `revert(<optional scope>)`: Revert commit

### Release [Amplitude Internal]

Releases are managed by [semantic-release](https://github.com/semantic-release/semantic-release). It is a tool that will scan commits since the last release, determine the next [semantic version number](https://semver.org/), publish, and create changelogs.

#### Release Conditions [Amplitude Internal]

- `BREAKING CHANGES` in the body will do a major release
  ```
  feat(cookies): Create new cookie format

  BREAKING CHANGES: Breaks old cookie format
  ```
- Else `feat` in title will do a `minor` release
  `feat(cookies): some changes`
- Else `fix` or `perf` in title will do a `patch` release
  `fix: null check bug`
- Else no release
  `docs: update website`

