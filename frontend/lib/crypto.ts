const SALT = new TextEncoder().encode("gtu-examai-community-v1");
const INFO = new TextEncoder().encode("room-aes-gcm-key");

/**
 * Derive a 256-bit AES-GCM key from arbitrary key material via HKDF-SHA-256.
 * The derived key is non-exportable.
 */
export async function deriveRoomKey(keyMaterial: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(keyMaterial);
  const base = await crypto.subtle.importKey("raw", raw, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: SALT, info: INFO },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(
  key: CryptoKey,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  // Use ArrayBuffer directly to satisfy strict WebCrypto types.
  const ivBuf = new ArrayBuffer(12);
  crypto.getRandomValues(new Uint8Array(ivBuf));

  const rawText = new TextEncoder().encode(plaintext);
  const plainBuf: ArrayBuffer = rawText.buffer.slice(rawText.byteOffset, rawText.byteOffset + rawText.byteLength);

  const encryptedBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv: ivBuf }, key, plainBuf);
  return {
    ciphertext: _bufToBase64(encryptedBuf),
    iv: _bufToBase64(ivBuf),
  };
}

export async function decryptMessage(
  key: CryptoKey,
  ciphertext: string,
  iv: string
): Promise<string> {
  const cipherBuf = _base64ToBuf(ciphertext);
  const ivBuf = _base64ToBuf(iv);
  const decryptedBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuf }, key, cipherBuf);
  return new TextDecoder().decode(decryptedBuf);
}

function _bufToBase64(buf: ArrayBuffer): string {
  return btoa(Array.from(new Uint8Array(buf)).map((b) => String.fromCharCode(b)).join(""));
}

function _base64ToBuf(b64: string): ArrayBuffer {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
