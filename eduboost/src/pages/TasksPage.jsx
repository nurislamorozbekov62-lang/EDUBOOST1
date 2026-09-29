import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  Award,
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileImage,
  FileText,
  Flame,
  NotebookText,
  RefreshCcw,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Wifi,
  X,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  createNotification,
  createNotificationsForUsers,
  getParentsForStudent,
} from '../services/notificationService'

import {
  createSupabaseTask,
  deleteSupabaseTask,
  getSupabaseStudentSubmissions,
  getSupabaseTasksForStudent,
  getSupabaseTasksForTeacher,
  getSupabaseTeacherSubmissions,
  getTaskClassStudents,
  getTaskSubmissionAttachmentUrl,
  reviewSupabaseSubmission,
  submitSupabaseTask,
  validateTaskAttachment,
} from '../services/supabaseTaskService'

import {
  getSupabaseJournalLessonById,
} from '../services/supabaseJournalLessonService'


const INITIAL_FORM = {
  title: '',
  subject: '',
  description: '',
  className: '6 класс',
  deadline: '',
  reward: 50,
  affectsStreak: true,
}


const SUBJECTS = [
  'Математика',
  'Английский язык',
  'Информатика',
  'Кыргызский язык',
  'Русский язык',
  'История',
  'Физика',
  'Химия',
  'Биология',
  'География',
  'Другое',
]


