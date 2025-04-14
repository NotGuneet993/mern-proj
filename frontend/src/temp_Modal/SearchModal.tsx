import React, { useState, useEffect } from 'react';
import { AiOutlineCloseCircle } from 'react-icons/ai';
const API_URL = import.meta.env.VITE_API_URL;

import thumbsUp from '../assets/thumbsup.svg'

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (searchClassData: any) => void;
}

function SearchModal({ isOpen, onClose, onSave }: SearchModalProps) {
    // Existing fields
    const [courseCode, setCourseCode] = useState('');
    const [professor, setProfessor] = useState('');
    const [meetingType, setMeetingType] = useState('');
    const [type, setType] = useState('');

    // Autocomplete states (unchanged)
    const [searchCount, setSearchCount] = useState(0);
    const [matchedCourseCodes, setMatchedCourseCodes] = useState<string[]>([]);
    const [matchedProfessors, setMatchedProfessors] = useState<string[]>([]);
    const [focusedField, setFocusedField] = useState<'courseCode' | 'professor' | null>(null);

  
    // Autocomplete calls (unchanged)
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

    // Handler: User picks a suggestion
    const selectCourseCode = (code: string) => {
        setCourseCode(code);
        setMatchedCourseCodes([]);
      };
      const selectProfessor = (prof: string) => {
        setProfessor(prof);
        setMatchedProfessors([]);
      };

    // Submit handler
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

    
        // Construct final object
        const searchClassData = {
          course_code: courseCode,
          professor: professor,
          meeting_type: meetingType,
          type: type,
        };
    
        // Pass back to parent
        onSave(searchClassData);
    
        // Reset fields
        setCourseCode('');
        setProfessor('');
        setMeetingType('');
        setType('');
        setSearchCount(0);
        setMatchedCourseCodes([]);
        setMatchedProfessors([]);
    
        onClose();
      };

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
      
              <h2 className="text-xl font-semibold mb-4">Start with a search! If we can't find your section, you can manually add it afterward.</h2>
      
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
                    autoComplete='off'
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
      
                  {/* PROFESSOR */}
                  <label htmlFor="professor" className="block mb-1">
                    Professor
                  </label>
                  <input
                    id="professor"
                    type="text"
                    autoComplete='off'
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
      
                    {/* Submit button in the schedule column (or you can move it outside) */}
                    <button
                    type="submit"
                    className="mt-4 bg-yellow-400 text-white px-4 py-2 rounded hover:bg-yellow-500"
                    >
                    Search
                    </button>

                </div>

                {/* RIGHT COLUMN: Awesome thumbs up SVG */}
                <div className="md:w-1/2 flex justify-center">
                  <img src={thumbsUp} className="w-105 h-78 bg-white"/>
                </div>

              </form>
            </div>
          </div>
        );
}

export default SearchModal;