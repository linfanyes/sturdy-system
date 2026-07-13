// Browser stub for Node.js 'stream' module
export class Readable {
  pipe() { return this }
  on() { return this }
  once() { return this }
  emit() { return false }
  push() { return true }
  read() { return null }
  destroy() { return this }
}
export class Writable {
  write() { return true }
  end() { return this }
  on() { return this }
  once() { return this }
}
export class Transform extends Readable {
  write() { return true }
  end() { return this }
  _transform() {}
  _flush() {}
}
export class PassThrough extends Transform {}
export default { Readable, Writable, Transform, PassThrough }
