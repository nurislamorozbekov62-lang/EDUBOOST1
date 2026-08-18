import { supabase } from '../lib/supabase'


const TASK_SUBMISSIONS_BUCKET =
  'task-submissions'

const MAX_ATTACHMENT_SIZE =
  10 * 1024 * 1024

const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]


/* =========================================================
   TASKS
========================================================= */

export async function createSupabaseTask(
  taskData,
  teacher,
) {
  if (
    !teacher?.id
  ) {
    throw new Error(
      'Учитель не авторизован',
    )
  }


  const title =
    String(
      taskData?.title ||
        '',
    ).trim()

  const subject =
    String(
      taskData?.subject ||
        '',
    ).trim()

  const description =
    String(
      taskData?.description ||
        '',
    ).trim()

  const className =
    taskData?.className ||
    ''


  if (
    !title
  ) {
    throw new Error(
      'Введите название задания',
    )
  }


  if (
    !subject
  ) {
    throw new Error(
      'Выберите предмет',
    )
  }


  if (
    !className
  ) {
    throw new Error(
      'Выберите класс',
    )
  }


  const payload = {
    title,

    subject,

    description,

    class_name:
      className,

    deadline:
      taskData?.deadline ||
      null,

    reward:
      Number(
        taskData?.reward ||
          0,
      ),

    affects_streak:
      Boolean(
        taskData
          ?.affectsStreak,
      ),

    school:
      teacher.school ||
      null,

    school_id:
      teacher.schoolId ||
      null,

    teacher_id:
      teacher.id,

    teacher_name:
      teacher.name ||
      '',

    journal_lesson_id:
      taskData
        ?.journalLessonId ||
      null,
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('tasks')
      .insert(
        payload,
      )
      .select('*')
      .single()


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось создать задание',
    )
  }


  return normalizeTask(
    data,
  )
}


export async function getSupabaseTasksForTeacher(
  teacher,
) {
  if (
    !teacher?.id
  ) {
    return []
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('tasks')
      .select('*')
      .eq(
        'teacher_id',
        teacher.id,
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        },
      )


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось загрузить задания',
    )
  }


  return (
    data ||
    []
  ).map(
    normalizeTask,
  )
}


export async function getSupabaseTasksForStudent(
  student,
) {
  if (
    !student
  ) {
    return []
  }


  if (
    !student.className
  ) {
    return []
  }


  let query =
    supabase
      .from('tasks')
      .select('*')
      .eq(
        'class_name',
        student.className,
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        },
      )


  if (
    student.schoolId
  ) {
    query =
      query.eq(
        'school_id',
        student.schoolId,
      )
  } else if (
    student.school
  ) {
    query =
      query.eq(
        'school',
        student.school,
      )
  } else {
    return []
  }


  const {
    data,
    error,
  } =
    await query


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось загрузить задания',
    )
  }


  return (
    data ||
    []
  ).map(
    normalizeTask,
  )
}


export async function getSupabaseTasksForJournalLesson(
  journalLessonId,
) {
  if (
    !journalLessonId
  ) {
    return []
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('tasks')
      .select('*')
      .eq(
        'journal_lesson_id',
        journalLessonId,
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        },
      )


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось загрузить задания урока',
    )
  }


  return (
    data ||
    []
  ).map(
    normalizeTask,
  )
}


export async function getSupabaseTaskById(
  taskId,
) {
  if (
    !taskId
  ) {
    return null
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('tasks')
      .select('*')
      .eq(
        'id',
        taskId,
      )
      .maybeSingle()


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось загрузить задание',
    )
  }


  return data
    ? normalizeTask(
        data,
      )
    : null
}


