const mongoose = require('mongoose');

const BuildingsSchema = new mongoose.Schema({
  type: { type: String },
  geometry: { type: Object },
  properties: { type: Object },
}, { timestamps: true, collection: "Buildings" });

const Buildings = mongoose.models.Buildings || mongoose.model('Buildings', BuildingsSchema);

module.exports = Buildings; // Exporting the model directly