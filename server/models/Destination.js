// Destination Mongoose Model with Full Schema Specification
const mongoose = require('mongoose');

// Slug generator utility
const slugify = (text) => {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const destinationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Destination name is required'],
      trim: true
    },
    slug: {
      type: String,
      required: [true, 'Destination slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      default: function () {
        return slugify(this.name);
      }
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true
    },
    state: {
      type: String,
      default: '',
      trim: true
    },
    categories: {
      type: [String],
      default: ['Adventure'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Destination must belong to at least one category'
      }
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    coverImage: {
      type: String,
      required: [true, 'Cover image URL is required'],
      trim: true
    },
    gallery: [
      {
        url: {
          type: String,
          required: [true, 'Gallery photo URL is required'],
          trim: true
        },
        caption: {
          type: String,
          default: '',
          trim: true
        }
      }
    ],
    bestVisitingTime: {
      type: String,
      default: '',
      trim: true
    },
    estimatedBudget: {
      type: Number,
      required: [true, 'Estimated budget is required'],
      default: 0,
      min: [0, 'Estimated budget must be a positive number']
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    duration: {
      type: String,
      default: '3-5 Days',
      trim: true
    },
    highlights: {
      type: [String],
      default: []
    },
    coordinates: {
      lat: {
        type: Number,
        default: 0
      },
      lng: {
        type: Number,
        default: 0
      }
    },
    featured: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'destinations',
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Pre-validation and pre-save normalization (synchronous hook executes on both validate() and validateSync())
destinationSchema.pre('validate', function () {
  // Auto-generate slug if missing
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }

  // Backward compatibility with legacy field names
  if (!this.coverImage && this.get('imageUrl')) {
    this.coverImage = this.get('imageUrl');
  }

  if ((!this.categories || this.categories.length === 0) && this.get('category')) {
    this.categories = [this.get('category')];
  }

  if (this.estimatedBudget === undefined || this.estimatedBudget === 0) {
    if (this.get('averageCostPerDay') !== undefined) {
      this.estimatedBudget = Number(this.get('averageCostPerDay'));
    }
  }

  // Ensure gallery has at least the cover image if empty
  if (!this.gallery || this.gallery.length === 0) {
    if (this.coverImage) {
      this.gallery = [{ url: this.coverImage, caption: `${this.name} main view` }];
    }
  }
});

// Backward-compatible virtual: imageUrl -> coverImage
destinationSchema.virtual('imageUrl').get(function () {
  return this.coverImage;
}).set(function (val) {
  this.coverImage = val;
});

// Backward-compatible virtual: category -> first category
destinationSchema.virtual('category').get(function () {
  return this.categories && this.categories.length > 0 ? this.categories[0] : 'Adventure';
}).set(function (val) {
  if (val) {
    if (!this.categories) this.categories = [];
    if (!this.categories.includes(val)) {
      this.categories.unshift(val);
    }
  }
});

// Backward-compatible virtual: averageCostPerDay -> estimatedBudget
destinationSchema.virtual('averageCostPerDay').get(function () {
  return this.estimatedBudget;
}).set(function (val) {
  this.estimatedBudget = Number(val);
});

module.exports = mongoose.model('Destination', destinationSchema);
