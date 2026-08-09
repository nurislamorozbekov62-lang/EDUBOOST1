import { supabase } from '../lib/supabase'

import {
  getGradeTypeWeight,
} from './supabaseJournalService'

export async function getSupabaseClassGrades({
  teacher,
  className,
  subject,
  quarter,
}) {
  if (
    !teacher?.school ||
    !className ||
    !subject
  ) {
    return []
  }

  const { data, error } =
    await supabase
      .from('grades')
      .select('*')
      .eq(
        'school',
        teacher.school,
      )
      .eq(
        'class_name',
        className,
      )
      .eq(
        'subject',
        subject,
      )
      .eq(
        'quarter',
        Number(quarter),
      )
      .order(
        'grade_date',
        {
          ascending: true,
        },
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
        'Не удалось загрузить оценки класса.',
    )
  }

  return (data || []).map(
    normalizeClassGrade,
  )
}

export async function getSupabaseClassQuarterGrades({
  teacher,
  className,
  subject,
  quarter,
}) {
  if (
    !teacher?.school ||
    !className ||
    !subject
  ) {
    return []
  }

  const { data, error } =
    await supabase
      .from('quarter_grades')
      .select('*')
      .eq(
        'school',
        teacher.school,
      )
      .eq(
        'class_name',
        className,
      )
      .eq(
        'subject',
        subject,
      )
      .eq(
        'quarter',
        Number(quarter),
      )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить четвертные оценки.',
    )
  }

  return (data || []).map(
    (item) => ({
      id:
        item.id,

      studentId:
        item.student_id,

      subject:
        item.subject,

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
    }),
  )
}

export async function getGradingMinimum({
  teacher,
  className,
  subject,
}) {
  if (
    !teacher?.school ||
    !className ||
    !subject
  ) {
    return 3
  }

  const { data, error } =
    await supabase
      .from('grading_settings')
      .select('min_grades')
      .eq(
        'school',
        teacher.school,
      )
      .eq(
        'class_name',
        className,
      )
      .eq(
        'subject',
        subject,
      )
      .maybeSingle()

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить настройки аттестации.',
    )
  }

  return Number(
    data?.min_grades || 3,
  )
}

export async function updateSupabaseGrade(
  gradeId,
  form,
) {
  if (!gradeId) {
    throw new Error(
      'Не найден ID оценки.',
    )
  }

  const value =
    Number(form.value)

  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > 5
  ) {
    throw new Error(
      'Оценка должна быть от 1 до 5.',
    )
  }

  const workType =
    String(
      form.workType ||
        'homework',
    )

  const gradeDate =
    form.date ||
    new Date()
      .toISOString()
      .slice(0, 10)

  const { data, error } =
    await supabase
      .from('grades')
      .update({
        grade:
          value,

        work_type:
          workType,

        weight:
          getGradeTypeWeight(
            workType,
          ),

        topic:
          form.topic?.trim() ||
          '',

        comment:
          form.comment?.trim() ||
          '',

        grade_date:
          gradeDate,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        gradeId,
      )
      .select('*')
      .single()

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось изменить оценку.',
    )
  }

  return normalizeClassGrade(
    data,
  )
}

function normalizeClassGrade(
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

    workType:
      grade.work_type,

    weight:
      Number(
        grade.weight ??
          getGradeTypeWeight(
            grade.work_type,
          ),
      ),

    quarter:
      Number(
        grade.quarter,
      ),

    topic:
      grade.topic || '',

    comment:
      grade.comment || '',

    date:
      grade.grade_date,

    createdAt:
      grade.created_at,

    updatedAt:
      grade.updated_at,
  }
}