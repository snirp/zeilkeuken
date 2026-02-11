const fs = require('fs');
const path = require('path');

module.exports = function () {
  const packagesDir = path.join(__dirname, 'packages');
  const packages = [];

  const files = fs.readdirSync(packagesDir);

  files.forEach(file => {
    if (file.endsWith('.json')) {
      const content = fs.readFileSync(path.join(packagesDir, file), 'utf8');
      packages.push(JSON.parse(content));
    }
  });

  // Define custom order: dagtocht, dinervaart, langevaart, flexibel
  const order = ['dagtocht', 'dinervaart', 'langevaart', 'flexibel'];
  packages.sort((a, b) => {
    const indexA = order.indexOf(a.slug);
    const indexB = order.indexOf(b.slug);
    return indexA - indexB;
  });

  return packages;
};