function TasksPage() {
  const {
    user,
  } = useAuth()


  const [
    tasks,
    setTasks,
  ] = useState([])

  const [
    submissions,
    setSubmissions,
  ] = useState([])

  const [
    lessonMap,
    setLessonMap,
  ] = useState({})

  const [
    loading,
    setLoading,
  ] = useState(true)


  /* =====================================
     STUDENT
  ===================================== */

  const [
    studentFilter,
    setStudentFilter,
  ] = useState('all')

  const [
    selectedTask,
    setSelectedTask,
  ] = useState(null)

  const [
    submissionType,
    setSubmissionType,
  ] = useState('')

  const [
    reportText,
    setReportText,
  ] = useState('')

  const [
    attachmentFile,
    setAttachmentFile,
  ] = useState(null)

  const [
    attachmentPreview,
    setAttachmentPreview,
  ] = useState('')

  const [
    submitting,
    setSubmitting,
  ] = useState(false)


  /* =====================================
     TEACHER
  ===================================== */

  const [
    form,
    setForm,
  ] = useState(
    INITIAL_FORM,
  )

  const [
    selectedTeacherTaskId,
    setSelectedTeacherTaskId,
  ] = useState(null)

  const [
    classStudents,
    setClassStudents,
  ] = useState([])

  const [
    classLoading,
    setClassLoading,
  ] = useState(false)

  const [
    teacherFilter,
    setTeacherFilter,
  ] = useState('all')

  const [
    teacherComments,
    setTeacherComments,
  ] = useState({})

  const [
    openingAttachmentId,
    setOpeningAttachmentId,
  ] = useState(null)

  const [
    reviewingId,
    setReviewingId,
  ] = useState(null)

  const [
    bulkReviewing,
    setBulkReviewing,
  ] = useState(false)


  useEffect(() => {
    void loadData()
  }, [
    user?.id,
    user?.role,
    user?.school,
    user?.schoolId,
    user?.className,
  ])


  useEffect(() => {
    return () => {
      if (
        attachmentPreview
      ) {
        URL.revokeObjectURL(
          attachmentPreview,
        )
      }
    }
  }, [
    attachmentPreview,
  ])


  /*
    Если учитель открыл страницу,
    автоматически выбираем
    первое его задание.
  */
  useEffect(() => {
    if (
      user?.role !==
      'Учитель'
    ) {
      return
    }


    if (
      tasks.length ===
      0
    ) {
      setSelectedTeacherTaskId(
        null,
      )

      setClassStudents([])

      return
    }


    const exists =
      tasks.some(
        (task) =>
          String(
            task.id,
          ) ===
          String(
            selectedTeacherTaskId,
          ),
      )


    if (!exists) {
      setSelectedTeacherTaskId(
        tasks[0].id,
      )
    }
  }, [
    tasks,
    selectedTeacherTaskId,
    user?.role,
  ])


  useEffect(() => {
    if (
      user?.role !==
        'Учитель' ||
      !selectedTeacherTaskId
    ) {
      return
    }


    void loadSelectedTaskClass(
      selectedTeacherTaskId,
    )
  }, [
    selectedTeacherTaskId,
    user?.role,
  ])


  /* =====================================
     LOAD DATA
  ===================================== */

  async function loadData() {
    if (!user) {
      setTasks([])
      setSubmissions([])
      setLessonMap({})
      setLoading(false)

      return
    }


    try {
      setLoading(true)


      if (
        user.role ===
        'Учитель'
      ) {
        const [
          teacherTasks,
          teacherSubmissions,
        ] =
          await Promise.all([
            getSupabaseTasksForTeacher(
              user,
            ),

            getSupabaseTeacherSubmissions(
              user.id,
            ),
          ])


        setTasks(
          Array.isArray(
            teacherTasks,
          )
            ? teacherTasks
            : [],
        )


        setSubmissions(
          Array.isArray(
            teacherSubmissions,
          )
            ? teacherSubmissions
            : [],
        )


        setLessonMap({})

        return
      }


      if (
        user.role ===
        'Ученик'
      ) {
        const [
          studentTasks,
          studentSubmissions,
        ] =
          await Promise.all([
            getSupabaseTasksForStudent(
              user,
            ),

            getSupabaseStudentSubmissions(
              user.id,
            ),
          ])


        const safeTasks =
          Array.isArray(
            studentTasks,
          )
            ? studentTasks
            : []


        setTasks(
          safeTasks,
        )


        setSubmissions(
          Array.isArray(
            studentSubmissions,
          )
            ? studentSubmissions
            : [],
        )


        await loadTaskLessons(
          safeTasks,
        )

        return
      }


      setTasks([])
      setSubmissions([])
      setLessonMap({})
    } catch (error) {
      console.error(
        'Ошибка загрузки заданий:',
        error,
      )


      window.alert(
        error?.message ||
          'Не удалось загрузить задания',
      )
    } finally {
      setLoading(false)
    }
  }


  async function loadSelectedTaskClass(
    taskId,
  ) {
    if (!taskId) {
      setClassStudents([])

      return
    }


    try {
      setClassLoading(true)


      const students =
        await getTaskClassStudents(
          taskId,
        )


      setClassStudents(
        Array.isArray(
          students,
        )
          ? students
          : [],
      )
    } catch (error) {
      console.error(
        'Ошибка загрузки класса:',
        error,
      )


      setClassStudents([])


      window.alert(
        error?.message ||
          'Не удалось загрузить учеников класса',
      )
    } finally {
      setClassLoading(false)
    }
  }


  async function reloadTeacherData() {
    await loadData()


    if (
      selectedTeacherTaskId
    ) {
      await loadSelectedTaskClass(
        selectedTeacherTaskId,
      )
    }
  }


  async function loadTaskLessons(
    taskRows,
  ) {
    const ids = [
      ...new Set(
        taskRows
          .map(
            (task) =>
              task.journalLessonId,
          )
          .filter(Boolean),
      ),
    ]


    if (
      ids.length ===
      0
    ) {
      setLessonMap({})

      return
    }


    const results =
      await Promise.allSettled(
        ids.map(
          async (
            lessonId,
          ) => {
            const lesson =
              await getSupabaseJournalLessonById(
                lessonId,
              )


            return {
              lessonId,
              lesson,
            }
          },
        ),
      )


    const nextMap = {}


    results.forEach(
      (result) => {
        if (
          result.status !==
          'fulfilled'
        ) {
          return
        }


        if (
          result.value.lesson
        ) {
          nextMap[
            result.value
              .lessonId
          ] =
            result.value
              .lesson
        }
      },
    )


    setLessonMap(
      nextMap,
    )
  }


  /* =====================================
     CREATE TASK
  ===================================== */

  function handleFormChange(
    event,
  ) {
    const {
      name,
      value,
      type,
      checked,
    } =
      event.target


    setForm(
      (
        oldForm,
      ) => ({
        ...oldForm,

        [name]:
          type ===
          'checkbox'
            ? checked
            : value,
      }),
    )
  }


  async function handleCreateTask(
    event,
  ) {
    event.preventDefault()


    try {
      const newTask =
        await createSupabaseTask(
          form,
          user,
        )


      setForm(
        INITIAL_FORM,
      )


      await loadData()


      if (
        newTask?.id
      ) {
        setSelectedTeacherTaskId(
          newTask.id,
        )
      }
    } catch (error) {
      window.alert(
        error?.message ||
          'Не удалось создать задание',
      )
    }
  }


  async function handleDeleteTask(
    taskId,
  ) {
    const confirmed =
      window.confirm(
        'Удалить задание? Это действие нельзя отменить.',
      )


    if (!confirmed) {
      return
    }


    try {
      await deleteSupabaseTask(
        taskId,
      )


      if (
        String(
          selectedTeacherTaskId,
        ) ===
        String(taskId)
      ) {
        setSelectedTeacherTaskId(
          null,
        )

        setClassStudents([])
      }


      await loadData()
    } catch (error) {
      window.alert(
        error?.message ||
          'Не удалось удалить задание',
      )
    }
  }


  /* =====================================
     TEACHER COMMENTS
  ===================================== */

  function getTeacherComment(
    submissionId,
  ) {
    return (
      teacherComments[
        submissionId
      ] ||
      ''
    )
  }


  function changeTeacherComment(
    submissionId,
    value,
  ) {
    setTeacherComments(
      (
        old,
      ) => ({
        ...old,

        [submissionId]:
          value,
      }),
    )
  }


  function clearTeacherComment(
    submissionId,
  ) {
    setTeacherComments(
      (
        old,
      ) => {
        const next = {
          ...old,
        }


        delete next[
          submissionId
        ]


        return next
      },
    )
  }


  /* =====================================
     APPROVED NOTIFICATIONS
  ===================================== */

  function sendApprovedNotifications(
    submission,
  ) {
    createNotification({
      userId:
        submission.studentId,

      title:
        'Работа принята',

      message:
        `Задание «${submission.taskTitle}» принято. Начислено ${submission.taskReward} баллов.`,

      type:
        'approved',

      link:
        '/tasks',
    })


    createNotificationsForUsers(
      getParentsForStudent(
        submission.studentId,
      ),
      {
        title:
          'Работа ребёнка принята',

        message:
          `${submission.studentName} успешно выполнил задание «${submission.taskTitle}».`,

        type:
          'approved',

        link:
          '/',
      },
    )
  }


  /* =====================================
     ONE APPROVE
  ===================================== */

  async function handleApprove(
    submission,
  ) {
    if (
      !submission?.id
    ) {
      return
    }


    try {
      setReviewingId(
        submission.id,
      )


      await reviewSupabaseSubmission(
        submission.id,
        'approved',
        getTeacherComment(
          submission.id,
        ),
      )


      sendApprovedNotifications(
        submission,
      )


      clearTeacherComment(
        submission.id,
      )


      await reloadTeacherData()
    } catch (error) {
      window.alert(
        error?.message ||
          'Не удалось принять работу',
      )
    } finally {
      setReviewingId(null)
    }
  }


  /* =====================================
     BULK NOTEBOOK APPROVE

     ВАЖНО:
     принимаются только:
     pending + notebook

     online работы сюда
     попасть не могут.
  ===================================== */

  async function handleBulkApprove(
    selectedSubmissions,
  ) {
    const safeSubmissions =
      Array.isArray(
        selectedSubmissions,
      )
        ? selectedSubmissions.filter(
            (submission) =>
              submission?.id &&
              submission.status ===
                'pending' &&
              submission.submissionType ===
                'notebook',
          )
        : []


    if (
      safeSubmissions.length ===
      0
    ) {
      return
    }


    const confirmed =
      window.confirm(
        `Принять проверенные тетради: ${safeSubmissions.length}?`,
      )


    if (!confirmed) {
      return
    }


    try {
      setBulkReviewing(true)


      const failed = []


      /*
        Последовательно, а не Promise.all.

        Так мы не создаём резкий всплеск
        десятков RPC запросов одновременно.
      */
      for (
        const submission
        of safeSubmissions
      ) {
        try {
          await reviewSupabaseSubmission(
            submission.id,
            'approved',
            getTeacherComment(
              submission.id,
            ),
          )


          sendApprovedNotifications(
            submission,
          )


          clearTeacherComment(
            submission.id,
          )
        } catch (error) {
          failed.push({
            submission,
            error,
          })
        }
      }


      await reloadTeacherData()


      if (
        failed.length >
        0
      ) {
        window.alert(
          `Принято: ${
            safeSubmissions.length -
            failed.length
          }. Не удалось принять: ${
            failed.length
          }.`,
        )
      }
    } finally {
      setBulkReviewing(false)
    }
  }


  /* =====================================
     REJECT
  ===================================== */

  async function handleReject(
    submission,
  ) {
    if (
      !submission?.id
    ) {
      return
    }


    try {
      setReviewingId(
        submission.id,
      )


      await reviewSupabaseSubmission(
        submission.id,
        'rejected',
        getTeacherComment(
          submission.id,
        ),
      )


      createNotification({
        userId:
          submission.studentId,

        title:
          'Работа возвращена',

        message:
          `Задание «${submission.taskTitle}» нужно исправить.`,

        type:
          'rejected',

        link:
          '/tasks',
      })


      createNotificationsForUsers(
        getParentsForStudent(
          submission.studentId,
        ),
        {
          title:
            'Работа ребёнка возвращена',

          message:
            `${submission.studentName} должен исправить задание «${submission.taskTitle}».`,

          type:
            'rejected',

          link:
            '/',
        },
      )


      clearTeacherComment(
        submission.id,
      )


      await reloadTeacherData()
    } catch (error) {
      window.alert(
        error?.message ||
          'Не удалось вернуть работу',
      )
    } finally {
      setReviewingId(null)
    }
  }


  /* =====================================
     ATTACHMENT
  ===================================== */

  async function handleOpenAttachment(
    submission,
  ) {
    if (
      !submission
        ?.attachmentPath
    ) {
      return
    }


    try {
      setOpeningAttachmentId(
        submission.id,
      )


      const url =
        await getTaskSubmissionAttachmentUrl(
          submission,
        )


      if (!url) {
        throw new Error(
          'Не удалось получить ссылку',
        )
      }


      window.open(
        url,
        '_blank',
        'noopener,noreferrer',
      )
    } catch (error) {
      window.alert(
        error?.message ||
          'Не удалось открыть файл',
      )
    } finally {
      setOpeningAttachmentId(
        null,
      )
    }
  }


  /* =====================================
     STUDENT ATTACHMENT
  ===================================== */

  function clearSelectedAttachment() {
    if (
      attachmentPreview
    ) {
      URL.revokeObjectURL(
        attachmentPreview,
      )
    }


    setAttachmentPreview('')
    setAttachmentFile(null)
  }


  function openSubmitModal(
    task,
  ) {
    const oldSubmission =
      submissions.find(
        (submission) =>
          String(
            submission.taskId,
          ) ===
            String(task.id) &&
          String(
            submission.studentId,
          ) ===
            String(user.id),
      )


    clearSelectedAttachment()

    setSelectedTask(task)


    if (
      oldSubmission
        ?.status ===
      'rejected'
    ) {
      setSubmissionType(
        oldSubmission
          .submissionType ||
          '',
      )
    } else {
      setSubmissionType('')
    }


    setReportText(
      oldSubmission
        ?.reportText ||
        '',
    )
  }


  function closeSubmitModal() {
    clearSelectedAttachment()

    setSelectedTask(null)
    setSubmissionType('')
    setReportText('')
  }


  function handleAttachmentChange(
    event,
  ) {
    const file =
      event.target
        .files?.[0]


    if (!file) {
      return
    }


    try {
      validateTaskAttachment(
        file,
      )


      clearSelectedAttachment()

      setAttachmentFile(
        file,
      )


      if (
        file.type.startsWith(
          'image/',
        )
      ) {
        setAttachmentPreview(
          URL.createObjectURL(
            file,
          ),
        )
      }
    } catch (error) {
      event.target.value =
        ''


      window.alert(
        error?.message ||
          'Не удалось выбрать файл',
      )
    }
  }


  async function submitNotebook() {
    if (!selectedTask) {
      return
    }


    try {
      setSubmitting(true)


      await submitSupabaseTask(
        selectedTask,
        user,
        '',
        'notebook',
        null,
      )


      closeSubmitModal()

      await loadData()
    } catch (error) {
      window.alert(
        error?.message ||
          'Не удалось отправить работу',
      )
    } finally {
      setSubmitting(false)
    }
  }


  async function handleSubmitOnline(
    event,
  ) {
    event.preventDefault()


    if (!selectedTask) {
      return
    }


    if (
      !attachmentFile &&
      !reportText.trim()
    ) {
      window.alert(
        'Добавьте фото, файл или пояснение',
      )

      return
    }


    try {
      setSubmitting(true)


      await submitSupabaseTask(
        selectedTask,
        user,
        reportText.trim(),
        'online',
        attachmentFile,
      )


      closeSubmitModal()

      await loadData()
    } catch (error) {
      window.alert(
        error?.message ||
          'Не удалось отправить работу',
      )
    } finally {
      setSubmitting(false)
    }
  }


  /* =====================================
     STUDENT TASK DATA
  ===================================== */

  function getStudentTaskData(
    task,
  ) {
    const submission =
      submissions.find(
        (item) =>
          String(
            item.taskId,
          ) ===
            String(task.id) &&
          String(
            item.studentId,
          ) ===
            String(user.id),
      )


    const status =
      submission?.status ||
      'new'


    return {
      status,

      overdue:
        isTaskOverdue(
          task,
          status,
        ),

      submission,

      lesson:
        task.journalLessonId
          ? lessonMap[
              task
                .journalLessonId
            ] || null
          : null,
    }
  }


  if (!user) {
    return null
  }


  if (
    user.role ===
    'Родитель'
  ) {
    return (
      <ParentTasksView />
    )
  }


  if (
    user.role ===
    'Учитель'
  ) {
    return (
      <TeacherView
        loading={loading}
        tasks={tasks}
        submissions={submissions}
        form={form}
        onFormChange={handleFormChange}
        onCreateTask={handleCreateTask}
        onDeleteTask={handleDeleteTask}
        selectedTaskId={
          selectedTeacherTaskId
        }
        setSelectedTaskId={
          setSelectedTeacherTaskId
        }
        classStudents={
          classStudents
        }
        classLoading={
          classLoading
        }
        teacherFilter={
          teacherFilter
        }
        setTeacherFilter={
          setTeacherFilter
        }
        comments={
          teacherComments
        }
        onCommentChange={
          changeTeacherComment
        }
        onApprove={
          handleApprove
        }
        onReject={
          handleReject
        }
        onBulkApprove={
          handleBulkApprove
        }
        reviewingId={
          reviewingId
        }
        bulkReviewing={
          bulkReviewing
        }
        openingAttachmentId={
          openingAttachmentId
        }
        onOpenAttachment={
          handleOpenAttachment
        }
        onReload={
          reloadTeacherData
        }
      />
    )
  }


  return (
    <>
      <StudentView
        loading={loading}
        tasks={tasks}
        filter={
          studentFilter
        }
        setFilter={
          setStudentFilter
        }
        getTaskData={
          getStudentTaskData
        }
        onOpen={
          openSubmitModal
        }
        onReload={
          loadData
        }
      />


      {selectedTask && (
        <SubmissionModal
          task={
            selectedTask
          }
          taskData={
            getStudentTaskData(
              selectedTask,
            )
          }
          submissionType={
            submissionType
          }
          setSubmissionType={
            setSubmissionType
          }
          reportText={
            reportText
          }
          setReportText={
            setReportText
          }
          attachmentFile={
            attachmentFile
          }
          attachmentPreview={
            attachmentPreview
          }
          submitting={
            submitting
          }
          onAttachmentChange={
            handleAttachmentChange
          }
          onRemoveAttachment={
            clearSelectedAttachment
          }
          onNotebookSubmit={
            submitNotebook
          }
          onOnlineSubmit={
            handleSubmitOnline
          }
          onClose={
            closeSubmitModal
          }
        />
      )}
    </>
  )
}


