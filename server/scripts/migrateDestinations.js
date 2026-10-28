// Safe, Idempotent Destination Migration Script
// Upgrades existing MongoDB Destination documents to full schema without losing custom records or IDs

require('dotenv').config();
const mongoose = require('mongoose');
const Destination = require('../models/Destination');
const destinationsData = require('../data/destinations.json');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tripmate';

const slugify = (text) => {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

async function migrate() {
  console.log('🔄 Starting Destination Schema Migration...');
  console.log(`Connecting to ${MONGO_URI}...`);

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const existingDestinations = await Destination.find({});
  console.log(`Found ${existingDestinations.length} existing destination records in MongoDB.`);

  let updatedCount = 0;
  let createdCount = 0;

  // Map master JSON by slug and by normalized name for easy matching
  const masterBySlug = new Map();
  const masterByName = new Map();

  destinationsData.forEach((d) => {
    masterBySlug.set(d.slug, d);
    masterByName.set(d.name.toLowerCase().trim(), d);
  });

  // Step 1: Upgrade existing records
  for (const doc of existingDestinations) {
    const normName = doc.name.toLowerCase().trim();
    const masterMatch = masterByName.get(normName) || (doc.slug ? masterBySlug.get(doc.slug) : null);

    let changed = false;

    // Ensure slug exists and is unique
    if (!doc.slug) {
      doc.slug = masterMatch?.slug || slugify(doc.name);
      changed = true;
    }

    // Ensure coverImage exists
    if (!doc.coverImage) {
      doc.coverImage = doc.get('imageUrl') || masterMatch?.coverImage || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800';
      changed = true;
    }

    // Ensure categories exists as an array
    if (!doc.categories || doc.categories.length === 0) {
      doc.categories = masterMatch?.categories || (doc.get('category') ? [doc.get('category')] : ['Adventure']);
      changed = true;
    }

    // Ensure gallery exists
    if (!doc.gallery || doc.gallery.length === 0) {
      doc.gallery = masterMatch?.gallery || [{ url: doc.coverImage, caption: `${doc.name} view` }];
      changed = true;
    }

    // Ensure estimatedBudget exists
    if (doc.estimatedBudget === undefined || doc.estimatedBudget === 0) {
      doc.estimatedBudget = masterMatch?.estimatedBudget || Number(doc.get('averageCostPerDay')) || 0;
      changed = true;
    }

    // Ensure state, bestVisitingTime, currency, duration, highlights, coordinates, featured
    if (!doc.state && masterMatch?.state) {
      doc.state = masterMatch.state;
      changed = true;
    }
    if (!doc.bestVisitingTime && masterMatch?.bestVisitingTime) {
      doc.bestVisitingTime = masterMatch.bestVisitingTime;
      changed = true;
    }
    if (!doc.currency) {
      doc.currency = masterMatch?.currency || 'INR';
      changed = true;
    }
    if (!doc.duration && masterMatch?.duration) {
      doc.duration = masterMatch.duration;
      changed = true;
    }
    if ((!doc.highlights || doc.highlights.length === 0) && masterMatch?.highlights) {
      doc.highlights = masterMatch.highlights;
      changed = true;
    }
    if ((!doc.coordinates || (doc.coordinates.lat === 0 && doc.coordinates.lng === 0)) && masterMatch?.coordinates) {
      doc.coordinates = masterMatch.coordinates;
      changed = true;
    }
    if (doc.featured === undefined && masterMatch?.featured !== undefined) {
      doc.featured = masterMatch.featured;
      changed = true;
    }

    if (changed) {
      await doc.save();
      updatedCount++;
      console.log(`  ✓ Updated schema for "${doc.name}" (_id: ${doc._id})`);
    }
  }

  // Step 2: Insert any missing destinations from master JSON
  for (const master of destinationsData) {
    const exists = await Destination.findOne({
      $or: [{ slug: master.slug }, { name: new RegExp(`^${master.name}$`, 'i') }]
    });

    if (!exists) {
      await Destination.create(master);
      createdCount++;
      console.log(`  + Inserted new destination "${master.name}" (${master.slug})`);
    }
  }

  console.log('\n========================================');
  console.log(`Migration complete: ${updatedCount} updated, ${createdCount} created.`);
  console.log(`Total destinations in MongoDB: ${await Destination.countDocuments()}`);
  console.log('========================================\n');

  await mongoose.disconnect();
}

if (require.main === module) {
  migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = migrate;
