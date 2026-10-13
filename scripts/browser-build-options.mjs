/** Shared browser semantics for prepared previews and standalone source exports.
 * Version this contract when changing a build setting that can affect output. */
export const BROWSER_BUILD_OPTIONS_VERSION = 'react-browser-build-v1';

/** @param {Record<string,string>} environment */
export function publicBrowserEnvironment(environment = {}) {
  for (const [key, value] of Object.entries(environment)) {
    if (!/^[A-Za-z_$][\w$]*$/.test(key) || typeof value !== 'string' || /SECRET|PASSWORD|PRIVATE|TOKEN|API_KEY/i.test(key))
      throw new Error('Only explicit non-secret browser environment values are allowed.');
  }
  return { MODE: 'production', PROD: true, DEV: false, SSR: false, ...environment };
}

/** Only data is accepted; callers supply paths and IO without executing project config.
 * @param {{environment?:Record<string,string>,aliases?:Record<string,string>}} input
 * @returns {import('esbuild').BuildOptions}
 */
export function browserBuildOptions({ environment = {}, aliases = {} } = {}) {
  const modes = publicBrowserEnvironment(environment);
  return {
    bundle: true, format: 'esm', platform: 'browser', target: 'es2022',
    jsx: 'automatic', minify: true, legalComments: 'inline', alias: { ...aliases },
    define: {
      ...Object.fromEntries(Object.entries(environment).map(([key, value]) => ['process.env.' + key, JSON.stringify(value)])),
      'process.env.NODE_ENV': '"production"', 'import.meta.env': JSON.stringify(modes),
    },
    loader: {
      '.png': 'dataurl', '.jpg': 'dataurl', '.jpeg': 'dataurl', '.gif': 'dataurl',
      '.webp': 'dataurl', '.svg': 'dataurl', '.woff': 'dataurl', '.woff2': 'dataurl',
      '.ttf': 'dataurl', '.mp3': 'dataurl', '.mp4': 'dataurl',
    },
  };
}
