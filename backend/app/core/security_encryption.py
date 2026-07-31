from cryptography.fernet import Fernet
import os
import base64
from typing import Any
from sqlalchemy.types import TypeDecorator, String

# Retrieve or generate a key (In prod, this must be persistent!)
# For this demo, we'll try to read from env or generate a warning
# Ideally, we should perform a check at startup.

def get_encryption_key():
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        # Fallback for dev/demo if not set, but this is risky for persistence across restarts if not constant
        # We will warn.
        print("WARNING: ENCRYPTION_KEY not set. Generating a temporary one. Data will be lost on restart!")
        return Fernet.generate_key()
    return key.encode() if isinstance(key, str) else key

_cipher_suite = None

def get_cipher():
    global _cipher_suite
    if _cipher_suite is None:
        key = get_encryption_key()
        _cipher_suite = Fernet(key)
    return _cipher_suite

def encrypt_value(value: str) -> str:
    if value is None:
        return None
    cipher = get_cipher()
    encrypted = cipher.encrypt(value.encode('utf-8'))
    return encrypted.decode('utf-8')

def decrypt_value(value: str) -> str:
    if value is None:
        return None
    cipher = get_cipher()
    try:
        decrypted = cipher.decrypt(value.encode('utf-8'))
        return decrypted.decode('utf-8')
    except Exception as e:
        # If decryption fails (wrong key?), return raw or raise
        print(f"Decryption error: {e}")
        return f"<Encrypted>"

class EncryptedString(TypeDecorator):
    """EncryptedString handles automatic encryption/decryption for SQLAlchemy models."""
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt_value(str(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return decrypt_value(value)
