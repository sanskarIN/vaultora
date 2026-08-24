fn main() {
    let args: Vec<_> = std::env::args_os().skip(1).collect();
    if vaultora_lib::native_host::is_native_host_invocation(&args) {
        if let Err(error) = vaultora_lib::native_host::run() {
            eprintln!("Vaultora native host stopped: {error}");
            std::process::exit(1);
        }
        return;
    }

    vaultora_lib::run();
}
