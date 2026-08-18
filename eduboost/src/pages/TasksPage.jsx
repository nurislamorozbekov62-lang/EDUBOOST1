import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  File,
  FileImage,
  FileText,
  Flame,
  GraduationCap,
  Image,
  NotebookText,
  Paperclip,
  Plus,
  RefreshCcw,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
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


  const [
    teacherComments,
    setTeacherComments,
  ] = useState({})

  const [
    openingAttachmentId,
    setOpeningAttachmentId,
  ] = useState(null)


  const [
    form,
    setForm,
  ] = useState(
    INITIAL_FORM,
  )


  const [
    studentFilter,
    setStudentFilter,
  ] = useState('all')


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


  async function loadData() {
    if (
      !user
    ) {
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
          teacherTasks ||
            [],
        )


        setSubmissions(
          teacherSubmissions ||
            [],
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
    } catch (
      error
    ) {
      console.error(
        'Ошибка загрузки заданий:',
        error,
      )


      setTasks([])
      setSubmissions([])
      setLessonMap({})


      window.alert(
        error?.message ||
          'Не удалось загрузить задания',
      )
    } finally {
      setLoading(false)
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
          .filter(
            Boolean,
          ),
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
          console.error(
            result.reason,
          )

          return
        }


        const {
          lessonId,
          lesson,
        } =
          result.value


        if (
          lesson
        ) {
          nextMap[
            lessonId
          ] = lesson
        }
      },
    )


    setLessonMap(
      nextMap,
    )
  }


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
      await createSupabaseTask(
        form,
        user,
      )


      setForm(
        INITIAL_FORM,
      )


      await loadData()
    } catch (
      error
    ) {
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
        'Удалить это задание и все работы учеников?',
      )


    if (
      !confirmed
    ) {
      return
    }


    try {
      await deleteSupabaseTask(
        taskId,
      )


      await loadData()
    } catch (
      error
    ) {
      window.alert(
        error?.message ||
          'Не удалось удалить задание',
      )
    }
  }


  function openSubmitModal(
    task,
  ) {
    const oldSubmission =
      submissions.find(
        (
          submission,
        ) =>
          String(
            submission.taskId,
          ) ===
            String(
              task.id,
            ) &&
          String(
            submission.studentId,
          ) ===
            String(
              user.id,
            ),
      )


    clearSelectedAttachment()


    setSelectedTask(
      task,
    )


    if (
      oldSubmission?.status ===
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


  function handleAttachmentChange(
    event,
  ) {
    const file =
      event.target
        .files?.[0]


    if (
      !file
    ) {
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
    } catch (
      error
    ) {
      event.target.value =
        ''


      window.alert(
        error?.message ||
          'Не удалось выбрать файл',
      )
    }
  }


  async function submitNotebook() {
    if (
      !selectedTask
    ) {
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
    } catch (
      error
    ) {
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


    if (
      !selectedTask
    ) {
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
    } catch (
      error
    ) {
      window.alert(
        error?.message ||
          'Не удалось отправить работу',
      )
    } finally {
      setSubmitting(false)
    }
  }


  async function handleOpenAttachment(
    submission,
  ) {
    if (
      !submission?.attachmentPath
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


      if (
        !url
      ) {
        throw new Error(
          'Не удалось получить ссылку на файл',
        )
      }


      window.open(
        url,
        '_blank',
        'noopener,noreferrer',
      )
    } catch (
      error
    ) {
      window.alert(
        error?.message ||
          'Не удалось открыть вложение',
      )
    } finally {
      setOpeningAttachmentId(
        null,
      )
    }
  }


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
        oldComments,
      ) => ({
        ...oldComments,

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
        oldComments,
      ) => {
        const updated = {
          ...oldComments,
        }


        delete updated[
          submissionId
        ]


        return updated
      },
    )
  }


  async function handleApprove(
    submission,
  ) {
    try {
      await reviewSupabaseSubmission(
        submission.id,
        'approved',
        getTeacherComment(
          submission.id,
        ),
      )


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


      clearTeacherComment(
        submission.id,
      )


      await loadData()
    } catch (
      error
    ) {
      window.alert(
        error?.message ||
          'Не удалось принять работу',
      )
    }
  }


  async function handleReject(
    submission,
  ) {
    try {
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


      await loadData()
    } catch (
      error
    ) {
      window.alert(
        error?.message ||
          'Не удалось вернуть работу',
      )
    }
  }


  function getTaskData(
    task,
  ) {
    const submission =
      submissions.find(
        (item) =>
          String(
            item.taskId,
          ) ===
            String(
              task.id,
            ) &&
          String(
            item.studentId,
          ) ===
            String(
              user.id,
            ),
      )


    const status =
      submission
        ?.status ||
      'new'


    const overdue =
      isTaskOverdue(
        task,
        status,
      )


    const lesson =
      task.journalLessonId
        ? lessonMap[
            task
              .journalLessonId
          ] ||
          null
        : null


    return {
      status,

      overdue,

      lesson,

      submissionType:
        submission
          ?.submissionType ||
        '',

      teacherComment:
        submission
          ?.teacherComment ||
        '',

      reportText:
        submission
          ?.reportText ||
        '',

      attachmentPath:
        submission
          ?.attachmentPath ||
        null,

      attachmentName:
        submission
          ?.attachmentName ||
        null,

      attachmentType:
        submission
          ?.attachmentType ||
        null,

      hasAttachment:
        Boolean(
          submission
            ?.attachmentPath,
        ),

      submittedAt:
        submission
          ?.submittedAt ||
        null,

      reviewedAt:
        submission
          ?.reviewedAt ||
        null,
    }
  }


  if (
    !user
  ) {
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


  return (
    <div className="eb-task-page">

      {user.role ===
      'Учитель' ? (
        <>
          <TeacherHeader />


          <TeacherTaskCreator
            form={
              form
            }
            onChange={
              handleFormChange
            }
            onSubmit={
              handleCreateTask
            }
          />


          <TeacherTasks
            tasks={
              tasks
            }
            onDelete={
              handleDeleteTask
            }
          />


          <TeacherSubmissions
            submissions={
              submissions
            }
            comments={
              teacherComments
            }
            openingAttachmentId={
              openingAttachmentId
            }
            onCommentChange={
              changeTeacherComment
            }
            onOpenAttachment={
              handleOpenAttachment
            }
            onApprove={
              handleApprove
            }
            onReject={
              handleReject
            }
          />
        </>
      ) : (
        <>
          <StudentHeader
            loading={
              loading
            }
            reload={
              loadData
            }
          />


          <StudentStats
            tasks={
              tasks
            }
            getTaskData={
              getTaskData
            }
          />


          <StudentFilters
            filter={
              studentFilter
            }
            setFilter={
              setStudentFilter
            }
            tasks={
              tasks
            }
            getTaskData={
              getTaskData
            }
          />


          <StudentTaskList
            loading={
              loading
            }
            tasks={
              tasks
            }
            filter={
              studentFilter
            }
            getTaskData={
              getTaskData
            }
            openSubmitModal={
              openSubmitModal
            }
          />
        </>
      )}


      {selectedTask && (
        <SubmissionModal
          task={
            selectedTask
          }
          taskData={
            getTaskData(
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

    </div>
  )
}


/* =========================================================
   STUDENT HEADER
========================================================= */

function StudentHeader({
  loading,
  reload,
}) {
  return (
    <section
      style={
        studentHeaderStyle
      }
    >

      <div>

        <p
          style={
            headerEyebrowStyle
          }
        >
          Учебный процесс
        </p>


        <h1
          style={
            headerTitleStyle
          }
        >
          Мои задания
        </h1>


        <p
          style={
            headerSubtitleStyle
          }
        >
          Домашние работы,
          сроки сдачи и результаты
          проверки учителя.
        </p>

      </div>


      <button
        type="button"
        onClick={
          reload
        }
        disabled={
          loading
        }
        style={
          reloadButtonStyle
        }
        title="Обновить задания"
      >
        <RefreshCcw
          size={20}
        />
      </button>

    </section>
  )
}


/* =========================================================
   STUDENT STATS
========================================================= */

function StudentStats({
  tasks,
  getTaskData,
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


  const todo =
    prepared.filter(
      ({
        data,
      }) =>
        data.status ===
          'new' ||
        data.status ===
          'rejected',
    ).length


  const pending =
    prepared.filter(
      ({
        data,
      }) =>
        data.status ===
        'pending',
    ).length


  const approved =
    prepared.filter(
      ({
        data,
      }) =>
        data.status ===
        'approved',
    ).length


  const overdue =
    prepared.filter(
      ({
        data,
      }) =>
        data.overdue,
    ).length


  const stats = [
    {
      label:
        'К выполнению',

      value:
        todo,

      icon:
        BookOpen,

      background:
        '#eff6ff',

      color:
        '#2563eb',
    },

    {
      label:
        'На проверке',

      value:
        pending,

      icon:
        Clock3,

      background:
        '#fff7ed',

      color:
        '#c2410c',
    },

    {
      label:
        'Выполнено',

      value:
        approved,

      icon:
        CheckCircle2,

      background:
        '#ecfdf5',

      color:
        '#047857',
    },

    {
      label:
        'Просрочено',

      value:
        overdue,

      icon:
        AlertTriangle,

      background:
        '#fef2f2',

      color:
        '#b91c1c',
    },
  ]


  return (
    <section
      style={
        statsGridStyle
      }
    >

      {stats.map(
        (stat) => {
          const Icon =
            stat.icon


          return (
            <article
              key={
                stat.label
              }
              style={
                statCardStyle
              }
            >

              <div
                style={{
                  ...statIconStyle,

                  background:
                    stat.background,

                  color:
                    stat.color,
                }}
              >
                <Icon
                  size={21}
                />
              </div>


              <div>
                <strong
                  style={
                    statValueStyle
                  }
                >
                  {stat.value}
                </strong>

                <span
                  style={
                    statLabelStyle
                  }
                >
                  {stat.label}
                </span>
              </div>

            </article>
          )
        },
      )}

    </section>
  )
}


/* =========================================================
   STUDENT FILTERS
========================================================= */

function StudentFilters({
  filter,
  setFilter,
  tasks,
  getTaskData,
}) {
  const counts = {
    all:
      tasks.length,

    todo:
      0,

    pending:
      0,

    approved:
      0,

    overdue:
      0,
  }


  tasks.forEach(
    (task) => {
      const data =
        getTaskData(
          task,
        )


      if (
        data.status ===
          'new' ||
        data.status ===
          'rejected'
      ) {
        counts.todo +=
          1
      }


      if (
        data.status ===
        'pending'
      ) {
        counts.pending +=
          1
      }


      if (
        data.status ===
        'approved'
      ) {
        counts.approved +=
          1
      }


      if (
        data.overdue
      ) {
        counts.overdue +=
          1
      }
    },
  )


  const filters = [
    {
      id:
        'all',

      label:
        'Все',
    },

    {
      id:
        'todo',

      label:
        'К выполнению',
    },

    {
      id:
        'pending',

      label:
        'На проверке',
    },

    {
      id:
        'approved',

      label:
        'Выполнено',
    },

    {
      id:
        'overdue',

      label:
        'Просрочено',
    },
  ]


  return (
    <div
      style={
        filtersStyle
      }
    >

      {filters.map(
        (item) => (
          <button
            type="button"
            key={
              item.id
            }
            onClick={() =>
              setFilter(
                item.id,
              )
            }
            style={
              filterButtonStyle(
                filter ===
                  item.id,
              )
            }
          >
            {item.label}

            <span
              style={
                filterCountStyle(
                  filter ===
                    item.id,
                )
              }
            >
              {
                counts[
                  item.id
                ]
              }
            </span>
          </button>
        ),
      )}

    </div>
  )
}


/* =========================================================
   STUDENT TASK LIST
========================================================= */

function StudentTaskList({
  loading,
  tasks,
  filter,
  getTaskData,
  openSubmitModal,
}) {
  if (
    loading
  ) {
    return (
      <TaskEmptyState
        icon={
          RefreshCcw
        }
        title="Загружаем задания"
        text="Получаем домашние работы..."
      />
    )
  }


  const prepared =
    tasks
      .map(
        (task) => ({
          ...task,

          data:
            getTaskData(
              task,
            ),
        }),
      )
      .sort(
        compareStudentTasks,
      )


  const visibleTasks =
    prepared.filter(
      (task) => {
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
            task.data.status ===
              'new' ||
            task.data.status ===
              'rejected'
          )
        }


        if (
          filter ===
          'pending'
        ) {
          return (
            task.data.status ===
            'pending'
          )
        }


        if (
          filter ===
          'approved'
        ) {
          return (
            task.data.status ===
            'approved'
          )
        }


        if (
          filter ===
          'overdue'
        ) {
          return (
            task.data.overdue
          )
        }


        return true
      },
    )


  if (
    visibleTasks.length ===
    0
  ) {
    return (
      <TaskEmptyState
        icon={
          CheckCircle2
        }
        title="Заданий здесь нет"
        text={
          getFilterEmptyText(
            filter,
          )
        }
      />
    )
  }


  return (
    <section
      style={
        taskListStyle
      }
    >

      {visibleTasks.map(
        (task) => (
          <StudentTaskCard
            key={
              task.id
            }
            task={
              task
            }
            taskData={
              task.data
            }
            onOpen={() =>
              openSubmitModal(
                task,
              )
            }
          />
        ),
      )}

    </section>
  )
}


/* =========================================================
   STUDENT TASK CARD
========================================================= */

function StudentTaskCard({
  task,
  taskData,
  onOpen,
}) {
  const {
    status,
    overdue,
    lesson,
  } =
    taskData


  const progress =
    getTaskProgress(
      status,
    )


  return (
    <article
      style={
        taskCardStyle(
          overdue,
        )
      }
    >

      <div
        style={
          taskCardHeaderStyle
        }
      >

        <SubjectIcon
          subject={
            task.subject
          }
        />


        <div
          style={{
            minWidth:
              0,

            flex:
              1,
          }}
        >

          <div
            style={
              taskTitleRowStyle
            }
          >

            <div>

              <span
                style={
                  subjectLabelStyle
                }
              >
                {task.subject}
              </span>


              <h3
                style={
                  taskTitleStyle
                }
              >
                {task.title}
              </h3>

            </div>


            <TaskStatus
              status={
                status
              }
              overdue={
                overdue
              }
            />

          </div>


          {task.description && (
            <p
              style={
                taskDescriptionStyle
              }
            >
              {task.description}
            </p>
          )}

        </div>

      </div>


      {lesson && (
        <div
          style={
            lessonInfoStyle
          }
        >

          <BookOpen
            size={17}
          />


          <div
            style={
              stackedTextStyle
            }
          >
            <small
              style={
                miniLabelStyle
              }
            >
              Урок
            </small>

            <strong
              style={
                lessonValueStyle
              }
            >
              {formatFullDate(
                lesson.date,
              )}

              {lesson.topic
                ? ` · ${lesson.topic}`
                : ''}
            </strong>
          </div>

        </div>
      )}


      <div
        style={
          taskMetaGridStyle
        }
      >

        <TaskMeta
          icon={
            CalendarDays
          }
          label="Срок сдачи"
          value={
            task.deadline
              ? formatFullDeadline(
                  task.deadline,
                )
              : 'Не указан'
          }
          danger={
            overdue
          }
        />


        <TaskMeta
          icon={
            Sparkles
          }
          label="Награда"
          value={`${task.reward || 0} баллов`}
        />


        <TaskMeta
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


      {taskData.submissionType && (
        <div
          style={
            submittedMethodStyle
          }
        >
          {taskData.submissionType ===
          'notebook' ? (
            <NotebookText
              size={18}
            />
          ) : (
            <Wifi
              size={18}
            />
          )}


          <div
            style={
              stackedTextStyle
            }
          >
            <small
              style={
                miniLabelStyle
              }
            >
              Способ сдачи
            </small>

            <strong>
              {taskData.submissionType ===
              'notebook'
                ? 'Тетрадь учителю'
                : 'Онлайн'}
            </strong>
          </div>
        </div>
      )}


      {taskData.hasAttachment && (
        <div
          style={
            attachedStudentStyle
          }
        >
          <FileImage
            size={18}
          />

          <div
            style={
              stackedTextStyle
            }
          >
            <small
              style={
                miniLabelStyle
              }
            >
              Прикреплён файл
            </small>

            <strong
              style={
                fileNameStyle
              }
            >
              {taskData.attachmentName ||
                'Фото работы'}
            </strong>
          </div>
        </div>
      )}


      <div
        style={
          progressBoxStyle
        }
      >

        <div
          style={
            progressHeaderStyle
          }
        >
          <span>
            Прогресс
          </span>

          <strong>
            {progress}%
          </strong>
        </div>


        <div
          style={
            progressTrackStyle
          }
        >
          <span
            style={{
              ...progressBarStyle,

              width:
                `${progress}%`,
            }}
          />
        </div>

      </div>


      {taskData.reportText && (
        <div
          style={
            reportBoxStyle
          }
        >

          <div
            style={
              reportTitleStyle
            }
          >
            <FileText
              size={16}
            />

            Пояснение
          </div>


          <p
            style={
              reportTextStyle
            }
          >
            {
              taskData.reportText
            }
          </p>

        </div>
      )}


      {taskData.teacherComment && (
        <div
          style={
            teacherCommentStyle
          }
        >
          <strong>
            Комментарий учителя
          </strong>

          <p>
            {
              taskData
                .teacherComment
            }
          </p>
        </div>
      )}


      <StudentTaskAction
        status={
          status
        }
        overdue={
          overdue
        }
        onOpen={
          onOpen
        }
      />

    </article>
  )
}


function TaskMeta({
  icon: Icon,
  label,
  value,
  danger = false,
}) {
  return (
    <div
      style={
        metaItemStyle
      }
    >

      <Icon
        size={17}
        color={
          danger
            ? '#dc2626'
            : '#2563eb'
        }
      />


      <div
        style={
          stackedTextStyle
        }
      >
        <small
          style={
            miniLabelStyle
          }
        >
          {label}
        </small>

        <strong
          style={{
            display:
              'block',

            color:
              danger
                ? '#b91c1c'
                : '#0f274d',

            fontSize:
              14,

            lineHeight:
              1.3,
          }}
        >
          {value}
        </strong>
      </div>

    </div>
  )
}


function StudentTaskAction({
  status,
  overdue,
  onOpen,
}) {
  if (
    status ===
    'approved'
  ) {
    return (
      <div
        style={
          successActionStyle
        }
      >
        <CheckCircle2
          size={19}
        />

        Работа принята
      </div>
    )
  }


  if (
    status ===
    'pending'
  ) {
    return (
      <div
        style={
          pendingActionStyle
        }
      >
        <Clock3
          size={19}
        />

        Ожидает проверки учителя
      </div>
    )
  }


  if (
    status ===
    'rejected'
  ) {
    return (
      <button
        type="button"
        onClick={
          onOpen
        }
        style={
          fixButtonStyle
        }
      >
        <RotateCcw
          size={18}
        />

        Исправить и сдать снова
      </button>
    )
  }


  return (
    <button
      type="button"
      onClick={
        onOpen
      }
      style={
        overdue
          ? overdueButtonStyle
          : primaryActionStyle
      }
    >
      <Send
        size={18}
      />

      {overdue
        ? 'Сдать просроченную работу'
        : 'Сдать работу'}
    </button>
  )
}


/* =========================================================
   SUBMISSION MODAL
========================================================= */

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
          modalCardStyle
        }
      >

        <button
          type="button"
          onClick={
            onClose
          }
          style={
            modalCloseStyle
          }
        >
          <X
            size={20}
          />
        </button>


        <div
          style={
            modalIconStyle
          }
        >
          <Send
            size={24}
          />
        </div>


        <p
          style={
            headerEyebrowStyle
          }
        >
          {task.subject}
        </p>


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
            modalTaskTitleStyle
          }
        >
          {task.title}
        </p>


        {taskData.lesson && (
          <div
            style={
              modalLessonStyle
            }
          >
            <BookOpen
              size={16}
            />

            <span>
              {formatFullDate(
                taskData.lesson
                  .date,
              )}

              {taskData.lesson
                .topic
                ? ` · ${taskData.lesson.topic}`
                : ''}
            </span>
          </div>
        )}


        {taskData.teacherComment && (
          <div
            style={
              modalTeacherCommentStyle
            }
          >
            <strong>
              Что нужно исправить
            </strong>

            <p>
              {
                taskData
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

              <span
                style={{
                  ...methodIconStyle,

                  background:
                    '#eff6ff',

                  color:
                    '#2563eb',
                }}
              >
                <NotebookText
                  size={27}
                />
              </span>


              <span
                style={
                  methodTextStyle
                }
              >
                <strong>
                  Сдам тетрадь учителю
                </strong>

                <small>
                  Учитель проверит обычную тетрадь на уроке
                </small>
              </span>

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

              <span
                style={{
                  ...methodIconStyle,

                  background:
                    '#ecfdf5',

                  color:
                    '#047857',
                }}
              >
                <Camera
                  size={27}
                />
              </span>


              <span
                style={
                  methodTextStyle
                }
              >
                <strong>
                  Отправить онлайн
                </strong>

                <small>
                  Прикрепите фото тетради или PDF
                </small>
              </span>

            </button>

          </div>
        )}


        {submissionType ===
          'notebook' && (
          <div>

            <div
              style={
                notebookConfirmStyle
              }
            >
              <NotebookText
                size={30}
              />

              <div>
                <strong>
                  Тетрадь проверит учитель
                </strong>

                <p>
                  Учитель увидит отметку
                  «Проверить тетрадь» и подтвердит
                  выполнение после проверки.
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
                primaryActionStyle
              }
            >
              <Check
                size={18}
              />

              {submitting
                ? 'Отправляем...'
                : 'Подтвердить сдачу тетради'}
            </button>


            <button
              type="button"
              disabled={
                submitting
              }
              onClick={() =>
                setSubmissionType(
                  '',
                )
              }
              style={
                cancelButtonStyle
              }
            >
              Назад
            </button>

          </div>
        )}


        {submissionType ===
          'online' && (
          <form
            onSubmit={
              onOnlineSubmit
            }
          >

            <div
              style={
                onlineNoticeStyle
              }
            >
              <Camera
                size={20}
              />

              <span>
                Прикрепите фото выполненной работы.
                На телефоне можно выбрать снимок
                из галереи или открыть камеру.
              </span>
            </div>


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
                  attachmentSelectStyle
                }
              >
                <span
                  style={
                    attachmentSelectIconStyle
                  }
                >
                  <Camera
                    size={27}
                  />
                </span>


                <span
                  style={
                    attachmentSelectTextStyle
                  }
                >
                  <strong>
                    Добавить фото или файл
                  </strong>

                  <small>
                    JPG, PNG, WEBP или PDF · до 10 МБ
                  </small>
                </span>


                <Upload
                  size={20}
                />
              </button>
            ) : (
              <div
                style={
                  selectedAttachmentStyle
                }
              >

                {attachmentPreview ? (
                  <img
                    src={
                      attachmentPreview
                    }
                    alt="Предпросмотр работы"
                    style={
                      attachmentPreviewStyle
                    }
                  />
                ) : (
                  <div
                    style={
                      pdfPreviewStyle
                    }
                  >
                    <FileText
                      size={35}
                    />

                    PDF
                  </div>
                )}


                <div
                  style={{
                    minWidth:
                      0,

                    flex:
                      1,
                  }}
                >
                  <small
                    style={
                      attachmentReadyStyle
                    }
                  >
                    ✓ Готово к отправке
                  </small>

                  <strong
                    style={
                      selectedFileNameStyle
                    }
                  >
                    {
                      attachmentFile.name
                    }
                  </strong>

                  <small
                    style={
                      fileSizeStyle
                    }
                  >
                    {formatFileSize(
                      attachmentFile.size,
                    )}
                  </small>
                </div>


                <button
                  type="button"
                  onClick={
                    onRemoveAttachment
                  }
                  style={
                    removeAttachmentStyle
                  }
                  title="Удалить файл"
                >
                  <X
                    size={18}
                  />
                </button>

              </div>
            )}


            <div
              style={
                photoHelpStyle
              }
            >
              <Sparkles
                size={17}
              />

              <span>
                Сфотографируйте страницу так,
                чтобы текст и решение были хорошо видны.
              </span>
            </div>


            <label
              style={
                reportLabelStyle
              }
            >
              <span>
                Пояснение
                <small
                  style={{
                    marginLeft:
                      6,

                    color:
                      '#94a3b8',

                    fontWeight:
                      500,
                  }}
                >
                  необязательно
                </small>
              </span>


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
                placeholder="Например: выполнил упражнения 1–5."
                style={
                  reportTextareaStyle
                }
              />
            </label>


            <button
              type="submit"
              disabled={
                submitting
              }
              style={{
                ...primaryActionStyle,

                opacity:
                  submitting
                    ? 0.7
                    : 1,
              }}
            >
              <Send
                size={18}
              />

              {submitting
                ? 'Загружаем работу...'
                : 'Отправить учителю'}
            </button>


            <button
              type="button"
              disabled={
                submitting
              }
              onClick={() =>
                setSubmissionType(
                  '',
                )
              }
              style={
                cancelButtonStyle
              }
            >
              Назад
            </button>

          </form>
        )}

      </div>

    </div>
  )
}


