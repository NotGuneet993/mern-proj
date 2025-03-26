import React, { useState, useEffect } from 'react';
import { AiOutlineCloseCircle } from 'react-icons/ai';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newClassData: any) => void;
}

function AddModal({ isOpen, onClose, onSave }: AddModalProps) {
  // Existing fields
  const [courseCode, setCourseCode] = useState('');
  const [className, setClassName] = useState('');
  const [professor, setProfessor] = useState('');
  const [meetingType, setMeetingType] = useState('');
  const [type, setType] = useState('');
  const [building, setBuilding] = useState('');
  const [buildingPrefix, setBuildingPrefix] = useState('');
  const [roomNumber, setRoomNumber] = useState('');

  // related states
  const [searchCount, setSearchCount] = useState(0);
  const [matchedCourseCodes, setMatchedCourseCodes] = useState<string[]>([]);
  const [matchedClassNames, setMatchedClassNames] = useState<string[]>([]);
  const [matchedProfessors, setMatchedProfessors] = useState<string[]>([]);
  const [focusedField, setFocusedField] = useState<'courseCode' | 'className' | 'professor' | null>(null);

  // 1) Days of the week
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // 2) Define the type for each day’s schedule
  interface ScheduleDay {
    day: string;
    startTime: string; // 'HH:MM'
    endTime: string;   // 'HH:MM'
  }

  // 3) Initialize schedule array with empty times
  const [schedule, setSchedule] = useState<ScheduleDay[]>(
    daysOfWeek.map((day) => ({
      day,
      startTime: '',
      endTime: '',
    }))
  );

  /***************************************************************
   * Autocomplete for courseCode
   ***************************************************************/
  useEffect(() => {
    if (focusedField === 'courseCode' && courseCode.trim() && searchCount < 50) {
      setSearchCount((prev) => prev + 1);
      const params = new URLSearchParams({ courseCode });
      fetch(`${import.meta.env.VITE_URL}/schedule/search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          const codes = data.map((cls: any) => cls.course_code);
          setMatchedCourseCodes(codes);
        })
        .catch((err) => console.error('Error fetching courseCode matches:', err));
    } else {
      setMatchedCourseCodes([]);
    }
  }, [courseCode, focusedField]);

  /***************************************************************
   * Autocomplete for className
   ***************************************************************/
  useEffect(() => {
    if (focusedField === 'className' && className.trim() && searchCount < 50) {
      setSearchCount((prev) => prev + 1);
      const params = new URLSearchParams({ className });
      fetch(`${import.meta.env.VITE_URL}/schedule/search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          const names = data.map((cls: any) => cls.class_name);
          setMatchedClassNames(names);
        })
        .catch((err) => console.error('Error fetching className matches:', err));
    } else {
      setMatchedClassNames([]);
    }
  }, [className, focusedField]);

  /***************************************************************
   * Autocomplete for professor
   ***************************************************************/
  useEffect(() => {
    if (focusedField === 'professor' && professor.trim() && searchCount < 50) {
      setSearchCount((prev) => prev + 1);
      const params = new URLSearchParams({ professor });
      fetch(`${import.meta.env.VITE_URL}/schedule/search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          const profs = data.map((cls: any) => cls.professor);
          setMatchedProfessors(profs);
        })
        .catch((err) => console.error('Error fetching professor matches:', err));
    } else {
      setMatchedProfessors([]);
    }
  }, [professor, focusedField]);

  /***************************************************************
   * Handler: user picks a suggestion
   ***************************************************************/
  const selectCourseCode = (code: string) => {
    setCourseCode(code);
    setMatchedCourseCodes([]);
  };
  const selectClassName = (name: string) => {
    setClassName(name);
    setMatchedClassNames([]);
  };
  const selectProfessor = (prof: string) => {
    setProfessor(prof);
    setMatchedProfessors([]);
  };

  /***************************************************************
   * Time Change Handler for each day
   ***************************************************************/
  const handleTimeChange = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setSchedule((prev) =>
      prev.map((entry) =>
        entry.day === day ? { ...entry, [field]: value } : entry
      )
    );
  };

  /***************************************************************
   * Submit Handler
   ***************************************************************/
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 4) Transform each day into { day, time: "HH:MM-HH:MM" } or "None"
    const class_schedule = schedule.map((entry) => {
      const { day, startTime, endTime } = entry;
      if (!startTime && !endTime) {
        // No times selected => "None"
        return { day, time: 'None' };
      } else {
        // Format e.g. "10:30-11:45"
        return { day, time: `${startTime}-${endTime}` };
      }
    });

    // Construct final object
    const newClassData = {
      course_code: courseCode,
      class_name: className,
      professor: professor,
      meeting_type: meetingType,
      type: type,
      building: building,
      class_schedule: class_schedule,
      building_prefix: buildingPrefix,
      room_number: roomNumber,
    };

    // Pass back to parent
    onSave(newClassData);

    // Reset fields
    setCourseCode('');
    setClassName('');
    setProfessor('');
    setMeetingType('');
    setType('');
    setBuilding('');
    setBuildingPrefix('');
    setRoomNumber('');
    setSchedule(
      daysOfWeek.map((day) => ({ day, startTime: '', endTime: '' }))
    );

    onClose();
  };

  /***************************************************************
   * Render
   ***************************************************************/
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 pt-120 overflow-scroll">
      <div className="relative max-w-lg w-full bg-white p-6 rounded shadow-lg">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-3xl hover:text-red-500"
        >
          <AiOutlineCloseCircle />
        </button>
        <h2 className="text-xl font-semibold mb-4">Add Class</h2>

        <form onSubmit={handleSubmit}>
          {/* COURSE CODE */}
          <label htmlFor="courseCode" className="block mb-1">
            Course Code
          </label>
          <input
            id="courseCode"
            type="text"
            value={courseCode}
            onFocus={() => setFocusedField('courseCode')}
            onBlur={() => {
              setTimeout(() => {
                setMatchedCourseCodes([]);
                setFocusedField(null);
              }, 150);
            }}
            onChange={(e) => setCourseCode(e.target.value)}
            className="border p-1 w-full mb-2"
          />
          {focusedField === 'courseCode' && matchedCourseCodes.length > 0 && (
            <ul className="border bg-white mb-2 max-h-40 overflow-y-auto">
              {matchedCourseCodes.map((code, idx) => (
                <li
                  key={`${code}-${idx}`}
                  onMouseDown={() => selectCourseCode(code)}
                  className="px-2 py-1 cursor-pointer hover:bg-blue-100"
                >
                  {code}
                </li>
              ))}
            </ul>
          )}

          {/* CLASS NAME */}
          <label htmlFor="className" className="block mb-1">
            Class Name
          </label>
          <input
            id="className"
            type="text"
            value={className}
            onFocus={() => setFocusedField('className')}
            onBlur={() => {
              setTimeout(() => {
                setMatchedClassNames([]);
                setFocusedField(null);
              }, 150);
            }}
            onChange={(e) => setClassName(e.target.value)}
            className="border p-1 w-full mb-2"
          />
          {focusedField === 'className' && matchedClassNames.length > 0 && (
            <ul className="border bg-white mb-2 max-h-40 overflow-y-auto">
              {matchedClassNames.map((name, idx) => (
                <li
                  key={`${name}-${idx}`}
                  onMouseDown={() => selectClassName(name)}
                  className="px-2 py-1 cursor-pointer hover:bg-blue-100"
                >
                  {name}
                </li>
              ))}
            </ul>
          )}

          {/* PROFESSOR */}
          <label htmlFor="professor" className="block mb-1">
            Professor
          </label>
          <input
            id="professor"
            type="text"
            value={professor}
            onFocus={() => setFocusedField('professor')}
            onBlur={() => {
              setTimeout(() => {
                setMatchedProfessors([]);
                setFocusedField(null);
              }, 150);
            }}
            onChange={(e) => setProfessor(e.target.value)}
            className="border p-1 w-full mb-2"
          />
          {focusedField === 'professor' && matchedProfessors.length > 0 && (
            <ul className="border bg-white mb-2 max-h-40 overflow-y-auto">
              {matchedProfessors.map((prof, idx) => (
                <li
                  key={`${prof}-${idx}`}
                  onMouseDown={() => selectProfessor(prof)}
                  className="px-2 py-1 cursor-pointer hover:bg-blue-100"
                >
                  {prof}
                </li>
              ))}
            </ul>
          )}

          {/* MEETING TYPE */}
          <label htmlFor="meetingType" className="block mb-1">
            Meeting Type
          </label>
          <select
            id="meetingType"
            value={meetingType}
            onChange={(e) => setMeetingType(e.target.value)}
            className="border p-1 w-full mb-2"
          >
            <option value="">Select a meeting type</option>
            <option value="in-person">In person</option>
            <option value="mixed-mode">Mixed mode</option>
            <option value="online">Online</option>
          </select>

          {/* TYPE */}
          <label htmlFor="type" className="block mb-1">
            Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border p-1 w-full mb-4"
          >
            <option value="">Select a type</option>
            <option value="lecture">Lecture</option>
            <option value="lab">Lab</option>
            <option value="discussion">Discussion</option>
          </select>

          {/* BUILDING */}
          <label htmlFor="building" className="block mb-1">
            Building (Required)
          </label>
          <input
            id="building"
            type="text"
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            className="border p-1 w-full mb-2"
            required
          />

          {/* BUILDING PREFIX */}
          <label htmlFor="buildingPrefix" className="block mb-1">
            Building Prefix (Optional)
          </label>
          <input
            id="buildingPrefix"
            type="text"
            value={buildingPrefix}
            onChange={(e) => setBuildingPrefix(e.target.value)}
            className="border p-1 w-full mb-2"
          />

          {/* ROOM NUMBER */}
          <label htmlFor="roomNumber" className="block mb-1">
            Room Number (Required)
          </label>
          <input
            id="roomNumber"
            type="text"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            className="border p-1 w-full mb-2"
            required
          />

          {/* CLASS SCHEDULE */}
          <h3 className="text-lg font-semibold mb-2 mt-4">Class Schedule</h3>
          <p className="text-sm text-gray-600 mb-2">
            Select start/end times for each day. If blank, “None” will be stored.
          </p>

          <div className="grid grid-cols-1 gap-2">
            {schedule.map((entry) => (
              <div key={entry.day} className="flex items-center gap-2">
                <span className="w-24">{entry.day}:</span>
                {/* Start Time */}
                <input
                  type="time"
                  value={entry.startTime}
                  onChange={(e) => handleTimeChange(entry.day, 'startTime', e.target.value)}
                  className="border p-1"
                />
                {/* End Time */}
                <input
                  type="time"
                  value={entry.endTime}
                  onChange={(e) => handleTimeChange(entry.day, 'endTime', e.target.value)}
                  className="border p-1"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="mt-4 bg-yellow-400 text-white px-4 py-2 rounded hover:bg-yellow-500"
          >
            Add Class
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddModal;