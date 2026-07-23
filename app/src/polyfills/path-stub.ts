// Browser stub for Node.js 'path' module
export function join(...parts: string[]) { return parts.join('/').replace(/\/+/g, '/') }
export function resolve(...parts: string[]) { return parts.join('/').replace(/\/+/g, '/') }
export function basename(p: string, ext?: string) {
  const b = p.split('/').pop() || ''
  return ext && b.endsWith(ext) ? b.slice(0, -ext.length) : b
}
export function dirname(p: string) { return p.split('/').slice(0, -1).join('/') || '.' }
export function extname(p: string) {
  const b = p.split('/').pop() || ''
  const i = b.lastIndexOf('.')
  return i > 0 ? b.slice(i) : ''
}
export const sep = '/'
export default { join, resolve, basename, dirname, extname, sep }
