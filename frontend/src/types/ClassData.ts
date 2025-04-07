import { ClassSchedule } from './ClassSchedule';

export interface ClassData {
    _id: string;
    course_code: string;
    class_name: string;
    professor: string;
    meeting_type: string;
    type: string;
    building: string;
    building_prefix?: string;
    room_number: string;
    class_schedule: ClassSchedule[] | null;
}