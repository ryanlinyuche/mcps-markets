import { describe, it, expect } from 'vitest'
import { encryptPassword, decryptPassword, sha256, decryptXmlPassword } from '../crypto.js'

describe('crypto', () => {
  it('encrypt → decrypt roundtrip', () => {
    const plain = 'hunter2'
    const encrypted = encryptPassword(plain)
    expect(encrypted).not.toBe(plain)
    expect(decryptPassword(encrypted)).toBe(plain)
  })

  it('different plaintexts produce different ciphertext', () => {
    const a = encryptPassword('password1')
    const b = encryptPassword('password2')
    expect(a).not.toBe(b)
  })

  it('sha256 returns consistent hex hash', () => {
    const hash = sha256('test')
    expect(hash).toHaveLength(64)
    expect(sha256('test')).toBe(hash)
    expect(sha256('other')).not.toBe(hash)
  })

  it('decryptXmlPassword decrypts <Password> in SOAP XML', () => {
    const plain = 'mySecretPass'
    const enc = encryptPassword(plain)
    const xml = `<Request><Username>user</Username><Password>${enc}</Password></Request>`
    const result = decryptXmlPassword(xml)
    expect(result).toBe(`<Request><Username>user</Username><Password>${plain}</Password></Request>`)
  })

  it('decryptXmlPassword throws on invalid ciphertext', () => {
    const xml = '<Password>not-valid-ciphertext</Password>'
    expect(() => decryptXmlPassword(xml)).toThrow('Failed to decrypt password in SOAP XML')
  })
})
