import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'node:fs';
import path from 'node:path';

const distPath = path.resolve('dist');

function obfuscateDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      obfuscateDirectory(fullPath);
    } else if (file.endsWith('.js')) {
      const code = fs.readFileSync(fullPath, 'utf8');

      const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        numbersToExpressions: true,
        simplify: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.8,
        splitStrings: true,
        deadCodeInjection: false,
        renameGlobals: false,
      });

      fs.writeFileSync(fullPath, obfuscationResult.getObfuscatedCode());
      console.log(`✓ Obfuscated: ${fullPath}`);
    }
  }
}

obfuscateDirectory(distPath);
