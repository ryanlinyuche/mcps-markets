import { Router } from 'express'
import { z } from 'zod'
import { fetchPage, getAssignments } from '../synergy.js'
import { enqueue } from '../taskQueue.js'
import { validate } from '../middleware/validate.js'
import { logger } from '../logger.js'

const router = Router()

const BaseSchema = z.object({
  cookies: z.string().min(1),
  domain: z.string().min(1),
})

// POST /getHomePageGrades
router.post('/getHomePageGrades', validate(BaseSchema), async (req, res) => {
  const { cookies, domain } = req.body as z.infer<typeof BaseSchema>
  try {
    const html = await fetchPage(domain, 'PXP2_GradeBook.aspx?AGU=0', cookies)
    // Detect session expiry
    if (html.includes('Internal Server Error') || html.includes('Object moved')) {
      res.status(401).json({ error: 'Session expired' })
      return
    }
    res.json({ html })
  } catch (err) {
    logger.error('/getHomePageGrades error', { err })
    res.status(502).json({ error: 'Failed to fetch grades' })
  }
})

// POST /getAssignments
const AssignmentsSchema = BaseSchema.extend({
  senddata: z.unknown(),
})

router.post('/getAssignments', validate(AssignmentsSchema), async (req, res) => {
  const { cookies, domain, senddata } = req.body as z.infer<typeof AssignmentsSchema>
  const key = cookies.slice(0, 64) // use part of cookie as queue key

  try {
    const result = await enqueue(key, () => getAssignments(domain, cookies, senddata))
    const [assignments, classData] = result as [unknown, unknown]
    res.json({ status: 'ok', assignments, classData })
  } catch (err) {
    logger.error('/getAssignments error', { err })
    res.status(502).json({ error: 'Failed to fetch assignments' })
  }
})

export default router
