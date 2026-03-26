import { Router } from 'express'
import { z } from 'zod'
import axios from 'axios'
import { encryptPassword, decryptXmlPassword } from '../crypto.js'
import { validate } from '../middleware/validate.js'
import { logger } from '../logger.js'

const router = Router()

// POST /encryptPassword
// Encrypts a plain password and returns the AES ciphertext
const EncryptSchema = z.object({ password: z.string().min(1) })

router.post('/encryptPassword', validate(EncryptSchema), (req, res) => {
  try {
    const encrypted = encryptPassword(req.body.password as string)
    res.json({ encryptedPassword: encrypted })
  } catch (err) {
    logger.error('encryptPassword error', { err })
    res.status(500).json({ error: 'Encryption failed' })
  }
})

// POST /fulfillAxios
// Forwards a SOAP XML request to a Synergy URL.
// If encrypted=true, decrypts the <Password> in the XML first.
const FulfillSchema = z.object({
  url: z.string().url(),
  xml: z.string().min(1),
  encrypted: z.boolean().optional().default(false),
  headers: z.record(z.string()).optional(),
})

router.post('/fulfillAxios', validate(FulfillSchema), async (req, res) => {
  const { url, xml, encrypted, headers: extraHeaders } = req.body as z.infer<typeof FulfillSchema>

  let processedXml = xml
  if (encrypted) {
    try {
      processedXml = decryptXmlPassword(xml)
    } catch (err) {
      logger.warn('Failed to decrypt XML password', { err })
      res.status(400).json({ status: false, error: 'Failed to decrypt password in request' })
      return
    }
  }

  try {
    const response = await axios.post<string>(url, processedXml, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://edupoint.com/webservices/ProcessWebServiceRequestMultiWeb',
        'User-Agent': 'StudentVUE/11.0.0 CFNetwork/1568.300.1 Darwin/24.2.0',
        ...extraHeaders,
      },
      timeout: 30_000,
    })
    res.json({ status: true, response: response.data })
  } catch (err) {
    logger.error('fulfillAxios error', { url, err })
    if (axios.isAxiosError(err)) {
      res.status(502).json({ status: false, error: err.message, response: err.response?.data ?? null })
    } else {
      res.status(500).json({ status: false, error: 'Request failed' })
    }
  }
})

export default router
