import { supabase } from '../lib/supabase'


export const GRADE_TYPES = [
  {
    value: 'control',
    label: 'Контрольная работа',
    weight: 1,
  },
  {
    value: 'sor',
    label: 'СОР',
    weight: 1,
  },
  {
    value: 'soch',
    label: 'СОЧ',
    weight: 1,
  },
  {
    value: 'test',
    label: 'Тест',
    weight: 1,
  },
  {
    value: 'independent',
    label: 'Самостоятельная работа',
    weight: 0.7,
  },
  {
    value: 'practical',
    label: 'Практическая работа',
    weight: 0.7,
  },
  {
    value: 'oral',
    label: 'Устный ответ',
    weight: 0.5,
  },
  {
    value: 'homework',
    label: 'Домашняя работа',
    weight: 0.3,
  },
]


/* ========================================
   CREATE GRADE
======================================== */

export async function createSupabaseGrade(
  teacher,
  student,
  form,
) {
  if (!teacher?.id) {
    throw new Error(
      'Не найден аккаунт учителя.',
    )
  }


  if (!student?.id) {
    throw new Error(
      'Не выбран ученик.',
    )
  }


  if (
    !student?.school &&
    !student?.schoolId &&
    !teacher?.school &&
    !teacher?.schoolId
  ) {
    throw new Error(
      'Не удалось определить школу.',
    )
  }


  if (!student?.className) {
    throw new Error(
      'У ученика не указан класс.',
    )
  }


  if (!form?.subject) {
    throw new Error(
      'Выберите предмет.',
    )
  }


  const gradeValue =
    Number(
      form.grade ??
        form.value,
    )


  if (
    !Number.isInteger(
      gradeValue,
    ) ||
    gradeValue < 1 ||
    gradeValue > 5
  ) {
    throw new Error(
      'Оценка должна быть от 1 до 5.',
    )
  }


  const quarter =
    Number(
      form.quarter ||
        1,
    )


  if (
    !Number.isInteger(
      quarter,
    ) ||
    quarter < 1 ||
    quarter > 4
  ) {
    throw new Error(
      'Некорректная четверть.',
    )
  }


  const workType =
    normalizeWorkType(
      form.workType ||
        form.gradeType,
    )


  const payload = {
    school:
      student.school ||
      teacher.school ||
      null,

    school_id:
      student.schoolId ||
      teacher.schoolId ||
      null,

    class_name:
      student.className,

    subject:
      form.subject,

    student_id:
      student.id,

    teacher_id:
      teacher.id,

    teacher_name:
      teacher.name ||
      '',

    grade:
      gradeValue,

    work_type:
      workType,

    weight:
      getGradeTypeWeight(
        workType,
      ),

    quarter,

    topic:
      String(
        form.topic ||
          '',
      ).trim(),

    comment:
      String(
        form.comment ||
          '',
      ).trim(),

    grade_date:
      form.date ||
      getToday(),

    journal_lesson_id:
      form.journalLessonId ||
      null,
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('grades')
      .insert(
        payload,
      )
      .select('*')
      .single()


  if (error) {
    console.error(
      'Ошибка Supabase grades:',
      error,
    )

    throw new Error(
      error.message ||
        'Не удалось сохранить оценку.',
    )
  }


  return normalizeGrade(
    data,
  )
}


/* ========================================
   CREATE GRADE FOR JOURNAL LESSON
======================================== */

export async function createSupabaseJournalLessonGrade({
  teacher,
  student,
  lesson,
  grade,
  workType = 'oral',
  comment = '',
}) {
  if (!lesson?.id) {
    throw new Error(
      'Урок не найден.',
    )
  }


  return createSupabaseGrade(
    teacher,
    student,
    {
      grade,

      subject:
        lesson.subject,

      quarter:
        lesson.quarter,

      topic:
        lesson.topic ||
        '',

      date:
        lesson.date,

      workType,

      comment,

      journalLessonId:
        lesson.id,
    },
  )
}


/* ========================================
   DELETE GRADE
======================================== */

export async function deleteSupabaseGrade(
  gradeId,
) {
  if (!gradeId) {
    return
  }


  const {
    error,
  } =
    await supabase
      .from('grades')
      .delete()
      .eq(
        'id',
        gradeId,
      )


  if (error) {
    throw new Error(
      error.message ||
        'Не удалось удалить оценку.',
    )
  }
}


/* ========================================
   GET GRADES FOR ONE JOURNAL LESSON
======================================== */

export async function getSupabaseGradesForJournalLesson(
  journalLessonId,
) {
  if (!journalLessonId) {
    return []
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('grades')
      .select('*')
      .eq(
        'journal_lesson_id',
        journalLessonId,
      )
      .order(
        'created_at',
        {
          ascending: true,
        },
      )


  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить оценки урока.',
    )
  }


  return (
    data ||
    []
  ).map(
    normalizeGrade,
  )
}


