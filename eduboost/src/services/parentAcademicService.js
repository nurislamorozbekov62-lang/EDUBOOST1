import {
  getSupabaseStudentGrades,
} from './supabaseJournalService'

import {
  calculateSupabaseAttendanceStats,
  getSupabaseStudentAttendance,
} from './supabaseAttendanceService'


export async function getParentAcademicSnapshot(
  studentId,
) {
  if (!studentId) {
    return {
      grades: [],
      attendanceRecords: [],
      attendance: {
        percent: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      },
      averageGrade: null,
    }
  }


  const [
    gradesResult,
    attendanceResult,
  ] = await Promise.all([
    getSupabaseStudentGrades(
      studentId,
    ),

    getSupabaseStudentAttendance(
      studentId,
    ),
  ])


  const grades =
    gradesResult || []


  const attendanceRecords =
    attendanceResult || []


  const attendance =
    calculateSupabaseAttendanceStats(
      attendanceRecords,
    )


  const averageGrade =
    grades.length === 0
      ? null
      : Number(
          (
            grades.reduce(
              (
                total,
                grade,
              ) =>
                total +
                Number(
                  grade.value ||
                    0,
                ),
              0,
            ) /
            grades.length
          ).toFixed(2),
        )


  return {
    grades,
    attendanceRecords,
    attendance,
    averageGrade,
  }
}