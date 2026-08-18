import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Save,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  ROLES,
} from '../config/access'

import {
  getSupabaseJournalLessonById,
  updateSupabaseJournalLessonTopic,
} from '../services/supabaseJournalLessonService'

import {
  createSupabaseTask,
  getSupabaseTasksForJournalLesson,
} from '../services/supabaseTaskService'

import {
  ATTENDANCE_STATUSES,
  calculateSupabaseAttendanceStats,
  getSupabaseAttendanceForJournalLesson,
  saveSupabaseJournalLessonAttendance,
} from '../services/supabaseAttendanceService'

import {
  GRADE_TYPES,
  createSupabaseJournalLessonGrade,
  deleteSupabaseGrade,
  getSupabaseGradesForJournalLesson,
  getSupabaseStudentsByClass,
} from '../services/supabaseJournalService'


function SchoolLessonPage() {
  const {
    lessonId,
  } = useParams()

  const {
    user,
  } = useAuth()

  const navigate =
    useNavigate()


  const [
    lesson,
    setLesson,
  ] = useState(null)

  const [
    students,
    setStudents,
  ] = useState([])

  const [
    attendance,
    setAttendance,
  ] = useState([])

  const [
    grades,
    setGrades,
  ] = useState([])

  const [
    tasks,
    setTasks,
  ] = useState([])


  const [
    topic,
    setTopic,
  ] = useState('')


  const [
    homeworkTitle,
    setHomeworkTitle,
  ] = useState('')

  const [
    homeworkDescription,
    setHomeworkDescription,
  ] = useState('')

  const [
    homeworkDeadline,
    setHomeworkDeadline,
  ] = useState('')

  const [
    homeworkReward,
    setHomeworkReward,
  ] = useState(50)

  const [
    homeworkAffectsStreak,
    setHomeworkAffectsStreak,
  ] = useState(true)


  const [
    attendanceDrafts,
    setAttendanceDrafts,
  ] = useState({})


  const [
    gradeDrafts,
    setGradeDrafts,
  ] = useState({})


  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    savingTopic,
    setSavingTopic,
  ] = useState(false)

  const [
    creatingTask,
    setCreatingTask,
  ] = useState(false)

  const [
    savingAttendanceId,
    setSavingAttendanceId,
  ] = useState(null)

  const [
    savingGradeId,
    setSavingGradeId,
  ] = useState(null)

  const [
    deletingGradeId,
    setDeletingGradeId,
  ] = useState(null)


  const [
    message,
    setMessage,
  ] = useState('')

  const [
    error,
    setError,
  ] = useState('')


  const allowedRole =
    [
      ROLES.TEACHER,
      ROLES.VICE_PRINCIPAL,
      ROLES.DIRECTOR,
    ].includes(
      user?.role,
    )


  const canEdit =
    user?.role ===
      ROLES.TEACHER &&
    lesson?.teacherId ===
      user?.id


  useEffect(() => {
    if (
      !user?.id ||
      !lessonId ||
      !allowedRole
    ) {
      return
    }

    void loadPage()
  }, [
    user?.id,
    user?.schoolId,
    user?.school,
    user?.role,
    lessonId,
  ])


  async function loadPage() {
    try {
      setLoading(true)
      setError('')

      const foundLesson =
        await getSupabaseJournalLessonById(
          lessonId,
        )


      if (!foundLesson) {
        throw new Error(
          'Урок не найден.',
        )
      }


      setLesson(
        foundLesson,
      )

      setTopic(
        foundLesson.topic ||
          '',
      )


      const [
        studentsResult,
        attendanceResult,
        gradesResult,
        tasksResult,
      ] =
        await Promise.allSettled([
          getSupabaseStudentsByClass(
            user,
            foundLesson.className,
          ),

          getSupabaseAttendanceForJournalLesson(
            foundLesson.id,
          ),

          getSupabaseGradesForJournalLesson(
            foundLesson.id,
          ),

          getSupabaseTasksForJournalLesson(
            foundLesson.id,
          ),
        ])


      const safeStudents =
        studentsResult.status ===
          'fulfilled' &&
        Array.isArray(
          studentsResult.value,
        )
          ? studentsResult.value
          : []


      const safeAttendance =
        attendanceResult.status ===
          'fulfilled' &&
        Array.isArray(
          attendanceResult.value,
        )
          ? attendanceResult.value
          : []


      const safeGrades =
        gradesResult.status ===
          'fulfilled' &&
        Array.isArray(
          gradesResult.value,
        )
          ? gradesResult.value
          : []


      const safeTasks =
        tasksResult.status ===
          'fulfilled' &&
        Array.isArray(
          tasksResult.value,
        )
          ? tasksResult.value
          : []


      setStudents(
        safeStudents,
      )

      setAttendance(
        safeAttendance,
      )

      setGrades(
        safeGrades,
      )

      setTasks(
        safeTasks,
      )


      initialiseAttendanceDrafts(
        safeStudents,
        safeAttendance,
      )

      initialiseGradeDrafts(
        safeStudents,
      )


      const failed = []


      if (
        studentsResult.status ===
        'rejected'
      ) {
        failed.push(
          'ученики',
        )

        console.error(
          studentsResult.reason,
        )
      }


      if (
        attendanceResult.status ===
        'rejected'
      ) {
        failed.push(
          'посещаемость',
        )

        console.error(
          attendanceResult.reason,
        )
      }


      if (
        gradesResult.status ===
        'rejected'
      ) {
        failed.push(
          'оценки',
        )

        console.error(
          gradesResult.reason,
        )
      }


      if (
        tasksResult.status ===
        'rejected'
      ) {
        failed.push(
          'домашние задания',
        )

        console.error(
          tasksResult.reason,
        )
      }


      if (
        failed.length > 0
      ) {
        setError(
          `Не удалось загрузить часть данных: ${failed.join(
            ', ',
          )}.`,
        )
      }
    } catch (
      loadError
    ) {
      console.error(
        'School lesson:',
        loadError,
      )

      setLesson(null)

      setError(
        loadError?.message ||
          'Не удалось загрузить урок.',
      )
    } finally {
      setLoading(false)
    }
  }


  function initialiseAttendanceDrafts(
    studentRows,
    attendanceRows,
  ) {
    const map = {}


    studentRows.forEach(
      (student) => {
        const existing =
          attendanceRows.find(
            (record) =>
              String(
                record.studentId,
              ) ===
              String(
                student.id,
              ),
          )


        map[
          student.id
        ] = {
          status:
            existing?.status ||
            'present',

          comment:
            existing?.comment ||
            '',
        }
      },
    )


    setAttendanceDrafts(
      map,
    )
  }


  function initialiseGradeDrafts(
    studentRows,
  ) {
    const map = {}


    studentRows.forEach(
      (student) => {
        map[
          student.id
        ] = {
          value:
            '',

          workType:
            'oral',

          comment:
            '',
        }
      },
    )


    setGradeDrafts(
      map,
    )
  }


  const attendanceMap =
    useMemo(() => {
      const map =
        new Map()


      attendance.forEach(
        (record) => {
          map.set(
            String(
              record.studentId,
            ),
            record,
          )
        },
      )


      return map
    }, [
      attendance,
    ])


  const gradesByStudent =
    useMemo(() => {
      const map =
        new Map()


      grades.forEach(
        (grade) => {
          const key =
            String(
              grade.studentId,
            )


          if (
            !map.has(
              key,
            )
          ) {
            map.set(
              key,
              [],
            )
          }


          map
            .get(
              key,
            )
            .push(
              grade,
            )
        },
      )


      return map
    }, [
      grades,
    ])


  const attendanceStats =
    useMemo(
      () =>
        calculateSupabaseAttendanceStats(
          attendance,
        ),
      [
        attendance,
      ],
    )


  const markedStudents =
    attendanceMap.size


  const attendancePercent =
    attendance.length > 0
      ? `${attendanceStats.percent}%`
      : '—'


  async function handleSaveTopic() {
    if (
      !lesson?.id ||
      !canEdit
    ) {
      return
    }


    try {
      setSavingTopic(true)
      clearMessages()


      const updated =
        await updateSupabaseJournalLessonTopic(
          lesson.id,
          topic,
        )


      setLesson(
        updated,
      )


      setTopic(
        updated.topic ||
          '',
      )


      setMessage(
        'Тема урока сохранена.',
      )
    } catch (
      saveError
    ) {
      setError(
        saveError?.message ||
          'Не удалось сохранить тему.',
      )
    } finally {
      setSavingTopic(false)
    }
  }


  function updateAttendanceDraft(
    studentId,
    field,
    value,
  ) {
    setAttendanceDrafts(
      (current) => ({
        ...current,

        [studentId]: {
          ...current[
            studentId
          ],

          [field]:
            value,
        },
      }),
    )
  }


  async function handleSaveAttendance(
    student,
  ) {
    if (
      !canEdit ||
      !lesson
    ) {
      return
    }


    const draft =
      attendanceDrafts[
        student.id
      ] || {
        status:
          'present',

        comment:
          '',
      }


    try {
      setSavingAttendanceId(
        student.id,
      )

      clearMessages()


      const saved =
        await saveSupabaseJournalLessonAttendance({
          teacher:
            user,

          student,

          lesson,

          status:
            draft.status,

          comment:
            draft.comment,
        })


      setAttendance(
        (current) => {
          const exists =
            current.some(
              (record) =>
                String(
                  record.studentId,
                ) ===
                String(
                  student.id,
                ),
            )


          if (
            !exists
          ) {
            return [
              ...current,
              saved,
            ]
          }


          return current.map(
            (record) =>
              String(
                record.studentId,
              ) ===
              String(
                student.id,
              )
                ? saved
                : record,
          )
        },
      )


      setMessage(
        `Посещаемость: ${student.name} сохранена.`,
      )
    } catch (
      saveError
    ) {
      setError(
        saveError?.message ||
          'Не удалось сохранить посещаемость.',
      )
    } finally {
      setSavingAttendanceId(
        null,
      )
    }
  }


  function updateGradeDraft(
    studentId,
    field,
    value,
  ) {
    setGradeDrafts(
      (current) => ({
        ...current,

        [studentId]: {
          ...current[
            studentId
          ],

          [field]:
            value,
        },
      }),
    )
  }


  async function handleCreateGrade(
    student,
  ) {
    if (
      !canEdit ||
      !lesson
    ) {
      return
    }


    const draft =
      gradeDrafts[
        student.id
      ]


    const value =
      Number(
        draft?.value,
      )


    if (
      !Number.isInteger(
        value,
      ) ||
      value < 1 ||
      value > 5
    ) {
      setError(
        'Выберите оценку от 1 до 5.',
      )

      return
    }


    try {
      setSavingGradeId(
        student.id,
      )

      clearMessages()


      const created =
        await createSupabaseJournalLessonGrade({
          teacher:
            user,

          student,

          lesson,

          grade:
            value,

          workType:
            draft?.workType ||
            'oral',

          comment:
            draft?.comment ||
            '',
        })


      setGrades(
        (current) => [
          ...current,
          created,
        ],
      )


      setGradeDrafts(
        (current) => ({
          ...current,

          [student.id]: {
            value:
              '',

            workType:
              current[
                student.id
              ]?.workType ||
              'oral',

            comment:
              '',
          },
        }),
      )


      setMessage(
        `Оценка ${value} выставлена ученику ${student.name}.`,
      )
    } catch (
      saveError
    ) {
      setError(
        saveError?.message ||
          'Не удалось выставить оценку.',
      )
    } finally {
      setSavingGradeId(
        null,
      )
    }
  }


  async function handleDeleteGrade(
    grade,
  ) {
    if (
      !canEdit ||
      !grade?.id
    ) {
      return
    }


    try {
      setDeletingGradeId(
        grade.id,
      )

      clearMessages()


      await deleteSupabaseGrade(
        grade.id,
      )


      setGrades(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              grade.id,
          ),
      )


      setMessage(
        'Оценка удалена.',
      )
    } catch (
      deleteError
    ) {
      setError(
        deleteError?.message ||
          'Не удалось удалить оценку.',
      )
    } finally {
      setDeletingGradeId(
        null,
      )
    }
  }


  async function handleCreateHomework(
    event,
  ) {
    event.preventDefault()


    if (
      !canEdit ||
      !lesson
    ) {
      return
    }


    const title =
      homeworkTitle
        .trim()


    if (
      !title
    ) {
      setError(
        'Введите название домашнего задания.',
      )

      return
    }


    if (
      homeworkReward < 0 ||
      homeworkReward > 1000
    ) {
      setError(
        'Баллы должны быть от 0 до 1000.',
      )

      return
    }


    try {
      setCreatingTask(true)

      clearMessages()


      const created =
        await createSupabaseTask(
          {
            title,

            subject:
              lesson.subject,

            description:
              homeworkDescription,

            className:
              lesson.className,

            deadline:
              homeworkDeadline ||
              null,

            reward:
              Number(
                homeworkReward ||
                  0,
              ),

            affectsStreak:
              Boolean(
                homeworkAffectsStreak,
              ),

            journalLessonId:
              lesson.id,
          },
          user,
        )


      setTasks(
        (current) => [
          created,
          ...current,
        ],
      )


      setHomeworkTitle('')
      setHomeworkDescription('')
      setHomeworkDeadline('')
      setHomeworkReward(50)
      setHomeworkAffectsStreak(
        true,
      )


      setMessage(
        'Домашнее задание добавлено.',
      )
    } catch (
      taskError
    ) {
      setError(
        taskError?.message ||
          'Не удалось создать домашнее задание.',
      )
    } finally {
      setCreatingTask(false)
    }
  }


  function clearMessages() {
    setMessage('')
    setError('')
  }


  if (
    !user
  ) {
    return null
  }


  if (
    !allowedRole
  ) {
    return (
      <PageState
        title="Доступ запрещён"
        text="Карточка школьного урока доступна учителю, завучу и директору."
        onBack={() =>
          navigate('/')
        }
      />
    )
  }


  if (
    loading
  ) {
    return (
      <div className="page-container">

        <section className="content-card">
          Загружаем урок...
        </section>

      </div>
    )
  }


  if (
    !lesson
  ) {
    return (
      <PageState
        title="Урок не найден"
        text={
          error ||
          'Возможно, урок был удалён.'
        }
        onBack={() =>
          navigate(-1)
        }
      />
    )
  }


  return (
    <div className="page-container">

      <button
        type="button"
        onClick={() =>
          navigate(-1)
        }
        style={
          styles.backButton
        }
      >
        <ArrowLeft
          size={18}
        />

        Назад
      </button>


      <header
        style={
          styles.hero
        }
      >

        <div>

          <div
            style={
              styles.heroEyebrow
            }
          >
            <BookOpen
              size={16}
            />

            Школьный урок
          </div>


          <h1
            style={
              styles.heroTitle
            }
          >
            {lesson.subject}
          </h1>


          <p
            style={
              styles.heroSubtitle
            }
          >
            {lesson.className}

            {' · '}

            {formatDate(
              lesson.date,
            )}

            {' · '}

            {lesson.quarter}

            {' четверть'}
          </p>

        </div>


        <div
          style={
            canEdit
              ? styles.editBadge
              : styles.readBadge
          }
        >
          {canEdit
            ? 'Можно редактировать'
            : 'Только просмотр'}
        </div>

      </header>


      {message && (
        <div
          style={
            styles.success
          }
        >
          <CheckCircle2
            size={18}
          />

          {message}
        </div>
      )}


      {error && (
        <div
          className="auth-error"
          style={{
            marginBottom:
              16,
          }}
        >
          {error}
        </div>
      )}


      <div
        style={
          styles.statsGrid
        }
      >

        <InfoCard
          icon={
            Users
          }
          label="Учеников"
          value={
            students.length
          }
        />


        <InfoCard
          icon={
            CheckCircle2
          }
          label="Отмечено"
          value={`${markedStudents} из ${students.length}`}
        />


        <InfoCard
          icon={
            GraduationCap
          }
          label="Оценок"
          value={
            grades.length
          }
        />


        <InfoCard
          icon={
            ClipboardList
          }
          label="Домашних заданий"
          value={
            tasks.length
          }
        />


        <InfoCard
          icon={
            CalendarDays
          }
          label="Посещаемость"
          value={
            attendancePercent
          }
        />

      </div>


      <section
        className="content-card"
        style={
          styles.section
        }
      >

        <SectionHeader
          eyebrow="Журнал"
          title="Тема урока"
          readOnly={
            !canEdit
          }
        />


        {canEdit ? (
          <>
            <textarea
              value={
                topic
              }
              onChange={
                (event) =>
                  setTopic(
                    event.target.value,
                  )
              }
              rows={3}
              placeholder="Например: Линейные уравнения"
              style={
                styles.textarea
              }
            />


            <button
              type="button"
              onClick={
                handleSaveTopic
              }
              disabled={
                savingTopic
              }
              style={
                styles.primaryButton
              }
            >
              <Save
                size={17}
              />

              {savingTopic
                ? 'Сохраняем...'
                : 'Сохранить тему'}
            </button>
          </>
        ) : (
          <div
            style={
              styles.readonlyBox
            }
          >
            {lesson.topic ||
              'Тема урока не заполнена.'}
          </div>
        )}

      </section>


      <section
        className="content-card"
        style={
          styles.section
        }
      >

        <SectionHeader
          eyebrow="Класс"
          title="Ученики, посещаемость и оценки"
          readOnly={
            !canEdit
          }
        />


        {students.length ===
        0 ? (
          <div
            style={
              styles.empty
            }
          >
            В этом классе нет учеников.
          </div>
        ) : (
          <div
            style={
              styles.studentList
            }
          >

            {students.map(
              (student) => {
                const existingAttendance =
                  attendanceMap.get(
                    String(
                      student.id,
                    ),
                  )


                const attendanceDraft =
                  attendanceDrafts[
                    student.id
                  ] || {
                    status:
                      'present',

                    comment:
                      '',
                  }


                const studentGrades =
                  gradesByStudent.get(
                    String(
                      student.id,
                    ),
                  ) ||
                  []


                const gradeDraft =
                  gradeDrafts[
                    student.id
                  ] || {
                    value:
                      '',

                    workType:
                      'oral',

                    comment:
                      '',
                  }


                return (
                  <article
                    key={
                      student.id
                    }
                    style={
                      styles.studentCard
                    }
                  >

                    <div
                      style={
                        styles.studentHeader
                      }
                    >

                      <div
                        style={
                          styles.studentIdentity
                        }
                      >
                        <div
                          style={
                            styles.avatar
                          }
                        >
                          {String(
                            student.name ||
                              'У',
                          )
                            .charAt(
                              0,
                            )
                            .toUpperCase()}
                        </div>


                        <div>
                          <strong
                            style={
                              styles.studentName
                            }
                          >
                            {student.name}
                          </strong>

                          <small
                            style={
                              styles.studentClass
                            }
                          >
                            {lesson.className}
                          </small>
                        </div>
                      </div>


                      <div
                        style={
                          styles.gradePills
                        }
                      >

                        {studentGrades.length ===
                        0 ? (
                          <span
                            style={
                              styles.noGrades
                            }
                          >
                            Нет оценок
                          </span>
                        ) : (
                          studentGrades.map(
                            (grade) => (
                              <div
                                key={
                                  grade.id
                                }
                                style={
                                  styles.gradeItem
                                }
                              >

                                <span
                                  style={
                                    gradeStyle(
                                      grade.value,
                                    )
                                  }
                                  title={
                                    `${grade.gradeType}${
                                      grade.comment
                                        ? ` · ${grade.comment}`
                                        : ''
                                    }`
                                  }
                                >
                                  {grade.value}
                                </span>


                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteGrade(
                                        grade,
                                      )
                                    }
                                    disabled={
                                      deletingGradeId ===
                                      grade.id
                                    }
                                    style={
                                      styles.deleteGradeButton
                                    }
                                    title="Удалить оценку"
                                  >
                                    <Trash2
                                      size={13}
                                    />
                                  </button>
                                )}

                              </div>
                            ),
                          )
                        )}

                      </div>

                    </div>


                    <div
                      style={
                        styles.studentControls
                      }
                    >

                      <div
                        style={
                          styles.controlBlock
                        }
                      >

                        <strong>
                          Посещаемость
                        </strong>


                        {canEdit ? (
                          <>
                            <select
                              value={
                                attendanceDraft.status
                              }
                              onChange={
                                (event) =>
                                  updateAttendanceDraft(
                                    student.id,
                                    'status',
                                    event.target.value,
                                  )
                              }
                            >
                              {ATTENDANCE_STATUSES.map(
                                (status) => (
                                  <option
                                    key={
                                      status.value
                                    }
                                    value={
                                      status.value
                                    }
                                  >
                                    {status.label}
                                  </option>
                                ),
                              )}
                            </select>


                            <input
                              value={
                                attendanceDraft.comment
                              }
                              onChange={
                                (event) =>
                                  updateAttendanceDraft(
                                    student.id,
                                    'comment',
                                    event.target.value,
                                  )
                              }
                              placeholder="Комментарий"
                            />


                            <button
                              type="button"
                              onClick={() =>
                                handleSaveAttendance(
                                  student,
                                )
                              }
                              disabled={
                                savingAttendanceId ===
                                student.id
                              }
                              style={
                                styles.secondaryButton
                              }
                            >
                              {savingAttendanceId ===
                              student.id
                                ? 'Сохраняем...'
                                : existingAttendance
                                  ? 'Обновить'
                                  : 'Отметить'}
                            </button>
                          </>
                        ) : (
                          <AttendanceView
                            record={
                              existingAttendance
                            }
                          />
                        )}

                      </div>


                      <div
                        style={
                          styles.controlBlock
                        }
                      >

                        <strong>
                          Оценка
                        </strong>


                        {canEdit ? (
                          <>
                            <select
                              value={
                                gradeDraft.value
                              }
                              onChange={
                                (event) =>
                                  updateGradeDraft(
                                    student.id,
                                    'value',
                                    event.target.value,
                                  )
                              }
                            >
                              <option value="">
                                Выберите
                              </option>

                              {[5, 4, 3, 2, 1].map(
                                (grade) => (
                                  <option
                                    key={
                                      grade
                                    }
                                    value={
                                      grade
                                    }
                                  >
                                    {grade}
                                  </option>
                                ),
                              )}
                            </select>


                            <select
                              value={
                                gradeDraft.workType
                              }
                              onChange={
                                (event) =>
                                  updateGradeDraft(
                                    student.id,
                                    'workType',
                                    event.target.value,
                                  )
                              }
                            >
                              {GRADE_TYPES.map(
                                (type) => (
                                  <option
                                    key={
                                      type.value
                                    }
                                    value={
                                      type.value
                                    }
                                  >
                                    {type.label}
                                  </option>
                                ),
                              )}
                            </select>


                            <input
                              value={
                                gradeDraft.comment
                              }
                              onChange={
                                (event) =>
                                  updateGradeDraft(
                                    student.id,
                                    'comment',
                                    event.target.value,
                                  )
                              }
                              placeholder="Комментарий к оценке"
                            />


                            <button
                              type="button"
                              onClick={() =>
                                handleCreateGrade(
                                  student,
                                )
                              }
                              disabled={
                                savingGradeId ===
                                student.id
                              }
                              style={
                                styles.primaryButtonSmall
                              }
                            >
                              {savingGradeId ===
                              student.id
                                ? 'Сохраняем...'
                                : 'Поставить оценку'}
                            </button>
                          </>
                        ) : (
                          <div
                            style={
                              styles.readonlyMini
                            }
                          >
                            {studentGrades.length >
                            0
                              ? `${studentGrades.length} оценок`
                              : 'Оценок нет'}
                          </div>
                        )}

                      </div>

                    </div>

                  </article>
                )
              },
            )}

          </div>
        )}

      </section>


      <section
        style={
          styles.summaryGrid
        }
      >

        <MiniStat
          value={
            attendanceStats.present
          }
          label="Присутствовали"
        />

        <MiniStat
          value={
            attendanceStats.absent
          }
          label="Отсутствовали"
        />

        <MiniStat
          value={
            attendanceStats.late
          }
          label="Опоздали"
        />

        <MiniStat
          value={
            attendanceStats.excused
          }
          label="Уважительная"
        />

        <MiniStat
          value={
            attendancePercent
          }
          label="Посещаемость"
        />

      </section>


      <section
        className="content-card"
        style={
          styles.section
        }
      >

        <SectionHeader
          eyebrow="Учебный процесс"
          title="Домашнее задание"
          readOnly={
            !canEdit
          }
        />


        {tasks.length ===
        0 ? (
          <div
            style={
              styles.empty
            }
          >
            Домашнее задание пока не добавлено.
          </div>
        ) : (
          <div
            style={
              styles.taskList
            }
          >

            {tasks.map(
              (task) => (
                <article
                  key={
                    task.id
                  }
                  style={
                    styles.taskCard
                  }
                >

                  <div>
                    <strong>
                      {task.title}
                    </strong>


                    {task.description && (
                      <p
                        style={
                          styles.taskDescription
                        }
                      >
                        {task.description}
                      </p>
                    )}

                  </div>


                  <div
                    style={
                      styles.taskMeta
                    }
                  >

                    <small
                      style={
                        styles.taskDeadline
                      }
                    >
                      {task.deadline
                        ? `Срок: ${formatDateTime(
                            task.deadline,
                          )}`
                        : 'Без срока'}
                    </small>


                    <small
                      style={
                        styles.taskReward
                      }
                    >
                      {`${Number(
                        task.reward ||
                          0,
                      )} баллов`}
                    </small>


                    <small
                      style={
                        task.affectsStreak
                          ? styles.taskStreakOn
                          : styles.taskStreakOff
                      }
                    >
                      {task.affectsStreak
                        ? 'Влияет на серию'
                        : 'Не влияет на серию'}
                    </small>

                  </div>

                </article>
              ),
            )}

          </div>
        )}


        {canEdit && (
          <form
            onSubmit={
              handleCreateHomework
            }
            style={
              styles.homeworkForm
            }
          >

            <h3
              style={{
                margin:
                  0,
              }}
            >
              Добавить домашнее задание
            </h3>


            <label className="form-group">

              <span>
                Название
              </span>


              <input
                value={
                  homeworkTitle
                }
                onChange={
                  (event) =>
                    setHomeworkTitle(
                      event.target.value,
                    )
                }
                placeholder="Например: Решить № 15–20"
                required
              />

            </label>


            <label className="form-group">

              <span>
                Описание
              </span>


              <textarea
                value={
                  homeworkDescription
                }
                onChange={
                  (event) =>
                    setHomeworkDescription(
                      event.target.value,
                    )
                }
                rows={3}
                placeholder="Что нужно выполнить"
                style={
                  styles.textarea
                }
              />

            </label>


            <label className="form-group">

              <span>
                Срок сдачи
              </span>


              <input
                type="datetime-local"
                value={
                  homeworkDeadline
                }
                onChange={
                  (event) =>
                    setHomeworkDeadline(
                      event.target.value,
                    )
                }
              />

            </label>


            <div
              style={
                styles.homeworkOptions
              }
            >

              <label className="form-group">

                <span>
                  Баллы за выполнение
                </span>


                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={
                    homeworkReward
                  }
                  onChange={
                    (event) =>
                      setHomeworkReward(
                        Math.max(
                          0,
                          Number(
                            event.target.value,
                          ) ||
                            0,
                        ),
                      )
                  }
                />

              </label>


              <label
                style={
                  styles.streakToggle
                }
              >

                <input
                  type="checkbox"
                  checked={
                    homeworkAffectsStreak
                  }
                  onChange={
                    (event) =>
                      setHomeworkAffectsStreak(
                        event.target.checked,
                      )
                  }
                />


                <div>

                  <strong>
                    Влияет на серию
                  </strong>

                  <small>
                    Выполненное ДЗ поддерживает серию ученика
                  </small>

                </div>

              </label>

            </div>


            <button
              type="submit"
              disabled={
                creatingTask
              }
              style={
                styles.primaryButton
              }
            >
              <ClipboardList
                size={17}
              />

              {creatingTask
                ? 'Создаём...'
                : 'Добавить задание'}
            </button>

          </form>
        )}

      </section>


      <div
        style={
          styles.footerInfo
        }
      >
        <UserRound
          size={17}
        />

        {canEdit
          ? 'Вы редактируете свой урок.'
          : 'Данные урока доступны только для просмотра.'}
      </div>

    </div>
  )
}