/* =========================================================
   TEACHER
========================================================= */

function TeacherHeader() {
  return (
    <section className="eb-task-header">

      <div>
        <p className="eb-task-eyebrow">
          Кабинет учителя
        </p>

        <h1>
          Управление
          <br />
          заданиями
        </h1>

        <p className="eb-task-subtitle">
          Создавайте задания и
          проверяйте работы учеников
        </p>
      </div>


      <div className="eb-task-header-art">
        <GraduationCap
          size={58}
        />
      </div>

    </section>
  )
}


function TeacherTaskCreator({
  form,
  onChange,
  onSubmit,
}) {
  const [
    isOpen,
    setIsOpen,
  ] =
    useState(false)


  return (
    <section className="eb-task-teacher-section">

      <button
        type="button"
        className="eb-task-create-toggle"
        onClick={() =>
          setIsOpen(
            (old) =>
              !old,
          )
        }
      >

        <span>
          <Plus
            size={20}
          />

          Создать задание
        </span>


        <ChevronDown
          size={20}
          className={
            isOpen
              ? 'eb-task-chevron-open'
              : ''
          }
        />

      </button>


      {isOpen && (
        <form
          className="eb-task-create-form"
          onSubmit={
            onSubmit
          }
        >

          <label>
            <span>
              Название
            </span>

            <input
              name="title"
              value={
                form.title
              }
              onChange={
                onChange
              }
              placeholder="Например: Квадратные уравнения"
              required
            />
          </label>


          <div className="eb-task-form-grid">

            <label>
              <span>
                Предмет
              </span>

              <select
                name="subject"
                value={
                  form.subject
                }
                onChange={
                  onChange
                }
                required
              >
                <option value="">
                  Выберите предмет
                </option>

                <option value="Математика">
                  Математика
                </option>

                <option value="Английский язык">
                  Английский язык
                </option>

                <option value="Информатика">
                  Информатика
                </option>

                <option value="Кыргызский язык">
                  Кыргызский язык
                </option>

                <option value="Русский язык">
                  Русский язык
                </option>

                <option value="История">
                  История
                </option>

                <option value="Физика">
                  Физика
                </option>

                <option value="Химия">
                  Химия
                </option>

                <option value="Биология">
                  Биология
                </option>

                <option value="География">
                  География
                </option>

                <option value="Другое">
                  Другое
                </option>
              </select>
            </label>


            <label>
              <span>
                Класс
              </span>

              <select
                name="className"
                value={
                  form.className
                }
                onChange={
                  onChange
                }
              >
                {[6, 7, 8, 9, 10, 11].map(
                  (grade) => (
                    <option
                      key={
                        grade
                      }
                      value={`${grade} класс`}
                    >
                      {grade} класс
                    </option>
                  ),
                )}
              </select>
            </label>


            <label>
              <span>
                Срок сдачи
              </span>

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
              />
            </label>


            <label>
              <span>
                Баллы
              </span>

              <input
                type="number"
                name="reward"
                value={
                  form.reward
                }
                onChange={
                  onChange
                }
                min="0"
                max="1000"
                required
              />
            </label>

          </div>


          <label>
            <span>
              Описание задания
            </span>

            <textarea
              name="description"
              value={
                form.description
              }
              onChange={
                onChange
              }
              placeholder="Что должен выполнить ученик?"
              required
            />
          </label>


          <label className="eb-task-streak-check">

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

            <span>
              Влияет на серию
            </span>

          </label>


          <button
            type="submit"
            className="eb-task-main-button"
          >
            <Plus
              size={18}
            />

            Создать задание
          </button>

        </form>
      )}

    </section>
  )
}


