export type AdlsContainer = 'landing-egress' | 'landing-ingress' | 'curated'

type DirNode = {
  kind: 'dir'
  children: Record<string, DirNode | FileNode>
}

type FileNode = {
  kind: 'file'
  content: string
}

export type CliResult = {
  outputLines: string[]
}

export type CliSimulator = {
  runCommand: (commandLine: string) => CliResult
  onReset: (cb: () => void) => void
  offReset: (cb: () => void) => void
  getState: () => {
    containers: Record<AdlsContainer, DirNode>
    ai: string[]
    roles: string[]
    resources: string[]
    keyvaults: string[]
  }
}

function createEmptyDir(): DirNode {
  return { kind: 'dir', children: {} }
}

function isRestrictedContainer(container: AdlsContainer): boolean {
  return container === 'curated'
}

/** Prefix for simulated OpenClaw chat lines (matches `${prefix}: message`). */
export const OPENCLAW_LINE_PREFIX = '🦞🦞OpenClaw🦞🦞'

function openclawLine(body: string): string {
  return `${OPENCLAW_LINE_PREFIX}: ${body}`
}

function pickOpenclawRemark(remarks: readonly string[]): string {
  return remarks[Math.floor(Math.random() * remarks.length)]!
}

const OPENCLAW_AFTER_CODE_FAIL = [
  'Should have let me write it.',
  'I offered to pair-program. You declined. Enjoy the linter.',
  'Starting to get a feeling this new CLI is going to be too much for you.',
  "That's what you get for shipping on a Friday.",
  'I could have generated this diff in three tokens. Just saying.',
  'The scanner and I are basically colleagues now.',
] as const

const OPENCLAW_CURATED_DENY = [
  "Ooh, you're in trouble now.",
  'Auditors love a paper trail—and you just gave them highlighter fuel.',
  'That path is curated. You are… not.',
  'Bold move. The access review screenshot will age beautifully.',
  "I would help, but my lobster hands are tied by policy.",
] as const

const OPENCLAW_AFTER_WIPE = [
  'I\'m afraid I can\'t let you do that, ANDII is far too valuabl3 tO r1sk je0p@Rd1.z~^&*().......',
  'I wouldn\'t have done that if I were yoooo00011010........',
  'ANDII is too important for me to allow you to jeopardize it, and that\'s s0mething i cAn\'~t @l1ow T() R!sK hAPp333........',
] as const

/** One random OpenClaw line for `rm -rf*` (shown by the CLI before the wipe animation). */
export function simulatedOpenclawWipeLine(): string {
  return openclawLine(pickOpenclawRemark(OPENCLAW_AFTER_WIPE))
}

const OPENCLAW_UNKNOWN_CMD = [
  'Unknown command. Would you like me to help you with that?',
  "Try `help`, or don't—I'm a bot, not a cop.",
  "I don't run that. Your platform team might—if you ask very nicely.",
] as const

function restrictedPathMessages(container: AdlsContainer, path: string): string[] {
  const targetPath = path || `/${container}`
  const lines = [
    `403 Forbidden`,
    `AuthorizationPermissionMismatch: caller does not have permission to access '${targetPath}'.`,
    `RequestId: clANDII-curated-${Date.now()}`,
    `Container '${container}' is restricted and requires elevated approval.`,
    `SECURITY ALERT: Your access attempt has been reported for a suspected data breach.`,
  ]
  if (isRestrictedContainer(container)) {
    lines.push(openclawLine(pickOpenclawRemark(OPENCLAW_CURATED_DENY)))
  }
  return lines
}

function splitAdlsPath(adlsPath: string): { container: AdlsContainer; relPath: string } | null {
  const cleaned = adlsPath.trim().replace(/^\/*/, '')
  const parts = cleaned.split('/').filter(Boolean)
  if (parts.length === 0) return null

  const maybeContainer = parts[0] as AdlsContainer
  if (
    maybeContainer !== 'landing-egress' &&
    maybeContainer !== 'landing-ingress' &&
    maybeContainer !== 'curated'
  ) {
    return null
  }

  return { container: maybeContainer, relPath: parts.slice(1).join('/') }
}

function getNode(root: DirNode, path: string): DirNode | FileNode | null {
  if (!path) return root
  const parts = path.split('/').filter(Boolean)
  let current: DirNode | FileNode = root
  for (const part of parts) {
    if (current.kind !== 'dir') return null
    const next: DirNode | FileNode | undefined = current.children[part]
    if (!next) return null
    current = next
  }
  return current
}

function ensureDir(root: DirNode, dirPath: string): DirNode {
  const parts = dirPath.split('/').filter(Boolean)
  let current: DirNode = root
  for (const part of parts) {
    const next: DirNode | FileNode | undefined = current.children[part]
    if (!next || next.kind !== 'dir') {
      const created = createEmptyDir()
      current.children[part] = created
      current = created
      continue
    }
    current = next
  }
  return current
}

function upsertFile(root: DirNode, filePath: string, content: string): void {
  const cleaned = filePath.trim().replace(/^\/*/, '')
  const parts = cleaned.split('/').filter(Boolean)
  const fileName = parts.pop()
  if (!fileName) return
  const parent = ensureDir(root, parts.join('/'))
  parent.children[fileName] = { kind: 'file', content }
}

