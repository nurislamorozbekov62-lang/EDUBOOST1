const GRADES_KEY = 'eduboost_grades'
const ATTENDANCE_KEY = 'eduboost_attendance'

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || []
  } catch {
    return []
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getSchoolStudents(teacher) {
  return readStorage('eduboost_users')
    .filter(
      (user) =>
        user.role === 'Ученик' &&
        user.school === teacher.school,
    )
    .sort((firstStudent, secondStudent) =>
      firstStudent.name.localeCompare(
        secondStudent.name,
        'ru',
      ),
    )
}

export function getSchoolClasses(teacher) {
  const students = getSchoolStudents(teacher)

  return [
    ...new Set(
      students
        .map((student) => student.className)
        .filter(Boolean),
    ),
  ].sort((firstClass, secondClass) =>
    firstClass.localeCompare(
      secondClass,
      'ru',
      {
        numeric: true,
      },
    ),
  )
}

export function getStudentsByClass(
  teacher,
  className,
) {
  return getSchoolStudents(teacher).filter(
    (student) =>
      student.className === className,
  )
}

export function getGrades() {
  return readStorage(GRADES_KEY)
}

export function getStudentGrades(studentId) {
  return getGrades()
    .filter(
      (grade) =>
        grade.studentId === studentId,
    )
    .sort(
      (firstGrade, secondGrade) =>
        new Date(secondGrade.date) -
        new Date(firstGrade.date),
    )
}

export function getTeacherGrades(teacherId) {
  return getGrades()
    .filter(
      (grade) =>
        grade.teacherId === teacherId,
    )
    .sort(
      (firstGrade, secondGrade) =>
        new Date(secondGrade.date) -
        new Date(firstGrade.date),
    )
}

export function createGrade(
  teacher,
  student,
  gradeData,
) {
  const grades = getGrades()

  const newGrade = {
    id: crypto.randomUUID(),
    teacherId: teacher.id,
    teacherName: teacher.name,
    studentId: student.id,
    studentName: student.name,
    school: student.school,
    className: student.className,
    subject: gradeData.subject,
    value: Number(gradeData.value),
    gradeType: gradeData.gradeType,
    topic: gradeData.topic.trim(),
    comment: gradeData.comment.trim(),
    date: gradeData.date,
    createdAt: new Date().toISOString(),
  }

  grades.push(newGrade)
  saveStorage(GRADES_KEY, grades)

  return newGrade
}

export function deleteGrade(
  gradeId,
  teacherId,
) {
  const updatedGrades = getGrades().filter(
    (grade) =>
      !(
        grade.id === gradeId &&
        grade.teacherId === teacherId
      ),
  )

  saveStorage(GRADES_KEY, updatedGrades)
}

export function getAttendance() {
  return readStorage(ATTENDANCE_KEY)
}

export function getStudentAttendance(
  studentId,
) {
  return getAttendance()
    .filter(
      (record) =>
        record.studentId === studentId,
    )
    .sort(
      (firstRecord, secondRecord) =>
        new Date(secondRecord.date) -
        new Date(firstRecord.date),
    )
}

export function getTeacherAttendance(
  teacherId,
) {
  return getAttendance()
    .filter(
      (record) =>
        record.teacherId === teacherId,
    )
    .sort(
      (firstRecord, secondRecord) =>
        new Date(secondRecord.date) -
        new Date(firstRecord.date),
    )
}

export function saveAttendanceRecord(
  teacher,
  student,
  attendanceData,
) {
  const records = getAttendance()

  const existingIndex = records.findIndex(
    (record) =>
      record.studentId === student.id &&
      record.teacherId === teacher.id &&
      record.date === attendanceData.date &&
      record.subject ===
        attendanceData.subject,
  )

  const record = {
    id:
      existingIndex >= 0
        ? records[existingIndex].id
        : crypto.randomUUID(),
    teacherId: teacher.id,
    teacherName: teacher.name,
    studentId: student.id,
    studentName: student.name,
    school: student.school,
    className: student.className,
    subject: attendanceData.subject,
    date: attendanceData.date,
    status: attendanceData.status,
    comment: attendanceData.comment.trim(),
    updatedAt: new Date().toISOString(),
  }

  if (existingIndex >= 0) {
    records[existingIndex] = record
  } else {
    records.push(record)
  }

  saveStorage(ATTENDANCE_KEY, records)

  return record
}

export function deleteAttendanceRecord(
  recordId,
  teacherId,
) {
  const updatedRecords =
    getAttendance().filter(
      (record) =>
        !(
          record.id === recordId &&
          record.teacherId === teacherId
        ),
    )

  saveStorage(
    ATTENDANCE_KEY,
    updatedRecords,
  )
}

export function calculateAverageGrade(
  grades,
) {
  if (!grades.length) {
    return 0
  }

  const sum = grades.reduce(
    (total, grade) =>
      total + Number(grade.value || 0),
    0,
  )

  return Number(
    (sum / grades.length).toFixed(2),
  )
}

export function calculateAttendanceStats(
  records,
) {
  if (!records.length) {
    return {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      percent: 0,
    }
  }

  const present = records.filter(
    (record) =>
      record.status === 'present',
  ).length

  const absent = records.filter(
    (record) =>
      record.status === 'absent',
  ).length

  const late = records.filter(
    (record) =>
      record.status === 'late',
  ).length

  const excused = records.filter(
    (record) =>
      record.status === 'excused',
  ).length

  return {
    total: records.length,
    present,
    absent,
    late,
    excused,
    percent: Math.round(
      ((present + excused) /
        records.length) *
        100,
    ),
  }
}