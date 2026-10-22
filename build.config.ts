import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  declaration: 'compatible',
  clean: true,
  externals: ['vue'],
  rollup: { emitCJS: true, output: { exports: 'named' } },
})
