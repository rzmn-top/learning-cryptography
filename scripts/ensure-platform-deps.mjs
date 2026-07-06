/**
 * Проект живёт в папке, общей для macOS (разработка) и Linux-песочницы (сборка агентом).
 * npm ставит нативные бинарники rollup/esbuild только под текущую платформу и вычищает
 * чужие (npm/cli#4828). Этот скрипт докачивает недостающие, чтобы node_modules
 * работал на обеих платформах одновременно.
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const need = () => {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  const ver = (name, fallback) =>
    lock.packages?.[`node_modules/${name}`]?.version ?? fallback;
  const rollup = ver('rollup', '4.62.2');
  const esbuild = ver('esbuild', '0.21.5');
  return [
    [`@rollup/rollup-darwin-arm64`, rollup],
    [`@rollup/rollup-linux-arm64-gnu`, rollup],
    [`@rollup/rollup-linux-x64-gnu`, rollup],
    [`@esbuild/darwin-arm64`, esbuild],
    [`@esbuild/linux-arm64`, esbuild],
    [`@esbuild/linux-x64`, esbuild],
  ];
};

const ensure = (name, version) => {
  const dest = join('node_modules', ...name.split('/'));
  if (existsSync(dest)) return;
  const work = join(tmpdir(), `pkg-${name.replace(/[@/]/g, '_')}`);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  mkdirSync(dest, { recursive: true });
  try {
    execSync(`npm pack ${name}@${version} --silent`, { cwd: work, stdio: 'pipe' });
    execSync(`tar xzf *.tgz -C "${process.cwd()}/${dest}" --strip-components=1`, {
      cwd: work,
      shell: '/bin/bash',
      stdio: 'pipe',
    });
    console.log(`[platform-deps] installed ${name}@${version}`);
  } catch (e) {
    console.warn(`[platform-deps] skip ${name}: ${e.message}`);
    rmSync(dest, { recursive: true, force: true });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
};

for (const [name, version] of need()) ensure(name, version);
