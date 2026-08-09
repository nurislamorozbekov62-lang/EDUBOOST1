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

  if (!student?.school) {
    throw new Error(
      'У ученика не указана школа.',
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

  const gradeValue = Number(
    form.grade ?? form.value,
  )

  if (
    !Number.isInteger(gradeValue) ||
    gradeValue < 1 ||
    gradeValue > 5
  ) {
    throw new Error(
      'Оценка должна быть от 1 до 5.',
    )
  }

  const quarter = Number(
    form.quarter || 1,
  )

  if (
    !Number.isInteger(quarter) ||
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
    school: student.school,

    class_name:
      student.className,

    subject:
      form.subject,

    student_id:
      student.id,

    teacher_id:
      teacher.id,

    teacher_name:
      teacher.name || '',

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
      form.topic?.trim() || '',

    comment:
      form.comment?.trim() || '',

    grade_date:
      form.date ||
      new Date()
        .toISOString()
        .slice(0, 10),
  }

  console.log(
    'Отправляем оценку:',
    payload,
  )

  const { data, error } =
    await supabase
      .from('grades')
      .insert(payload)
      .select('*')
      .single()

  if (error) {
    console.error(
      'Ошибка Supabase grades:',
      error,
    )

    window.alert(
      `Не удалось поставить оценку.\n\n${error.message}`,
    )

    throw new Error(
      error.message ||
        'Не удалось сохранить оценку.',
    )
  }

  console.log(
    'Оценка сохранена:',
    data,
  )

  return normalizeGrade(data)
}

export async function deleteSupabaseGrade(
  gradeId,
) {
  if (!gradeId) {
    return
  }

  const { error } =
    await supabase
      .from('grades')
      .delete()
      .eq('id', gradeId)

  if (error) {
    window.alert(
      `Не удалось удалить оценку.\n\n${error.message}`,
    )

    throw new Error(
      error.message ||
        'Не удалось удалить оценку.',
    )
  }
}

export async function getSupabaseStudentGrades(
  studentId,
) {
  if (!studentId) {
    return []
  }

  const { data, error } =
    await supabase
      .from('grades')
      .select('*')
      .eq(
        'student_id',
        studentId,
      )
      .order('grade_date', {
        ascending: false,
      })
      .order('created_at', {
        ascending: false,
      })

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить оценки.',
    )
  }

  return (data || []).map(
    normalizeGrade,
  )
}

export async function getSupabaseStudentQuarterGrades(
  studentId,
  quarter,
) {
  if (!studentId) {
    return []
  }

  const { data, error } =
    await supabase
      .from('grades')
      .select('*')
      .eq(
        'student_id',
        studentId,
      )
      .eq(
        'quarter',
        Number(quarter),
      )
      .order('grade_date', {
        ascending: false,
      })
      .order('created_at', {
        ascending: false,
      })

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить оценки за четверть.',
    )
  }

  return (data || []).map(
    normalizeGrade,
  )
}

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

  const { data, error } =
    await supabase.rpc(
      'calculate_quarter_grade',
      {
        target_student_id:
          studentId,

        target_subject:
          subject,

        target_quarter:
          Number(quarter),
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

export async function saveGradingSettings(
  teacher,
  className,
  subject,
  minGrades,
) {
  if (
    !teacher?.id ||
    !teacher?.school
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
    Number(minGrades)

  if (
    !Number.isInteger(minimum) ||
    minimum < 1 ||
    minimum > 30
  ) {
    throw new Error(
      'Минимум оценок должен быть от 1 до 30.',
    )
  }

  const { data, error } =
    await supabase
      .from('grading_settings')
      .upsert(
        {
          school:
            teacher.school,

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
        },
        {
          onConflict:
            'school,class_name,subject',
        },
      )
      .select('*')
      .single()

  if (error) {
    window.alert(
      `Не удалось сохранить настройки.\n\n${error.message}`,
    )

    throw new Error(
      error.message ||
        'Не удалось сохранить настройки.',
    )
  }

  return {
    id: data.id,

    minGrades:
      Number(
        data.min_grades,
      ),
  }
}

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

  const { data, error } =
    await supabase
      .from('quarter_grades')
      .upsert(
        {
          school:
            student.school,

          class_name:
            student.className,

          subject,

          student_id:
            student.id,

          quarter:
            Number(quarter),

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
        },
        {
          onConflict:
            'student_id,subject,quarter',
        },
      )
      .select('*')
      .single()

  if (error) {
    window.alert(
      `Не удалось выставить четвертную оценку.\n\n${error.message}`,
    )

    throw new Error(
      error.message ||
        'Не удалось выставить четвертную оценку.',
    )
  }

  return normalizeQuarterGrade(
    data,
  )
}

export async function getStudentFinalQuarterGrades(
  studentId,
) {
  if (!studentId) {
    return []
  }

  const { data, error } =
    await supabase
      .from('quarter_grades')
      .select('*')
      .eq(
        'student_id',
        studentId,
      )
      .order('quarter', {
        ascending: true,
      })

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить четвертные оценки.',
    )
  }

  return (data || []).map(
    normalizeQuarterGrade,
  )
}

