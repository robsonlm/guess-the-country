const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');

console.log('Deploying from:', distDir);

try {
  const gitDir = path.join(distDir, '.git');
  if (fs.existsSync(gitDir)) {
    fs.rmSync(gitDir, { recursive: true, force: true });
  }

  execSync('git init', { cwd: distDir, stdio: 'inherit' });
  execSync('git config user.name "robsonlm"', { cwd: distDir, stdio: 'inherit' });
  execSync('git config user.email "robsonlm@users.noreply.github.com"', { cwd: distDir, stdio: 'inherit' });
  execSync('git add -A', { cwd: distDir, stdio: 'inherit' });
  execSync('git commit -m "Deploy to GitHub Pages"', { cwd: distDir, stdio: 'inherit' });
  execSync('git remote add origin https://github.com/robsonlm/guess-the-country', { cwd: distDir, stdio: 'inherit' });
  execSync('git push origin HEAD:gh-pages --force', { cwd: distDir, stdio: 'inherit' });

  // clean up .git inside dist
  fs.rmSync(gitDir, { recursive: true, force: true });
  console.log('Successfully deployed to gh-pages branch!');
} catch (err) {
  console.error('Deployment error:', err.message);
  process.exit(1);
}