/* ========================================
   STUDENT GRADES
======================================== */

export async function getSupabaseStudentGrades(
  studentId,
) {
  if (!studentId) {
    return []
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('grades')
      .select('*')
      .eq(
        'student_id',
        studentId,
      )
      .order(
        'grade_date',
        {
          ascending: false,
        },
      )
      .order(
        'created_at',
        {
          ascending: false,
        },
      )


  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить оценки.',
    )
  }


  return (
    data ||
    []
  ).map(
    normalizeGrade,
  )
}


/* ========================================
   STUDENT QUARTER GRADES
======================================== */

export async function getSupabaseStudentQuarterGrades(
  studentId,
  quarter,
) {
  if (!studentId) {
    return []
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('grades')
      .select('*')
      .eq(
        'student_id',
        studentId,
      )
      .eq(
        'quarter',
        Number(
          quarter,
        ),
      )
      .order(
        'grade_date',
        {
          ascending: false,
        },
      )
      .order(
        'created_at',
        {
          ascending: false,
        },
      )


  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить оценки за четверть.',
    )
  }


  return (
    data ||
    []
  ).map(
    normalizeGrade,
  )
}


/* ========================================
   CALCULATE QUARTER
======================================== */

export async function calculateQuarterResult(
  studentId,
  subject,
  quarter,
) {
  if (
    !studentId ||
    !subject
  ) {
    return emptyQuarterResult()
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      'calculate_quarter_grade',
      {
        target_student_id:
          studentId,

        target_subject:
          subject,

        target_quarter:
          Number(
            quarter,
          ),
      },
    )


  if (error) {
    console.error(
      'Ошибка расчёта четверти:',
      error,
    )

    throw new Error(
      error.message ||
        'Не удалось рассчитать четвертную оценку.',
    )
  }


  const result =
    data?.[0]


  if (!result) {
    return emptyQuarterResult()
  }


  return {
    weightedAverage:
      result.weighted_average ===
      null
        ? null
        : Number(
            result.weighted_average,
          ),

    suggestedGrade:
      result.suggested_grade ===
      null
        ? null
        : Number(
            result.suggested_grade,
          ),

    gradesCount:
      Number(
        result.grades_count ||
          0,
      ),

    minimumRequired:
      Number(
        result.minimum_required ||
          3,
      ),

    gradesMissing:
      Number(
        result.grades_missing ||
          0,
      ),

    isAttested:
      Boolean(
        result.is_attested,
      ),
  }
}


/* ========================================
   GRADING SETTINGS
======================================== */

export async function saveGradingSettings(
  teacher,
  className,
  subject,
  minGrades,
) {
  if (
    !teacher?.id ||
    (
      !teacher?.school &&
      !teacher?.schoolId
    )
  ) {
    throw new Error(
      'Не найден профиль учителя.',
    )
  }


  if (!className) {
    throw new Error(
      'Не выбран класс.',
    )
  }


  const minimum =
    Number(
      minGrades,
    )


  if (
    !Number.isInteger(
      minimum,
    ) ||
    minimum < 1 ||
    minimum > 30
  ) {
    throw new Error(
      'Минимум оценок должен быть от 1 до 30.',
    )
  }


  const payload = {
    school:
      teacher.school ||
      null,

    school_id:
      teacher.schoolId ||
      null,

    class_name:
      className,

    subject,

    min_grades:
      minimum,

    created_by:
      teacher.id,

    updated_at:
      new Date()
        .toISOString(),
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'grading_settings',
      )
      .upsert(
        payload,
        {
          onConflict:
            'school,class_name,subject',
        },
      )
      .select('*')
      .single()


  if (error) {
    throw new Error(
      error.message ||
        'Не удалось сохранить настройки.',
    )
  }


  return {
    id:
      data.id,

    minGrades:
      Number(
        data.min_grades,
      ),
  }
}