function TeacherTasks({
  tasks,
  onDelete,
}) {
  return (
    <section className="eb-task-teacher-section">

      <SectionTitle
        title="Созданные задания"
        count={
          tasks.length
        }
      />


      {tasks.length ===
      0 ? (
        <SimpleEmpty
          text="Вы пока не создали ни одного задания."
        />
      ) : (
        <div className="eb-task-teacher-list">

          {tasks.map(
            (task) => (
              <article
                key={
                  task.id
                }
                className="eb-task-teacher-card"
              >

                <SubjectIcon
                  subject={
                    task.subject
                  }
                />


                <div className="eb-task-teacher-card-main">

                  <span>
                    {task.subject}
                  </span>

                  <h3>
                    {task.title}
                  </h3>

                  <p>
                    {task.description}
                  </p>


                  <div className="eb-task-teacher-meta">

                    <span>
                      <GraduationCap
                        size={15}
                      />

                      {task.className}
                    </span>


                    <span>
                      <CalendarDays
                        size={15}
                      />

                      {formatTaskDate(
                        task.deadline,
                      )}
                    </span>


                    <span>
                      <Award
                        size={15}
                      />

                      {task.reward}
                    </span>

                  </div>

                </div>


                <button
                  type="button"
                  className="eb-task-delete"
                  onClick={() =>
                    onDelete(
                      task.id,
                    )
                  }
                >
                  <Trash2
                    size={18}
                  />
                </button>

              </article>
            ),
          )}

        </div>
      )}

    </section>
  )
}


