import React, { useState, useEffect } from 'react';
import { AiOutlineCloseCircle } from 'react-icons/ai';
const API_URL = import.meta.env.VITE_API_URL;

interface AddModalProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newClassData: any) => void;
}

function AddModal({ message, isOpen, onClose, onSave }: AddModalProps) {
  if (!message) message = "No Message Sent (How)";

  // Existing fields
  const [courseCode, setCourseCode] = useState('');
  const [className, setClassName] = useState('');
  const [professor, setProfessor] = useState('');
  const [meetingType, setMeetingType] = useState('');
  const [type, setType] = useState('');
  const [building, setBuilding] = useState('');
  const [buildingPrefix, setBuildingPrefix] = useState('');
  const [roomNumber, setRoomNumber] = useState('');

  // Autocomplete states (unchanged)
  const [searchCount, setSearchCount] = useState(0);
  const [matchedCourseCodes, setMatchedCourseCodes] = useState<string[]>([]);
  const [matchedClassNames, setMatchedClassNames] = useState<string[]>([]);
  const [matchedProfessors, setMatchedProfessors] = useState<string[]>([]);
  const [matchedBuildings, setMatchedBuildings] = useState<string[]>([]);
  const [focusedField, setFocusedField] = useState<'courseCode' | 'className' | 'professor' | 'building' | null>(null);
  const [locations, setLocations] = useState<string[]>([]);

  // Days of the week
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // We'll store each day's schedule object, including whether it's enabled.
  interface ScheduleDay {
    day: string;
    enabled: boolean;       // checked or not
    startHour: string;      // '1'...'12'
    startMinute: string;    // '00','15','30','45','... or '00'..'59'
    startAMPM: string;      // 'AM' or 'PM'
    endHour: string;
    endMinute: string;
    endAMPM: string;
  }

  // Initialize schedule array with "disabled" for each day
  const [schedule, setSchedule] = useState<ScheduleDay[]>(
    daysOfWeek.map((day) => ({
      day,
      enabled: false,
      startHour: '8',
      startMinute: '00',
      startAMPM: 'AM',
      endHour: '9',
      endMinute: '00',
      endAMPM: 'AM',
    }))
  );

  /***************************************************************
   * Autocomplete calls (unchanged)
   ***************************************************************/
  useEffect(() => {
    if (focusedField === 'courseCode' && courseCode.trim() && searchCount < 50) {
      setSearchCount((prev) => prev + 1);
      const params = new URLSearchParams({ courseCode });
      fetch(`${API_URL}/schedule/search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          const codes: string[] = data.map((cls: any) => cls.course_code);
          setMatchedCourseCodes([... new Set(codes)]);
        })
        .catch((err) => console.error('Error fetching courseCode matches:', err));
    } else {
      setMatchedCourseCodes([]);
    }
  }, [courseCode, focusedField]);

  useEffect(() => {
    if (focusedField === 'className' && className.trim() && searchCount < 50) {
      setSearchCount((prev) => prev + 1);
      const params = new URLSearchParams({ className });
      fetch(`${API_URL}/schedule/search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          const names: string[] = data.map((cls: any) => cls.class_name);
          setMatchedClassNames([...new Set(names)]);
        })
        .catch((err) => console.error('Error fetching className matches:', err));
    } else {
      setMatchedClassNames([]);
    }
  }, [className, focusedField]);

  useEffect(() => {
    if (focusedField === 'professor' && professor.trim() && searchCount < 50) {
      setSearchCount((prev) => prev + 1);
      const params = new URLSearchParams({ professor });
      fetch(`${API_URL}/schedule/search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          const profs: string[] = data.map((cls: any) => cls.professor);
          setMatchedProfessors([...new Set(profs)]);
        })
        .catch((err) => console.error('Error fetching professor matches:', err));
    } else {
      setMatchedProfessors([]);
    }
  }, [professor, focusedField]);

  useEffect(() => {
    if (focusedField === 'building' && building.trim() && searchCount < 50) {
      setSearchCount((prev) => prev + 1);
      const params = new URLSearchParams({ building });
      fetch(`${API_URL}/schedule/search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          const buildings: string[] = data.map((cls: any) => cls.building);
          setMatchedBuildings([...new Set(buildings)]);
        })
        .catch((err) => console.error('Error fetching building matches:', err));
    } else {
      setMatchedBuildings([]);
    }
  }, [building, focusedField]);

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
  const selectBuilding = (bldg: string) => {
    setBuilding(bldg);
    setMatchedBuildings([]);
  }

  /***************************************************************
   * Toggle day enabled
   ***************************************************************/
  const handleToggleDay = (index: number) => {
    setSchedule((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, enabled: !entry.enabled } : entry
      )
    );
  };

  /***************************************************************
   * Handle changes to start/end time selects
   ***************************************************************/
  const handleTimeChange = (
    index: number,
    field: keyof ScheduleDay, // e.g. 'startHour', 'endAMPM'
    value: string
  ) => {
    setSchedule((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;
        return { ...entry, [field]: value };
      })
    );
  };

  /***************************************************************
   * Submit Handler
   ***************************************************************/
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Convert each day's picks into "HH:MM AM/PM-HH:MM AM/PM" if enabled, else "None"
    const class_schedule = schedule.map((entry) => {
      if (!entry.enabled) {
        return { day: entry.day, time: 'None' };
      } else {
        // e.g. "8:00 AM-9:00 AM"
        const start = `${entry.startHour}:${entry.startMinute} ${entry.startAMPM}`;
        const end = `${entry.endHour}:${entry.endMinute} ${entry.endAMPM}`;
        return { day: entry.day, time: `${start}-${end}` };
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
    setSearchCount(0);
    setMatchedCourseCodes([]);
    setMatchedClassNames([]);
    setMatchedProfessors([]);
    setMatchedBuildings([]);

    // Reset schedule
    setSchedule(
      daysOfWeek.map((day) => ({
        day,
        enabled: false,
        startHour: '8',
        startMinute: '00',
        startAMPM: 'AM',
        endHour: '9',
        endMinute: '00',
        endAMPM: 'AM',
      }))
    );

    onClose();
  };

  useEffect(() => {
      const getLocations = async () => {
          try {
              const res = await fetch(`${API_URL}/locations/getLocation`)
              if (!res.ok) throw new Error("Couldn't get location");

              const data = await res.json();
              setLocations(data);

          } catch (error) {
              console.log(error);
          }
      }

      getLocations();

  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-100 pb-10 mt-15 md:pt-20 md:pb-5 overflow-scroll">
      <div className="relative max-w-5xl w-full bg-white p-6 rounded shadow-lg text-black">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-3xl hover:text-red-500"
        >
          <AiOutlineCloseCircle />
        </button>

        <h2 className="text-xl font-semibold mb-4">{message}</h2>

        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
          {/* LEFT COLUMN */}
          <div className="md:w-1/2">
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

            {/* Building */}
            <label htmlFor="building" className="block mb-1">
              Building
            </label>
            <select
              id="building"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="border p-1 w-full mb-4"
            >
              <option value="">Select a building</option>
              {locations.map((b, index) => (
                <option key={index} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {focusedField === 'building' && matchedBuildings.length > 0 && (
              <ul className="border bg-white mb-2 max-h-40 overflow-y-auto">
                {matchedBuildings.map((name, idx) => (
                  <li
                    key={`${name}-${idx}`}
                    onMouseDown={() => selectBuilding(name)}
                    className="px-2 py-1 cursor-pointer hover:bg-blue-100"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}

            {/* BUILDING PREFIX */}
            <label htmlFor="buildingPrefix" className="block mb-1">
              Building Prefix <span className="text-green-500">(Optional)</span>
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
              Room Number <span className="text-red-500">(Required)</span>
            </label>
            <input
              id="roomNumber"
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="border p-1 w-full mb-2"
              required
            />
          </div>

          {/* RIGHT COLUMN: AM/PM schedule picker */}
          <div className="md:w-1/2">
            <h3 className="text-lg font-semibold mb-2 mt-4">Class Schedule</h3>
            <p className="text-sm text-gray-600 mb-2">
              Check days + select start/end times (AM/PM). Unchecked days = "None".
            </p>

            <div className="grid grid-cols-1 gap-4">
              {schedule.map((entry, index) => (
                <div key={entry.day} className="border p-2 rounded">
                  <label className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={entry.enabled}
                      onChange={() => handleToggleDay(index)}
                      className="mr-2"
                    />
                    <span className="font-medium">{entry.day}</span>
                  </label>

                  {entry.enabled && (
                    <div className="flex flex-wrap gap-2">
                      {/* Start Time */}
                      <div className="flex items-center">
                        <span className="mr-1">Start:</span>
                        <select
                          value={entry.startHour}
                          onChange={(e) => handleTimeChange(index, 'startHour', e.target.value)}
                          className="border p-1 mr-1"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                            <option key={h} value={h.toString()}>{h}</option>
                          ))}
                        </select>
                        <select
                          value={entry.startMinute}
                          onChange={(e) => handleTimeChange(index, 'startMinute', e.target.value)}
                          className="border p-1 mr-1"
                        >
                          {/* You can do increments of 5 or 1 */}
                          {['00','15','30','45'].map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={entry.startAMPM}
                          onChange={(e) => handleTimeChange(index, 'startAMPM', e.target.value)}
                          className="border p-1"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>

                      {/* End Time */}
                      <div className="flex items-center">
                        <span className="mr-1">End:</span>
                        <select
                          value={entry.endHour}
                          onChange={(e) => handleTimeChange(index, 'endHour', e.target.value)}
                          className="border p-1 mr-1"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                            <option key={h} value={h.toString()}>{h}</option>
                          ))}
                        </select>
                        <select
                          value={entry.endMinute}
                          onChange={(e) => handleTimeChange(index, 'endMinute', e.target.value)}
                          className="border p-1 mr-1"
                        >
                          {['00','15','30','45'].map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={entry.endAMPM}
                          onChange={(e) => handleTimeChange(index, 'endAMPM', e.target.value)}
                          className="border p-1"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Submit button in the schedule column (or you can move it outside) */}
            <button
              type="submit"
              className="mt-4 bg-yellow-400 text-white px-4 py-2 rounded hover:bg-yellow-500"
            >
              Add Class
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddModal;