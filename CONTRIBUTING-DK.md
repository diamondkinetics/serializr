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