function TeacherSubmissions({
  submissions,
  comments,
  openingAttachmentId,
  onCommentChange,
  onOpenAttachment,
  onApprove,
  onReject,
}) {
  const pendingCount =
    submissions.filter(
      (submission) =>
        submission.status ===
        'pending',
    ).length


  return (
    <section className="eb-task-teacher-section">

      <SectionTitle
        title="Работы учеников"
        count={
          pendingCount
        }
      />


      {submissions.length ===
      0 ? (
        <SimpleEmpty
          text="Отправленные работы учеников появятся здесь."
        />
      ) : (
        <div className="eb-task-teacher-list">

          {submissions.map(
            (
              submission,
            ) => (
              <article
                key={
                  submission.id
                }
                className="eb-task-submission-card"
              >

                <div className="eb-task-submission-top">

                  <div className="eb-task-avatar">
                    {(
                      submission.studentName ||
                      'У'
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>


                  <div>
                    <span>
                      {submission.className}
                    </span>

                    <h3>
                      {submission.taskTitle}
                    </h3>

                    <p>
                      <UserRound
                        size={14}
                      />

                      {submission.studentName}
                    </p>
                  </div>


                  <TaskStatus
                    status={
                      submission.status
                    }
                  />

                </div>


                <div
                  style={
                    teacherMethodStyle
                  }
                >
                  {submission.submissionType ===
                  'notebook' ? (
                    <NotebookText
                      size={19}
                    />
                  ) : (
                    <Wifi
                      size={19}
                    />
                  )}


                  <div
                    style={
                      stackedTextStyle
                    }
                  >
                    <small
                      style={
                        miniLabelStyle
                      }
                    >
                      Способ сдачи
                    </small>

                    <strong>
                      {submission.submissionType ===
                      'notebook'
                        ? 'Проверить тетрадь'
                        : 'Онлайн'}
                    </strong>
                  </div>
                </div>


                {submission.submissionType ===
                'notebook' ? (
                  <div
                    style={
                      notebookTeacherNoticeStyle
                    }
                  >
                    <NotebookText
                      size={20}
                    />

                    <span>
                      Ученик сообщил, что выполнил
                      работу в тетради. Проверьте
                      тетрадь перед подтверждением.
                    </span>
                  </div>
                ) : (
                  <>
                    {submission.hasAttachment ? (
                      <div
                        style={
                          teacherAttachmentStyle
                        }
                      >

                        <div
                          style={
                            teacherAttachmentIconStyle
                          }
                        >
                          {submission
                            .attachmentType ===
                          'application/pdf' ? (
                            <FileText
                              size={24}
                            />
                          ) : (
                            <Image
                              size={24}
                            />
                          )}
                        </div>


                        <div
                          style={{
                            minWidth:
                              0,

                            flex:
                              1,
                          }}
                        >
                          <small
                            style={
                              miniLabelStyle
                            }
                          >
                            Работа ученика
                          </small>

                          <strong
                            style={
                              teacherAttachmentNameStyle
                            }
                          >
                            {submission
                              .attachmentName ||
                              'Вложение'}
                          </strong>
                        </div>


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
                            openAttachmentButtonStyle
                          }
                        >
                          <ExternalLink
                            size={17}
                          />

                          {openingAttachmentId ===
                          submission.id
                            ? 'Открываем...'
                            : 'Открыть'}
                        </button>

                      </div>
                    ) : (
                      <div
                        style={
                          noAttachmentStyle
                        }
                      >
                        <AlertTriangle
                          size={18}
                        />

                        Файл не прикреплён
                      </div>
                    )}


                    {submission.reportText && (
                      <div className="eb-task-report">

                        <div>
                          <FileText
                            size={16}
                          />

                          Пояснение ученика
                        </div>

                        <p>
                          {
                            submission.reportText
                          }
                        </p>

                      </div>
                    )}
                  </>
                )}


                {submission.teacherComment && (
                  <div className="eb-task-comment">

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


                {submission.status ===
                  'pending' && (
                  <div className="eb-task-review">

                    <textarea
                      value={
                        comments[
                          submission.id
                        ] ||
                        ''
                      }
                      onChange={
                        (
                          event,
                        ) =>
                          onCommentChange(
                            submission.id,
                            event.target.value,
                          )
                      }
                      placeholder={
                        submission.submissionType ===
                        'notebook'
                          ? 'Комментарий после проверки тетради'
                          : 'Комментарий ученику'
                      }
                    />


                    <div>

                      <button
                        type="button"
                        className="eb-task-approve"
                        onClick={() =>
                          onApprove(
                            submission,
                          )
                        }
                      >
                        <Check
                          size={17}
                        />

                        Принять
                      </button>


                      <button
                        type="button"
                        className="eb-task-reject"
                        onClick={() =>
                          onReject(
                            submission,
                          )
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

              </article>
            ),
          )}

        </div>
      )}

    </section>
  )
}


/* =========================================================
   COMMON
========================================================= */

function TaskStatus({
  status,
  overdue = false,
}) {
  if (
    overdue
  ) {
    return (
      <span
        style={
          statusStyle(
            'overdue',
          )
        }
      >
        Просрочено
      </span>
    )
  }


  const labels = {
    new:
      'К выполнению',

    pending:
      'На проверке',

    approved:
      'Выполнено',

    rejected:
      'Исправить',
  }


  return (
    <span
      style={
        statusStyle(
          status,
        )
      }
    >
      {labels[
        status
      ] ||
        'К выполнению'}
    </span>
  )
}


function SubjectIcon({
  subject,
}) {
  const value =
    String(
      subject ||
        '',
    ).toLowerCase()


  let Icon =
    BookOpen

  let background =
    '#eff6ff'

  let color =
    '#2563eb'


  if (
    value.includes(
      'математ',
    ) ||
    value.includes(
      'физик',
    )
  ) {
    Icon =
      GraduationCap
  } else if (
    value.includes(
      'рус',
    ) ||
    value.includes(
      'кыргыз',
    ) ||
    value.includes(
      'англий',
    )
  ) {
    background =
      '#ecfdf5'

    color =
      '#059669'
  } else if (
    value.includes(
      'информат',
    )
  ) {
    Icon =
      FileText

    background =
      '#f5f3ff'

    color =
      '#7c3aed'
  }


  return (
    <div
      style={{
        ...subjectIconStyle,

        background,

        color,
      }}
    >
      <Icon
        size={22}
      />
    </div>
  )
}


function SectionTitle({
  title,
  count,
}) {
  return (
    <div className="eb-task-section-title">

      <h2>
        {title}
      </h2>

      <span>
        {count}
      </span>

    </div>
  )
}


function SimpleEmpty({
  text,
}) {
  return (
    <div className="eb-task-empty">

      <BookOpen
        size={29}
      />

      <p>
        {text}
      </p>

    </div>
  )
}


function TaskEmptyState({
  icon: Icon,
  title,
  text,
}) {
  return (
    <section
      style={
        emptyStateStyle
      }
    >

      <div
        style={
          emptyIconStyle
        }
      >
        <Icon
          size={28}
        />
      </div>


      <h3>
        {title}
      </h3>


      <p>
        {text}
      </p>

    </section>
  )
}


function ParentTasksView() {
  return (
    <div className="eb-task-page">

      <section className="eb-task-header">

        <div>

          <p className="eb-task-eyebrow">
            Родительский кабинет
          </p>

          <h1>
            Задания
            <br />
            ребёнка
          </h1>

          <p className="eb-task-subtitle">
            Следите за выполнением домашних работ
          </p>

        </div>


        <div className="eb-task-header-art">
          <UserRound
            size={55}
          />
        </div>

      </section>


      <div className="eb-task-empty">

        <UserRound
          size={31}
        />

        <h3>
          Раздел готовится
        </h3>

        <p>
          Задания ребёнка доступны через дневник
          и карточку урока.
        </p>

      </div>

    </div>
  )
}


/* =========================================================
   HELPERS
========================================================= */

function isTaskOverdue(
  task,
  status,
) {
  if (
    status ===
      'approved' ||
    status ===
      'pending'
  ) {
    return false
  }


  if (
    !task?.deadline
  ) {
    return false
  }


  const deadline =
    parseDeadline(
      task.deadline,
    )


  if (
    !deadline
  ) {
    return false
  }


  return (
    deadline.getTime() <
    Date.now()
  )
}


function parseDeadline(
  value,
) {
  if (
    !value
  ) {
    return null
  }


  const raw =
    String(
      value,
    )


  const date =
    raw.length <=
    10
      ? new Date(
          `${raw.slice(0, 10)}T23:59:59`,
        )
      : new Date(
          raw,
        )


  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null
  }


  return date
}


function compareStudentTasks(
  first,
  second,
) {
  const firstDone =
    first.data.status ===
    'approved'

  const secondDone =
    second.data.status ===
    'approved'


  if (
    firstDone !==
    secondDone
  ) {
    return firstDone
      ? 1
      : -1
  }


  if (
    first.data.overdue !==
    second.data.overdue
  ) {
    return first.data.overdue
      ? -1
      : 1
  }


  const firstDeadline =
    parseDeadline(
      first.deadline,
    )

  const secondDeadline =
    parseDeadline(
      second.deadline,
    )


  if (
    firstDeadline &&
    secondDeadline
  ) {
    return (
      firstDeadline.getTime() -
      secondDeadline.getTime()
    )
  }


  if (
    firstDeadline
  ) {
    return -1
  }


  if (
    secondDeadline
  ) {
    return 1
  }


  return 0
}


function getTaskProgress(
  status,
) {
  const values = {
    new:
      0,

    rejected:
      40,

    pending:
      75,

    approved:
      100,
  }


  return (
    values[
      status
    ] ??
    0
  )
}


function getFilterEmptyText(
  filter,
) {
  const values = {
    all:
      'Учитель пока не добавил заданий.',

    todo:
      'Все текущие задания уже отправлены или выполнены.',

    pending:
      'Сейчас нет работ на проверке.',

    approved:
      'Пока нет принятых учителем работ.',

    overdue:
      'Отлично — просроченных заданий нет.',
  }


  return (
    values[
      filter
    ] ||
    'Заданий нет.'
  )
}


function formatTaskDate(
  value,
) {
  if (
    !value
  ) {
    return 'Не указано'
  }


  const date =
    parseDeadline(
      value,
    )


  if (
    !date
  ) {
    return value
  }


  return date.toLocaleDateString(
    'ru-RU',
    {
      day:
        'numeric',

      month:
        'short',
    },
  )
}


function formatFullDeadline(
  value,
) {
  const date =
    parseDeadline(
      value,
    )


  if (
    !date
  ) {
    return 'Не указан'
  }


  const hasTime =
    String(
      value,
    ).length >
    10


  return date.toLocaleString(
    'ru-RU',
    hasTime
      ? {
          day:
            '2-digit',

          month:
            'short',

          hour:
            '2-digit',

          minute:
            '2-digit',
        }
      : {
          day:
            '2-digit',

          month:
            'long',

          year:
            'numeric',
        },
  )
}


function formatFullDate(
  value,
) {
  if (
    !value
  ) {
    return 'Дата не указана'
  }


  const date =
    new Date(
      `${value}T12:00:00`,
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
        'long',

      year:
        'numeric',
    },
  )
}


function formatFileSize(
  bytes,
) {
  const size =
    Number(
      bytes ||
        0,
    )


  if (
    size <
    1024
  ) {
    return `${size} Б`
  }


  if (
    size <
    1024 * 1024
  ) {
    return `${(
      size /
      1024
    ).toFixed(
      1,
    )} КБ`
  }


  return `${(
    size /
    1024 /
    1024
  ).toFixed(
    1,
  )} МБ`
}


/* =========================================================
   STYLES
========================================================= */

const studentHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 18,
  padding: '20px 22px',
  border: '1px solid #dbeafe',
  borderRadius: 20,
  background:
    'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
}


const headerEyebrowStyle = {
  margin: 0,
  color: '#2563eb',
  fontSize: 11,
  fontWeight: 900,
  textTransform: 'uppercase',
}


const headerTitleStyle = {
  margin: '5px 0 0',
  color: '#082451',
  fontSize: 30,
}


const headerSubtitleStyle = {
  margin: '7px 0 0',
  color: '#64748b',
  lineHeight: 1.5,
}


const reloadButtonStyle = {
  width: 44,
  height: 44,
  flex: '0 0 44px',
  display: 'grid',
  placeItems: 'center',
  border: '1px solid #bfdbfe',
  borderRadius: 13,
  background: '#ffffff',
  color: '#2563eb',
  cursor: 'pointer',
}


const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 10,
  marginBottom: 16,
}


const statCardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  padding: 13,
  border: '1px solid #e2e8f0',
  borderRadius: 15,
  background: '#ffffff',
}


const statIconStyle = {
  width: 42,
  height: 42,
  flex: '0 0 42px',
  display: 'grid',
  placeItems: 'center',
  borderRadius: 12,
}


const statValueStyle = {
  display: 'block',
  color: '#082451',
  fontSize: 21,
}


const statLabelStyle = {
  display: 'block',
  marginTop: 1,
  color: '#64748b',
  fontSize: 11,
}


const filtersStyle = {
  display: 'flex',
  gap: 8,
  marginBottom: 16,
  overflowX: 'auto',
  paddingBottom: 3,
}


function filterButtonStyle(
  active,
) {
  return {
    minHeight: 40,
    flex: '0 0 auto',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '0 12px',
    border:
      active
        ? '1px solid #2563eb'
        : '1px solid #dbe4f0',
    borderRadius: 11,
    background:
      active
        ? '#2563eb'
        : '#ffffff',
    color:
      active
        ? '#ffffff'
        : '#475569',
    fontWeight: 800,
    fontSize: 12,
    cursor: 'pointer',
  }
}


function filterCountStyle(
  active,
) {
  return {
    minWidth: 22,
    height: 22,
    padding: '0 6px',
    display: 'inline-grid',
    placeItems: 'center',
    borderRadius: 7,
    background:
      active
        ? 'rgba(255,255,255,0.18)'
        : '#f1f5f9',
    fontSize: 10,
  }
}


const taskListStyle = {
  display: 'grid',
  gap: 13,
}


function taskCardStyle(
  overdue,
) {
  return {
    padding: 17,
    border:
      overdue
        ? '1px solid #fecaca'
        : '1px solid #dbe4f0',
    borderRadius: 18,
    background: '#ffffff',
    boxShadow:
      '0 4px 16px rgba(15, 23, 42, 0.04)',
  }
}


const taskCardHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
}