/* ========================================
   TEACHER VIEW
======================================== */

function TeacherView({
  loading,
  tasks,
  submissions,
  form,
  onFormChange,
  onCreateTask,
  onDeleteTask,
  selectedTaskId,
  setSelectedTaskId,
  classStudents,
  classLoading,
  teacherFilter,
  setTeacherFilter,
  comments,
  onCommentChange,
  onApprove,
  onReject,
  onBulkApprove,
  reviewingId,
  bulkReviewing,
  openingAttachmentId,
  onOpenAttachment,
  onReload,
}) {
  const [
    selectedNotebookIds,
    setSelectedNotebookIds,
  ] = useState([])


  /*
    При переходе на другое ДЗ
    выделение тетрадей очищаем.
  */
  useEffect(() => {
    setSelectedNotebookIds([])
  }, [
    selectedTaskId,
  ])


  const selectedTask =
    tasks.find(
      (task) =>
        String(
          task.id,
        ) ===
        String(
          selectedTaskId,
        ),
    ) || null


  const selectedSubmissions =
    useMemo(
      () =>
        submissions.filter(
          (submission) =>
            String(
              submission.taskId,
            ) ===
            String(
              selectedTaskId,
            ),
        ),
      [
        submissions,
        selectedTaskId,
      ],
    )


  const classRows =
    useMemo(
      () =>
        classStudents.map(
          (student) => {
            const submission =
              selectedSubmissions.find(
                (item) =>
                  String(
                    item.studentId,
                  ) ===
                  String(
                    student.id,
                  ),
              ) ||
              null


            return {
              student,
              submission,

              status:
                submission
                  ?.status ||
                'not_submitted',
            }
          },
        ),
      [
        classStudents,
        selectedSubmissions,
      ],
    )


  const counts = {
    all:
      classRows.length,

    not_submitted:
      classRows.filter(
        (row) =>
          row.status ===
          'not_submitted',
      ).length,

    pending:
      classRows.filter(
        (row) =>
          row.status ===
          'pending',
      ).length,

    approved:
      classRows.filter(
        (row) =>
          row.status ===
          'approved',
      ).length,

    rejected:
      classRows.filter(
        (row) =>
          row.status ===
          'rejected',
      ).length,
  }


  const visibleRows =
    classRows.filter(
      (row) =>
        teacherFilter ===
          'all' ||
        row.status ===
          teacherFilter,
    )


  /*
    Только ожидающие проверки
    тетради.

    Онлайн submissions сюда
    специально не входят.
  */
  const pendingNotebookRows =
    classRows.filter(
      (row) =>
        row.status ===
          'pending' &&
        row.submission
          ?.submissionType ===
          'notebook',
    )


  const pendingNotebookIds =
    pendingNotebookRows.map(
      (row) =>
        row.submission.id,
    )


  const selectedNotebookSubmissions =
    pendingNotebookRows
      .filter(
        (row) =>
          selectedNotebookIds.includes(
            row.submission.id,
          ),
      )
      .map(
        (row) =>
          row.submission,
      )


  const allNotebooksSelected =
    pendingNotebookIds.length >
      0 &&
    pendingNotebookIds.every(
      (id) =>
        selectedNotebookIds.includes(
          id,
        ),
    )


  function toggleNotebook(
    submissionId,
  ) {
    if (
      bulkReviewing
    ) {
      return
    }


    setSelectedNotebookIds(
      (oldIds) =>
        oldIds.includes(
          submissionId,
        )
          ? oldIds.filter(
              (id) =>
                id !==
                submissionId,
            )
          : [
              ...oldIds,
              submissionId,
            ],
    )
  }


  function toggleAllNotebooks() {
    if (
      bulkReviewing
    ) {
      return
    }


    setSelectedNotebookIds(
      allNotebooksSelected
        ? []
        : pendingNotebookIds,
    )
  }


  async function approveSelectedNotebooks() {
    if (
      selectedNotebookSubmissions
        .length ===
      0
    ) {
      return
    }


    await onBulkApprove(
      selectedNotebookSubmissions,
    )


    setSelectedNotebookIds([])
  }


  return (
    <main
      style={
        pageStyle
      }
    >
      <section
        style={
          heroStyle
        }
      >
        <div>
          <span
            style={
              eyebrowStyle
            }
          >
            Кабинет учителя
          </span>

          <h1
            style={
              titleStyle
            }
          >
            Домашние задания
          </h1>

          <p
            style={
              subtitleStyle
            }
          >
            Создавайте задания
            и проверяйте весь
            класс в одном месте.
          </p>
        </div>


        <button
          type="button"
          onClick={
            onReload
          }
          style={
            iconButtonStyle
          }
          title="Обновить"
        >
          <RefreshCcw
            size={20}
          />
        </button>
      </section>


      <TaskCreator
        form={
          form
        }
        onChange={
          onFormChange
        }
        onSubmit={
          onCreateTask
        }
      />


      <section
        style={
          sectionStyle
        }
      >
        <div
          style={
            sectionHeaderStyle
          }
        >
          <div>
            <h2
              style={
                sectionTitleStyle
              }
            >
              Задания учителя
            </h2>

            <p
              style={
                sectionSubtitleStyle
              }
            >
              Выберите задание,
              чтобы открыть класс.
            </p>
          </div>

          <span
            style={
              counterStyle
            }
          >
            {tasks.length}
          </span>
        </div>


        {loading ? (
          <EmptyState
            text="Загружаем задания..."
          />
        ) : tasks.length ===
          0 ? (
          <EmptyState
            text="Заданий пока нет."
          />
        ) : (
          <div
            style={
              teacherTaskListStyle
            }
          >
            {tasks.map(
              (task) => {
                const active =
                  String(
                    task.id,
                  ) ===
                  String(
                    selectedTaskId,
                  )


                return (
                  <button
                    type="button"
                    key={
                      task.id
                    }
                    onClick={() =>
                      setSelectedTaskId(
                        task.id,
                      )
                    }
                    style={
                      teacherTaskButtonStyle(
                        active,
                      )
                    }
                  >
                    <div
                      style={
                        subjectCircleStyle
                      }
                    >
                      <BookOpen
                        size={19}
                      />
                    </div>


                    <div
                      style={{
                        minWidth:
                          0,

                        flex:
                          1,

                        textAlign:
                          'left',
                      }}
                    >
                      <small
                        style={
                          miniStyle
                        }
                      >
                        {task.subject}
                      </small>

                      <strong
                        style={
                          taskNameStyle
                        }
                      >
                        {task.title}
                      </strong>

                      <span
                        style={
                          taskMetaStyle
                        }
                      >
                        {task.className}
                        {' · '}
                        {formatDate(
                          task.deadline,
                        )}
                      </span>
                    </div>


                    {active && (
                      <ChevronRight
                        size={19}
                      />
                    )}
                  </button>
                )
              },
            )}
          </div>
        )}
      </section>


      {selectedTask && (
        <section
          style={
            sectionStyle
          }
        >
          <div
            style={
              selectedTaskHeaderStyle
            }
          >
            <div>
              <span
                style={
                  eyebrowStyle
                }
              >
                {selectedTask.subject}
                {' · '}
                {selectedTask.className}
              </span>

              <h2
                style={
                  selectedTaskTitleStyle
                }
              >
                {selectedTask.title}
              </h2>

              {selectedTask.description && (
                <p
                  style={
                    descriptionStyle
                  }
                >
                  {selectedTask.description}
                </p>
              )}
            </div>


            <button
              type="button"
              onClick={() =>
                onDeleteTask(
                  selectedTask.id,
                )
              }
              style={
                dangerButtonStyle
              }
            >
              <Trash2
                size={17}
              />

              Удалить
            </button>
          </div>


          <div
            style={
              infoGridStyle
            }
          >
            <InfoBox
              icon={
                CalendarDays
              }
              label="Срок"
              value={
                formatDate(
                  selectedTask
                    .deadline,
                )
              }
            />

            <InfoBox
              icon={
                Award
              }
              label="Награда"
              value={
                `${selectedTask.reward} баллов`
              }
            />

            <InfoBox
              icon={
                Flame
              }
              label="Серия"
              value={
                selectedTask
                  .affectsStreak
                  ? 'Влияет'
                  : 'Не влияет'
              }
            />

            <InfoBox
              icon={
                Users
              }
              label="Ученики"
              value={
                classRows.length
              }
            />
          </div>


          <div
            style={
              filtersStyle
            }
          >
            <FilterButton
              id="all"
              label="Все"
              value={
                counts.all
              }
              active={
                teacherFilter ===
                'all'
              }
              onClick={
                setTeacherFilter
              }
            />

            <FilterButton
              id="pending"
              label="На проверке"
              value={
                counts.pending
              }
              active={
                teacherFilter ===
                'pending'
              }
              onClick={
                setTeacherFilter
              }
            />

            <FilterButton
              id="not_submitted"
              label="Не сдали"
              value={
                counts
                  .not_submitted
              }
              active={
                teacherFilter ===
                'not_submitted'
              }
              onClick={
                setTeacherFilter
              }
            />

            <FilterButton
              id="approved"
              label="Принято"
              value={
                counts.approved
              }
              active={
                teacherFilter ===
                'approved'
              }
              onClick={
                setTeacherFilter
              }
            />

            <FilterButton
              id="rejected"
              label="Исправить"
              value={
                counts.rejected
              }
              active={
                teacherFilter ===
                'rejected'
              }
              onClick={
                setTeacherFilter
              }
            />
          </div>


          {/* =================================
              MASS NOTEBOOK CHECK
          ================================= */}

          {pendingNotebookRows.length >
            0 && (
            <div
              style={
                bulkPanelStyle
              }
            >
              <div
                style={
                  bulkTopStyle
                }
              >
                <div>
                  <strong
                    style={
                      bulkTitleStyle
                    }
                  >
                    Быстрая проверка тетрадей
                  </strong>

                  <p
                    style={
                      bulkDescriptionStyle
                    }
                  >
                    Отметьте учеников,
                    чьи тетради вы уже
                    проверили лично.
                  </p>
                </div>


                <span
                  style={
                    bulkCountStyle
                  }
                >
                  {
                    pendingNotebookRows
                      .length
                  } на проверке
                </span>
              </div>


              <div
                style={
                  bulkActionsStyle
                }
              >
                <label
                  style={
                    selectAllStyle
                  }
                >
                  <input
                    type="checkbox"
                    checked={
                      allNotebooksSelected
                    }
                    disabled={
                      bulkReviewing
                    }
                    onChange={
                      toggleAllNotebooks
                    }
                  />

                  Выбрать все тетради
                </label>


                <button
                  type="button"
                  disabled={
                    bulkReviewing ||
                    selectedNotebookSubmissions
                      .length ===
                      0
                  }
                  onClick={
                    approveSelectedNotebooks
                  }
                  style={{
                    ...bulkApproveStyle,

                    opacity:
                      bulkReviewing ||
                      selectedNotebookSubmissions
                        .length ===
                        0
                        ? 0.55
                        : 1,
                  }}
                >
                  <Check
                    size={18}
                  />

                  {bulkReviewing
                    ? 'Принимаем...'
                    : `Принять выбранных (${selectedNotebookSubmissions.length})`}
                </button>
              </div>
            </div>
          )}


          {classLoading ? (
            <EmptyState
              text="Загружаем учеников класса..."
            />
          ) : classRows.length ===
            0 ? (
            <EmptyState
              text="В этом классе пока нет учеников."
            />
          ) : visibleRows.length ===
            0 ? (
            <EmptyState
              text="Учеников с таким статусом нет."
            />
          ) : (
            <div
              style={
                classListStyle
              }
            >
              {visibleRows.map(
                (
                  row,
                  index,
                ) => (
                  <TeacherStudentRow
                    key={
                      row.student.id
                    }
                    number={
                      index + 1
                    }
                    row={
                      row
                    }
                    comments={
                      comments
                    }
                    onCommentChange={
                      onCommentChange
                    }
                    onApprove={
                      onApprove
                    }
                    onReject={
                      onReject
                    }
                    bulkSelectable={
                      row.status ===
                        'pending' &&
                      row.submission
                        ?.submissionType ===
                        'notebook'
                    }
                    bulkSelected={
                      Boolean(
                        row.submission
                          ?.id &&
                        selectedNotebookIds
                          .includes(
                            row.submission.id,
                          ),
                      )
                    }
                    onBulkToggle={
                      toggleNotebook
                    }
                    reviewingId={
                      reviewingId
                    }
                    bulkReviewing={
                      bulkReviewing
                    }
                    openingAttachmentId={
                      openingAttachmentId
                    }
                    onOpenAttachment={
                      onOpenAttachment
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>
      )}
    </main>
  )
}


/* ========================================
   TEACHER STUDENT ROW
======================================== */

function TeacherStudentRow({
  number,
  row,
  comments,
  onCommentChange,
  onApprove,
  onReject,
  bulkSelectable,
  bulkSelected,
  onBulkToggle,
  reviewingId,
  bulkReviewing,
  openingAttachmentId,
  onOpenAttachment,
}) {
  const {
    student,
    submission,
    status,
  } = row


  const pending =
    status ===
    'pending'


  return (
    <article
      style={
        studentRowStyle
      }
    >
      <div
        style={
          studentTopStyle
        }
      >
        <span
          style={
            numberStyle
          }
        >
          {number}
        </span>


        {bulkSelectable && (
          <label
            style={
              rowCheckboxStyle
            }
            title="Добавить в массовую проверку"
          >
            <input
              type="checkbox"
              checked={
                bulkSelected
              }
              disabled={
                bulkReviewing
              }
              onChange={() =>
                onBulkToggle(
                  submission.id,
                )
              }
            />
          </label>
        )}


        <div
          style={
            avatarStyle
          }
        >
          {String(
            student.name ||
              'У',
          )
            .charAt(0)
            .toUpperCase()}
        </div>


        <div
          style={{
            minWidth:
              0,

            flex:
              1,
          }}
        >
          <strong
            style={
              studentNameStyle
            }
          >
            {student.name}
          </strong>

          <span
            style={
              studentClassStyle
            }
          >
            {student.className}
          </span>
        </div>


        <TeacherStatus
          status={
            status
          }
        />
      </div>


      {status ===
        'not_submitted' && (
        <div
          style={
            notSubmittedStyle
          }
        >
          <Clock3
            size={18}
          />

          Ученик ещё не отправил работу.
        </div>
      )}


      {submission && (
        <>
          <div
            style={
              submissionTypeStyle
            }
          >
            {submission
              .submissionType ===
            'notebook' ? (
              <>
                <NotebookText
                  size={18}
                />

                Тетрадь учителю
              </>
            ) : (
              <>
                <Wifi
                  size={18}
                />

                Онлайн
              </>
            )}
          </div>


          {submission
            .hasAttachment && (
            <button
              type="button"
              disabled={
                openingAttachmentId ===
                submission.id
              }
              onClick={() =>
                onOpenAttachment(
                  submission,
                )
              }
              style={
                attachmentButtonStyle
              }
            >
              <FileImage
                size={18}
              />

              <span>
                {submission
                  .attachmentName ||
                  'Открыть работу'}
              </span>

              <ExternalLink
                size={16}
              />
            </button>
          )}


          {submission.reportText && (
            <div
              style={
                reportStyle
              }
            >
              <strong>
                Пояснение ученика
              </strong>

              <p>
                {
                  submission
                    .reportText
                }
              </p>
            </div>
          )}


          {submission.teacherComment &&
            !pending && (
              <div
                style={
                  commentStyle
                }
              >
                <strong>
                  Комментарий учителя
                </strong>

                <p>
                  {
                    submission
                      .teacherComment
                  }
                </p>
              </div>
            )}


          {pending && (
            <div
              style={
                reviewStyle
              }
            >
              <textarea
                value={
                  comments[
                    submission.id
                  ] || ''
                }
                onChange={
                  (event) =>
                    onCommentChange(
                      submission.id,
                      event.target.value,
                    )
                }
                placeholder={
                  submission
                    .submissionType ===
                  'notebook'
                    ? 'Комментарий после проверки тетради — необязательно'
                    : 'Комментарий ученику — необязательно'
                }
                style={
                  textareaStyle
                }
              />


              <div
                style={
                  reviewButtonsStyle
                }
              >
                <button
                  type="button"
                  disabled={
                    reviewingId ===
                      submission.id ||
                    bulkReviewing
                  }
                  onClick={() =>
                    onApprove(
                      submission,
                    )
                  }
                  style={
                    approveStyle
                  }
                >
                  <Check
                    size={17}
                  />

                  {reviewingId ===
                  submission.id
                    ? 'Сохраняем...'
                    : 'Принять'}
                </button>


                <button
                  type="button"
                  disabled={
                    reviewingId ===
                      submission.id ||
                    bulkReviewing
                  }
                  onClick={() =>
                    onReject(
                      submission,
                    )
                  }
                  style={
                    rejectStyle
                  }
                >
                  <RotateCcw
                    size={17}
                  />

                  Вернуть
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </article>
  )
}


/* ========================================
   STATUS
======================================== */

function TeacherStatus({
  status,
}) {
  const config = {
    not_submitted: {
      label:
        'Не сдал',

      background:
        '#f1f5f9',

      color:
        '#64748b',
    },

    pending: {
      label:
        'На проверке',

      background:
        '#fff7ed',

      color:
        '#c2410c',
    },

    approved: {
      label:
        'Принято',

      background:
        '#ecfdf5',

      color:
        '#047857',
    },

    rejected: {
      label:
        'Исправить',

      background:
        '#fef2f2',

      color:
        '#b91c1c',
    },
  }


  const item =
    config[status] ||
    config.not_submitted


  return (
    <span
      style={{
        ...statusStyle,

        background:
          item.background,

        color:
          item.color,
      }}
    >
      {item.label}
    </span>
  )
}


/* ========================================
   FILTER
======================================== */

function FilterButton({
  id,
  label,
  value,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onClick(id)
      }
      style={
        filterButtonStyle(
          active,
        )
      }
    >
      {label}

      <span
        style={
          filterCountStyle(
            active,
          )
        }
      >
        {value}
      </span>
    </button>
  )
}


/* ========================================
   CREATE TASK
======================================== */

function TaskCreator({
  form,
  onChange,
  onSubmit,
}) {
  const [
    open,
    setOpen,
  ] = useState(false)


  return (
    <section
      style={
        sectionStyle
      }
    >
      <button
        type="button"
        onClick={() =>
          setOpen(
            (old) =>
              !old,
          )
        }
        style={
          createToggleStyle
        }
      >
        <Sparkles
          size={19}
        />

        {open
          ? 'Скрыть создание задания'
          : 'Создать новое задание'}
      </button>


      {open && (
        <form
          onSubmit={
            onSubmit
          }
          style={
            formStyle
          }
        >
          <Field
            label="Название"
          >
            <input
              name="title"
              value={
                form.title
              }
              onChange={
                onChange
              }
              placeholder="Например: Упражнение 15"
              required
              style={
                inputStyle
              }
            />
          </Field>


          <div
            style={
              formGridStyle
            }
          >
            <Field
              label="Предмет"
            >
              <select
                name="subject"
                value={
                  form.subject
                }
                onChange={
                  onChange
                }
                required
                style={
                  inputStyle
                }
              >
                <option value="">
                  Выберите предмет
                </option>

                {SUBJECTS.map(
                  (subject) => (
                    <option
                      key={
                        subject
                      }
                      value={
                        subject
                      }
                    >
                      {subject}
                    </option>
                  ),
                )}
              </select>
            </Field>


            <Field
              label="Класс"
            >
              <select
                name="className"
                value={
                  form.className
                }
                onChange={
                  onChange
                }
                style={
                  inputStyle
                }
              >
                {[
                  6,
                  7,
                  8,
                  9,
                  10,
                  11,
                ].map(
                  (grade) => (
                    <option
                      key={
                        grade
                      }
                      value={
                        `${grade} класс`
                      }
                    >
                      {grade} класс
                    </option>
                  ),
                )}
              </select>
            </Field>


            <Field
              label="Срок сдачи"
            >
              <input
                type="date"
                name="deadline"
                value={
                  form.deadline
                }
                onChange={
                  onChange
                }
                required
                style={
                  inputStyle
                }
              />
            </Field>


            <Field
              label="Награда"
            >
              <input
                type="number"
                name="reward"
                value={
                  form.reward
                }
                min="0"
                max="1000"
                onChange={
                  onChange
                }
                required
                style={
                  inputStyle
                }
              />
            </Field>
          </div>


          <Field
            label="Описание"
          >
            <textarea
              name="description"
              value={
                form.description
              }
              onChange={
                onChange
              }
              required
              placeholder="Что должен выполнить ученик?"
              style={{
                ...textareaStyle,

                minHeight:
                  110,
              }}
            />
          </Field>


          <label
            style={
              checkboxStyle
            }
          >
            <input
              type="checkbox"
              name="affectsStreak"
              checked={
                form.affectsStreak
              }
              onChange={
                onChange
              }
            />

            <Flame
              size={18}
            />

            Влияет на серию
          </label>


          <button
            type="submit"
            style={
              mainButtonStyle
            }
          >
            Создать задание
          </button>
        </form>
      )}
    </section>
  )
}


/* ========================================
   STUDENT
======================================== */

function StudentView({
  loading,
  tasks,
  filter,
  setFilter,
  getTaskData,
  onOpen,
  onReload,
}) {
  const prepared =
    tasks.map(
      (task) => ({
        task,

        data:
          getTaskData(
            task,
          ),
      }),
    )


  const counts = {
    all:
      prepared.length,

    todo:
      prepared.filter(
        ({ data }) =>
          data.status ===
            'new' ||
          data.status ===
            'rejected',
      ).length,

    pending:
      prepared.filter(
        ({ data }) =>
          data.status ===
          'pending',
      ).length,

    approved:
      prepared.filter(
        ({ data }) =>
          data.status ===
          'approved',
      ).length,

    overdue:
      prepared.filter(
        ({ data }) =>
          data.overdue,
      ).length,
  }


  const visible =
    prepared.filter(
      ({
        data,
      }) => {
        if (
          filter ===
          'all'
        ) {
          return true
        }


        if (
          filter ===
          'todo'
        ) {
          return (
            data.status ===
              'new' ||
            data.status ===
              'rejected'
          )
        }


        if (
          filter ===
          'pending'
        ) {
          return (
            data.status ===
            'pending'
          )
        }


        if (
          filter ===
          'approved'
        ) {
          return (
            data.status ===
            'approved'
          )
        }


        if (
          filter ===
          'overdue'
        ) {
          return data.overdue
        }


        return true
      },
    )


  return (
    <main
      style={
        pageStyle
      }
    >
      <section
        style={
          heroStyle
        }
      >
        <div>
          <span
            style={
              eyebrowStyle
            }
          >
            Учебный процесс
          </span>

          <h1
            style={
              titleStyle
            }
          >
            Мои задания
          </h1>

          <p
            style={
              subtitleStyle
            }
          >
            Домашние работы,
            сроки и результаты
            проверки.
          </p>
        </div>


        <button
          type="button"
          onClick={
            onReload
          }
          style={
            iconButtonStyle
          }
        >
          <RefreshCcw
            size={20}
          />
        </button>
      </section>


      <div
        style={
          statsGridStyle
        }
      >
        <Stat
          title="К выполнению"
          value={
            counts.todo
          }
        />

        <Stat
          title="На проверке"
          value={
            counts.pending
          }
        />

        <Stat
          title="Выполнено"
          value={
            counts.approved
          }
        />

        <Stat
          title="Просрочено"
          value={
            counts.overdue
          }
        />
      </div>


      <div
        style={
          filtersStyle
        }
      >
        {[
          [
            'all',
            'Все',
          ],
          [
            'todo',
            'К выполнению',
          ],
          [
            'pending',
            'На проверке',
          ],
          [
            'approved',
            'Выполнено',
          ],
          [
            'overdue',
            'Просрочено',
          ],
        ].map(
          ([
            id,
            title,
          ]) => (
            <FilterButton
              key={
                id
              }
              id={
                id
              }
              label={
                title
              }
              value={
                counts[id]
              }
              active={
                filter ===
                id
              }
              onClick={
                setFilter
              }
            />
          ),
        )}
      </div>


      {loading ? (
        <EmptyState
          text="Загружаем задания..."
        />
      ) : visible.length ===
        0 ? (
        <EmptyState
          text="Заданий здесь нет."
        />
      ) : (
        <div
          style={
            studentGridStyle
          }
        >
          {visible.map(
            ({
              task,
              data,
            }) => (
              <StudentTaskCard
                key={
                  task.id
                }
                task={
                  task
                }
                data={
                  data
                }
                onOpen={() =>
                  onOpen(
                    task,
                  )
                }
              />
            ),
          )}
        </div>
      )}
    </main>
  )
}


function StudentTaskCard({
  task,
  data,
  onOpen,
}) {
  const submission =
    data.submission


  return (
    <article
      style={
        cardStyle
      }
    >
      <div
        style={
          cardTopStyle
        }
      >
        <div
          style={
            subjectCircleStyle
          }
        >
          <BookOpen
            size={20}
          />
        </div>


        <div
          style={{
            flex:
              1,

            minWidth:
              0,
          }}
        >
          <small
            style={
              miniStyle
            }
          >
            {task.subject}
          </small>

          <h3
            style={
              cardTitleStyle
            }
          >
            {task.title}
          </h3>
        </div>


        <StudentStatus
          status={
            data.status
          }
          overdue={
            data.overdue
          }
        />
      </div>


      {task.description && (
        <p
          style={
            descriptionStyle
          }
        >
          {task.description}
        </p>
      )}


      <div
        style={
          infoGridStyle
        }
      >
        <InfoBox
          icon={
            CalendarDays
          }
          label="Срок"
          value={
            formatDate(
              task.deadline,
            )
          }
        />

        <InfoBox
          icon={
            Award
          }
          label="Награда"
          value={
            `${task.reward} баллов`
          }
        />

        <InfoBox
          icon={
            Flame
          }
          label="Серия"
          value={
            task.affectsStreak
              ? 'Влияет'
              : 'Не влияет'
          }
        />
      </div>


      {data.lesson && (
        <div
          style={
            lessonStyle
          }
        >
          <BookOpen
            size={17}
          />

          {formatDate(
            data.lesson.date,
          )}

          {data.lesson.topic
            ? ` · ${data.lesson.topic}`
            : ''}
        </div>
      )}


      {submission
        ?.teacherComment && (
        <div
          style={
            commentStyle
          }
        >
          <strong>
            Комментарий учителя
          </strong>

          <p>
            {
              submission
                .teacherComment
            }
          </p>
        </div>
      )}


      {data.status ===
        'approved' ? (
        <div
          style={
            approvedNoticeStyle
          }
        >
          <CheckCircle2
            size={19}
          />

          Работа принята
        </div>
      ) : data.status ===
        'pending' ? (
        <div
          style={
            pendingNoticeStyle
          }
        >
          <Clock3
            size={19}
          />

          Ожидает проверки
        </div>
      ) : (
        <button
          type="button"
          onClick={
            onOpen
          }
          style={
            mainButtonStyle
          }
        >
          {data.status ===
          'rejected' ? (
            <>
              <RotateCcw
                size={18}
              />

              Исправить и сдать снова
            </>
          ) : (
            <>
              <Send
                size={18}
              />

              {data.overdue
                ? 'Сдать просроченную работу'
                : 'Сдать работу'}
            </>
          )}
        </button>
      )}
    </article>
  )
}


function StudentStatus({
  status,
  overdue,
}) {
  if (overdue) {
    return (
      <span
        style={{
          ...statusStyle,

          background:
            '#fef2f2',

          color:
            '#b91c1c',
        }}
      >
        Просрочено
      </span>
    )
  }


  const map = {
    new: [
      'К выполнению',
      '#eff6ff',
      '#2563eb',
    ],

    pending: [
      'На проверке',
      '#fff7ed',
      '#c2410c',
    ],

    approved: [
      'Выполнено',
      '#ecfdf5',
      '#047857',
    ],

    rejected: [
      'Исправить',
      '#fef2f2',
      '#b91c1c',
    ],
  }


  const item =
    map[status] ||
    map.new


  return (
    <span
      style={{
        ...statusStyle,

        background:
          item[1],

        color:
          item[2],
      }}
    >
      {item[0]}
    </span>
  )
}


/* ========================================
   SUBMISSION MODAL
======================================== */

function SubmissionModal({
  task,
  taskData,
  submissionType,
  setSubmissionType,
  reportText,
  setReportText,
  attachmentFile,
  attachmentPreview,
  submitting,
  onAttachmentChange,
  onRemoveAttachment,
  onNotebookSubmit,
  onOnlineSubmit,
  onClose,
}) {
  const fileInputRef =
    useRef(null)


  return (
    <div
      style={
        modalBackdropStyle
      }
      onMouseDown={
        (event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            onClose()
          }
        }
      }
    >
      <div
        style={
          modalStyle
        }
      >
        <button
          type="button"
          onClick={
            onClose
          }
          style={
            closeStyle
          }
        >
          <X
            size={20}
          />
        </button>


        <span
          style={
            eyebrowStyle
          }
        >
          {task.subject}
        </span>


        <h2
          style={
            modalTitleStyle
          }
        >
          {taskData.status ===
          'rejected'
            ? 'Сдать работу повторно'
            : 'Как сдаёшь работу?'}
        </h2>


        <p
          style={
            descriptionStyle
          }
        >
          {task.title}
        </p>


        {taskData
          .submission
          ?.teacherComment && (
          <div
            style={
              commentStyle
            }
          >
            <strong>
              Что исправить
            </strong>

            <p>
              {
                taskData
                  .submission
                  .teacherComment
              }
            </p>
          </div>
        )}


        {!submissionType && (
          <div
            style={
              methodGridStyle
            }
          >
            <button
              type="button"
              onClick={() =>
                setSubmissionType(
                  'notebook',
                )
              }
              style={
                methodButtonStyle
              }
            >
              <NotebookText
                size={30}
              />

              <strong>
                Сдам тетрадь
              </strong>

              <small>
                Учитель проверит её лично.
              </small>
            </button>


            <button
              type="button"
              onClick={() =>
                setSubmissionType(
                  'online',
                )
              }
              style={
                methodButtonStyle
              }
            >
              <Camera
                size={30}
              />

              <strong>
                Отправить онлайн
              </strong>

              <small>
                Фото тетради или PDF.
              </small>
            </button>
          </div>
        )}


        {submissionType ===
          'notebook' && (
          <>
            <div
              style={
                notebookBoxStyle
              }
            >
              <NotebookText
                size={28}
              />

              <div>
                <strong>
                  Проверка тетради
                </strong>

                <p>
                  Учитель проверит
                  обычную тетрадь
                  и подтвердит работу.
                </p>
              </div>
            </div>


            <button
              type="button"
              disabled={
                submitting
              }
              onClick={
                onNotebookSubmit
              }
              style={
                mainButtonStyle
              }
            >
              <Check
                size={18}
              />

              {submitting
                ? 'Отправляем...'
                : 'Подтвердить сдачу'}
            </button>
          </>
        )}


        {submissionType ===
          'online' && (
          <form
            onSubmit={
              onOnlineSubmit
            }
          >
            <input
              ref={
                fileInputRef
              }
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={
                onAttachmentChange
              }
              style={{
                display:
                  'none',
              }}
            />


            {!attachmentFile ? (
              <button
                type="button"
                onClick={() =>
                  fileInputRef
                    .current
                    ?.click()
                }
                style={
                  uploadStyle
                }
              >
                <Upload
                  size={25}
                />

                <div>
                  <strong>
                    Добавить фото или PDF
                  </strong>

                  <small>
                    Максимум 10 МБ
                  </small>
                </div>
              </button>
            ) : (
              <div
                style={
                  selectedFileStyle
                }
              >
                {attachmentPreview ? (
                  <img
                    src={
                      attachmentPreview
                    }
                    alt="Работа"
                    style={
                      previewStyle
                    }
                  />
                ) : (
                  <FileText
                    size={35}
                  />
                )}


                <div
                  style={{
                    flex:
                      1,

                    minWidth:
                      0,
                  }}
                >
                  <strong>
                    {
                      attachmentFile
                        .name
                    }
                  </strong>
                </div>


                <button
                  type="button"
                  onClick={
                    onRemoveAttachment
                  }
                  style={
                    closeStyle
                  }
                >
                  <X
                    size={18}
                  />
                </button>
              </div>
            )}


            <textarea
              value={
                reportText
              }
              onChange={
                (event) =>
                  setReportText(
                    event.target
                      .value,
                  )
              }
              placeholder="Пояснение — необязательно"
              style={{
                ...textareaStyle,

                marginTop:
                  15,
              }}
            />


            <button
              type="submit"
              disabled={
                submitting
              }
              style={{
                ...mainButtonStyle,

                marginTop:
                  15,
              }}
            >
              <Send
                size={18}
              />

              {submitting
                ? 'Отправляем...'
                : 'Отправить учителю'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}


/* ========================================
   SIMPLE COMPONENTS
======================================== */

function InfoBox({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div
      style={
        infoStyle
      }
    >
      <Icon
        size={18}
      />

      <div>
        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>
      </div>
    </div>
  )
}


function Field({
  label,
  children,
}) {
  return (
    <label
      style={
        fieldStyle
      }
    >
      <span>
        {label}
      </span>

      {children}
    </label>
  )
}


function Stat({
  title,
  value,
}) {
  return (
    <div
      style={
        statStyle
      }
    >
      <strong>
        {value}
      </strong>

      <span>
        {title}
      </span>
    </div>
  )
}


function EmptyState({
  text,
}) {
  return (
    <div
      style={
        emptyStyle
      }
    >
      <BookOpen
        size={29}
      />

      <p>
        {text}
      </p>
    </div>
  )
}


function ParentTasksView() {
  return (
    <main
      style={
        pageStyle
      }
    >
      <section
        style={
          heroStyle
        }
      >
        <div>
          <span
            style={
              eyebrowStyle
            }
          >
            Родительский кабинет
          </span>

          <h1
            style={
              titleStyle
            }
          >
            Задания ребёнка
          </h1>

          <p
            style={
              subtitleStyle
            }
          >
            Просмотр домашних
            заданий ребёнка.
          </p>
        </div>
      </section>
    </main>
  )
}


/* ========================================
   HELPERS
======================================== */

function formatDate(
  value,
) {
  if (!value) {
    return 'Не указан'
  }


  const date =
    new Date(
      `${String(value).slice(
        0,
        10,
      )}T12:00:00`,
    )


  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }


  return date.toLocaleDateString(
    'ru-RU',
    {
      day:
        '2-digit',

      month:
        'short',

      year:
        'numeric',
    },
  )
}


function isTaskOverdue(
  task,
  status,
) {
  if (
    !task?.deadline ||
    status ===
      'approved'
  ) {
    return false
  }


  const end =
    new Date(
      `${String(
        task.deadline,
      ).slice(
        0,
        10,
      )}T23:59:59`,
    )


  return (
    Date.now() >
    end.getTime()
  )
}


/* ========================================
   STYLES
======================================== */

const pageStyle = {
  maxWidth:
    1180,

  margin:
    '0 auto',

  padding:
    '24px 16px 70px',
}


const heroStyle = {
  display:
    'flex',

  justifyContent:
    'space-between',

  alignItems:
    'center',

  gap:
    20,

  padding:
    24,

  background:
    '#ffffff',

  border:
    '1px solid #e2e8f0',

  borderRadius:
    22,

  marginBottom:
    18,
}


const eyebrowStyle = {
  display:
    'block',

  color:
    '#2563eb',

  fontSize:
    12,

  fontWeight:
    800,

  marginBottom:
    6,
}


const titleStyle = {
  margin:
    0,

  fontSize:
    'clamp(28px,5vw,42px)',

  color:
    '#0f172a',
}


const subtitleStyle = {
  margin:
    '8px 0 0',

  color:
    '#64748b',

  lineHeight:
    1.5,
}


const iconButtonStyle = {
  width:
    44,

  height:
    44,

  border:
    '1px solid #dbe3ee',

  borderRadius:
    13,

  background:
    '#ffffff',

  color:
    '#2563eb',

  cursor:
    'pointer',

  display:
    'grid',

  placeItems:
    'center',
}


const sectionStyle = {
  background:
    '#ffffff',

  border:
    '1px solid #e2e8f0',

  borderRadius:
    22,

  padding:
    20,

  marginBottom:
    18,
}


const sectionHeaderStyle = {
  display:
    'flex',

  justifyContent:
    'space-between',

  alignItems:
    'center',

  gap:
    12,

  marginBottom:
    16,
}


const sectionTitleStyle = {
  margin:
    0,

  fontSize:
    20,

  color:
    '#0f172a',
}


const sectionSubtitleStyle = {
  margin:
    '5px 0 0',

  color:
    '#64748b',

  fontSize:
    14,
}


const counterStyle = {
  minWidth:
    34,

  height:
    34,

  borderRadius:
    999,

  display:
    'grid',

  placeItems:
    'center',

  background:
    '#eff6ff',

  color:
    '#2563eb',

  fontWeight:
    800,
}


const createToggleStyle = {
  width:
    '100%',

  padding:
    14,

  border:
    '1px dashed #93c5fd',

  borderRadius:
    15,

  background:
    '#eff6ff',

  color:
    '#1d4ed8',

  fontWeight:
    800,

  cursor:
    'pointer',

  display:
    'flex',

  justifyContent:
    'center',

  alignItems:
    'center',

  gap:
    8,
}


const formStyle = {
  display:
    'grid',

  gap:
    15,

  marginTop:
    18,
}


const formGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit,minmax(180px,1fr))',

  gap:
    12,
}


const fieldStyle = {
  display:
    'grid',

  gap:
    7,

  fontSize:
    14,

  fontWeight:
    700,

  color:
    '#334155',
}


const inputStyle = {
  width:
    '100%',

  boxSizing:
    'border-box',

  border:
    '1px solid #cbd5e1',

  borderRadius:
    12,

  padding:
    '12px 13px',

  background:
    '#ffffff',

  color:
    '#0f172a',
}


const textareaStyle = {
  width:
    '100%',

  boxSizing:
    'border-box',

  minHeight:
    82,

  resize:
    'vertical',

  border:
    '1px solid #cbd5e1',

  borderRadius:
    12,

  padding:
    12,

  font:
    'inherit',

  color:
    '#0f172a',
}


const checkboxStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    8,

  fontWeight:
    700,
}


const mainButtonStyle = {
  border:
    0,

  borderRadius:
    13,

  padding:
    '12px 18px',

  background:
    '#2563eb',

  color:
    '#ffffff',

  fontWeight:
    800,

  cursor:
    'pointer',

  display:
    'flex',

  justifyContent:
    'center',

  alignItems:
    'center',

  gap:
    8,
}


const teacherTaskListStyle = {
  display:
    'grid',

  gap:
    9,
}


function teacherTaskButtonStyle(
  active,
) {
  return {
    width:
      '100%',

    display:
      'flex',

    alignItems:
      'center',

    gap:
      12,

    border:
      active
        ? '2px solid #3b82f6'
        : '1px solid #e2e8f0',

    background:
      active
        ? '#eff6ff'
        : '#ffffff',

    borderRadius:
      15,

    padding:
      13,

    color:
      '#0f172a',

    cursor:
      'pointer',
  }
}


const subjectCircleStyle = {
  width:
    42,

  height:
    42,

  flex:
    '0 0 42px',

  borderRadius:
    12,

  background:
    '#eff6ff',

  color:
    '#2563eb',

  display:
    'grid',

  placeItems:
    'center',
}


const miniStyle = {
  display:
    'block',

  color:
    '#64748b',

  fontSize:
    12,

  marginBottom:
    3,
}


const taskNameStyle = {
  display:
    'block',

  overflow:
    'hidden',

  textOverflow:
    'ellipsis',

  whiteSpace:
    'nowrap',
}


const taskMetaStyle = {
  display:
    'block',

  marginTop:
    4,

  color:
    '#64748b',

  fontSize:
    12,
}


const selectedTaskHeaderStyle = {
  display:
    'flex',

  justifyContent:
    'space-between',

  alignItems:
    'flex-start',

  gap:
    15,

  flexWrap:
    'wrap',

  marginBottom:
    18,
}


const selectedTaskTitleStyle = {
  margin:
    '3px 0',

  fontSize:
    24,

  color:
    '#0f172a',
}


const descriptionStyle = {
  color:
    '#64748b',

  lineHeight:
    1.55,

  whiteSpace:
    'pre-wrap',
}


const dangerButtonStyle = {
  border:
    '1px solid #fecaca',

  background:
    '#ffffff',

  color:
    '#dc2626',

  borderRadius:
    11,

  padding:
    '10px 13px',

  fontWeight:
    700,

  cursor:
    'pointer',

  display:
    'flex',

  alignItems:
    'center',

  gap:
    7,
}


const infoGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit,minmax(135px,1fr))',

  gap:
    10,

  margin:
    '14px 0',
}


const infoStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    9,

  background:
    '#f8fafc',

  border:
    '1px solid #e2e8f0',

  padding:
    11,

  borderRadius:
    12,

  color:
    '#2563eb',
}


const filtersStyle = {
  display:
    'flex',

  flexWrap:
    'wrap',

  gap:
    8,

  margin:
    '16px 0',
}


function filterButtonStyle(
  active,
) {
  return {
    border:
      active
        ? '1px solid #2563eb'
        : '1px solid #dbe3ee',

    background:
      active
        ? '#2563eb'
        : '#ffffff',

    color:
      active
        ? '#ffffff'
        : '#334155',

    borderRadius:
      999,

    padding:
      '8px 11px',

    fontWeight:
      700,

    cursor:
      'pointer',

    display:
      'flex',

    alignItems:
      'center',

    gap:
      7,
  }
}


function filterCountStyle(
  active,
) {
  return {
    minWidth:
      20,

    borderRadius:
      999,

    padding:
      '2px 6px',

    background:
      active
        ? 'rgba(255,255,255,.2)'
        : '#f1f5f9',

    color:
      active
        ? '#ffffff'
        : '#475569',

    fontSize:
      12,
  }
}


/* BULK */

const bulkPanelStyle = {
  margin:
    '14px 0 18px',

  padding:
    14,

  border:
    '1px solid #bbf7d0',

  borderRadius:
    15,

  background:
    '#f0fdf4',
}


const bulkTopStyle = {
  display:
    'flex',

  justifyContent:
    'space-between',

  alignItems:
    'flex-start',

  gap:
    12,

  flexWrap:
    'wrap',
}


const bulkTitleStyle = {
  display:
    'block',

  color:
    '#166534',

  fontSize:
    15,
}


const bulkDescriptionStyle = {
  margin:
    '4px 0 0',

  color:
    '#4b5563',

  fontSize:
    13,

  lineHeight:
    1.45,
}


const bulkCountStyle = {
  padding:
    '5px 9px',

  borderRadius:
    999,

  background:
    '#dcfce7',

  color:
    '#166534',

  fontSize:
    12,

  fontWeight:
    800,
}


const bulkActionsStyle = {
  marginTop:
    13,

  display:
    'flex',

  justifyContent:
    'space-between',

  alignItems:
    'center',

  gap:
    10,

  flexWrap:
    'wrap',
}


const selectAllStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    8,

  color:
    '#166534',

  fontWeight:
    700,

  cursor:
    'pointer',
}


const bulkApproveStyle = {
  border:
    0,

  borderRadius:
    11,

  padding:
    '10px 14px',

  background:
    '#059669',

  color:
    '#ffffff',

  fontWeight:
    800,

  cursor:
    'pointer',

  display:
    'flex',

  alignItems:
    'center',

  gap:
    7,
}


/* CLASS */

const classListStyle = {
  display:
    'grid',

  gap:
    10,
}


const studentRowStyle = {
  border:
    '1px solid #e2e8f0',

  borderRadius:
    16,

  padding:
    14,

  background:
    '#ffffff',
}


const studentTopStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    10,
}


const numberStyle = {
  width:
    24,

  textAlign:
    'center',

  color:
    '#94a3b8',

  fontSize:
    12,
}


const rowCheckboxStyle = {
  width:
    28,

  height:
    28,

  border:
    '1px solid #bbf7d0',

  borderRadius:
    8,

  background:
    '#f0fdf4',

  display:
    'grid',

  placeItems:
    'center',

  cursor:
    'pointer',
}


const avatarStyle = {
  width:
    40,

  height:
    40,

  flex:
    '0 0 40px',

  borderRadius:
    12,

  background:
    '#e0e7ff',

  color:
    '#3730a3',

  display:
    'grid',

  placeItems:
    'center',

  fontWeight:
    900,
}


const studentNameStyle = {
  display:
    'block',

  color:
    '#0f172a',
}


const studentClassStyle = {
  display:
    'block',

  color:
    '#64748b',

  fontSize:
    12,

  marginTop:
    2,
}


const statusStyle = {
  borderRadius:
    999,

  padding:
    '6px 9px',

  fontSize:
    12,

  fontWeight:
    800,

  whiteSpace:
    'nowrap',
}


const notSubmittedStyle = {
  marginTop:
    12,

  padding:
    11,

  borderRadius:
    11,

  background:
    '#f8fafc',

  color:
    '#64748b',

  display:
    'flex',

  gap:
    8,

  alignItems:
    'center',
}


const submissionTypeStyle = {
  marginTop:
    12,

  display:
    'flex',

  alignItems:
    'center',

  gap:
    8,

  color:
    '#475569',
}


const attachmentButtonStyle = {
  marginTop:
    10,

  width:
    '100%',

  border:
    '1px solid #bfdbfe',

  borderRadius:
    11,

  padding:
    '10px 12px',

  background:
    '#eff6ff',

  color:
    '#1d4ed8',

  cursor:
    'pointer',

  display:
    'flex',

  alignItems:
    'center',

  gap:
    8,
}


const reportStyle = {
  marginTop:
    10,

  padding:
    11,

  borderRadius:
    11,

  background:
    '#f8fafc',

  color:
    '#475569',
}


const commentStyle = {
  marginTop:
    10,

  padding:
    11,

  borderRadius:
    11,

  background:
    '#fff7ed',

  color:
    '#9a3412',
}


const reviewStyle = {
  marginTop:
    12,

  paddingTop:
    12,

  borderTop:
    '1px solid #e2e8f0',
}


const reviewButtonsStyle = {
  display:
    'flex',

  gap:
    8,

  flexWrap:
    'wrap',

  marginTop:
    9,
}


const approveStyle = {
  flex:
    1,

  minWidth:
    120,

  border:
    0,

  borderRadius:
    11,

  padding:
    '10px 13px',

  background:
    '#059669',

  color:
    '#ffffff',

  fontWeight:
    800,

  cursor:
    'pointer',

  display:
    'flex',

  justifyContent:
    'center',

  alignItems:
    'center',

  gap:
    7,
}


const rejectStyle = {
  flex:
    1,

  minWidth:
    120,

  border:
    '1px solid #fecaca',

  borderRadius:
    11,

  padding:
    '10px 13px',

  background:
    '#ffffff',

  color:
    '#dc2626',

  fontWeight:
    800,

  cursor:
    'pointer',

  display:
    'flex',

  justifyContent:
    'center',

  alignItems:
    'center',

  gap:
    7,
}


/* STUDENT */

const statsGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit,minmax(130px,1fr))',

  gap:
    10,

  marginBottom:
    15,
}


const statStyle = {
  padding:
    14,

  border:
    '1px solid #e2e8f0',

  borderRadius:
    15,

  background:
    '#ffffff',

  display:
    'grid',

  gap:
    4,
}


const studentGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit,minmax(min(100%,320px),1fr))',

  gap:
    14,
}