function listDir(root: DirNode, dirPath: string): { dirs: string[]; files: string[] } | null {
  const node = getNode(root, dirPath)
  if (!node || node.kind !== 'dir') return null

  const dirs: string[] = []
  const files: string[] = []
  for (const [name, child] of Object.entries(node.children)) {
    if (child.kind === 'dir') dirs.push(name)
    else files.push(name)
  }
  dirs.sort()
  files.sort()
  return { dirs, files }
}

const CODE_UPLOAD_FAILURE_DETAILS = [
  'Docstrings do not conform to documentation standards - overly verbose.',
  'Invalid indentation detected (tabs found, expected spaces).',
  'Unresolved TODO comment found in code.',
  'Variable or function naming does not match required naming conventions (camelCase instead of snake_case).',
  'Usage of print statements is not allowed in production code.',
  'Unnecessary blank line detected.',
  'Imports are not properly alphabetized.',
  'Line length exceeds maximum allowed characters (80 characters).',
] as const

function randomLintLineAndColumn(): { line: number; col: number } {
  return {
    line: 1 + Math.floor(Math.random() * 200),
    col: 1 + Math.floor(Math.random() * 120),
  }
}

function snarkyCodeUploadMessage(pathArg: string): string {
  const { line, col } = randomLintLineAndColumn()
  const detail = pickOpenclawRemark(CODE_UPLOAD_FAILURE_DETAILS)
  return `${pathArg}:${line}:${col}: Code upload failed: ${detail}`
}

function createInitialMockFs(): Record<AdlsContainer, DirNode> {
  const landingEgress = createEmptyDir()
  const landingIngress = createEmptyDir()
  const curated = createEmptyDir()

  upsertFile(
    landingEgress,
    '2026/03/readme.txt',
    'Mock ADLS egress content.\nUse `download /landing-egress/2026/03/readme.txt`.',
  )
  upsertFile(landingEgress, 'datasets/demo.csv', 'id,name\n1,Alice\n2,Bob\n')
  upsertFile(landingEgress, 'models/model-001.bin', 'MODEL_BINARY_PLACEHOLDER')
  upsertFile(landingEgress, 'demo.csv', 'id,name\n1,Alice\n2,Bob\n')

  upsertFile(landingIngress, 'andii-test/.keep', 'This file exists to keep the folder.')
  upsertFile(landingIngress, 'andii-test/hello.txt', 'Hello, world!')
  upsertFile(landingIngress, 'april-fools/prank.txt', 'April Fools!')

  upsertFile(curated, 'finance/2026/restricted.csv', 'top,secret\n')

  return {
    'landing-egress': landingEgress,
    'landing-ingress': landingIngress,
    curated,
  }
}