const subjectIconStyle = {
  width: 46,
  height: 46,
  flex: '0 0 46px',
  display: 'grid',
  placeItems: 'center',
  borderRadius: 13,
}


const taskTitleRowStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 10,
  flexWrap: 'wrap',
}


const subjectLabelStyle = {
  color: '#64748b',
  fontSize: 10,
  fontWeight: 900,
  textTransform: 'uppercase',
}


const taskTitleStyle = {
  margin: '3px 0 0',
  color: '#082451',
  fontSize: 18,
}


const taskDescriptionStyle = {
  margin: '7px 0 0',
  color: '#475569',
  lineHeight: 1.55,
  fontSize: 13,
}


const lessonInfoStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  marginTop: 13,
  padding: '10px 12px',
  border: '1px solid #dbeafe',
  borderRadius: 11,
  background: '#f8fbff',
  color: '#2563eb',
}


const lessonValueStyle = {
  display: 'block',
  color: '#2563eb',
  lineHeight: 1.35,
  wordBreak: 'break-word',
}


const stackedTextStyle = {
  display: 'grid',
  gap: 3,
  minWidth: 0,
  flex: 1,
}


const miniLabelStyle = {
  display: 'block',
  color: '#64748b',
  fontSize: 11,
  lineHeight: 1.2,
}


