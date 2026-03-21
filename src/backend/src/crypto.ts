import CryptoJS from 'crypto-js'
import { config } from './config.js'

/**
 * Encrypt a plaintext password using AES with the shared encryption key.
 * Returns a Base64-encoded ciphertext string (compatible with CryptoJS defaults).
 */
export function encryptPassword(password: string): string {
  return CryptoJS.AES.encrypt(password, config.encryptionKey).toString()
}

/**
 * Decrypt an AES-encrypted password string.
 */
export function decryptPassword(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, config.encryptionKey)
  return bytes.toString(CryptoJS.enc.Utf8)
}

/**
 * SHA-256 hash a string (used for anonymous user counting).
 */
export function sha256(value: string): string {
  return CryptoJS.SHA256(value).toString()
}

/**
 * Given a SOAP XML body that contains an encrypted <Password> field,
 * decrypt it in-place and return the modified XML.
 */
export function decryptXmlPassword(xml: string): string {
  // Match <Password>ENCRYPTED_VALUE</Password>
  return xml.replace(/<Password>([^<]+)<\/Password>/, (_match, enc: string) => {
    try {
      const plain = decryptPassword(enc.trim())
      if (!plain) throw new Error('Empty decryption result')
      return `<Password>${plain}</Password>`
    } catch {
      throw new Error('Failed to decrypt password in SOAP XML')
    }
  })
}
