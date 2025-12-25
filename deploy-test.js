import { exec } from 'child_process';

console.log('Testing Firebase deployment...');

exec('npx firebase-tools --version', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(`Firebase Tools Version: ${stdout}`);
});