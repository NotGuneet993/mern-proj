const express = require("express");
const Schedule = require("../models/Schedule.js");
const router = express.Router();


//Add a new class endpoint
// path is: /schedule/addClass
// inputs are course_code, class_name, professor, meeting_type, type, building, class_schedule, building_prefix, room_number
// a JSON with message is returned
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
    res.status(201).json({ 
      classID: newClass._id,
      message: "Class added successfully" 
    });
  } catch (error) {
    res.status(500).json({ message: `Server error: ${error}` });
  }
});

//Delete a class endpoint
//path is: /schedule/deleteClass
//inputs are classID
//a JSON with message is returned
router.delete("/deleteClass", async (req, res) => {
  const { classID } = req.body;

  try {
    const classData = await Schedule.findByIdAndDelete(classID);
    if (classData) {
      res.status(200).json({ message: "Class deleted successfully" });
    } else {
      res.status(404).json({ message: "Class not found" });
    }
  } catch (error) {
    res.status(500).json({ message: `Server error: ${error}` });
  }
});

//edit a class endpoint
//path is: /schedule/editClass
//inputs are classID (required), rest are optional: course_code, class_name, professor, meeting_type, type, building, class_schedule, building_prefix, room_number
//a JSON with the newly updated info is returned
router.put("/editClass", async (req, res) => {
  const { classID, ...updateFields } = req.body;

  try {
    // Remove undefined or null values from updateFields
    const filteredUpdateFields = Object.fromEntries(
      Object.entries(updateFields).filter(([_, v]) => v !== undefined)
    );

    const classData = await Schedule.findByIdAndUpdate(
      classID,
      { $set: filteredUpdateFields },
      { new: true } // Return the updated document
    );

    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }

    res.json(classData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//return classID based on user input endpoint
//path is: /schedule/getClass
//refer to the addEndPoint input
//a JSON with classID is returned
router.post("/getClass", async (req, res) => {
  const { course_code, class_name, professor, meeting_type, type, building, class_schedule, building_prefix, room_number } = req.body;

  try {
    const classData = await Schedule.findOne({
      course_code,
      class_name,
      professor,
      meeting_type,
      building_prefix,
      room_number
    });

    //if the class exists, return the classID
    if(classData){
      res.status(200).json({ classID: classData._id });
    }
    //if the class does not exist, added to the database
    else{
      //cretae a new class
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
      await newClass.save(); // save it
      res.status(201).json({ classID: newClass._id });
    }
  } catch (error) {
    res.status(500).json({ message: `Server error: ${error}` });
  }
}
);

//search endpoints for partial search
router.get('/search', async (req, res) => {
  try {
    const { courseCode, professor, className } = req.query;
    const searchFilters = {};

    // Only add the filters that are provided
    if (courseCode) {
      searchFilters.course_code = { $regex: courseCode, $options: 'i' }; // case-insensitive
    }
    if (professor) {
      searchFilters.professor = { $regex: professor, $options: 'i' };
    }
    if (className) {
      searchFilters.class_name = { $regex: className, $options: 'i' };
    }

    const matchedClasses = await Schedule.find(searchFilters).limit(10);
    res.json(matchedClasses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;