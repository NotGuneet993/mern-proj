import React, { useState, useEffect } from 'react';
import { AiOutlineCloseCircle } from 'react-icons/ai';
const API_URL = import.meta.env.VITE_API_URL;

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newClassData: any) => void;
}

function SearchModal({ isOpen, onClose, onSave }: SearchModalProps) {
    // Existing fields
    const [courseCode, setCourseCode] = useState('');
    const [professor, setProfessor] = useState('');

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
            const codes = data.map((cls: any) => cls.course_code);
            setMatchedCourseCodes(codes);
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
            const profs = data.map((cls: any) => cls.professor);
            setMatchedProfessors(profs);
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
}

export default SearchModal;