const { z } = require('zod')
const { bad } = require('./errors')
const C = require('./constants')

// Strip control characters (keeps \n and \t) and normalise Unicode.
const clean = (s) => s.normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()
const text = (min, max, label) =>
  z.string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .transform(clean)
    .pipe(z.string().min(min, `${label} must be at least ${min} characters`).max(max, `${label} must be at most ${max} characters`))
const oneLine = (min, max, label) => text(min, max, label).refine((s) => !/[\r\n]/.test(s), `${label} must be a single line`)

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', 'qwertyuiop', 'iloveyou1',
  'letmein123', 'admin1234', 'welcome123', 'abc12345', 'passw0rd', '11111111', 'qwerty123'
])

const username = z.string({ required_error: 'Username is required' })
  .transform((s) => s.trim())
  .pipe(z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username must be at most 24 characters')
    .regex(/^[A-Za-z0-9_.]+$/, 'Use letters, numbers, dots and underscores only'))

const password = z.string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), 'That password is too common')

const email = z.string().trim().max(254).email('Enter a valid email address')

const avatar = z.string().max(220_000, 'Avatar is too large')
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Avatar must be a PNG, JPEG or WebP image')

const topicName = z.enum(C.TOPICS)

const schemas = {
  signup: z.object({ username, password, email: email.optional().or(z.literal('').transform(() => undefined)) }).strict()
    .refine((d) => d.password.toLowerCase() !== d.username.toLowerCase(), { path: ['password'], message: 'Password can’t match your username' }),
  login: z.object({ username: z.string().min(1).max(64), password: z.string().min(1).max(200) }).strict(),
  changePassword: z.object({ current: z.string().min(1).max(200), next: password }).strict(),

  createPoll: z.object({
    title: oneLine(12, 140, 'Question'),
    context: text(0, 600, 'Context').optional().default(''),
    option_a: oneLine(1, 28, 'Option A'),
    option_b: oneLine(1, 28, 'Option B'),
    topic: topicName,
    duration_hours: z.number().int().refine((n) => C.DURATIONS_HOURS.includes(n), 'Choose 6 hours, 1 day, 3 days or 7 days'),
    is_anonymous: z.boolean().default(false),
    arguments_enabled: z.boolean().default(true),
    hide_results: z.boolean().default(true)
  }).strict().refine((d) => d.option_a.toLowerCase() !== d.option_b.toLowerCase(), { path: ['option_b'], message: 'The two options must be different' }),
  editPoll: z.object({ context: text(0, 600, 'Context') }).strict(),
  vote: z.object({ option_id: z.number().int().positive() }).strict(),
  argument: z.object({ body: text(3, 600, 'Argument') }).strict(),
  report: z.object({ reason: z.enum(C.REPORT_REASONS), note: text(0, 300, 'Note').optional() }).strict(),
  outcome: z.object({ option_id: z.number().int().positive() }).strict(),

  profile: z.object({
    display_name: oneLine(1, 40, 'Display name').optional(),
    bio: text(0, 200, 'Bio').optional(),
    gender: z.enum(['', ...C.GENDERS]).optional(),
    birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').refine((s) => {
      const d = new Date(s + 'T00:00:00Z')
      if (Number.isNaN(d.getTime())) return false
      const age = (Date.now() - d.getTime()) / 31557600000
      return age >= 13 && age <= 120
    }, 'Enter a valid birthday (13 or older)').or(z.literal('')).optional(),
    region: oneLine(0, 60, 'Region').optional(),
    email: email.or(z.literal('')).optional(),
    avatar: avatar.nullable().optional()
  }).strict(),
  topics: z.object({ topics: z.array(topicName).min(1, 'Pick at least one topic').max(C.TOPICS.length) }).strict()
}

const feedQuery = z.object({
  lens: z.enum(['foryou', 'rising', 'fresh', 'needs', 'saved', 'close']).optional(),
  topic: z.string().max(40).optional(),
  q: z.string().max(80).optional(),
  tab: z.enum(['asked', 'voted', 'saved']).optional(),
  limit: z.coerce.number().int().min(1).max(C.MAX_PAGE_SIZE).default(C.PAGE_SIZE),
  offset: z.coerce.number().int().min(0).max(5000).default(0)
})

/** Validate `data` with `schema`, throwing a 400 AppError that lists each failing field. */
function parse(schema, data) {
  const result = schema.safeParse(data ?? {})
  if (result.success) return result.data
  const fields = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_'
    if (!fields[key]) fields[key] = issue.message
  }
  const first = Object.values(fields)[0]
  throw bad(first, fields)
}

const idParam = (value) => {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0 || n > 2147483647) throw bad('Invalid id')
  return n
}

module.exports = { schemas, feedQuery, parse, idParam }
