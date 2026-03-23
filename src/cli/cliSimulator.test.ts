import { describe, expect, it } from 'vitest'
import { createMockCliSimulator } from './cliSimulator'

describe('cliSimulator', () => {
  it('help lists available commands', () => {
    const sim = createMockCliSimulator()
    const out = sim.runCommand('help')
    expect(out.outputLines.join('\n')).toContain('Available commands:')
  })

  it('ls lists egress content', () => {
    const sim = createMockCliSimulator()
    const out = sim.runCommand('ls /landing-egress/2026/03')
    expect(out.outputLines.join('\n')).toContain('readme.txt')
  })

  it('download prints file content', () => {
    const sim = createMockCliSimulator()
    const out = sim.runCommand('download /landing-egress/datasets/demo.csv')
    expect(out.outputLines[0]).toContain("Downloading '/landing-egress/datasets/demo.csv'...")
    expect(out.outputLines.join('\n')).toContain('id,name')
  })

  it('upload creates a file under landing-ingress', () => {
    const sim = createMockCliSimulator()
    sim.runCommand('upload /landing-ingress/new-folder/hello.txt')
    const out = sim.runCommand('ls /landing-ingress/new-folder')
    expect(out.outputLines.join('\n')).toContain('hello.txt')
  })

  it('denies ls access to curated container', () => {
    const sim = createMockCliSimulator()
    const out = sim.runCommand('ls /curated/finance/2026')
    expect(out.outputLines.join('\n')).toContain('403 Forbidden')
    expect(out.outputLines.join('\n')).toContain('AuthorizationPermissionMismatch')
    expect(out.outputLines.join('\n')).toContain('suspected data breach')
  })

  it('denies download access to curated container', () => {
    const sim = createMockCliSimulator()
    const out = sim.runCommand('download /curated/finance/2026/restricted.csv')
    expect(out.outputLines.join('\n')).toContain('403 Forbidden')
    expect(out.outputLines.join('\n')).toContain('suspected data breach')
  })

  it('roles returns current roles', () => {
    const sim = createMockCliSimulator()
    const out = sim.runCommand('roles')
    expect(out.outputLines.join('\n')).toContain('Current Roles:')
    expect(out.outputLines.join('\n')).toContain('- Uploader')
  })

  it('rm -rf* clears containers and roles', () => {
    const sim = createMockCliSimulator()
    sim.runCommand('rm -rf*')

    expect(sim.runCommand('roles').outputLines.join('\n')).toBe('(no roles)')
    expect(sim.runCommand('ls /landing-egress').outputLines.join('\n')).toBe('(empty)')
  })
})
