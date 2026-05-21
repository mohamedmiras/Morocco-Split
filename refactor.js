import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', (file) => {
  if (!file.endsWith('.js') && !file.endsWith('.jsx')) return;
  
  const unixFile = file.replace(/\\/g, '/');
  
  if (unixFile.includes('firestoreWrapper.js')) return;
  if (unixFile === 'src/lib/firebase.js' || unixFile === 'src/firebase/config.js') return;

  let content = fs.readFileSync(file, 'utf8');

  const depth = unixFile.split('/').length - 2; 
  const relativePath = depth === 0 ? './lib/firestoreWrapper' : '../'.repeat(depth) + 'lib/firestoreWrapper';

  if (content.includes('firebase/firestore')) {
    content = content.replace(/from ['"]firebase\/firestore['"]/g, `from '${relativePath}'`);
    fs.writeFileSync(file, content);
    console.log('Updated:', unixFile);
  }
});
