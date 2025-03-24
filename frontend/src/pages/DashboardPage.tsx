import React, { useState } from 'react';
import AddModal from '../temp_Modal/AddModal';

function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);

  // Suppose you keep a local list of classes:
  const [classes, setClasses] = useState<ClassData[]>([]);

  interface ClassData {
    course_code: string;
    class_name: string;
    professor: string;
  }

  const handleAddClass = (newClassData: ClassData) => {
    //it is curretly not saving the data to the database
    //we can call the schedule addClass api to add the class
    setClasses((prev) => [...prev, newClassData]);
  };
  return (
    <div>
      <button className='border-4 bg-gray-200' onClick={() => setModalOpen(true)}>Add Class</button>

      {/* Display current classes */}
      {classes.map((cls, index) => (
        <div key={index}>
          <h4>{cls.course_code} - {cls.class_name}</h4>
          <p>Professor: {cls.professor}</p>
        </div>
      ))}

    </div>
  );
}

export default DashboardPage;