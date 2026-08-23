# Vaultora Support

## Before requesting help

Please check:

1. [README.md](README.md)
2. [docs/setup.md](docs/setup.md)
3. [docs/troubleshooting.md](docs/troubleshooting.md)
4. existing GitHub issues
5. the newest release notes in [CHANGELOG.md](CHANGELOG.md)

## Bug reports

For ordinary bugs, use the GitHub bug-report template and include:

- Vaultora version or commit;
- operating system/version;
- exact steps to reproduce;
- expected and actual behavior;
- sanitized logs if relevant;
- screenshots only when they contain no private vault data.

Never attach a real `.vaultora` file, master password, current/previous password, API token, private key or personal identity record.

## Security reports

Potential vulnerabilities must follow [SECURITY.md](SECURITY.md), not a public issue.

## Master-password recovery

Vaultora deliberately has no recovery server, escrow key or account administrator. If the master password is forgotten, the project cannot decrypt the vault. Keep an independent recovery copy of the master password/passphrase somewhere safe and appropriate for your risk model.

## Backup recovery

Encrypted exports use the `.vaultora` extension and remain protected by the master password that was active when the backup was created. Test restores with non-critical data before relying on a backup strategy.

## Contact

- Support: `supportramsandesh@gmail.com`
- Project/business: `sanskarin@outlook.in`
- Business: `sanskarin.business@gmail.com`
- GitHub: https://github.com/sanskarIN/vaultora

## Supporting development

If Vaultora is useful to you, you can support continued development at:

https://buymeacoffee.com/sanskarIN

Support is optional and does not change security-report handling or access to the open-source code.

**Made by the Sanskar**
