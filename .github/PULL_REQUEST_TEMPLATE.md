## Description

<!-- Briefly describe the change and why it is needed. -->

## Checklist

- [ ] `npm run lint` passes
- [ ] `npm run server:build` passes (includes tsc + madge circular check)
- [ ] `cd frontend && npm run build` passes
- [ ] No circular import dependencies introduced
- [ ] Types are explicit — no `any` at exported boundaries
- [ ] Changes work on both `linux/amd64` and `linux/arm64`
- [ ] Fork-specific files updated if necessary (`Dockerfile.fork`, `compose.fork.yml`)
- [ ] Docs updated if public-facing behaviour changed
