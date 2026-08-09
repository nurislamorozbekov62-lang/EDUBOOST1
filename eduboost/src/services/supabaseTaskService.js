import { supabase } from '../lib/supabase'

export async function createSupabaseTask(
  taskData,
  teacher,
) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: taskData.title.trim(),
      subject: taskData.subject.trim(),
      description:
        taskData.description.trim(),
      class_name: taskData.className,
      deadline: taskData.deadline || null,
      reward: Number(taskData.reward || 0),
      affects_streak: Boolean(
        taskData.affectsStreak,
      ),
      school: teacher.school,
      teacher_id: teacher.id,
      teacher_name: teacher.name,
    })
    .select()
    .single()

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось создать задание',
    )
  }

  return normalizeTask(data)
}

export async function getSupabaseTasksForTeacher(
  teacher,
) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('teacher_id', teacher.id)
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить задания',
    )
  }

  return (data || []).map(normalizeTask)
}

export async function getSupabaseTasksForStudent(
  student,
) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('school', student.school)
    .eq('class_name', student.className)
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить задания',
    )
  }

  return (data || []).map(normalizeTask)
}

export async function deleteSupabaseTask(
  taskId,
) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось удалить задание',
    )
  }
}

export async function submitSupabaseTask(
  task,
  student,
  reportText,
) {
  const submission = {
    task_id: task.id,
    task_title: task.title,
    task_reward: Number(
      task.reward || 0,
    ),
    affects_streak: Boolean(
      task.affectsStreak,
    ),
    student_id: student.id,
    student_name: student.name,
    student_email: student.email || '',
    class_name: student.className,
    school: student.school,
    teacher_id: task.teacherId,
    report_text: reportText.trim(),
    status: 'pending',
    teacher_comment: '',
    reward_given: false,
    submitted_at:
      new Date().toISOString(),
    reviewed_at: null,
  }

  const { data, error } = await supabase
    .from('submissions')
    .upsert(submission, {
      onConflict: 'task_id,student_id',
    })
    .select()
    .single()

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось отправить работу',
    )
  }

  return normalizeSubmission(data)
}

export async function getSupabaseSubmission(
  taskId,
  studentId,
) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('task_id', taskId)
    .eq('student_id', studentId)
    .maybeSingle()

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить отчёт',
    )
  }

  return data
    ? normalizeSubmission(data)
    : null
}

export async function getSupabaseStudentSubmissions(
  studentId,
) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('student_id', studentId)
    .order('submitted_at', {
      ascending: false,
    })

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить работы',
    )
  }

  return (data || []).map(
    normalizeSubmission,
  )
}

export async function getSupabaseTeacherSubmissions(
  teacherId,
) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('submitted_at', {
      ascending: false,
    })

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить работы',
    )
  }

  return (data || []).map(
    normalizeSubmission,
  )
}

export async function reviewSupabaseSubmission(
  submissionId,
  status,
  teacherComment = '',
) {
  const { data, error } = await supabase.rpc(
    'review_submission',
    {
      submission_id: submissionId,
      new_status: status,
      new_teacher_comment:
        teacherComment.trim(),
    },
  )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось проверить работу',
    )
  }

  return normalizeSubmission(data)
}

function normalizeTask(task) {
  return {
    id: task.id,
    title: task.title,
    subject: task.subject,
    description: task.description,
    className: task.class_name,
    deadline: task.deadline,
    reward: Number(task.reward || 0),
    affectsStreak: Boolean(
      task.affects_streak,
    ),
    school: task.school,
    teacherId: task.teacher_id,
    teacherName: task.teacher_name,
    createdAt: task.created_at,
  }
}

function normalizeSubmission(
  submission,
) {
  return {
    id: submission.id,
    taskId: submission.task_id,
    taskTitle:
      submission.task_title,
    taskReward: Number(
      submission.task_reward || 0,
    ),
    affectsStreak: Boolean(
      submission.affects_streak,
    ),
    studentId:
      submission.student_id,
    studentName:
      submission.student_name,
    studentEmail:
      submission.student_email,
    className:
      submission.class_name,
    school: submission.school,
    teacherId:
      submission.teacher_id,
    reportText:
      submission.report_text,
    status: submission.status,
    teacherComment:
      submission.teacher_comment,
    rewardGiven: Boolean(
      submission.reward_given,
    ),
    submittedAt:
      submission.submitted_at,
    reviewedAt:
      submission.reviewed_at,
  }
}