export async function updateSupabaseTask(
  taskId,
  taskData,
) {
  if (
    !taskId
  ) {
    throw new Error(
      'Задание не найдено',
    )
  }


  const payload = {}


  if (
    taskData.title !==
    undefined
  ) {
    payload.title =
      String(
        taskData.title ||
          '',
      ).trim()
  }


  if (
    taskData.subject !==
    undefined
  ) {
    payload.subject =
      String(
        taskData.subject ||
          '',
      ).trim()
  }


  if (
    taskData.description !==
    undefined
  ) {
    payload.description =
      String(
        taskData.description ||
          '',
      ).trim()
  }


  if (
    taskData.className !==
    undefined
  ) {
    payload.class_name =
      taskData.className
  }


  if (
    taskData.deadline !==
    undefined
  ) {
    payload.deadline =
      taskData.deadline ||
      null
  }


  if (
    taskData.reward !==
    undefined
  ) {
    payload.reward =
      Number(
        taskData.reward ||
          0,
      )
  }


  if (
    taskData.affectsStreak !==
    undefined
  ) {
    payload.affects_streak =
      Boolean(
        taskData.affectsStreak,
      )
  }


  if (
    taskData.journalLessonId !==
    undefined
  ) {
    payload.journal_lesson_id =
      taskData.journalLessonId ||
      null
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('tasks')
      .update(
        payload,
      )
      .eq(
        'id',
        taskId,
      )
      .select('*')
      .single()


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось обновить задание',
    )
  }


  return normalizeTask(
    data,
  )
}


export async function deleteSupabaseTask(
  taskId,
) {
  if (
    !taskId
  ) {
    return
  }


  const {
    error,
  } =
    await supabase
      .from('tasks')
      .delete()
      .eq(
        'id',
        taskId,
      )


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось удалить задание',
    )
  }
}


/* =========================================================
   ATTACHMENTS
========================================================= */

export function validateTaskAttachment(
  file,
) {
  if (
    !file
  ) {
    return
  }


  if (
    !ALLOWED_ATTACHMENT_TYPES.includes(
      file.type,
    )
  ) {
    throw new Error(
      'Разрешены только JPG, PNG, WEBP и PDF',
    )
  }


  if (
    file.size >
    MAX_ATTACHMENT_SIZE
  ) {
    throw new Error(
      'Файл слишком большой. Максимальный размер — 10 МБ',
    )
  }
}


export async function uploadTaskSubmissionAttachment(
  file,
  task,
  student,
) {
  if (
    !file
  ) {
    return null
  }


  if (
    !task?.id
  ) {
    throw new Error(
      'Не удалось определить задание',
    )
  }


  if (
    !student?.id
  ) {
    throw new Error(
      'Не удалось определить ученика',
    )
  }


  if (
    !task?.teacherId
  ) {
    throw new Error(
      'Не удалось определить учителя задания',
    )
  }


  validateTaskAttachment(
    file,
  )


  const safeFileName =
    sanitizeFileName(
      file.name ||
        'attachment',
    )


  const extension =
    getFileExtension(
      safeFileName,
      file.type,
    )


  const uniqueName =
    `${Date.now()}-${generateRandomPart()}${extension}`


  const path =
    [
      task.teacherId,
      student.id,
      task.id,
      uniqueName,
    ].join('/')


  const {
    error,
  } =
    await supabase.storage
      .from(
        TASK_SUBMISSIONS_BUCKET,
      )
      .upload(
        path,
        file,
        {
          cacheControl:
            '3600',

          upsert:
            false,

          contentType:
            file.type,
        },
      )


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось загрузить файл',
    )
  }


  return {
    path,

    name:
      safeFileName,

    type:
      file.type,
  }
}


export async function deleteTaskSubmissionAttachment(
  attachmentPath,
) {
  if (
    !attachmentPath
  ) {
    return
  }


  const {
    error,
  } =
    await supabase.storage
      .from(
        TASK_SUBMISSIONS_BUCKET,
      )
      .remove([
        attachmentPath,
      ])


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось удалить файл',
    )
  }
}


export async function getTaskSubmissionAttachmentUrl(
  submissionOrPath,
  expiresIn = 3600,
) {
  const attachmentPath =
    typeof submissionOrPath ===
    'string'
      ? submissionOrPath
      : submissionOrPath
          ?.attachmentPath


  if (
    !attachmentPath
  ) {
    return null
  }


  const {
    data,
    error,
  } =
    await supabase.storage
      .from(
        TASK_SUBMISSIONS_BUCKET,
      )
      .createSignedUrl(
        attachmentPath,
        expiresIn,
      )


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось открыть файл',
    )
  }


  return (
    data?.signedUrl ||
    null
  )
}


/* =========================================================
   SUBMIT WORK
========================================================= */

