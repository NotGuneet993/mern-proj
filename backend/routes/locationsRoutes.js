const express = require("express");
const Locations = require("../models/Locations.js");
const router = express.Router();

// url is /locations/getLocation
// no input params
// an array of 179 locations is returned 
router.get('/getLocation', async (req, res) => {

    try {

        const locations = await Locations.find({})
        res.json(locations);

    } catch (error) {

        console.error(error);
        res.status(500).json({ error: 'Server error' });

    }
});

module.exports = router;