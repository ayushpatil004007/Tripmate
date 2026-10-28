// Destination Catalog Routes with Search, Filter, Admin CRUD & JSON Import/Export
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Destination = require('../models/Destination');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Helper to slugify a destination name
const slugify = (text) => {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// @route   GET /api/destinations/export/json
// @desc    Export all destinations as structured JSON
// @access  Private (Admin)
router.get('/export/json', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const destinations = await Destination.find().sort({ name: 1 });
    const cleanData = destinations.map((d) => ({
      name: d.name,
      slug: d.slug,
      country: d.country,
      state: d.state || '',
      categories: d.categories || [],
      description: d.description,
      coverImage: d.coverImage,
      gallery: d.gallery || [],
      bestVisitingTime: d.bestVisitingTime || '',
      estimatedBudget: d.estimatedBudget || 0,
      currency: d.currency || 'INR',
      duration: d.duration || '3-5 Days',
      highlights: d.highlights || [],
      coordinates: d.coordinates || { lat: 0, lng: 0 },
      featured: Boolean(d.featured)
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="destinations_export.json"');
    res.status(200).json({
      success: true,
      count: cleanData.length,
      exportedAt: new Date(),
      data: cleanData
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export destinations', error: error.message });
  }
});

// @route   POST /api/destinations/import/json
// @desc    Import destinations array from JSON without duplicates or destructive drops
// @access  Private (Admin)
router.post('/import/json', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const payload = req.body;
    const items = Array.isArray(payload) ? payload : payload.destinations || payload.data;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: Expected an array of destination objects under root or "destinations" key'
      });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        if (!item.name || !item.country) {
          errors.push(`Item ${i + 1}: Missing name or country`);
          continue;
        }

        const slug = item.slug ? slugify(item.slug) : slugify(item.name);
        const coverImage = item.coverImage || item.imageUrl || '';
        const categories = Array.isArray(item.categories) && item.categories.length > 0
          ? item.categories
          : item.category ? [item.category] : ['Adventure'];

        const estimatedBudget = item.estimatedBudget !== undefined
          ? Number(item.estimatedBudget)
          : item.averageCostPerDay !== undefined ? Number(item.averageCostPerDay) : 0;

        const gallery = Array.isArray(item.gallery) && item.gallery.length > 0
          ? item.gallery
          : coverImage ? [{ url: coverImage, caption: `${item.name} main view` }] : [];

        const destData = {
          name: item.name.trim(),
          slug,
          country: item.country.trim(),
          state: item.state ? item.state.trim() : '',
          categories,
          description: item.description || `${item.name} in ${item.country}`,
          coverImage: coverImage || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800',
          gallery,
          bestVisitingTime: item.bestVisitingTime || '',
          estimatedBudget,
          currency: (item.currency || 'INR').toUpperCase(),
          duration: item.duration || '3-5 Days',
          highlights: Array.isArray(item.highlights) ? item.highlights : [],
          coordinates: item.coordinates || { lat: 0, lng: 0 },
          featured: Boolean(item.featured)
        };

        const existing = await Destination.findOne({ slug });
        if (existing) {
          Object.assign(existing, destData);
          await existing.save();
          updatedCount++;
        } else {
          await Destination.create(destData);
          createdCount++;
        }
      } catch (itemErr) {
        errors.push(`Item ${item.name || i + 1}: ${itemErr.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Import processed: ${createdCount} created, ${updatedCount} updated`,
      createdCount,
      updatedCount,
      totalProcessed: items.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ success: false, message: 'Failed to import destinations', error: error.message });
  }
});

// @route   GET /api/destinations/featured
// @desc    Retrieve featured destinations
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const featured = await Destination.find({ featured: true }).sort({ name: 1 });
    res.status(200).json({
      success: true,
      count: featured.length,
      data: featured
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch featured destinations', error: error.message });
  }
});

// @route   GET /api/destinations
// @desc    Retrieve destinations with search, filtering, and country classification
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { search, category, country, featured, classification, homeCountry, sort } = req.query;

    const filter = {};

    // Text search across name, country, state, description, and highlights
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { country: searchRegex },
        { state: searchRegex },
        { description: searchRegex },
        { highlights: searchRegex }
      ];
    }

    // Category filter
    if (category && category.trim() && category !== 'All') {
      filter.categories = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    // Country filter
    if (country && country.trim() && country !== 'All') {
      filter.country = { $regex: new RegExp(`^${country.trim()}$`, 'i') };
    }

    // Featured filter
    if (featured !== undefined) {
      filter.featured = featured === 'true' || featured === true;
    }

    // Domestic vs International classification filter based on user's home country
    if (classification && homeCountry && homeCountry.trim()) {
      const cleanHome = homeCountry.trim();
      if (classification.toLowerCase() === 'domestic') {
        filter.country = { $regex: new RegExp(`^${cleanHome}$`, 'i') };
      } else if (classification.toLowerCase() === 'international') {
        filter.country = { $not: new RegExp(`^${cleanHome}$`, 'i') };
      }
    }

    // Sorting options
    let sortOption = { featured: -1, createdAt: -1 };
    if (sort === 'budget-asc') {
      sortOption = { estimatedBudget: 1 };
    } else if (sort === 'budget-desc') {
      sortOption = { estimatedBudget: -1 };
    } else if (sort === 'name') {
      sortOption = { name: 1 };
    }

    const destinations = await Destination.find(filter).sort(sortOption);

    res.status(200).json({
      success: true,
      count: destinations.length,
      data: destinations
    });
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch destinations',
      error: error.message
    });
  }
});