export async function submitSupabaseTask(
  task,
  student,
  reportText = '',
  submissionType = 'online',
  attachmentFile = null,
) {
  if (
    !task?.id ||
    !student?.id
  ) {
    throw new Error(
      'Не удалось определить задание или ученика',
    )
  }


  const safeSubmissionType =
    submissionType ===
    'notebook'
      ? 'notebook'
      : 'online'


  const safeReportText =
    String(
      reportText ||
        '',
    ).trim()


  if (
    safeSubmissionType ===
    'notebook'
  ) {
    return await saveSubmission({
      task,
      student,

      submissionType:
        'notebook',

      reportText:
        '',

      attachment:
        null,
    })
  }


  if (
    attachmentFile
  ) {
    validateTaskAttachment(
      attachmentFile,
    )
  }


  if (
    !safeReportText &&
    !attachmentFile
  ) {
    throw new Error(
      'Добавьте фото, файл или пояснение к работе',
    )
  }


  let uploadedAttachment =
    null


  try {
    if (
      attachmentFile
    ) {
      uploadedAttachment =
        await uploadTaskSubmissionAttachment(
          attachmentFile,
          task,
          student,
        )
    }


    return await saveSubmission({
      task,
      student,

      submissionType:
        'online',

      reportText:
        safeReportText,

      attachment:
        uploadedAttachment,
    })
  } catch (
    error
  ) {
    if (
      uploadedAttachment?.path
    ) {
      try {
        await deleteTaskSubmissionAttachment(
          uploadedAttachment.path,
        )
      } catch (
        cleanupError
      ) {
        console.error(
          'Не удалось удалить незавершённое вложение:',
          cleanupError,
        )
      }
    }


    throw error
  }
}


async function saveSubmission({
  task,
  student,
  submissionType,
  reportText,
  attachment,
}) {
  const existing =
    await getSupabaseSubmission(
      task.id,
      student.id,
    )


  const submission = {
    task_id:
      task.id,

    task_title:
      task.title,

    task_reward:
      Number(
        task.reward ||
          0,
      ),

    affects_streak:
      Boolean(
        task.affectsStreak,
      ),

    student_id:
      student.id,

    student_name:
      student.name,

    student_email:
      student.email ||
      '',

    class_name:
      student.className,

    school:
      student.school ||
      null,

    teacher_id:
      task.teacherId,

    submission_type:
      submissionType,

    report_text:
      reportText,

    attachment_path:
      attachment?.path ||
      null,

    attachment_name:
      attachment?.name ||
      null,

    attachment_type:
      attachment?.type ||
      null,

    status:
      'pending',

    teacher_comment:
      '',

    reward_given:
      false,

    submitted_at:
      new Date()
        .toISOString(),

    reviewed_at:
      null,
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('submissions')
      .upsert(
        submission,
        {
          onConflict:
            'task_id,student_id',
        },
      )
      .select('*')
      .single()


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось отправить работу',
    )
  }


  if (
    existing
      ?.attachmentPath &&
    existing.attachmentPath !==
      attachment?.path
  ) {
    try {
      await deleteTaskSubmissionAttachment(
        existing.attachmentPath,
      )
    } catch (
      deleteError
    ) {
      console.error(
        'Не удалось удалить старое вложение:',
        deleteError,
      )
    }
  }


  return normalizeSubmission(
    data,
  )
}


export async function submitNotebookTask(
  task,
  student,
) {
  return await submitSupabaseTask(
    task,
    student,
    '',
    'notebook',
    null,
  )
}


export async function submitOnlineTask(
  task,
  student,
  reportText = '',
  attachmentFile = null,
) {
  return await submitSupabaseTask(
    task,
    student,
    reportText,
    'online',
    attachmentFile,
  )
}


/* =========================================================
   GET SUBMISSIONS
========================================================= */

export async function getSupabaseSubmission(
  taskId,
  studentId,
) {
  if (
    !taskId ||
    !studentId
  ) {
    return null
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('submissions')
      .select('*')
      .eq(
        'task_id',
        taskId,
      )
      .eq(
        'student_id',
        studentId,
      )
      .maybeSingle()


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось загрузить работу',
    )
  }


  return data
    ? normalizeSubmission(
        data,
      )
    : null
}


export async function getSupabaseStudentSubmissions(
  studentId,
) {
  if (
    !studentId
  ) {
    return []
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('submissions')
      .select('*')
      .eq(
        'student_id',
        studentId,
      )
      .order(
        'submitted_at',
        {
          ascending:
            false,
        },
      )


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось загрузить работы',
    )
  }


  return (
    data ||
    []
  ).map(
    normalizeSubmission,
  )
}


