fn main() {
    if let Err(error) = vaultora_lib::native_host::run() {
        eprintln!("Vaultora native host stopped: {error}");
        std::process::exit(1);
    }
}
