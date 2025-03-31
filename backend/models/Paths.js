const mongoose = require('mongoose');

const PathsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: [Number], required: true }
}, { timestamps: true, collection: "Paths" });

const Paths = mongoose.models.Paths || mongoose.model('Paths', PathsSchema);

module.exports = Paths;