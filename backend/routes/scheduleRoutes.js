const express = require("express");
const Schedule = require("../models/Schedule.js");
const router = express.Router();


//Add a new class endpoint
router.post("/addClass", async (req, res) => {
  const { course_code, class_name, professor, meeting_type, type, building, class_schedule, building_prefix, room_number } = req.body;

  try {
    const newClass = new Schedule({
      course_code,
      class_name,
      professor,
      meeting_type,
      type,
      building,
      class_schedule,
      building_prefix,
      room_number
    });

    await newClass.save();
    res.status(201).json({ message: "Class added successfully" });
  } catch (error) {
    res.status(500).json({ message: `Server error: ${error}` });
  }
});

//Edit an exisiting class endpoint

//Delete a class endpoint

//Get class by ID endpoint
router.get("/getClass/:_id", async (req, res) => {
  const { _id } = req.params;

  try {
    const classData = await Schedule.findById(_id);
    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }
    res.json(classData);
  } catch (error) {
    res.status(500).json({ message: `Server error: ${error}` });
  }
}
);


module.exports = router;