const cardStyle = {
  border:
    '1px solid #e2e8f0',

  borderRadius:
    18,

  padding:
    16,

  background:
    '#ffffff',
}


const cardTopStyle = {
  display:
    'flex',

  alignItems:
    'flex-start',

  gap:
    11,
}


const cardTitleStyle = {
  margin:
    0,

  color:
    '#0f172a',

  fontSize:
    18,
}


const lessonStyle = {
  margin:
    '12px 0',

  padding:
    10,

  borderRadius:
    10,

  background:
    '#eff6ff',

  color:
    '#1d4ed8',

  display:
    'flex',

  gap:
    7,

  alignItems:
    'center',

  fontSize:
    13,
}


const approvedNoticeStyle = {
  marginTop:
    14,

  padding:
    12,

  borderRadius:
    11,

  background:
    '#ecfdf5',

  color:
    '#047857',

  fontWeight:
    800,

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  gap:
    8,
}


const pendingNoticeStyle = {
  ...approvedNoticeStyle,

  background:
    '#fff7ed',

  color:
    '#c2410c',
}


/* MODAL */

const emptyStyle = {
  padding:
    30,

  textAlign:
    'center',

  color:
    '#64748b',

  border:
    '1px dashed #cbd5e1',

  borderRadius:
    15,
}


