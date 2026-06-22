import pytest
import os
import tempfile

def test_encrypt_decrypt_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.db"))
    from security.encryption import encrypt, decrypt
    plaintext = "sk-test-api-key-12345"
    ciphertext = encrypt(plaintext)
    assert ciphertext != plaintext
    assert decrypt(ciphertext) == plaintext

def test_different_plaintexts_produce_different_ciphertexts(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.db"))
    from security.encryption import encrypt
    c1 = encrypt("key-one")
    c2 = encrypt("key-two")
    assert c1 != c2

def test_decrypt_invalid_raises(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.db"))
    from security.encryption import decrypt
    with pytest.raises(ValueError):
        decrypt("not-valid-ciphertext")
