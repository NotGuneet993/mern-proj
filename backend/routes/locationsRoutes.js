const express = require("express");
const Locations = require("../models/Locations.js");
const Paths = require("../models/Paths.js");
const router = express.Router();

// hashmaps 
const nodeMap = require("../hashmaps/nodeMap.json");
const edgeMap = require("../hashmaps/edgeMap.json");

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


// this gets the node path ids from mongo and converts geoJson object 
// inputs are location1 and location2
// response is path
router.get('/getPath', async (req, res) => {
    const { location1, location2 } = req.query;
    
    if (!location1 || !location2) {
        return res.status(400).json({ error: "Locations missing"});
    }

    const query = `${location1}-${location2}`;
    
    try {

        // College of Arts & Humanities-Nicholson School of Communication
        const result = await Paths.findOne({ name: query});

        // iterate through each item excluding the last in the hasmap 
        const querySize = result.path.length;
        const resArr = [];
        
        for (let i = 0; i < (querySize - 1); i++) {
            resArr.push(nodeMap[result.path[i]])
            resArr.push(edgeMap[`${result.path[i]}-${result.path[i+1]}`])
        }
        resArr.push(nodeMap[result.path[querySize-1]])

        res.json({ path: resArr });

    } catch (error) {

        console.error(error);
        res.status(500).json({ error: 'Server error' });

    }

});


module.exports = router;