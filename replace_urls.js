const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(srcDir);
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('http://localhost:5000')) {
    // We want to replace it safely.
    // Let's replace 'http://localhost:5000/api' with '`${import.meta.env.VITE_API_URL}/api`' if it is inside backticks.
    // It's much easier to just do text replacement.
    
    // Replace URL inside backticks
    content = content.replace(/http:\/\/localhost:5000/g, '${import.meta.env.VITE_API_URL}');
    
    // Handle standard string quotes if they exist -> 'http://localhost:5000/api/...' -> `...`
    // Actually, simple regex to convert 'http://localhost:5000/api/...' to `${import.meta.env.VITE_API_URL}/api/...`
    content = content.replace(/'http:\/\/localhost:5000([^']*)'/g, '`${import.meta.env.VITE_API_URL}$1`');
    content = content.replace(/"http:\/\/localhost:5000([^"]*)"/g, '`${import.meta.env.VITE_API_URL}$1`');

    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Successfully updated ${changedFiles} files frontend to use VITE_API_URL!`);
