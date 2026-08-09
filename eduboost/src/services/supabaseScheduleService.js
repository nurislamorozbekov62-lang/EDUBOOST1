import { supabase } from '../lib/supabase'

const DAYS = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]

export async function createScheduleLesson(
  lessonData,
  user,
) {
  const { data, error } = await supabase
    .from('schedule_lessons')
    .insert({
      school: user.school,
      class_name: lessonData.className,
      subject: lessonData.subject.trim(),
      teacher_name:
        lessonData.teacherName?.trim() ||
        user.name ||
        '',
      room:
        lessonData.classroom?.trim() ||
        lessonData.room?.trim() ||
        '',
      weekday:
        lessonData.weekday ||
        dayToWeekday(lessonData.day),
      lesson_number: Number(
        lessonData.lessonNumber || 1,
      ),
      start_time: lessonData.startTime,
      end_time: lessonData.endTime,
      description:
        lessonData.description?.trim() ||
        '',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось добавить урок',
    )
  }

  return normalizeLesson(data)
}

export async function getScheduleForTeacher(
  user,
) {
  const { data, error } = await supabase
    .from('schedule_lessons')
    .select('*')
    .eq('school', user.school)
    .order('weekday', {
      ascending: true,
    })
    .order('lesson_number', {
      ascending: true,
    })
    .order('start_time', {
      ascending: true,
    })

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить расписание',
    )
  }

  return (data || []).map(
    normalizeLesson,
  )
}

export async function getScheduleForStudent(
  user,
) {
  const { data, error } = await supabase
    .from('schedule_lessons')
    .select('*')
    .eq('school', user.school)
    .eq('class_name', user.className)
    .order('weekday', {
      ascending: true,
    })
    .order('lesson_number', {
      ascending: true,
    })
    .order('start_time', {
      ascending: true,
    })

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить расписание',
    )
  }

  return (data || []).map(
    normalizeLesson,
  )
}

export async function updateScheduleLesson(
  lessonId,
  lessonData,
) {
  const { data, error } = await supabase
    .from('schedule_lessons')
    .update({
      class_name: lessonData.className,
      subject: lessonData.subject.trim(),
      teacher_name:
        lessonData.teacherName?.trim() ||
        '',
      room:
        lessonData.classroom?.trim() ||
        lessonData.room?.trim() ||
        '',
      weekday:
        lessonData.weekday ||
        dayToWeekday(lessonData.day),
      lesson_number: Number(
        lessonData.lessonNumber || 1,
      ),
      start_time: lessonData.startTime,
      end_time: lessonData.endTime,
      description:
        lessonData.description?.trim() ||
        '',
    })
    .eq('id', lessonId)
    .select()
    .single()

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось изменить урок',
    )
  }

  return normalizeLesson(data)
}

export async function deleteScheduleLesson(
  lessonId,
) {
  const { error } = await supabase
    .from('schedule_lessons')
    .delete()
    .eq('id', lessonId)

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось удалить урок',
    )
  }
}

export function getTodayName() {
  const weekday = new Date().getDay()

  const names = {
    0: 'Воскресенье',
    1: 'Понедельник',
    2: 'Вторник',
    3: 'Среда',
    4: 'Четверг',
    5: 'Пятница',
    6: 'Суббота',
  }

  return names[weekday]
}

export function getNextLessonFromSchedule(
  schedule,
) {
  const today = getTodayName()

  const now = new Date()

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes()

  return (
    schedule
      .filter(
        (lesson) =>
          lesson.day === today,
      )
      .filter(
        (lesson) =>
          timeToMinutes(
            lesson.endTime,
          ) > currentMinutes,
      )
      .sort(
        (firstLesson, secondLesson) =>
          timeToMinutes(
            firstLesson.startTime,
          ) -
          timeToMinutes(
            secondLesson.startTime,
          ),
      )[0] || null
  )
}

function normalizeLesson(lesson) {
  return {
    id: lesson.id,
    school: lesson.school,
    className: lesson.class_name,
    subject: lesson.subject,
    teacherName:
      lesson.teacher_name,
    classroom: lesson.room,
    room: lesson.room,
    weekday: Number(
      lesson.weekday,
    ),
    day:
      DAYS[
        Number(lesson.weekday) - 1
      ] || 'Понедельник',
    lessonNumber: Number(
      lesson.lesson_number || 1,
    ),
    startTime:
      lesson.start_time?.slice(
        0,
        5,
      ) || '',
    endTime:
      lesson.end_time?.slice(
        0,
        5,
      ) || '',
    description:
      lesson.description || '',
    createdBy: lesson.created_by,
    createdAt: lesson.created_at,
  }
}

function dayToWeekday(day) {
  const index = DAYS.indexOf(day)

  return index >= 0
    ? index + 1
    : 1
}

function timeToMinutes(value) {
  const [hours, minutes] =
    String(value || '00:00')
      .split(':')
      .map(Number)

  return hours * 60 + minutes
}