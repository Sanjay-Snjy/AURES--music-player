import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const lnk = 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Peace\\Peace.lnk'
const psQuoted = lnk.replace(/'/g, "''")
const cmd = `powershell -NoProfile -Command \"(New-Object -ComObject WScript.Shell).CreateShortcut('${psQuoted}').TargetPath\"`
console.log('cmd:', cmd)
try {
  const out = execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 1024 * 64, shell: 'powershell.exe' })
  const resolved = out.toString().trim()
  console.log('resolved:', resolved || undefined)
  if (resolved) console.log('exists on disk:', existsSync(resolved))
} catch (err) {
  console.log('error:', err instanceof Error ? err.message : String(err))
}