export async function getSupabaseSchoolClassesForTeacher(
  teacher,
) {
  if (
    !teacher?.school
  ) {
    return []
  }

  const { data, error } =
    await supabase
      .from('profiles')
      .select('class_name')
      .eq(
        'school',
        teacher.school,
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
      (data || [])
        .map(
          (profile) =>
            profile.class_name,
        )
        .filter(Boolean),
    ),
  ].sort((a, b) =>
    a.localeCompare(
      b,
      'ru',
      {
        numeric: true,
      },
    ),
  )
}

export async function getSupabaseStudentsByClass(
  teacher,
  className,
) {
  if (
    !teacher?.school ||
    !className
  ) {
    return []
  }

  const { data, error } =
    await supabase
      .from('profiles')
      .select(
        `
          id,
          name,
          role,
          school,
          class_name
        `,
      )
      .eq(
        'school',
        teacher.school,
      )
      .eq(
        'class_name',
        className,
      )
      .eq(
        'role',
        'Ученик',
      )
      .order('name', {
        ascending: true,
      })

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

  return (data || []).map(
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

      className:
        student.class_name ||
        '',
    }),
  )
}

export function buildGradeForecast(
  grades,
  subject,
  quarter,
  nextWorkType = 'control',
) {
  const subjectGrades =
    (grades || []).filter(
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

export function getQuarterTargetInfo(
  weightedAverage,
) {
  if (
    weightedAverage === null ||
    weightedAverage === undefined
  ) {
    return {
      toFour: null,
      toFive: null,
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
            ).toFixed(2),
          ),

    toFive:
      average >= 4.5
        ? 0
        : Number(
            (
              4.5 -
              average
            ).toFixed(2),
          ),
  }
}

export function calculateWeightedAverage(
  grades,
) {
  if (
    !Array.isArray(grades) ||
    grades.length === 0
  ) {
    return null
  }

  let weightedSum = 0
  let totalWeight = 0

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
          value * weight

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
    ).toFixed(2),
  )
}

export function getSuggestedQuarterGrade(
  average,
) {
  if (
    average === null ||
    average === undefined
  ) {
    return null
  }

  const value =
    Number(average)

  if (value >= 4.5) {
    return 5
  }

  if (value >= 3.5) {
    return 4
  }

  if (value >= 2.5) {
    return 3
  }

  return 2
}

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

function normalizeWorkType(
  value,
) {
  const normalized =
    String(value || '')
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
    mapping[normalized] ||
    'homework'
  )
}

function normalizeGrade(
  grade,
) {
  return {
    id:
      grade.id,

    school:
      grade.school,

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

    createdAt:
      grade.created_at,
  }
}

function normalizeQuarterGrade(
  item,
) {
  return {
    id:
      item.id,

    school:
      item.school,

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