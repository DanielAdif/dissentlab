import os
from cryptography.fernet import Fernet, InvalidToken

_fernet: Fernet | None = None

def _get_key_path() -> str:
    db_path = os.environ.get("DB_PATH", "/data/db/dissentlab.db")
    return os.path.join(os.path.dirname(db_path), "secret.key")

def get_or_create_fernet_key() -> Fernet:
    global _fernet
    if _fernet is not None:
        return _fernet
    key_path = _get_key_path()
    os.makedirs(os.path.dirname(key_path), exist_ok=True)
    if os.path.exists(key_path):
        with open(key_path, "rb") as f:
            key = f.read().strip()
    else:
        key = Fernet.generate_key()
        with open(key_path, "wb") as f:
            f.write(key)
    _fernet = Fernet(key)
    return _fernet

def encrypt(plaintext: str) -> str:
    fernet = get_or_create_fernet_key()
    return fernet.encrypt(plaintext.encode()).decode()

def decrypt(ciphertext: str) -> str:
    fernet = get_or_create_fernet_key()
    try:
        return fernet.decrypt(ciphertext.encode()).decode()
    except (InvalidToken, Exception) as e:
        raise ValueError(f"Decryption failed: {e}") from e