const taskMetaGridStyle = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(145px, 1fr))',
  gap: 8,
  marginTop: 13,
}


const metaItemStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 9,
  minWidth: 0,
  padding: '11px 12px',
  borderRadius: 11,
  background: '#f8fafc',
}


const submittedMethodStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  marginTop: 10,
  padding: '10px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 11,
  background: '#ffffff',
  color: '#475569',
}


const attachedStudentStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  marginTop: 8,
  padding: '10px 12px',
  border: '1px solid #bbf7d0',
  borderRadius: 11,
  background: '#f0fdf4',
  color: '#047857',
}


const fileNameStyle = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}


const progressBoxStyle = {
  marginTop: 13,
}


const progressHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 6,
  color: '#64748b',
  fontSize: 11,
}


const progressTrackStyle = {
  height: 7,
  overflow: 'hidden',
  borderRadius: 999,
  background: '#e2e8f0',
}


const progressBarStyle = {
  display: 'block',
  height: '100%',
  borderRadius: 999,
  background: '#2563eb',
}


const reportBoxStyle = {
  marginTop: 13,
  padding: 12,
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  background: '#f8fafc',
}


const reportTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  color: '#475569',
  fontSize: 11,
  fontWeight: 800,
}


const reportTextStyle = {
  margin: '7px 0 0',
  color: '#0f274d',
  lineHeight: 1.5,
}