// @route   GET /api/destinations/:idOrSlug
// @desc    Retrieve a single destination by MongoDB ID or slug
// @access  Public
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let destination = null;

    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      destination = await Destination.findById(idOrSlug);
    }

    if (!destination) {
      destination = await Destination.findOne({ slug: idOrSlug.toLowerCase() });
    }

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: `Destination not found with identifier: ${idOrSlug}`
      });
    }

    res.status(200).json({
      success: true,
      data: destination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve destination',
      error: error.message
    });
  }
});

// @route   POST /api/destinations
// @desc    Create a new destination
// @access  Private (Admin)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      name,
      slug,
      country,
      state,
      categories,
      description,
      coverImage,
      gallery,
      bestVisitingTime,
      estimatedBudget,
      currency,
      duration,
      highlights,
      coordinates,
      featured
    } = req.body;

    if (!name || !country || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name, country, and description are required'
      });
    }

    const targetSlug = slug ? slugify(slug) : slugify(name);
    const existing = await Destination.findOne({ slug: targetSlug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A destination with slug "${targetSlug}" already exists`
      });
    }

    const destination = await Destination.create({
      name: name.trim(),
      slug: targetSlug,
      country: country.trim(),
      state: state ? state.trim() : '',
      categories: Array.isArray(categories) && categories.length > 0 ? categories : ['Adventure'],
      description: description.trim(),
      coverImage: coverImage || req.body.imageUrl || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800',
      gallery: Array.isArray(gallery) && gallery.length > 0
        ? gallery
        : [{ url: coverImage || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800', caption: name }],
      bestVisitingTime: bestVisitingTime || '',
      estimatedBudget: estimatedBudget !== undefined ? Number(estimatedBudget) : Number(req.body.averageCostPerDay || 0),
      currency: (currency || 'INR').toUpperCase(),
      duration: duration || '3-5 Days',
      highlights: Array.isArray(highlights) ? highlights : [],
      coordinates: coordinates || { lat: 0, lng: 0 },
      featured: Boolean(featured)
    });

    res.status(201).json({
      success: true,
      message: 'Destination created successfully',
      data: destination
    });
  } catch (error) {
    console.error('Error creating destination:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate destination slug or name' });
    }
    res.status(500).json({ success: false, message: 'Failed to create destination', error: error.message });
  }
});

// @route   PUT /api/destinations/:id
// @desc    Update an existing destination
// @access  Private (Admin)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    let destination = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      destination = await Destination.findById(id);
    }
    if (!destination) {
      destination = await Destination.findOne({ slug: id.toLowerCase() });
    }

    if (!destination) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    const updates = req.body;
    if (updates.name) destination.name = updates.name.trim();
    if (updates.slug) destination.slug = slugify(updates.slug);
    if (updates.country) destination.country = updates.country.trim();
    if (updates.state !== undefined) destination.state = updates.state.trim();
    if (updates.categories) destination.categories = updates.categories;
    if (updates.description) destination.description = updates.description.trim();
    if (updates.coverImage) destination.coverImage = updates.coverImage.trim();
    if (updates.imageUrl) destination.coverImage = updates.imageUrl.trim();
    if (updates.gallery) destination.gallery = updates.gallery;
    if (updates.bestVisitingTime !== undefined) destination.bestVisitingTime = updates.bestVisitingTime.trim();
    if (updates.estimatedBudget !== undefined) destination.estimatedBudget = Number(updates.estimatedBudget);
    if (updates.averageCostPerDay !== undefined) destination.estimatedBudget = Number(updates.averageCostPerDay);
    if (updates.currency) destination.currency = updates.currency.trim().toUpperCase();
    if (updates.duration !== undefined) destination.duration = updates.duration.trim();
    if (updates.highlights) destination.highlights = updates.highlights;
    if (updates.coordinates) destination.coordinates = updates.coordinates;
    if (updates.featured !== undefined) destination.featured = Boolean(updates.featured);

    const saved = await destination.save();

    res.status(200).json({
      success: true,
      message: 'Destination updated successfully',
      data: saved
    });
  } catch (error) {
    console.error('Error updating destination:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Destination with this slug already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to update destination', error: error.message });
  }
});

// @route   DELETE /api/destinations/:id
// @desc    Delete a destination
// @access  Private (Admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    let destination = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      destination = await Destination.findById(id);
    }
    if (!destination) {
      destination = await Destination.findOne({ slug: id.toLowerCase() });
    }

    if (!destination) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    await Destination.deleteOne({ _id: destination._id });

    res.status(200).json({
      success: true,
      message: `Destination "${destination.name}" deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete destination', error: error.message });
  }
});

module.exports = router;
