import { exec } from 'child_process';
// const exec = require('child_process');

/**
 * Execute simple shell command (async wrapper).
 * @param {String} cmd
 * @return {Object} { stdout: String, stderr: String }
 */
async function sh(cmd: string): Promise<{stdout: string; stderr: string}> {
  return new Promise(function (resolve, reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function main() {
  let { stdout } = await sh(`cd web & npm run build`);
  for (let line of stdout.split('\n')) {
    console.log(`${line}`);
  }
}

main();