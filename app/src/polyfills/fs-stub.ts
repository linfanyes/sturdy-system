// Browser stub for Node.js 'fs' module
// word-extractor only uses fs for filename-based extraction; we always pass a Buffer.
const err = () => { throw new Error('fs not available in browser') }
export const readFile = err
export const readFileSync = err
export const writeFile = err
export const writeFileSync = err
export const existsSync = () => false
export const stat = err
export const statSync = err
export const readdir = err
export const mkdir = err
export const createReadStream = err
export const createWriteStream = err
export default { readFile, readFileSync, writeFile, writeFileSync, existsSync, stat, statSync, readdir, mkdir, createReadStream, createWriteStream }
