//schedule schema
const mongoose = require('mongoose');
ObjectId = mongoose.Schema.Types.ObjectId;

const ScheduleSchema = new mongoose.Schema({
  _id: { type: ObjectId, required: false },
  course_code: { type: String, required: true },
  class_name: { type: String, required: true},
  professor: { type: String, required: true },
  meeting_type: { type: String, required: true },
  type:{ type: String, required: true },
  building: { type: String, required: true },
  class_schedule:{type: Array, required: true},
  building_prefix: { type: String, required: false },
  room_number: { type: String, required: true },
}, { timestamps: true, collection: "Classes" }); // Explicit collection name

const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', ScheduleSchema);

module.exports = Schedule;