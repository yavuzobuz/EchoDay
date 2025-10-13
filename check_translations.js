// Script to check missing English translations
const fs = require('fs');

const content = fs.readFileSync('src/contexts/I18nContext.tsx', 'utf-8');

// Extract Turkish keys
const trMatch = content.match(/tr:\s*{([^}]+(?:}[^}]+)*?)},\s*en:/s);
if (!trMatch) {
  console.log('Could not find Turkish translations');
  process.exit(1);
}

// Extract English keys
const enMatch = content.match(/en:\s*{([^}]+(?:}[^}]+)*?)}\s*};/s);
if (!enMatch) {
  console.log('Could not find English translations');
  process.exit(1);
}

// Parse keys
const parseKeys = (text) => {
  const keys = [];
  const regex = /'([^']+)':\s*'[^']*'/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    keys.push(match[1]);
  }
  return keys;
};

const trKeys = parseKeys(trMatch[1]);
const enKeys = parseKeys(enMatch[1]);

console.log(`Turkish keys: ${trKeys.length}`);
console.log(`English keys: ${enKeys.length}`);

const trSet = new Set(trKeys);
const enSet = new Set(enKeys);

const missingInEnglish = trKeys.filter(k => !enSet.has(k));
const missingInTurkish = enKeys.filter(k => !trSet.has(k));

console.log('\n=== Missing in English ===');
console.log(`Count: ${missingInEnglish.length}`);
missingInEnglish.forEach(k => console.log(`  - ${k}`));

console.log('\n=== Missing in Turkish ===');
console.log(`Count: ${missingInTurkish.length}`);
missingInTurkish.forEach(k => console.log(`  - ${k}`));
