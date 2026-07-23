/**
 * Minimal hello-world script.
 *
 * Run with: pnpm exec tsx scripts/helloworld.ts
 */
export function hello(name = 'world'): string {
  return `Hello, ${name}!`
}

if (require.main === module) {
  console.log(hello())
}