function SectionHeader({
  eyebrow,
  title,
  readOnly,
}) {
  return (
    <div
      style={
        styles.sectionHeader
      }
    >

      <div>

        <p
          style={
            styles.sectionEyebrow
          }
        >
          {eyebrow}
        </p>

        <h2
          style={
            styles.sectionTitle
          }
        >
          {title}
        </h2>

      </div>


      {readOnly && (
        <span
          style={
            styles.readBadge
          }
        >
          Только просмотр
        </span>
      )}

    </div>
  )
}


function InfoCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <article
      style={
        styles.infoCard
      }
    >

      <div
        style={
          styles.infoIcon
        }
      >
        <Icon
          size={21}
        />
      </div>


      <div>

        <strong
          style={
            styles.infoValue
          }
        >
          {value}
        </strong>

        <small
          style={
            styles.infoLabel
          }
        >
          {label}
        </small>

      </div>

    </article>
  )
}


function MiniStat({
  value,
  label,
}) {
  return (
    <article
      style={
        styles.miniStat
      }
    >
      <strong>
        {value}
      </strong>

      <small>
        {label}
      </small>
    </article>
  )
}


function AttendanceView({
  record,
}) {
  if (
    !record
  ) {
    return (
      <span
        style={
          styles.notMarked
        }
      >
        Не отмечен
      </span>
    )
  }


  const item =
    ATTENDANCE_STATUSES.find(
      (status) =>
        status.value ===
        record.status,
    )


  return (
    <div
      style={
        styles.readonlyMini
      }
    >
      <strong>
        {item?.label ||
          record.status}
      </strong>

      {record.comment && (
        <small>
          {record.comment}
        </small>
      )}
    </div>
  )
}


