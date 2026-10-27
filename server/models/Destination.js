// Destination Mongoose Model
const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: 'Adventure'
    },
    averageCostPerDay: {
      type: Number,
      default: 100
    }
  },
  {
    timestamps: true,
    collection: 'destinations'
  }
);

module.exports = mongoose.model('Destination', destinationSchema);
