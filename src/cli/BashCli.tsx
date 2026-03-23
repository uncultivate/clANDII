import { useEffect, useMemo, useRef, useState } from 'react'
import type { CliSimulator } from './cliSimulator'
import '../styles/bash-cli.css'

type HistoryItem = {
  kind: 'cmd' | 'out'
  lines: string[]
}

type ActiveTransfer = {
  verb: 'upload' | 'download'
  progress: number
}

type ActiveWipe = {
  target: string
  progress: number
}

function formatPrompt(): string {
  return '$'
}

function formatAsciiProgress(progress: number): string {
  const width = 24
  const filled = Math.round((progress / 100) * width)
  const bar = `${'='.repeat(filled)}${' '.repeat(Math.max(0, width - filled))}`
  return `[${bar}] ${String(progress).padStart(3, ' ')}%`
}

function getOutputLineClass(line: string): string {
  if (line.startsWith('SECURITY ALERT:')) {
    return 'bashText bashTextAlert'
  }
  return 'bashText'
}

export default function BashCli({
  simulator,
  onSystemDestroyed,
}: {
  simulator: CliSimulator
  onSystemDestroyed?: () => void
}) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([
    { kind: 'out', lines: ['Type `help` to see available commands.'] },
  ])
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const [activeTransfer, setActiveTransfer] = useState<ActiveTransfer | null>(null)
  const [activeWipe, setActiveWipe] = useState<ActiveWipe | null>(null)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)
  const draftInputRef = useRef('')
  const transferTimerRef = useRef<number | null>(null)
  const transferIntervalRef = useRef<number | null>(null)
  const wipeTimerRef = useRef<number | null>(null)
  const wipeIntervalRef = useRef<number | null>(null)

  const prompt = useMemo(() => formatPrompt(), [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    return () => {
      if (transferTimerRef.current !== null) window.clearTimeout(transferTimerRef.current)
      if (transferIntervalRef.current !== null) window.clearInterval(transferIntervalRef.current)
      if (wipeTimerRef.current !== null) window.clearTimeout(wipeTimerRef.current)
      if (wipeIntervalRef.current !== null) window.clearInterval(wipeIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [history, activeTransfer, activeWipe])

  const beginWipeSequence = (commandLine: string) => {
    const state = simulator.getState()
    const targets = [
      ...Object.keys(state.containers).map((name) => `container ${name}`),
      ...state.resources.map((name) => `resource ${name}`),
      ...state.keyvaults.map((name) => `keyvault ${name}`),
      ...state.roles.map((name) => `role ${name}`),
      "'clANDII'",
    ]

    let index = 0

    const runStep = () => {
      const target = targets[index]
      if (!target) {
        simulator.runCommand(commandLine)
        setActiveWipe(null)
        window.setTimeout(() => onSystemDestroyed?.(), 250)
        return
      }

      const durationMs = 900 + Math.floor(Math.random() * 1700)
      const startedAt = Date.now()
      setActiveWipe({ target, progress: 0 })

      wipeIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAt
        const progress = Math.min(98, Math.round((elapsed / durationMs) * 100))
        setActiveWipe((prev) => (prev ? { ...prev, progress } : prev))
      }, 120)

      wipeTimerRef.current = window.setTimeout(() => {
        if (wipeIntervalRef.current !== null) {
          window.clearInterval(wipeIntervalRef.current)
          wipeIntervalRef.current = null
        }

        setActiveWipe((prev) => (prev ? { ...prev, progress: 100 } : prev))

        window.setTimeout(() => {
          const line =
            target === "'clANDII'" ? "removing 'clANDII' complete" : `${target} removed`

          setHistory((prev) => [...prev, { kind: 'out', lines: [line] }])
          index += 1
          runStep()
        }, 160)
      }, durationMs)
    }

    runStep()
  }

  const submit = () => {
    const cmd = input.trim()
    setInput('')
    if (!cmd) return
    if (activeTransfer || activeWipe) return

    setCommandHistory((prev) => [...prev, cmd])
    setHistoryIndex(null)
    draftInputRef.current = ''
    setHistory((prev) => [...prev, { kind: 'cmd', lines: [`${prompt} ${cmd}`] }])

    if (cmd === 'rm -rf*') {
      beginWipeSequence(cmd)
      return
    }

    const verb = cmd.startsWith('download ')
      ? 'download'
      : cmd.startsWith('upload ')
        ? 'upload'
        : null

    if (verb) {
      const durationMs = 3000 + Math.floor(Math.random() * 7001)
      const startedAt = Date.now()
      setActiveTransfer({ verb, progress: 0 })

      transferIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAt
        const progress = Math.min(98, Math.round((elapsed / durationMs) * 100))
        setActiveTransfer((prev) => (prev ? { ...prev, progress } : prev))
      }, 120)

      transferTimerRef.current = window.setTimeout(() => {
        if (transferIntervalRef.current !== null) {
          window.clearInterval(transferIntervalRef.current)
          transferIntervalRef.current = null
        }
        setActiveTransfer((prev) => (prev ? { ...prev, progress: 100 } : prev))
        const result = simulator.runCommand(cmd).outputLines
        window.setTimeout(() => {
          setHistory((prev) => [...prev, { kind: 'out', lines: result }])
          setActiveTransfer(null)
          transferTimerRef.current = null
          inputRef.current?.focus()
        }, 180)
      }, durationMs)
      return
    }

    setHistory((prev) => [...prev, { kind: 'out', lines: simulator.runCommand(cmd).outputLines }])
  }

  const showPreviousCommand = () => {
    if (commandHistory.length === 0) return
    if (historyIndex === null) {
      draftInputRef.current = input
      const nextIndex = commandHistory.length - 1
      setHistoryIndex(nextIndex)
      setInput(commandHistory[nextIndex])
      return
    }
    if (historyIndex <= 0) return
    const nextIndex = historyIndex - 1
    setHistoryIndex(nextIndex)
    setInput(commandHistory[nextIndex])
  }

  const showNextCommand = () => {
    if (historyIndex === null) return
    if (historyIndex >= commandHistory.length - 1) {
      setHistoryIndex(null)
      setInput(draftInputRef.current)
      return
    }
    const nextIndex = historyIndex + 1
    setHistoryIndex(nextIndex)
    setInput(commandHistory[nextIndex])
  }

  return (
    <section className="bashWrap" aria-label="Simulated bash CLI">
      <div className="bashHeader">
        <span className="bashHeaderLeft">
          <span className="bashHeaderUser">clANDII_test</span>@<span className="bashHeaderHost">K602415</span>{' '}
          <span className="bashHeaderEnv">MINING64</span>
        </span>
        <span className="bashHeaderPath">~/clandii/testenv</span>
      </div>

      <div className="bashHistory" role="log" aria-live="polite">
        {history.map((item, idx) => (
          <div key={idx} className={item.kind === 'cmd' ? 'bashLine bashCmd' : 'bashLine'}>
            {item.lines.length === 0 ? (
              <span className="bashEmpty">(no output)</span>
            ) : (
              item.lines.map((line, lineIdx) => (
                <div key={lineIdx} className={getOutputLineClass(line)}>
                  {line}
                </div>
              ))
            )}
          </div>
        ))}

        {activeTransfer ? (
          <div className="bashTransfer" aria-live="polite">
            <div className="bashTransferLabel">
              {activeTransfer.verb === 'download' ? 'Downloading' : 'Uploading'}...
            </div>
            <div className="bashTransferAscii">{formatAsciiProgress(activeTransfer.progress)}</div>
          </div>
        ) : null}

        {activeWipe ? (
          <div className="bashTransfer" aria-live="polite">
            <div className="bashTransferLabel">removing {activeWipe.target}...</div>
            <div className="bashTransferAscii">{formatAsciiProgress(activeWipe.progress)}</div>
          </div>
        ) : null}

        <div className="bashInputRow bashInputInline">
          <span className="bashPrompt">{prompt}</span>
          <input
            ref={inputRef}
            className="bashInput"
            value={input}
            disabled={Boolean(activeTransfer || activeWipe)}
            spellCheck={false}
            onChange={(e) => {
              setInput(e.target.value)
              if (historyIndex === null) {
                draftInputRef.current = e.target.value
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                showPreviousCommand()
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                showNextCommand()
              }
            }}
            aria-label="Command input"
          />
        </div>

        <div ref={scrollAnchorRef} />
      </div>
    </section>
  )
}