function PageState({
  title,
  text,
  onBack,
}) {
  return (
    <div className="page-container">

      <section className="content-card">

        <h2>
          {title}
        </h2>

        <p>
          {text}
        </p>

        <button
          type="button"
          onClick={
            onBack
          }
          style={
            styles.backButton
          }
        >
          <ArrowLeft
            size={18}
          />

          Назад
        </button>

      </section>

    </div>
  )
}


function formatDate(
  value,
) {
  if (
    !value
  ) {
    return '—'
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
        'numeric',

      month:
        'long',

      year:
        'numeric',
    },
  )
}


function formatDateTime(
  value,
) {
  if (
    !value
  ) {
    return '—'
  }


  const date =
    new Date(
      value,
    )


  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }


  return date.toLocaleString(
    'ru-RU',
    {
      day:
        '2-digit',

      month:
        '2-digit',

      year:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit',
    },
  )
}


function gradeStyle(
  value,
) {
  const grade =
    Number(
      value,
    )


  return {
    minWidth:
      32,

    height:
      32,

    padding:
      '0 8px',

    display:
      'inline-grid',

    placeItems:
      'center',

    borderRadius:
      9,

    background:
      grade >= 5
        ? '#dcfce7'
        : grade >= 4
          ? '#dbeafe'
          : grade >= 3
            ? '#fef3c7'
            : '#fee2e2',

    color:
      '#1e293b',

    fontWeight:
      900,
  }
}


