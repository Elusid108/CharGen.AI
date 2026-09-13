import packageJson from '../package.json'

export const APP_VERSION =
  typeof packageJson?.version === 'string' && packageJson.version.trim()
    ? packageJson.version.trim()
    : '1.8.0'