/* ========================================
   CONFIRM QUARTER GRADE
======================================== */

export async function confirmQuarterGrade({
  teacher,
  student,
  subject,
  quarter,
  finalGrade,
}) {
  const result =
    await calculateQuarterResult(
      student.id,
      subject,
      quarter,
    )


  if (!result.isAttested) {
    throw new Error(
      `Недостаточно оценок. Не хватает: ${result.gradesMissing}`,
    )
  }


  const grade =
    Number(
      finalGrade ??
        result.suggestedGrade,
    )


  if (
    grade < 2 ||
    grade > 5
  ) {
    throw new Error(
      'Некорректная четвертная оценка.',
    )
  }


  const payload = {
    school:
      student.school ||
      teacher.school ||
      null,

    school_id:
      student.schoolId ||
      teacher.schoolId ||
      null,

    class_name:
      student.className,

    subject,

    student_id:
      student.id,

    quarter:
      Number(
        quarter,
      ),

    weighted_average:
      result.weightedAverage,

    suggested_grade:
      result.suggestedGrade,

    final_grade:
      grade,

    teacher_id:
      teacher.id,

    confirmed_at:
      new Date()
        .toISOString(),

    updated_at:
      new Date()
        .toISOString(),
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'quarter_grades',
      )
      .upsert(
        payload,
        {
          onConflict:
            'student_id,subject,quarter',
        },
      )
      .select('*')
      .single()


  if (error) {
    throw new Error(
      error.message ||
        'Не удалось выставить четвертную оценку.',
    )
  }


  return normalizeQuarterGrade(
    data,
  )
}


/* ========================================
   FINAL QUARTER GRADES
======================================== */

export async function getStudentFinalQuarterGrades(
  studentId,
) {
  if (!studentId) {
    return []
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'quarter_grades',
      )
      .select('*')
      .eq(
        'student_id',
        studentId,
      )
      .order(
        'quarter',
        {
          ascending: true,
        },
      )


  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить четвертные оценки.',
    )
  }


  return (
    data ||
    []
  ).map(
    normalizeQuarterGrade,
  )
}


/* ========================================
   SCHOOL CLASSES FOR TEACHER
======================================== */

export async function getSupabaseSchoolClassesForTeacher(
  teacher,
) {
  if (
    !teacher?.school &&
    !teacher?.schoolId
  ) {
    return []
  }


  let query =
    supabase
      .from('profiles')
      .select(
        'class_name',
      )
      .eq(
        'role',
        'Ученик',
      )
      .not(
        'class_name',
        'is',
        null,
      )


  if (
    teacher.schoolId
  ) {
    query =
      query.eq(
        'school_id',
        teacher.schoolId,
      )
  } else {
    query =
      query.eq(
        'school',
        teacher.school,
      )
  }


  const {
    data,
    error,
  } =
    await query


  if (error) {
    console.error(
      'Ошибка загрузки классов:',
      error,
    )

    throw new Error(
      error.message ||
        'Не удалось загрузить классы.',
    )
  }


  return [
    ...new Set(
      (
        data ||
        []
      )
        .map(
          (profile) =>
            profile.class_name,
        )
        .filter(
          Boolean,
        ),
    ),
  ].sort(
    (
      first,
      second,
    ) =>
      first.localeCompare(
        second,
        'ru',
        {
          numeric: true,
        },
      ),
  )
}


/* ========================================
   STUDENTS BY CLASS
======================================== */

