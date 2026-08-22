export function AboutPanel() {
  return (
    <section className="content-card about-card">
      <img src="/vaultora-mark.svg" className="brand-mark" alt="" />
      <p className="eyebrow">Vaultora 0.1.0</p>
      <h2>Private by architecture, useful by default.</h2>
      <p>Vaultora is an open-source, local-first password manager for Windows, macOS, and Linux. It does not require an account or cloud service.</p>
      <div className="about-grid">
        <div><strong>Encryption</strong><span>Argon2id + XChaCha20-Poly1305</span></div>
        <div><strong>License</strong><span>Apache-2.0</span></div>
        <div><strong>Source</strong><a href="https://github.com/sanskarIN" target="_blank" rel="noreferrer">github.com/sanskarIN</a></div>
        <div><strong>Support</strong><a href="mailto:supportramsandesh@gmail.com">supportramsandesh@gmail.com</a></div>
        <div><strong>Business</strong><a href="mailto:sanskarin@outlook.in">sanskarin@outlook.in</a></div>
        <div><strong>Business</strong><a href="mailto:sanskarin.business@gmail.com">sanskarin.business@gmail.com</a></div>
      </div>
      <a className="button coffee" href="https://buymeacoffee.com/sanskarIN" target="_blank" rel="noreferrer">Buy Me a Coffee</a>
      <p className="watermark">Made by the Sanskar</p>
      <p className="fine-print">Security-sensitive software benefits from independent review. Review SECURITY.md and THREAT_MODEL.md before relying on Vaultora for high-value secrets.</p>
    </section>
  );
}
