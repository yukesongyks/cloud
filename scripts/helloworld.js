/**
 * Minimal hello-world script (CommonJS, runnable with plain Node).
 *
 * Run with: node scripts/helloworld.js
 */
function hello(name) {
  if (name === undefined) name = 'world'
  return `Hello, ${name}!`
}

exports.hello = hello

if (require.main === module) {
  console.log(hello())
}
