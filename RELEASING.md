# Releasing

The release script follows the local publishing workflow in [nuxt-codemirror](https://github.com/ThimoDEV/nuxt-codemirror/blob/master/package.json) and the [Nuxt module author guide](https://nuxt.com/docs/4.x/guide/modules/getting-started): validate, build, generate a changelog and version from Conventional Commits, publish to npm, then push tags.

## Before the first release

1. Check the name with `pnpm view tunnel-rat-vue`. The registry returned 404 on 2026-10-22. This does not reserve the name or guarantee that npm will accept it for your account.
2. Review the initial version, MIT license, author, repository, and exports. The current version is `0.1.0`; the general release script calculates a version bump. Use the explicit first-release steps below to publish `0.1.0`.
3. Authenticate with `pnpm login` and check the intended account with `pnpm whoami`. Interactive publishing requires npm account two-factor authentication. See [npm's publishing authentication requirements](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/).
4. Commit the implementation on `master` using Conventional Commits, for example `feat: add Vue tunnels and TresJS playground`. Start a release with a clean working tree and an up-to-date remote.
5. Install Chromium with `pnpm exec playwright install chromium`.

## Validate without publishing

```sh
pnpm install --frozen-lockfile
pnpm release:check
```

This runs Oxlint, Oxfmt's formatting check, type checks, unit tests, ESM/CommonJS consumer checks, library and playground builds, the Chromium integration test, and `pnpm pack --dry-run`. It does not change versions, push, or publish.

For an installable local artifact, run `pnpm pack`. The tarball should contain `dist/`, README, LICENSE, and package metadata. Vue stays external as a peer dependency. Playground assets, test code, and development dependencies are excluded from the published files.

## Publish when ready

For the first release at exactly `0.1.0`, start with a clean checkout and a passing GitHub CI run, then:

```sh
pnpm release:check
pnpm exec changelogen --from 6178560 -r 0.1.0 --output CHANGELOG.md --noAuthors
pnpm format
git add CHANGELOG.md
git commit -m "chore: release v0.1.0"
git tag -a v0.1.0 -m "v0.1.0"
pnpm publish --access public
git push --follow-tags
```

The initial version is already `0.1.0`, so generate the changelog from the initial commit without asking Changelogen to bump it. Review the generated changelog before committing and publishing. Commit any release documentation updates before these steps.

For subsequent releases with an automatic version bump:

```sh
pnpm release
```

This command has external effects:

1. Runs `release:check`.
2. Runs `changelogen --release` to update the version and changelog and create the release commit and tag.
3. Publishes publicly to npm. The `prepack` lifecycle builds the distribution again with the updated metadata.
4. Pushes commits and tags with `git push --follow-tags`.

If publication succeeds but the push fails, fix the Git connection and retry the push. Do not rerun the whole release script and bump the version again. If publication fails after changelogen has created a release commit/tag, resolve the npm problem and publish that prepared version before pushing.

There is no automatic npm publication in CI. For future releases through GitHub Actions, configure [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) for the exact repository and workflow, then add a publishing workflow with `id-token: write`. npm's documented CLI requirements are npm 11.5.1+ and Node.js 22.14.0+. Use pnpm for dependencies and builds; follow npm's supported OIDC publishing setup for the publish step.
