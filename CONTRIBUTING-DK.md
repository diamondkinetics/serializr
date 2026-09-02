# Contributing to the DiamondKinetics fork

This fork lives two lives. It is published internally as
`@diamondkinetics/serializr`, and it is also where we prepare contributions
back to [mobxjs/serializr](https://github.com/mobxjs/serializr). Those two jobs
want different content in the tree, so this file records how they stay apart.

For upstream's own house rules — yarn not npm, tests required, eslint and
prettier clean — see [CONTRIBUTING.md](CONTRIBUTING.md). They apply here too.

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | The DiamondKinetics fork. Default branch. Versioned and published from here. |
| `upstream/**` | Work destined for mobxjs. **Cut from `mobxjs/master`, never from `main`.** |
| anything else | Ordinary fork work, targeting `main`. |

`main` is the default branch (rather than upstream's `master`) so that
`diamondkinetics/versioner` works with its stock `target-branch`.

## Sending a change upstream

```bash
git remote add mobxjs https://github.com/mobxjs/serializr.git   # once
git fetch mobxjs

git checkout -b upstream/my-fix mobxjs/master
yarn install        # see the gotcha below
# ...make the change, then:
gh pr create --repo mobxjs/serializr --base master \
             --head diamondkinetics:upstream/my-fix
```

Branching from `mobxjs/master` is the whole discipline. Do it and the branch
cannot contain our package name or our workflows; skip it and the pull request
shows a stranger our CI configuration.

`dk-guard-upstream.yml` enforces this on any `upstream/**` branch. It cannot
run on a correctly-cut branch, because such a branch does not contain the
workflow file — which is exactly the point: if the guard runs at all, the
branch was cut from the wrong place, and it says so.

## What is DiamondKinetics-only

Everything DK-specific lives in a path upstream does not have, so it can never
conflict with an upstream change:

- `.github/workflows/dk-*.yml`
- `CONTRIBUTING-DK.md` (this file)

The one shared file we do diverge on is `package.json`, in three keys:
`name` (scoped), `version` (ours), and `publishConfig.registry` (CodeArtifact,
so no publish can reach npmjs). Upstream's `node.js.yml` is left untouched.

Add anything new in a `dk-`prefixed path, and the guard picks it up
automatically.

## Releasing

Versioning and publishing are done from a maintainer's machine. There is no
release automation, and that is deliberate: `diamondkinetics/versioner` lives
in a private repo, which a public fork cannot use as an action, and the
`VERSIONER_TOKEN` that its git push needs is not exposed to public
repositories either. Releases are infrequent enough that neither hole is worth
working around.

Everything below has been verified end to end against a throwaway clone.

### 1. Refresh the CodeArtifact token

```bash
npm-login    # alias in ~/.zprofile; expires after 12 hours
```

Expands to `aws codeartifact login --tool npm --repository dk-npm --domain
diamond-kinetics --domain-owner 626803233223 --region us-east-1`, which writes
the registry and an auth token into `~/.npmrc`.

### 2. Bump the version

From a clean `main`:

```bash
npm version patch -m "versioner: Updated version to %s"
```

`patch` for a normal release; `minor` or `major` as needed. This runs
`preversion` (`yarn build && yarn test && git diff --exit-code`), writes the
new version, commits, tags `vX.Y.Z`, and then `postversion` **pushes the commit
and the tag to GitHub for you** — it is not a local-only step.

The `-m` is optional. Without it npm writes a bare `3.0.8` as the commit
message; with it the log matches the `versioner: Updated version to 3.0.8`
convention every other DiamondKinetics repo uses.

`npm version` works here despite the repo being on yarn — the lifecycle scripts
it runs are the ones in `package.json`, and they call `yarn` themselves.

### 3. Publish

```bash
npm publish
```

No `--registry` flag: `publishConfig.registry` in `package.json` points at
dk-npm. That field is the only thing standing between a stray publish and the
public registry — yarn berry ignores `~/.npmrc` entirely, and
`yarn config get npmRegistryServer` still reports `registry.yarnpkg.com`. Do
not remove it.

`npm publish` runs `prepare` (`yarn build && yarn build-docs`), so the shipped
`lib/` is always rebuilt from the commit being published. The typedoc run is
noisy and slow but harmless.

### 4. Confirm it landed

```bash
aws codeartifact list-package-versions --domain diamond-kinetics \
    --repository dk-npm --format npm --namespace diamondkinetics \
    --package serializr --region us-east-1 \
    --query '{default:defaultDisplayVersion,versions:versions[].version}'
```

For a change worth double-checking, install the published artifact into a
scratch directory and exercise it, rather than trusting the version number.

### Notes

- CI still runs on `main` and on pull requests (`dk-quality.yml`) — only
  versioning and publishing are manual.
- A version already in CodeArtifact cannot be republished. If a publish fails
  partway, check step 4 before bumping again.
- `npm version` refuses to run with a dirty working tree, and `preversion`
  fails the release if the build or tests fail. Both are intentional guards;
  don't pass `--force`.

## Gotcha: switching between `main` and an `upstream/**` branch

`package.json`'s `name` differs between them, and that name is yarn's workspace
identifier. Switching branches without reinstalling leaves yarn's install state
pointing at the other name, and binaries go missing:

```
$ yarn test
command not found: jest
```

Run `yarn install` after switching. It rewrites nothing in `yarn.lock` — the
lockfile entry it needs is already there for whichever name is checked out.
