import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4177',
    viewport: { width: 1440, height: 1100 },
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev:preview --host 127.0.0.1 --port 4177 --strictPort',
    url: 'http://127.0.0.1:4177',
    reuseExistingServer: false,
  },
})
