const express = require("express");
const Schedule = require("../models/Schedule.js");
const router = express.Router();


//Add a new class endpoint
// path is: /schedule/addClass
// inputs are course_code, class_name, professor, meeting_type, type, building, class_schedule, building_prefix, room_number
// a JSON with "message" is returned
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

//return classID based on user input endpoint
//path is: /schedule/getClass
//refer to the addendpoint input
//a JSON with "classID" is returned
router.get("/getClass", async (req, res) => {
  const { course_code, class_name, professor, meeting_type, type, building, class_schedule, building_prefix, room_number } = req.body;

  try {
    const classData = await Schedule.findOne({
      course_code,
      class_name,
      professor
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


module.exports = router;