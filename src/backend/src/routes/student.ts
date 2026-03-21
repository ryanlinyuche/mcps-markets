import { Router } from 'express'
import { z } from 'zod'
import axios from 'axios'
import { fetchPage } from '../synergy.js'
import { validate } from '../middleware/validate.js'
import { logger } from '../logger.js'

const router = Router()

const BaseSchema = z.object({
  cookies: z.string().min(1),
  domain: z.string().min(1),
})

// POST /getStudentInfo
router.post('/getStudentInfo', validate(BaseSchema), async (req, res) => {
  const { cookies, domain } = req.body as z.infer<typeof BaseSchema>
  try {
    // Bug fix from original: correctly constructs the URL (original had "/+" syntax error)
    const html = await fetchPage(domain, 'PXP2_Student.aspx?AGU=0', cookies)
    if (html.includes('ParentVUE and StudentVUE Access')) {
      res.status(401).json({ error: 'Session expired' })
      return
    }
    res.json({ html })
  } catch (err) {
    logger.error('/getStudentInfo error', { err })
    res.status(502).json({ error: 'Failed to fetch student info' })
  }
})

// POST /getDocuments
router.post('/getDocuments', validate(BaseSchema), async (req, res) => {
  const { cookies, domain } = req.body as z.infer<typeof BaseSchema>
  try {
    const html = await fetchPage(domain, 'PXP2_Documents.aspx?AGU=0', cookies)
    if (html.includes('ParentVUE and StudentVUE Access')) {
      res.status(401).json({ error: 'Session expired' })
      return
    }
    res.json({ html })
  } catch (err) {
    logger.error('/getDocuments error', { err })
    res.status(502).json({ error: 'Failed to fetch documents' })
  }
})

// POST /getDocument
const DocumentSchema = BaseSchema.extend({ url: z.string().url() })

router.post('/getDocument', validate(DocumentSchema), async (req, res) => {
  const { cookies, url } = req.body as z.infer<typeof DocumentSchema>
  try {
    const response = await axios.get<ArrayBuffer>(url, {
      headers: {
        Cookie: cookies,
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (compatible; MCPSMarkets/1.0)',
      },
      responseType: 'arraybuffer',
      timeout: 30_000,
    })

    const contentType = response.headers['content-type'] as string ?? ''
    if (!contentType.includes('application/pdf')) {
      res.status(400).json({ error: 'URL did not return a PDF' })
      return
    }

    res.set('Content-Type', 'application/pdf')
    res.send(Buffer.from(response.data))
  } catch (err) {
    logger.error('/getDocument error', { err })
    res.status(502).json({ error: 'Failed to fetch document' })
  }
})

// POST /getStudentPhoto
const PhotoSchema = BaseSchema.extend({ url: z.string().url() })

router.post('/getStudentPhoto', validate(PhotoSchema), async (req, res) => {
  const { cookies, url } = req.body as z.infer<typeof PhotoSchema>
  try {
    const response = await axios.get<ArrayBuffer>(url, {
      headers: {
        Cookie: cookies,
        'User-Agent': 'Mozilla/5.0 (compatible; MCPSMarkets/1.0)',
      },
      responseType: 'arraybuffer',
      timeout: 15_000,
    })
    const contentType = (response.headers['content-type'] as string | undefined) ?? 'image/jpeg'
    res.set('Content-Type', contentType)
    res.send(Buffer.from(response.data))
  } catch (err) {
    logger.error('/getStudentPhoto error', { err })
    res.status(502).json({ error: 'Failed to fetch photo' })
  }
})

export default router
