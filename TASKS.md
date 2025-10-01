# Daily and Milestone Tasks

## Goals

- [ ] **Dev Experience Improvements (see
      [rnx-kit Roadmap](https://github.com/microsoft/rnx-kit/blob/main/ROADMAP.md))**
  - [ ] Make RNTA the best choice for library and app development.
  - [ ] Simplify initial setup, reduce required tooling.
  - [ ] Effortless inclusion of modules and changing RN versions.
  - [ ] Support standardized APIs across platforms (React Native WebAPIs).

---

## Daily Tasks

- [ ] **Issue Triage & Maintenance**
  - [ ] Review new issues and pull requests, apply labels.
  - [ ] Respond to questions, bug reports, and feature requests.
  - [ ] Update and close resolved issues.
  - [ ] Monitor the
        [Dependency Dashboard](https://github.com/microsoft/react-native-test-app/issues/492)
        for updates.
  - [ ] Review and address
        [security alerts](https://github.com/microsoft/react-native-test-app/security).

- [ ] **Continuous Integration (CI)**
  - [ ] Ensure CI
        [nightly builds](https://github.com/microsoft/react-native-test-app/actions/workflows/build.yml?query=event%3Aschedule)
        succeed for all supported platforms.
  - [ ] Address failing builds or flaky tests.
    - This entails figuring out where the failure happens, whose responsibility
      it is to fix or create workarounds, and possibly communicating with
      upstream projects to figure out expectations and solutions.
  - [ ] Review
        [dependency update PRs](https://github.com/search?q=repo%3Amicrosoft%2Freact-native-test-app+is%3Apr+is%3Aopen+author%3Aapp%2Fdependabot+author%3Aapp%2Frenovate&type=pullrequests).

- [ ] **Platform-Specific Upkeep**
  - [ ] Check for upstream changes in React Native and platform SDKs (Android,
        iOS, macOS, Windows).
  - [ ] Keep the app compatible with latest SDKs and tooling.

- [ ] **Documentation**
  - [ ] Update
        [`README`](https://github.com/microsoft/react-native-test-app/blob/trunk/README.md)
        and [wiki](https://github.com/microsoft/react-native-test-app/wiki) for
        new features, breaking changes, or platform instructions.
  - [ ] Document new APIs and configuration options.

- [ ] **Community Engagement**
  - [ ] Monitor Discord and GitHub discussions for feedback and requests.
  - [ ] Engage with contributors and reviewers.

---

## Future Milestones & Development Areas

- [ ] **Platform Support & Enhancements**
  - [ ] Support out-of-tree platforms
        ([issue #2211](https://github.com/microsoft/react-native-test-app/issues/2211)).

- [ ] **Feature Development**
  - [ ] Drop support for older React Native versions as new versions come out
        ([example PR](https://github.com/microsoft/react-native-test-app/pull/2545)).
  - [ ] Investigate `react-native-web` support
        ([issue #812](https://github.com/microsoft/react-native-test-app/issues/812)).

- [ ] **Release Management**
  - [ ] Plan and communicate breaking changes
        ([example issue](https://github.com/microsoft/react-native-test-app/issues/2544)).
  - [ ] Maintain
        [compatibility matrix with React Native and platforms](https://github.com/microsoft/react-native-test-app/wiki#react-native-versions).

- [ ] **Metrics & Community Feedback**
  - [ ] Track adoption rates, time savings, efficiency gains.
  - [ ] Gather and incorporate feedback from users and contributors.

---

See all current
[open issues and PRs](https://github.com/microsoft/react-native-test-app/issues)
for details and progress tracking.