const teacherCommentStyle = {
  marginTop: 11,
  padding: 12,
  border: '1px solid #fed7aa',
  borderRadius: 12,
  background: '#fff7ed',
  color: '#9a3412',
}


const successActionStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  marginTop: 14,
  minHeight: 44,
  borderRadius: 12,
  background: '#ecfdf5',
  color: '#047857',
  fontWeight: 800,
}


const pendingActionStyle = {
  ...successActionStyle,
  background: '#fff7ed',
  color: '#c2410c',
}


const primaryActionStyle = {
  width: '100%',
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  marginTop: 14,
  padding: '0 15px',
  border: 'none',
  borderRadius: 12,
  background: '#2563eb',
  color: '#ffffff',
  fontWeight: 800,
  cursor: 'pointer',
}


const fixButtonStyle = {
  ...primaryActionStyle,
  background: '#ea580c',
}


const overdueButtonStyle = {
  ...primaryActionStyle,
  background: '#dc2626',
}


function statusStyle(
  status,
) {
  const values = {
    new: {
      background: '#eff6ff',
      color: '#1d4ed8',
    },

    pending: {
      background: '#fff7ed',
      color: '#c2410c',
    },

    approved: {
      background: '#ecfdf5',
      color: '#047857',
    },

    rejected: {
      background: '#fff7ed',
      color: '#c2410c',
    },

    overdue: {
      background: '#fef2f2',
      color: '#b91c1c',
    },
  }


  return {
    padding: '6px 9px',
    borderRadius: 9,
    fontSize: 10,
    fontWeight: 900,
    whiteSpace: 'nowrap',
    ...(
      values[
        status
      ] ||
      values.new
    ),
  }
}


const emptyStateStyle = {
  minHeight: 190,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: 25,
  border: '1px solid #e2e8f0',
  borderRadius: 18,
  background: '#ffffff',
  color: '#64748b',
  textAlign: 'center',
}