export async function getSupabaseTeacherSubmissions(
  teacherId,
) {
  if (
    !teacherId
  ) {
    return []
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('submissions')
      .select('*')
      .eq(
        'teacher_id',
        teacherId,
      )
      .order(
        'submitted_at',
        {
          ascending:
            false,
        },
      )


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось загрузить работы',
    )
  }


  return (
    data ||
    []
  ).map(
    normalizeSubmission,
  )
}


/* =========================================================
   REVIEW
========================================================= */

export async function reviewSupabaseSubmission(
  submissionId,
  status,
  teacherComment = '',
) {
  if (
    !submissionId
  ) {
    throw new Error(
      'Работа ученика не найдена',
    )
  }


  if (
    ![
      'approved',
      'rejected',
    ].includes(
      status,
    )
  ) {
    throw new Error(
      'Некорректный статус проверки',
    )
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      'review_submission',
      {
        submission_id:
          submissionId,

        new_status:
          status,

        new_teacher_comment:
          String(
            teacherComment ||
              '',
          ).trim(),
      },
    )


  if (
    error
  ) {
    throw new Error(
      error.message ||
        'Не удалось проверить работу',
    )
  }


  return normalizeSubmission(
    data,
  )
}


/* =========================================================
   NORMALIZERS
========================================================= */

function normalizeTask(
  task,
) {
  return {
    id:
      task.id,

    title:
      task.title,

    subject:
      task.subject,

    description:
      task.description,

    className:
      task.class_name,

    deadline:
      task.deadline,

    reward:
      Number(
        task.reward ||
          0,
      ),

    affectsStreak:
      Boolean(
        task.affects_streak,
      ),

    school:
      task.school,

    schoolId:
      task.school_id,

    teacherId:
      task.teacher_id,

    teacherName:
      task.teacher_name,

    journalLessonId:
      task.journal_lesson_id,

    createdAt:
      task.created_at,
  }
}


function normalizeSubmission(
  submission,
) {
  return {
    id:
      submission.id,

    taskId:
      submission.task_id,

    taskTitle:
      submission.task_title,

    taskReward:
      Number(
        submission.task_reward ||
          0,
      ),

    affectsStreak:
      Boolean(
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

    school:
      submission.school,

    teacherId:
      submission.teacher_id,

    submissionType:
      submission.submission_type ||
      'online',

    reportText:
      submission.report_text ||
      '',

    attachmentPath:
      submission.attachment_path ||
      null,

    attachmentName:
      submission.attachment_name ||
      null,

    attachmentType:
      submission.attachment_type ||
      null,

    hasAttachment:
      Boolean(
        submission.attachment_path,
      ),

    status:
      submission.status,

    teacherComment:
      submission.teacher_comment ||
      '',

    rewardGiven:
      Boolean(
        submission.reward_given,
      ),

    submittedAt:
      submission.submitted_at,

    reviewedAt:
      submission.reviewed_at,
  }
}


/* =========================================================
   FILE HELPERS
========================================================= */

function sanitizeFileName(
  fileName,
) {
  const value =
    String(
      fileName ||
        'attachment',
    )
      .trim()
      .replace(
        /\s+/g,
        '-',
      )
      .replace(
        /[^a-zA-Z0-9а-яА-ЯёЁ._-]/g,
        '',
      )


  return (
    value ||
    'attachment'
  )
}


function getFileExtension(
  fileName,
  mimeType,
) {
  const match =
    String(
      fileName ||
        '',
    ).match(
      /(\.[a-zA-Z0-9]+)$/,
    )


  if (
    match?.[1]
  ) {
    return match[1]
      .toLowerCase()
  }


  const extensions = {
    'image/jpeg':
      '.jpg',

    'image/png':
      '.png',

    'image/webp':
      '.webp',

    'application/pdf':
      '.pdf',
  }


  return (
    extensions[
      mimeType
    ] ||
    ''
  )
}


function generateRandomPart() {
  if (
    typeof crypto !==
      'undefined' &&
    typeof crypto.randomUUID ===
      'function'
  ) {
    return crypto
      .randomUUID()
      .slice(
        0,
        12,
      )
  }


  return Math
    .random()
    .toString(36)
    .slice(
      2,
      14,
    )
}