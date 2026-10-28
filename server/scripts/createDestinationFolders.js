const fs = require('fs');
const path = require('path');

const destinationsPath = path.join(__dirname, '..', 'data', 'destinations.json');
const dests = JSON.parse(fs.readFileSync(destinationsPath, 'utf8'));

const publicDestDir = path.join(__dirname, '..', '..', 'client', 'public', 'destinations');

if (!fs.existsSync(publicDestDir)) {
  fs.mkdirSync(publicDestDir, { recursive: true });
}

dests.forEach((d) => {
  const dir = path.join(publicDestDir, d.slug);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write a metadata json inside the destination folder
  const meta = {
    slug: d.slug,
    name: d.name,
    country: d.country,
    state: d.state,
    coverImage: d.coverImage,
    gallery: d.gallery
  };
  fs.writeFileSync(path.join(dir, 'info.json'), JSON.stringify(meta, null, 2));

  // Write an SVG fallback image for cover
  const coverSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="#0f172a"/>
    <circle cx="400" cy="250" r="120" fill="#0ea5e9" opacity="0.3"/>
    <text x="50%" y="45%" text-anchor="middle" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="44" font-weight="700">${d.name}</text>
    <text x="50%" y="55%" text-anchor="middle" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="20" letter-spacing="3">${d.country.toUpperCase()}</text>
    <text x="50%" y="65%" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="16">${d.categories.join(' • ')}</text>
  </svg>`;
  fs.writeFileSync(path.join(dir, 'cover.svg'), coverSvg);

  d.gallery.forEach((g, idx) => {
    const gallerySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <rect width="800" height="600" fill="#1e293b"/>
      <text x="50%" y="45%" text-anchor="middle" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="34" font-weight="600">${d.name} Photo ${idx + 1}</text>
      <text x="50%" y="55%" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="18">${g.caption}</text>
    </svg>`;
    fs.writeFileSync(path.join(dir, `gallery-${idx + 1}.svg`), gallerySvg);
  });
});

console.log(`Successfully organized ${dests.length} destination asset folders in client/public/destinations/`);