const modalBackdropStyle = {
  position:
    'fixed',

  inset:
    0,

  zIndex:
    1000,

  background:
    'rgba(15,23,42,.55)',

  display:
    'grid',

  placeItems:
    'center',

  padding:
    15,

  overflowY:
    'auto',
}


const modalStyle = {
  width:
    'min(100%,560px)',

  maxHeight:
    '90vh',

  overflowY:
    'auto',

  background:
    '#ffffff',

  borderRadius:
    20,

  padding:
    22,

  boxSizing:
    'border-box',
}


const closeStyle = {
  marginLeft:
    'auto',

  border:
    0,

  background:
    'transparent',

  color:
    '#64748b',

  cursor:
    'pointer',

  display:
    'grid',

  placeItems:
    'center',
}


const modalTitleStyle = {
  margin:
    '3px 0',

  fontSize:
    24,

  color:
    '#0f172a',
}


const methodGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit,minmax(180px,1fr))',

  gap:
    10,

  marginTop:
    18,
}


const methodButtonStyle = {
  border:
    '1px solid #dbe3ee',

  background:
    '#ffffff',

  borderRadius:
    15,

  padding:
    18,

  color:
    '#2563eb',

  cursor:
    'pointer',

  display:
    'grid',

  gap:
    8,

  textAlign:
    'left',
}


const notebookBoxStyle = {
  display:
    'flex',

  gap:
    11,

  margin:
    '18px 0',

  padding:
    14,

  borderRadius:
    13,

  background:
    '#eff6ff',

  color:
    '#1d4ed8',
}


const uploadStyle = {
  width:
    '100%',

  display:
    'flex',

  alignItems:
    'center',

  gap:
    12,

  border:
    '2px dashed #93c5fd',

  background:
    '#eff6ff',

  color:
    '#1d4ed8',

  padding:
    18,

  borderRadius:
    14,

  cursor:
    'pointer',
}


const selectedFileStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    11,

  marginTop:
    14,

  border:
    '1px solid #dbe3ee',

  padding:
    11,

  borderRadius:
    13,
}


const previewStyle = {
  width:
    72,

  height:
    72,

  borderRadius:
    10,

  objectFit:
    'cover',
}


export default TasksPage