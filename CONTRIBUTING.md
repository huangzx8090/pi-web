# Contributing

First off, thanks for taking the time to contribute! 🎉

> This is a **personal fork** of [agegr/pi-web](https://github.com/agegr/pi-web)
> focused on a Codex-style, project-first UI. It is not the official project.

## What kind of changes fit here

The fork has a clear direction: make Pi Web feel closer to **Codex**.

Welcome:

- Bug fixes, performance work, accessibility, and i18n for the redesigned UI
- Refinements to the sidebar, project lifecycle, archive, and auto-titles
- Cross-platform fixes (especially Windows/Linux paths and the folder picker)

Please open an issue **before** starting a large change so we can agree on the
direction. Changes that pull the UI back toward the original dense layout will
likely be declined here — consider sending those upstream instead.

## Development

Requires Node.js **22.19.0+**.

```bash
git clone https://github.com/huangzx8090/pi-web.git
cd pi-web
npm install
npm run dev
```

The dev server runs at <http://127.0.0.1:30141>.

### Checks

Run all of these before opening a PR:

```bash
npm test
node_modules/.bin/tsc --noEmit
npm run lint
```

All three must be green. New behavior should come with tests where practical —
the existing suite mixes pure-function tests with source-level assertions.

> Do **not** run `next build` / `npm run build` during normal development. It
> writes to `.next/` and can interfere with the dev server.

## Commit style

- Use the conventional-ish prefixes already used in the history: `feat:`,
  `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Keep the subject under ~72 characters; explain the *why* in the body.
- One logical change per commit when possible.

## Pull requests

- Fill out the pull request template.
- Link the issue it closes (`Closes #123`).
- Describe how you tested it, and include a screenshot/GIF for UI changes.

## Notes for maintainers

This fork tracks upstream. To sync:

```bash
git fetch origin
git rebase origin/main
git push --force-with-lease fork main
```

Some local launcher customizations (standalone Chrome app window, the instance
manager page) are macOS-specific and intentionally **not** upstreamable.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](./LICENSE).