export async function getSupabaseStudentsByClass(
  teacher,
  className,
) {
  if (
    (
      !teacher?.school &&
      !teacher?.schoolId
    ) ||
    !className
  ) {
    return []
  }


  let query =
    supabase
      .from('profiles')
      .select(
        `
          id,
          name,
          role,
          school,
          school_id,
          class_name
        `,
      )
      .eq(
        'class_name',
        className,
      )
      .eq(
        'role',
        'Ученик',
      )
      .order(
        'name',
        {
          ascending: true,
        },
      )


  if (
    teacher.schoolId
  ) {
    query =
      query.eq(
        'school_id',
        teacher.schoolId,
      )
  } else {
    query =
      query.eq(
        'school',
        teacher.school,
      )
  }


  const {
    data,
    error,
  } =
    await query


  if (error) {
    console.error(
      'Ошибка загрузки учеников:',
      error,
    )

    throw new Error(
      error.message ||
        'Не удалось загрузить учеников.',
    )
  }


  return (
    data ||
    []
  ).map(
    (student) => ({
      id:
        student.id,

      name:
        student.name ||
        'Ученик',

      role:
        student.role,

      school:
        student.school,

      schoolId:
        student.school_id,

      className:
        student.class_name ||
        '',
    }),
  )
}


/* ========================================
   FORECAST
======================================== */

export function buildGradeForecast(
  grades,
  subject,
  quarter,
  nextWorkType = 'control',
) {
  const subjectGrades =
    (
      grades ||
      []
    ).filter(
      (grade) =>
        grade.subject ===
          subject &&
        Number(
          grade.quarter,
        ) ===
          Number(
            quarter,
          ),
    )


  const nextWeight =
    getGradeTypeWeight(
      nextWorkType,
    )


  return [
    2,
    3,
    4,
    5,
  ].map(
    (nextGrade) => {
      const projected =
        calculateWeightedAverage([
          ...subjectGrades,

          {
            value:
              nextGrade,

            weight:
              nextWeight,
          },
        ])


      return {
        grade:
          nextGrade,

        weightedAverage:
          projected,

        predictedQuarterGrade:
          getSuggestedQuarterGrade(
            projected,
          ),
      }
    },
  )
}


/* ========================================
   TARGET INFO
======================================== */

export function getQuarterTargetInfo(
  weightedAverage,
) {
  if (
    weightedAverage ===
      null ||
    weightedAverage ===
      undefined
  ) {
    return {
      toFour:
        null,

      toFive:
        null,
    }
  }


  const average =
    Number(
      weightedAverage,
    )


  return {
    toFour:
      average >= 3.5
        ? 0
        : Number(
            (
              3.5 -
              average
            ).toFixed(
              2,
            ),
          ),

    toFive:
      average >= 4.5
        ? 0
        : Number(
            (
              4.5 -
              average
            ).toFixed(
              2,
            ),
          ),
  }
}


/* ========================================
   WEIGHTED AVERAGE
======================================== */

export function calculateWeightedAverage(
  grades,
) {
  if (
    !Array.isArray(
      grades,
    ) ||
    grades.length === 0
  ) {
    return null
  }


  let weightedSum =
    0

  let totalWeight =
    0


  grades.forEach(
    (grade) => {
      const value =
        Number(
          grade.value ??
            grade.grade ??
            0,
        )


      const weight =
        Number(
          grade.weight ??
            getGradeTypeWeight(
              grade.workType,
            ),
        )


      if (
        value > 0 &&
        weight > 0
      ) {
        weightedSum +=
          value *
          weight

        totalWeight +=
          weight
      }
    },
  )


  if (
    totalWeight === 0
  ) {
    return null
  }


  return Number(
    (
      weightedSum /
      totalWeight
    ).toFixed(
      2,
    ),
  )
}


/* ========================================
   SUGGESTED QUARTER GRADE
======================================== */