const emptyIconStyle = {
  width: 52,
  height: 52,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 15,
  background: '#eff6ff',
  color: '#2563eb',
}


/* MODAL */

const modalBackdropStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 1400,
  display: 'grid',
  placeItems: 'center',
  padding: 18,
  background:
    'rgba(15, 23, 42, 0.5)',
}


const modalCardStyle = {
  position: 'relative',
  width: 'min(540px, 100%)',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: 22,
  borderRadius: 21,
  background: '#ffffff',
  boxShadow:
    '0 25px 90px rgba(15, 23, 42, 0.28)',
}


const modalCloseStyle = {
  position: 'absolute',
  top: 14,
  right: 14,
  width: 38,
  height: 38,
  display: 'grid',
  placeItems: 'center',
  border: '1px solid #e2e8f0',
  borderRadius: 11,
  background: '#ffffff',
  color: '#475569',
  cursor: 'pointer',
}


const modalIconStyle = {
  width: 48,
  height: 48,
  display: 'grid',
  placeItems: 'center',
  marginBottom: 12,
  borderRadius: 14,
  background: '#eff6ff',
  color: '#2563eb',
}


const modalTitleStyle = {
  margin: '4px 0 0',
  color: '#082451',
}


const modalTaskTitleStyle = {
  margin: '6px 0 15px',
  color: '#64748b',
}


const modalLessonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  marginBottom: 13,
  padding: 10,
  borderRadius: 11,
  background: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 12,
}


const modalTeacherCommentStyle = {
  marginBottom: 13,
  padding: 12,
  border: '1px solid #fed7aa',
  borderRadius: 11,
  background: '#fff7ed',
  color: '#9a3412',
}


const methodGridStyle = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 11,
  marginTop: 12,
}


const methodButtonStyle = {
  minHeight: 125,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 14,
  border: '1px solid #dbe4f0',
  borderRadius: 15,
  background: '#ffffff',
  textAlign: 'left',
  cursor: 'pointer',
}


const methodIconStyle = {
  width: 52,
  height: 52,
  flex: '0 0 52px',
  display: 'grid',
  placeItems: 'center',
  borderRadius: 14,
}


const methodTextStyle = {
  display: 'grid',
  gap: 5,
  color: '#0f274d',
}


const notebookConfirmStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  marginTop: 12,
  padding: 14,
  border: '1px solid #bfdbfe',
  borderRadius: 14,
  background: '#eff6ff',
  color: '#1e3a8a',
}


const onlineNoticeStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  marginBottom: 14,
  padding: 11,
  borderRadius: 11,
  background: '#ecfdf5',
  color: '#047857',
  fontSize: 12,
  lineHeight: 1.45,
}


const attachmentSelectStyle = {
  width: '100%',
  minHeight: 88,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 13,
  border:
    '1.5px dashed #93c5fd',
  borderRadius: 14,
  background: '#f8fbff',
  color: '#2563eb',
  textAlign: 'left',
  cursor: 'pointer',
}


const attachmentSelectIconStyle = {
  width: 48,
  height: 48,
  flex: '0 0 48px',
  display: 'grid',
  placeItems: 'center',
  borderRadius: 13,
  background: '#dbeafe',
}


const attachmentSelectTextStyle = {
  display: 'grid',
  gap: 4,
  flex: 1,
  color: '#0f274d',
}


const selectedAttachmentStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 12,
  border:
    '1px solid #bbf7d0',
  borderRadius: 14,
  background: '#f0fdf4',
}


const attachmentPreviewStyle = {
  width: 74,
  height: 74,
  flex: '0 0 74px',
  objectFit: 'cover',
  borderRadius: 11,
  background: '#ffffff',
}


const pdfPreviewStyle = {
  width: 74,
  height: 74,
  flex: '0 0 74px',
  display: 'grid',
  placeItems: 'center',
  borderRadius: 11,
  background: '#ffffff',
  color: '#dc2626',
  fontSize: 11,
  fontWeight: 900,
}


const attachmentReadyStyle = {
  display: 'block',
  marginBottom: 3,
  color: '#047857',
  fontSize: 11,
  fontWeight: 800,
}


const selectedFileNameStyle = {
  display: 'block',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#0f274d',
}


const fileSizeStyle = {
  display: 'block',
  marginTop: 3,
  color: '#64748b',
}


const removeAttachmentStyle = {
  width: 34,
  height: 34,
  flex: '0 0 34px',
  display: 'grid',
  placeItems: 'center',
  border: 'none',
  borderRadius: 10,
  background: '#fee2e2',
  color: '#dc2626',
  cursor: 'pointer',
}


const photoHelpStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 7,
  marginTop: 10,
  marginBottom: 14,
  padding: 9,
  borderRadius: 10,
  background: '#f8fafc',
  color: '#64748b',
  fontSize: 11,
  lineHeight: 1.4,
}


const reportLabelStyle = {
  display: 'grid',
  gap: 7,
  color: '#0f274d',
  fontSize: 12,
  fontWeight: 800,
}


const reportTextareaStyle = {
  width: '100%',
  minHeight: 115,
  resize: 'vertical',
  padding: 12,
  border: '1px solid #cbd5e1',
  borderRadius: 12,
  font: 'inherit',
  fontWeight: 400,
  boxSizing: 'border-box',
}


const cancelButtonStyle = {
  width: '100%',
  minHeight: 42,
  marginTop: 8,
  border: '1px solid #e2e8f0',
  borderRadius: 11,
  background: '#ffffff',
  color: '#475569',
  fontWeight: 700,
  cursor: 'pointer',
}


/* TEACHER ATTACHMENT */

const teacherMethodStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  marginTop: 12,
  padding: '10px 12px',
  border: '1px solid #dbeafe',
  borderRadius: 11,
  background: '#f8fbff',
  color: '#2563eb',
}


const notebookTeacherNoticeStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 9,
  marginTop: 10,
  padding: 12,
  border: '1px solid #bfdbfe',
  borderRadius: 11,
  background: '#eff6ff',
  color: '#1e40af',
  fontSize: 12,
  lineHeight: 1.5,
}


const teacherAttachmentStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  marginTop: 10,
  padding: 12,
  border: '1px solid #bbf7d0',
  borderRadius: 12,
  background: '#f0fdf4',
}


const teacherAttachmentIconStyle = {
  width: 44,
  height: 44,
  flex: '0 0 44px',
  display: 'grid',
  placeItems: 'center',
  borderRadius: 11,
  background: '#ffffff',
  color: '#047857',
}


const teacherAttachmentNameStyle = {
  display: 'block',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#0f274d',
}


const openAttachmentButtonStyle = {
  minHeight: 38,
  flex: '0 0 auto',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '0 11px',
  border: 'none',
  borderRadius: 10,
  background: '#2563eb',
  color: '#ffffff',
  fontWeight: 800,
  fontSize: 12,
  cursor: 'pointer',
}


const noAttachmentStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  marginTop: 10,
  padding: 10,
  borderRadius: 10,
  background: '#fff7ed',
  color: '#c2410c',
  fontSize: 12,
}


export default TasksPage