/**
 * crypto.js - Web Crypto API 기반 암호화/복호화/해싱 유틸리티
 */

const CryptoUtil = {
  /**
   * 문자열을 SHA-256 해시로 변환
   */
  async sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * 랜덤 salt 생성 (16바이트, hex 문자열)
   */
  generateSalt() {
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * 비밀번호 + salt로 AES-GCM 키 파생 (PBKDF2)
   */
  async deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    const saltBytes = new Uint8Array(salt.match(/.{2}/g).map(h => parseInt(h, 16)));
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  /**
   * AES-GCM 암호화 → Base64 문자열 (iv + ciphertext)
   */
  async encrypt(plainText, password, salt) {
    const key = await this.deriveKey(password, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plainText)
    );
    // iv(12bytes) + ciphertext를 합쳐서 Base64로 인코딩
    const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuffer), iv.length);
    return btoa(String.fromCharCode(...combined));
  },

  /**
   * AES-GCM 복호화 ← Base64 문자열
   */
  async decrypt(encryptedBase64, password, salt) {
    const key = await this.deriveKey(password, salt);
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decBuffer);
  },

  /**
   * 비밀번호 해시 생성 (salt 포함)
   */
  async hashPassword(password, salt) {
    return this.sha256(salt + password);
  },

  /**
   * 비밀번호 검증
   */
  async verifyPassword(password, salt, hash) {
    const computed = await this.hashPassword(password, salt);
    return computed === hash;
  }
};
