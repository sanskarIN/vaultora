# Vaultora Performance

Vaultora optimizes for predictable security and correctness before micro-optimizing UI benchmarks. Performance work must not weaken KDF cost, authenticated encryption, validation, atomic persistence, or auto-lock behavior.

## Current architecture cost model

- Unlock cost is dominated intentionally by Argon2id key derivation.
- A mutation reserializes and re-encrypts the complete decrypted vault, so write cost grows approximately with total vault size.
- Entry list/search uses non-secret in-memory summaries.
- Full protected entry data is fetched only when an entry is selected.
- Local security audit is O(number of login entries plus password bytes) and runs only on explicit audit-screen load/refresh.
- Password history is capped to 10 items per login.

## Defensive ceilings are not targets

Current validation includes:

- 64 MiB encrypted-file read/write safety cap;
- 50,000 decrypted entries maximum;
- per-field, tag, notes, secret and password-history limits.

A vault close to these ceilings is a stress case, not the expected personal-vault workload.

## Release performance budgets

These are engineering targets to measure on representative release hardware, not hard security guarantees:

| Scenario | Target |
| --- | --- |
| Renderer usable after native window opens | < 1 s on a warm modern desktop |
| Entry search/filter for 5,000 summaries | < 100 ms interaction response |
| Open entry detail for 5,000-entry vault | < 150 ms excluding first unlock |
| Security audit for 5,000 logins | < 500 ms on a modern desktop |
| Save one entry in a 10 MiB encrypted vault | < 1 s excluding unusually slow storage |
| UI input response during normal unlocked browsing | < 100 ms |

Argon2 unlock is intentionally allowed to consume noticeable time because lowering KDF work simply to satisfy a startup benchmark would weaken offline-guess resistance.

## Benchmark fixtures

Performance fixtures must be synthetic and deterministic enough to compare runs. Generate entries with fictional names/domains and generated non-sensitive values. Never benchmark using a real user vault.

Suggested sizes:

- 100 entries — normal small vault;
- 1,000 entries — large personal vault;
- 5,000 entries — stress UI/audit case;
- 10 MiB encrypted payload — storage rewrite stress case.

## What to measure

### Rust

- Argon2 derivation duration by supported platform/CPU class;
- serialization + encryption time by payload size;
- encrypted atomic write duration;
- decrypt + deserialize + payload-validation duration;
- security-audit duration and allocations.

### Frontend

- first meaningful vault render after snapshot;
- filter/search response time;
- selection → detail render time;
- modal open/close response;
- layout stability at responsive breakpoints.

### Release package

- bundle size per platform;
- cold/warm launch observations;
- memory footprint locked vs unlocked using synthetic vaults.

## Performance regression policy

A change should be investigated when it produces a repeatable regression greater than roughly 20% in a representative benchmark or breaks an interaction budget, especially in entry filtering, save operations or audit analysis.

Security/correctness fixes may intentionally cost performance. Document the trade-off rather than weakening the fix.

## Future optimization options

Only pursue after measurement:

- precomputed normalized search fields in non-secret summary memory;
- worker/background audit computation with cancellation;
- reduced React rerenders through narrower state ownership;
- streaming serialization/encryption for very large payloads;
- a chunked/encrypted database format for O(changed-record) writes.

The last two materially change the cryptographic/storage design and require ADR + threat-model + migration work before implementation.

## Benchmark automation roadmap

A future non-blocking CI benchmark job can record synthetic benchmark artifacts and compare release candidates. It should not expose secrets, should not run on untrusted code with signing credentials, and should not make noisy single-run timing a merge blocker.
