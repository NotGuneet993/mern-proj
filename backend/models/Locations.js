const mongoose = require('mongoose');

const LocationsSchema = new mongoose.Schema({

    buildingName: { type: String, require: true },
    nodeID: { type: Number, require: true },

}, { timestamps: true, collection: "Locations" });

const Locations = mongoose.models.Locations || mongoose.model('Locations', LocationsSchema)

module.exports = Locations;