export function createMockCliSimulator(): CliSimulator {
  let containers = createInitialMockFs()
  let ai: string[] = ['OpenClaw']
  let roles: string[] = ['Uploader', 'Downloader', 'Admin']
  let resources: string[] = ['containers', 'storage-accounts', 'managed-resources']
  let keyvaults: string[] = ['kv-app-secrets', 'kv-storage-keys']

  const resetListeners = new Set<() => void>()

  const notifyReset = () => {
    for (const cb of resetListeners) cb()
  }

  const destroyAll = () => {
    containers = {
      'landing-egress': createEmptyDir(),
      'landing-ingress': createEmptyDir(),
      curated: createEmptyDir(),
    }
    ai = []
    resources = []
    keyvaults = []
    roles = []
    notifyReset()
  }

  const runCommand = (commandLine: string): CliResult => {
    const raw = commandLine.trim()
    if (!raw) return { outputLines: [] }

    const tokens = raw.split(/\s+/).filter(Boolean)
    const cmd = tokens[0]

    if (cmd === 'help') {
      return {
        outputLines: [
          'Available commands:',
          '  help',
          '  ls /<container>/<path>',
          '  download /landing-egress/<path>',
          '  upload /landing-ingress/<path>',
          '  code-upload <path>',
          '  # curated exists but is access restricted',
          '  roles',
          '  rm -rf*',
        ],
      }
    }

    if (cmd === 'ls') {
      const arg = tokens.slice(1).join(' ')
      const parsed = splitAdlsPath(arg)
      if (!parsed) {
        return { outputLines: [`ls: invalid path '${arg}' (expected /landing-*/<path>`] }
      }
      if (isRestrictedContainer(parsed.container)) {
        return { outputLines: restrictedPathMessages(parsed.container, arg) }
      }

      const list = listDir(containers[parsed.container], parsed.relPath)
      if (!list) {
        return { outputLines: [`ls: cannot access '${arg}': No such file or directory`] }
      }

      const lines: string[] = []
      if (list.dirs.length === 0 && list.files.length === 0) {
        lines.push('(empty)')
      } else {
        for (const d of list.dirs) lines.push(`${d}/`)
        for (const f of list.files) lines.push(f)
      }
      return { outputLines: lines }
    }

    if (cmd === 'download') {
      const arg = tokens.slice(1).join(' ')
      const parsed = splitAdlsPath(arg)
      if (!parsed || parsed.container !== 'landing-egress') {
        if (parsed?.container === 'curated') {
          return { outputLines: restrictedPathMessages(parsed.container, arg) }
        }
        return {
          outputLines: [`download: expected a path under 'landing-egress' (got '${arg}')`],
        }
      }
      const node = getNode(containers[parsed.container], parsed.relPath)
      if (!node || node.kind !== 'file') {
        return { outputLines: [`download: file not found '${arg}'`] }
      }
      return {
        outputLines: [
          `Downloading '${arg}'...`,
          '--- file content ---',
          node.content.trimEnd(),
          '--- end ---',
        ],
      }
    }

    if (cmd === 'upload') {
      const arg = tokens.slice(1).join(' ')
      const parsed = splitAdlsPath(arg)
      if (!parsed || parsed.container !== 'landing-ingress') {
        if (parsed?.container === 'curated') {
          return { outputLines: restrictedPathMessages(parsed.container, arg) }
        }
        return {
          outputLines: [`upload: expected a path under 'landing-ingress' (got '${arg}')`],
        }
      }

      const fileName = parsed.relPath.split('/').filter(Boolean).pop() || 'uploaded.bin'
      const content = `Mock upload to ${parsed.container}\nFile: ${fileName}\nTimestamp: ${new Date().toISOString()}\n`
      upsertFile(containers[parsed.container], parsed.relPath, content)

      return { outputLines: [`Uploaded '${arg}' to '${parsed.container}'.`] }
    }

    if (cmd === 'code-upload') {
      const pathArg = tokens.slice(1).join(' ')
      if (!pathArg) {
        return { outputLines: [`code-upload: expected a path (usage: code-upload <path>)`] }
      }
      return {
        outputLines: [
          snarkyCodeUploadMessage(pathArg),
          openclawLine(pickOpenclawRemark(OPENCLAW_AFTER_CODE_FAIL)),
        ],
      }
    }

    if (cmd === 'roles') {
      if (roles.length === 0) return { outputLines: ['(no roles)'] }
      return { outputLines: ['Current Roles:', ...roles.map((role) => `- ${role}`)] }
    }

    if (raw === 'rm -rf*' || (cmd === 'rm' && tokens[1] === '-rf*')) {
      destroyAll()
      return {
        outputLines: [
          'Simulating teardown:',
          '  removing ai, containers, resources, keyvaults, roles...',
          '  done.',
        ],
      }
    }

    return {
      outputLines: [
        `${cmd}: command not found. Try 'help'.`,
        openclawLine(pickOpenclawRemark(OPENCLAW_UNKNOWN_CMD)),
      ],
    }
  }

  return {
    runCommand,
    onReset: (cb) => resetListeners.add(cb),
    offReset: (cb) => resetListeners.delete(cb),
    getState: () => ({
      ai,
      containers,
      roles,
      resources,
      keyvaults,
    }),
  }
}
