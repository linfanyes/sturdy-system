// 轻量 SFC 语法校验：parse + compileScript + compileTemplate（不跑完整 vite/uni bundle）
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc')
const fs = require('fs')

function validate(path) {
  const source = fs.readFileSync(path, 'utf-8')
  const { descriptor, errors } = parse(source, { filename: path })
  if (errors && errors.length) {
    console.error('PARSE ERRORS in', path)
    errors.forEach((e) => console.error('  -', e.message || e))
    process.exitCode = 1
    return
  }
  // script
  let script
  try {
    script = compileScript(descriptor, { id: 'validate-' + Date.now() })
  } catch (e) {
    console.error('SCRIPT COMPILE ERROR in', path, '\n', e.message)
    process.exitCode = 1
    return
  }
  // template
  if (descriptor.template && descriptor.template.content) {
    try {
      const res = compileTemplate({
        source: descriptor.template.content,
        filename: path,
        id: 'validate-' + Date.now(),
        compilerOptions: { bindingMetadata: script.bindings },
      })
      if (res.errors && res.errors.length) {
        console.error('TEMPLATE COMPILE ERRORS in', path)
        res.errors.forEach((e) => console.error('  -', e.message || e))
        process.exitCode = 1
        return
      }
    } catch (e) {
      console.error('TEMPLATE COMPILE ERROR in', path, '\n', e.message)
      process.exitCode = 1
      return
    }
  }
  console.log('OK:', path)
}

validate(process.argv[2])
