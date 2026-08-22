use crate::error::{Result, VaultError};
use crate::model::PasswordStrength;
use bip39::Language;
use rand::{rngs::OsRng, Rng};
use serde::Deserialize;

const LOWER: &[u8] = b"abcdefghijkmnopqrstuvwxyz";
const UPPER: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS: &[u8] = b"23456789";
const SYMBOLS: &[u8] = b"!@#$%^&*()-_=+[]{}:,.?";

#[derive(Debug, Clone, Deserialize)]
pub struct PasswordOptions {
    pub length: usize,
    #[serde(default = "yes")]
    pub lowercase: bool,
    #[serde(default = "yes")]
    pub uppercase: bool,
    #[serde(default = "yes")]
    pub digits: bool,
    #[serde(default = "yes")]
    pub symbols: bool,
}

fn yes() -> bool { true }

impl Default for PasswordOptions {
    fn default() -> Self {
        Self { length: 24, lowercase: true, uppercase: true, digits: true, symbols: true }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct PassphraseOptions {
    pub words: usize,
    #[serde(default = "default_separator")]
    pub separator: String,
    #[serde(default)]
    pub capitalize: bool,
    #[serde(default)]
    pub append_number: bool,
}

fn default_separator() -> String { "-".into() }

pub fn generate_password(options: PasswordOptions) -> Result<String> {
    if !(12..=128).contains(&options.length) {
        return Err(VaultError::Validation("password length must be between 12 and 128".into()));
    }
    let mut pools: Vec<&[u8]> = Vec::new();
    if options.lowercase { pools.push(LOWER); }
    if options.uppercase { pools.push(UPPER); }
    if options.digits { pools.push(DIGITS); }
    if options.symbols { pools.push(SYMBOLS); }
    if pools.is_empty() {
        return Err(VaultError::Validation("select at least one character class".into()));
    }
    if options.length < pools.len() {
        return Err(VaultError::Validation("length is too short for the selected character classes".into()));
    }

    let mut rng = OsRng;
    let mut output = Vec::with_capacity(options.length);
    for pool in &pools {
        output.push(pool[rng.gen_range(0..pool.len())]);
    }
    let alphabet: Vec<u8> = pools.iter().flat_map(|pool| pool.iter().copied()).collect();
    while output.len() < options.length {
        output.push(alphabet[rng.gen_range(0..alphabet.len())]);
    }
    // Fisher-Yates using the operating-system CSPRNG.
    for i in (1..output.len()).rev() {
        let j = rng.gen_range(0..=i);
        output.swap(i, j);
    }
    String::from_utf8(output).map_err(|_| VaultError::Crypto)
}

pub fn generate_passphrase(options: PassphraseOptions) -> Result<String> {
    if !(4..=12).contains(&options.words) {
        return Err(VaultError::Validation("passphrase must contain between 4 and 12 words".into()));
    }
    if options.separator.chars().count() > 4 || options.separator.chars().any(char::is_whitespace) {
        return Err(VaultError::Validation("separator must be 0 to 4 non-whitespace characters".into()));
    }
    let list = Language::English.word_list();
    let mut rng = OsRng;
    let mut words = Vec::with_capacity(options.words);
    for _ in 0..options.words {
        let mut word = list[rng.gen_range(0..list.len())].to_string();
        if options.capitalize {
            if let Some(first) = word.get_mut(0..1) {
                first.make_ascii_uppercase();
            }
        }
        words.push(word);
    }
    let mut phrase = words.join(&options.separator);
    if options.append_number {
        phrase.push_str(&format!("{:02}", rng.gen_range(0..100)));
    }
    Ok(phrase)
}

pub fn analyze_password(secret: &str) -> PasswordStrength {
    let length = secret.chars().count();
    let mut alphabet = 0usize;
    if secret.chars().any(|c| c.is_ascii_lowercase()) { alphabet += 26; }
    if secret.chars().any(|c| c.is_ascii_uppercase()) { alphabet += 26; }
    if secret.chars().any(|c| c.is_ascii_digit()) { alphabet += 10; }
    if secret.chars().any(|c| !c.is_ascii_alphanumeric()) { alphabet += 32; }
    let entropy_bits = if alphabet > 1 { (length as f64) * (alphabet as f64).log2() } else { 0.0 };
    let repetitive = length > 0 && secret.chars().collect::<std::collections::BTreeSet<_>>().len() <= 3;
    let sequential = ["123456", "abcdef", "qwerty", "password", "letmein"]
        .iter()
        .any(|needle| secret.to_ascii_lowercase().contains(needle));
    let mut score: u8 = match entropy_bits {
        e if e >= 100.0 => 4,
        e if e >= 75.0 => 3,
        e if e >= 50.0 => 2,
        e if e >= 35.0 => 1,
        _ => 0,
    };
    if repetitive || sequential { score = score.saturating_sub(2); }
    if length < 12 { score = score.min(1); }
    let label = ["very_weak", "weak", "fair", "strong", "very_strong"][score as usize];
    let mut suggestions = Vec::new();
    if length < 16 { suggestions.push("Use at least 16 characters when possible."); }
    if alphabet < 62 { suggestions.push("Mix more character classes or use a longer passphrase."); }
    if repetitive { suggestions.push("Avoid repeated characters and short repeated patterns."); }
    if sequential { suggestions.push("Avoid common words, keyboard patterns, and sequences."); }
    PasswordStrength { score, entropy_bits, label, suggestions }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generator_respects_length_and_classes() {
        let output = generate_password(PasswordOptions::default()).unwrap();
        assert_eq!(output.len(), 24);
        assert!(output.chars().any(|c| c.is_ascii_lowercase()));
        assert!(output.chars().any(|c| c.is_ascii_uppercase()));
        assert!(output.chars().any(|c| c.is_ascii_digit()));
        assert!(output.chars().any(|c| !c.is_ascii_alphanumeric()));
    }

    #[test]
    fn passphrase_uses_requested_word_count() {
        let phrase = generate_passphrase(PassphraseOptions { words: 6, separator: "-".into(), capitalize: false, append_number: false }).unwrap();
        assert_eq!(phrase.split('-').count(), 6);
    }
}
