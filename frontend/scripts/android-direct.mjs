// Android builds using the project's domestic Maven mirrors, with no explicit proxy.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const environment = { ...process.env };
for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'JAVA_TOOL_OPTIONS', '_JAVA_OPTIONS', 'JDK_JAVA_OPTIONS']) {
  delete environment[key];
}
environment.NO_PROXY = '*';
environment.no_proxy = '*';
// JVM properties take precedence over a user's Gradle proxy settings. A fresh process
// also avoids inheriting a proxy from a previously running Gradle daemon.
environment.GRADLE_OPTS = '-Dhttp.proxyHost= -Dhttps.proxyHost= -DsocksProxyHost= -Dorg.gradle.daemon=false';
const child = spawn(process.execPath, ['scripts/desktop.mjs', 'android', 'build', ...process.argv.slice(2)], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  env: environment,
  stdio: 'inherit',
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
