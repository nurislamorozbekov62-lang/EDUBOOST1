import { supabase } from '../lib/supabase'

export async function getSupabaseJournalLessons({
  teacher,
  className,
  subject,
  quarter,
}) {
  if (
    !teacher?.school ||
    !className ||
    !subject ||
    !quarter
  ) {
    return []
  }

  const { data, error } = await supabase
    .from('journal_lessons')
    .select('*')
    .eq('school', teacher.school)
    .eq('class_name', className)
    .eq('subject', subject)
    .eq('quarter', Number(quarter))
    .order('lesson_date', {
      ascending: true,
    })

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить даты уроков.',
    )
  }

  return (data || []).map(
    normalizeLesson,
  )
}


export async function createSupabaseJournalLesson({
  teacher,
  className,
  subject,
  quarter,
  date,
  topic = '',
}) {
  if (!teacher?.id || !teacher?.school) {
    throw new Error(
      'Учитель не авторизован.',
    )
  }

  if (!className) {
    throw new Error(
      'Выберите класс.',
    )
  }

  if (!subject) {
    throw new Error(
      'Выберите предмет.',
    )
  }

  if (!date) {
    throw new Error(
      'Выберите дату урока.',
    )
  }

  const { data, error } = await supabase
    .from('journal_lessons')
    .upsert(
      {
        school: teacher.school,
        class_name: className,
        subject,
        quarter: Number(quarter),
        lesson_date: date,
        topic: topic.trim(),
        teacher_id: teacher.id,
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          'school,class_name,subject,quarter,lesson_date',
      },
    )
    .select('*')
    .single()

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось добавить дату урока.',
    )
  }

  return normalizeLesson(data)
}


export async function deleteSupabaseJournalLesson(
  lessonId,
) {
  if (!lessonId) {
    return
  }

  const { error } = await supabase
    .from('journal_lessons')
    .delete()
    .eq('id', lessonId)

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось удалить дату урока.',
    )
  }
}


function normalizeLesson(
  lesson,
) {
  return {
    id: lesson.id,
    school: lesson.school,
    className: lesson.class_name,
    subject: lesson.subject,
    quarter: Number(
      lesson.quarter,
    ),
    date: lesson.lesson_date,
    topic: lesson.topic || '',
    teacherId: lesson.teacher_id,
    createdAt: lesson.created_at,
    updatedAt: lesson.updated_at,
  }
}