const styles = {
  backButton: {
    display:
      'inline-flex',

    alignItems:
      'center',

    gap:
      7,

    marginBottom:
      14,

    padding:
      '9px 12px',

    border:
      '1px solid #dbe2ea',

    borderRadius:
      10,

    background:
      '#ffffff',

    color:
      '#334155',

    cursor:
      'pointer',
  },


  hero: {
    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'space-between',

    gap:
      18,

    flexWrap:
      'wrap',

    padding:
      22,

    marginBottom:
      18,

    border:
      '1px solid #dbeafe',

    borderRadius:
      20,

    background:
      '#f8fbff',
  },


  heroEyebrow: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      7,

    color:
      '#2563eb',

    fontWeight:
      800,

    fontSize:
      11,

    textTransform:
      'uppercase',
  },


  heroTitle: {
    margin:
      '8px 0 4px',

    color:
      '#0f274d',
  },


  heroSubtitle: {
    margin:
      0,

    color:
      '#64748b',
  },


  editBadge: {
    padding:
      '8px 12px',

    borderRadius:
      10,

    background:
      '#dcfce7',

    color:
      '#166534',

    fontWeight:
      800,

    fontSize:
      12,
  },


  readBadge: {
    padding:
      '8px 12px',

    borderRadius:
      10,

    background:
      '#f1f5f9',

    color:
      '#64748b',

    fontWeight:
      800,

    fontSize:
      12,
  },


  success: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      8,

    padding:
      12,

    marginBottom:
      16,

    borderRadius:
      12,

    background:
      '#dcfce7',

    color:
      '#166534',

    fontWeight:
      700,
  },


  statsGrid: {
    display:
      'grid',

    gridTemplateColumns:
      'repeat(auto-fit, minmax(155px, 1fr))',

    gap:
      12,

    marginBottom:
      18,
  },


  infoCard: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      12,

    padding:
      16,

    border:
      '1px solid #e2e8f0',

    borderRadius:
      16,

    background:
      '#ffffff',
  },


  infoIcon: {
    width:
      42,

    height:
      42,

    display:
      'grid',

    placeItems:
      'center',

    flexShrink:
      0,

    borderRadius:
      12,

    background:
      '#eff6ff',

    color:
      '#2563eb',
  },


  infoValue: {
    display:
      'block',

    color:
      '#0f274d',

    fontSize:
      18,
  },


  infoLabel: {
    display:
      'block',

    marginTop:
      3,

    color:
      '#94a3b8',
  },


  section: {
    marginBottom:
      18,
  },


  sectionHeader: {
    display:
      'flex',

    justifyContent:
      'space-between',

    alignItems:
      'center',

    gap:
      12,

    flexWrap:
      'wrap',

    marginBottom:
      14,
  },


  sectionEyebrow: {
    margin:
      0,

    color:
      '#2563eb',

    fontSize:
      11,

    fontWeight:
      800,

    textTransform:
      'uppercase',
  },


  sectionTitle: {
    margin:
      '4px 0 0',

    color:
      '#0f274d',
  },


  textarea: {
    width:
      '100%',

    boxSizing:
      'border-box',

    resize:
      'vertical',
  },


  primaryButton: {
    display:
      'inline-flex',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap:
      7,

    marginTop:
      12,

    padding:
      '10px 14px',

    border:
      'none',

    borderRadius:
      10,

    background:
      '#2563eb',

    color:
      '#ffffff',

    fontWeight:
      800,

    cursor:
      'pointer',
  },


  primaryButtonSmall: {
    padding:
      '9px 11px',

    border:
      'none',

    borderRadius:
      9,

    background:
      '#2563eb',

    color:
      '#ffffff',

    fontWeight:
      800,

    cursor:
      'pointer',
  },


  secondaryButton: {
    padding:
      '9px 11px',

    border:
      '1px solid #bfdbfe',

    borderRadius:
      9,

    background:
      '#eff6ff',

    color:
      '#1d4ed8',

    fontWeight:
      800,

    cursor:
      'pointer',
  },


  readonlyBox: {
    padding:
      14,

    borderRadius:
      12,

    background:
      '#f8fafc',

    color:
      '#334155',

    lineHeight:
      1.6,
  },


  empty: {
    padding:
      18,

    borderRadius:
      12,

    background:
      '#f8fafc',

    color:
      '#64748b',
  },


  studentList: {
    display:
      'grid',

    gap:
      12,
  },


  studentCard: {
    padding:
      16,

    border:
      '1px solid #e2e8f0',

    borderRadius:
      16,

    background:
      '#ffffff',
  },


  studentHeader: {
    display:
      'flex',

    justifyContent:
      'space-between',

    alignItems:
      'center',

    gap:
      12,

    flexWrap:
      'wrap',

    paddingBottom:
      14,

    borderBottom:
      '1px solid #eef2f7',
  },


  studentIdentity: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      10,
  },


  avatar: {
    width:
      38,

    height:
      38,

    display:
      'grid',

    placeItems:
      'center',

    borderRadius:
      '50%',

    background:
      '#eef5ff',

    color:
      '#2563eb',

    fontWeight:
      900,
  },


  studentName: {
    display:
      'block',

    color:
      '#0f274d',
  },


  studentClass: {
    color:
      '#94a3b8',
  },


  gradePills: {
    display:
      'flex',

    gap:
      6,

    flexWrap:
      'wrap',
  },


  gradeItem: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      2,
  },


  deleteGradeButton: {
    width:
      23,

    height:
      23,

    display:
      'grid',

    placeItems:
      'center',

    padding:
      0,

    border:
      'none',

    borderRadius:
      6,

    background:
      '#fee2e2',

    color:
      '#b91c1c',

    cursor:
      'pointer',
  },


  noGrades: {
    color:
      '#94a3b8',

    fontSize:
      12,
  },


  studentControls: {
    display:
      'grid',

    gridTemplateColumns:
      'repeat(auto-fit, minmax(260px, 1fr))',

    gap:
      16,

    marginTop:
      14,
  },


  controlBlock: {
    display:
      'grid',

    gap:
      9,

    alignContent:
      'start',
  },


  readonlyMini: {
    display:
      'grid',

    gap:
      3,

    padding:
      10,

    borderRadius:
      10,

    background:
      '#f8fafc',

    color:
      '#475569',
  },


  notMarked: {
    display:
      'inline-block',

    padding:
      '8px 10px',

    borderRadius:
      9,

    background:
      '#f1f5f9',

    color:
      '#64748b',

    fontSize:
      12,

    fontWeight:
      700,
  },


  summaryGrid: {
    display:
      'grid',

    gridTemplateColumns:
      'repeat(auto-fit, minmax(125px, 1fr))',

    gap:
      10,

    marginBottom:
      18,
  },


  miniStat: {
    display:
      'grid',

    gap:
      4,

    padding:
      14,

    border:
      '1px solid #e2e8f0',

    borderRadius:
      12,

    background:
      '#ffffff',

    color:
      '#334155',
  },


  taskList: {
    display:
      'grid',

    gap:
      10,
  },


  taskCard: {
    display:
      'flex',

    justifyContent:
      'space-between',

    alignItems:
      'flex-start',

    gap:
      14,

    flexWrap:
      'wrap',

    padding:
      14,

    border:
      '1px solid #e2e8f0',

    borderRadius:
      12,
  },


  taskDescription: {
    margin:
      '6px 0 0',

    color:
      '#64748b',

    lineHeight:
      1.5,
  },


  taskDeadline: {
    color:
      '#64748b',
  },


  homeworkForm: {
    display:
      'grid',

    gap:
      12,

    marginTop:
      20,

    paddingTop:
      20,

    borderTop:
      '1px solid #e2e8f0',
  },


  homeworkOptions: {
    display:
      'grid',

    gridTemplateColumns:
      'repeat(auto-fit, minmax(190px, 1fr))',

    gap:
      12,

    alignItems:
      'end',
  },


  streakToggle: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      10,

    minHeight:
      46,

    padding:
      '10px 12px',

    border:
      '1px solid #dbe2ea',

    borderRadius:
      10,

    background:
      '#f8fafc',

    color:
      '#334155',

    cursor:
      'pointer',
  },


  taskMeta: {
    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'flex-end',

    gap:
      8,

    flexWrap:
      'wrap',
  },


  taskReward: {
    padding:
      '6px 8px',

    borderRadius:
      8,

    background:
      '#eff6ff',

    color:
      '#1d4ed8',

    fontWeight:
      800,
  },


  taskStreakOn: {
    padding:
      '6px 8px',

    borderRadius:
      8,

    background:
      '#fff7ed',

    color:
      '#c2410c',

    fontWeight:
      800,
  },


  taskStreakOff: {
    padding:
      '6px 8px',

    borderRadius:
      8,

    background:
      '#f1f5f9',

    color:
      '#64748b',

    fontWeight:
      700,
  },


  footerInfo: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      7,

    marginTop:
      14,

    padding:
      12,

    color:
      '#64748b',

    fontSize:
      12,
  },
}


export default SchoolLessonPage