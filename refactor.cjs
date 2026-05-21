const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{jsx,js}');

files.forEach(file => {
  if (file.includes('firestoreWrapper.js')) return;
  
  let content = fs.readFileSync(file, 'utf8');

  const depth = file.split('/').length - 2; 
  const relativePath = depth === 0 ? './lib/firestoreWrapper' : '../'.repeat(depth) + 'lib/firestoreWrapper';

  if (file === 'src/lib/firebase.js' || file === 'src/firebase/config.js') return;

  if (content.includes('firebase/firestore')) {
    content = content.replace(/from ['"]firebase\/firestore['"]/g, `from '${relativePath}'`);
    fs.writeFileSync(file, content);
    console.log('Updated:', file);
  }
});