export function getSuggestedQuarterGrade(
  average,
) {
  if (
    average === null ||
    average ===
      undefined
  ) {
    return null
  }


  const value =
    Number(
      average,
    )


  if (
    value >= 4.5
  ) {
    return 5
  }


  if (
    value >= 3.5
  ) {
    return 4
  }


  if (
    value >= 2.5
  ) {
    return 3
  }


  return 2
}


/* ========================================
   GRADE TYPE
======================================== */

export function getGradeTypeWeight(
  workType,
) {
  const item =
    GRADE_TYPES.find(
      (type) =>
        type.value ===
        workType,
    )


  return (
    item?.weight ??
    0.3
  )
}


export function getGradeTypeLabel(
  workType,
) {
  const item =
    GRADE_TYPES.find(
      (type) =>
        type.value ===
        workType,
    )


  return (
    item?.label ||
    'Оценка'
  )
}


/* ========================================
   HELPERS
======================================== */

function normalizeWorkType(
  value,
) {
  const normalized =
    String(
      value ||
        '',
    )
      .trim()
      .toLowerCase()


  const mapping = {
    'контрольная работа':
      'control',

    контрольная:
      'control',

    сор:
      'sor',

    соч:
      'soch',

    тест:
      'test',

    'самостоятельная работа':
      'independent',

    самостоятельная:
      'independent',

    'практическая работа':
      'practical',

    практическая:
      'practical',

    'устный ответ':
      'oral',

    'ответ на уроке':
      'oral',

    'домашняя работа':
      'homework',

    домашняя:
      'homework',
  }


  if (
    GRADE_TYPES.some(
      (type) =>
        type.value ===
        normalized,
    )
  ) {
    return normalized
  }


  return (
    mapping[
      normalized
    ] ||
    'homework'
  )
}


function getToday() {
  const now =
    new Date()


  const local =
    new Date(
      now.getTime() -
        now.getTimezoneOffset() *
          60000,
    )


  return local
    .toISOString()
    .slice(
      0,
      10,
    )
}


/* ========================================
   NORMALIZE GRADE
======================================== */

function normalizeGrade(
  grade,
) {
  return {
    id:
      grade.id,

    school:
      grade.school,

    schoolId:
      grade.school_id,

    className:
      grade.class_name,

    subject:
      grade.subject,

    studentId:
      grade.student_id,

    teacherId:
      grade.teacher_id,

    teacherName:
      grade.teacher_name ||
      '',

    value:
      Number(
        grade.grade,
      ),

    grade:
      Number(
        grade.grade,
      ),

    workType:
      grade.work_type,

    gradeType:
      getGradeTypeLabel(
        grade.work_type,
      ),

    weight:
      Number(
        grade.weight,
      ),

    quarter:
      Number(
        grade.quarter,
      ),

    topic:
      grade.topic ||
      '',

    comment:
      grade.comment ||
      '',

    date:
      grade.grade_date,

    journalLessonId:
      grade.journal_lesson_id,

    createdAt:
      grade.created_at,

    updatedAt:
      grade.updated_at,
  }
}


/* ========================================
   NORMALIZE QUARTER GRADE
======================================== */

function normalizeQuarterGrade(
  item,
) {
  return {
    id:
      item.id,

    school:
      item.school,

    schoolId:
      item.school_id,

    className:
      item.class_name,

    subject:
      item.subject,

    studentId:
      item.student_id,

    quarter:
      Number(
        item.quarter,
      ),

    weightedAverage:
      item.weighted_average ===
      null
        ? null
        : Number(
            item.weighted_average,
          ),

    suggestedGrade:
      item.suggested_grade ===
      null
        ? null
        : Number(
            item.suggested_grade,
          ),

    finalGrade:
      item.final_grade ===
      null
        ? null
        : Number(
            item.final_grade,
          ),

    teacherId:
      item.teacher_id,

    confirmedAt:
      item.confirmed_at,
  }
}


/* ========================================
   EMPTY QUARTER RESULT
======================================== */

function emptyQuarterResult() {
  return {
    weightedAverage:
      null,

    suggestedGrade:
      null,

    gradesCount:
      0,

    minimumRequired:
      3,

    gradesMissing:
      3,

    isAttested:
      false,
  }
}