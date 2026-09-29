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
  getSupabaseAttendanceForJournalLesson,
  saveSupabaseJournalLessonAttendance,
  updateSupabaseAttendanceRecord,
} from '../services/supabaseAttendanceService'

import {
  createSupabaseJournalLessonGrade,
  deleteSupabaseGrade,
  getSupabaseGradesForJournalLesson,
} from '../services/supabaseJournalService'

import {
  getSupabaseStudentsByClass,
} from '../services/schoolRosterService'


/* =========================================================
   CONSTANTS
========================================================= */

const ATTENDANCE_OPTIONS = [
  {
    value: 'present',
    short: '+',
    label: 'Присутствовал',
  },
  {
    value: 'absent',
    short: '−',
    label: 'Отсутствовал',
  },
  {
    value: 'excused',
    short: 'УВ',
    label: 'Уважительная причина',
  },
  {
    value: 'sick',
    short: 'Б',
    label: 'Болел',
  },
  {
    value: 'late',
    short: 'Оп',
    label: 'Опоздал',
  },
]


const WORK_TYPES = [
  {
    value: 'oral',
    label: 'Устный ответ',
  },
  {
    value: 'homework',
    label: 'Домашняя работа',
  },
  {
    value: 'control',
    label: 'Контрольная работа',
  },
  {
    value: 'test',
    label: 'Тест',
  },
  {
    value: 'independent',
    label: 'Самостоятельная работа',
  },
  {
    value: 'practical',
    label: 'Практическая работа',
  },
  {
    value: 'sor',
    label: 'СОР',
  },
  {
    value: 'soch',
    label: 'СОЧ',
  },
]


const QUICK_GRADES = [
  5,
  4,
  3,
  2,
]


/* =========================================================
   PAGE
========================================================= */

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


  /*
    ВАЖНО:
    никакого автоматического oral.
  */

  const [
    selectedWorkType,
    setSelectedWorkType,
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
    loading,
    setLoading,
  ] = useState(true)

  const [
    savingTopic,
    setSavingTopic,
  ] = useState(false)

  const [
    savingStudentId,
    setSavingStudentId,
  ] = useState('')

  const [
    deletingGradeId,
    setDeletingGradeId,
  ] = useState('')

  const [
    creatingTask,
    setCreatingTask,
  ] = useState(false)


  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
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
    String(
      lesson?.teacherId ||
        '',
    ) ===
      String(
        user?.id ||
          '',
      )


  /* =======================================================
     LOAD
  ======================================================= */

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
        studentResult,
        attendanceResult,
        gradeResult,
        taskResult,
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


      setStudents(
        studentResult.status ===
          'fulfilled' &&
        Array.isArray(
          studentResult.value,
        )
          ? studentResult.value
          : [],
      )


      setAttendance(
        attendanceResult.status ===
          'fulfilled' &&
        Array.isArray(
          attendanceResult.value,
        )
          ? attendanceResult.value
          : [],
      )


      setGrades(
        gradeResult.status ===
          'fulfilled' &&
        Array.isArray(
          gradeResult.value,
        )
          ? gradeResult.value
          : [],
      )


      setTasks(
        taskResult.status ===
          'fulfilled' &&
        Array.isArray(
          taskResult.value,
        )
          ? taskResult.value
          : [],
      )


      if (
        studentResult.status ===
        'rejected'
      ) {
        console.error(
          'Students:',
          studentResult.reason,
        )
      }


      if (
        attendanceResult.status ===
        'rejected'
      ) {
        console.error(
          'Attendance:',
          attendanceResult.reason,
        )
      }


      if (
        gradeResult.status ===
        'rejected'
      ) {
        console.error(
          'Grades:',
          gradeResult.reason,
        )
      }


      if (
        taskResult.status ===
        'rejected'
      ) {
        console.error(
          'Tasks:',
          taskResult.reason,
        )
      }
    } catch (
      loadError
    ) {
      console.error(
        'SchoolLessonPage:',
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


  /* =======================================================
     MAPS
  ======================================================= */

  const attendanceMap =
    useMemo(() => {
      const map =
        new Map()

      attendance.forEach(
        (
          record,
        ) => {
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


  const gradesMap =
    useMemo(() => {
      const map =
        new Map()

      grades.forEach(
        (
          grade,
        ) => {
          const studentId =
            String(
              grade.studentId,
            )

          if (
            !map.has(
              studentId,
            )
          ) {
            map.set(
              studentId,
              [],
            )
          }

          map
            .get(
              studentId,
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


  const markedCount =
    attendance.length


  const presentCount =
    attendance.filter(
      (
        record,
      ) =>
        [
          'present',
          'late',
        ].includes(
          record.status,
        ),
    ).length


  /* =======================================================
     TOPIC
  ======================================================= */

  async function handleSaveTopic() {
    if (
      !canEdit ||
      !lesson?.id
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

      setSuccess(
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


  /* =======================================================
     ATTENDANCE

     Новая запись -> INSERT
     Существующая -> UPDATE
  ======================================================= */

  async function handleAttendance(
    student,
    status,
  ) {
    if (
      !canEdit ||
      !lesson
    ) {
      return
    }


    try {
      setSavingStudentId(
        student.id,
      )

      clearMessages()


      const existing =
        attendanceMap.get(
          String(
            student.id,
          ),
        )


      let saved


      if (existing?.id) {
        saved =
          await updateSupabaseAttendanceRecord(
            existing.id,
            {
              subject:
                lesson.subject,

              status,

              comment:
                existing.comment ||
                '',

              date:
                lesson.date,
            },
          )
      } else {
        saved =
          await saveSupabaseJournalLessonAttendance({
            teacher:
              user,

            student,

            lesson,

            status,

            comment:
              '',
          })
      }


      replaceAttendanceRecord(
        student.id,
        saved,
      )


      setSuccess(
        `${student.name}: ${getAttendanceLabel(
          status,
        )}.`,
      )
    } catch (
      saveError
    ) {
      console.error(
        'Attendance:',
        saveError,
      )

      setError(
        saveError?.message ||
          'Не удалось сохранить посещаемость.',
      )
    } finally {
      setSavingStudentId('')
    }
  }


  function replaceAttendanceRecord(
    studentId,
    saved,
  ) {
    setAttendance(
      (
        current,
      ) => {
        const exists =
          current.some(
            (
              item,
            ) =>
              String(
                item.studentId,
              ) ===
              String(
                studentId,
              ),
          )


        if (!exists) {
          return [
            ...current,
            saved,
          ]
        }


        return current.map(
          (
            item,
          ) =>
            String(
              item.studentId,
            ) ===
            String(
              studentId,
            )
              ? saved
              : item,
        )
      },
    )
  }


  /* =======================================================
     QUICK GRADE
  ======================================================= */

  async function handleQuickGrade(
    student,
    gradeValue,
  ) {
    if (
      !canEdit ||
      !lesson
    ) {
      return
    }


    const numericGrade =
      Number(
        gradeValue,
      )


    if (
      !QUICK_GRADES.includes(
        numericGrade,
      )
    ) {
      setError(
        'Можно поставить только оценку от 2 до 5.',
      )

      return
    }


    /*
      Главное изменение:
      тип нельзя угадать автоматически.
    */

    if (
      !WORK_TYPES.some(
        (
          item,
        ) =>
          item.value ===
          selectedWorkType,
      )
    ) {
      setError(
        'Сначала выберите тип работы.',
      )

      return
    }


    const existingAttendance =
      attendanceMap.get(
        String(
          student.id,
        ),
      )


    const currentStatus =
      existingAttendance?.status ||
      null


    const conflict =
      [
        'absent',
        'excused',
        'sick',
      ].includes(
        currentStatus,
      )


    if (conflict) {
      const confirmed =
        window.confirm(
          `${student.name} отмечен как «${getAttendanceLabel(
            currentStatus,
          )}».\n\nПоставить оценку ${numericGrade} и изменить посещаемость на «Присутствовал»?`,
        )


      if (!confirmed) {
        return
      }
    }


    try {
      setSavingStudentId(
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
            numericGrade,

          workType:
            selectedWorkType,

          comment:
            '',
        })


      setGrades(
        (
          current,
        ) => [
          ...current,
          created,
        ],
      )


      /*
        Оценка автоматически означает,
        что ученик был на уроке.

        late оставляем late.
      */

      if (
        !currentStatus ||
        conflict
      ) {
        let savedAttendance


        if (
          existingAttendance?.id
        ) {
          savedAttendance =
            await updateSupabaseAttendanceRecord(
              existingAttendance.id,
              {
                subject:
                  lesson.subject,

                status:
                  'present',

                comment:
                  existingAttendance.comment ||
                  '',

                date:
                  lesson.date,
              },
            )
        } else {
          savedAttendance =
            await saveSupabaseJournalLessonAttendance({
              teacher:
                user,

              student,

              lesson,

              status:
                'present',

              comment:
                '',
            })
        }


        replaceAttendanceRecord(
          student.id,
          savedAttendance,
        )
      }


      setSuccess(
        `${student.name}: оценка ${numericGrade}.`,
      )
    } catch (
      saveError
    ) {
      console.error(
        'Grade:',
        saveError,
      )

      setError(
        saveError?.message ||
          'Не удалось поставить оценку.',
      )
    } finally {
      setSavingStudentId('')
    }
  }


  /* =======================================================
     DELETE GRADE
  ======================================================= */

  async function handleDeleteGrade(
    grade,
  ) {
    if (
      !canEdit ||
      !grade?.id
    ) {
      return
    }


    const confirmed =
      window.confirm(
        `Удалить оценку ${grade.value}?`,
      )


    if (!confirmed) {
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
        (
          current,
        ) =>
          current.filter(
            (
              item,
            ) =>
              item.id !==
              grade.id,
          ),
      )


      setSuccess(
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
      setDeletingGradeId('')
    }
  }


  /* =======================================================
     HOMEWORK
  ======================================================= */

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
      homeworkTitle.trim()


    if (!title) {
      setError(
        'Введите домашнее задание.',
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
              homeworkDescription.trim(),

            className:
              lesson.className,

            deadline:
              homeworkDeadline ||
              null,

            reward:
              0,

            affectsStreak:
              false,

            journalLessonId:
              lesson.id,
          },

          user,
        )


      setTasks(
        (
          current,
        ) => [
          created,
          ...current,
        ],
      )


      setHomeworkTitle('')
      setHomeworkDescription('')
      setHomeworkDeadline('')


      setSuccess(
        'Домашнее задание добавлено.',
      )
    } catch (
      taskError
    ) {
      setError(
        taskError?.message ||
          'Не удалось добавить домашнее задание.',
      )
    } finally {
      setCreatingTask(false)
    }
  }


  function clearMessages() {
    setError('')
    setSuccess('')
  }


  /* =======================================================
     ACCESS
  ======================================================= */

  if (!user) {
    return null
  }


  if (!allowedRole) {
    return (
      <PageState
        title="Доступ запрещён"
        text="Эта страница доступна учителю и руководству школы."
        onBack={() =>
          navigate('/')
        }
      />
    )
  }


  if (loading) {
    return (
      <div className="page-container">
        <section className="content-card">
          Загружаем урок...
        </section>
      </div>
    )
  }


  if (!lesson) {
    return (
      <PageState
        title="Урок не найден"
        text={
          error ||
          'Возможно, урок был удалён.'
        }
        onBack={() =>
          navigate(
            '/journal',
          )
        }
      />
    )
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="page-container"
      style={
        styles.page
      }
    >

      <button
        type="button"
        onClick={() =>
          navigate(
            '/journal',
          )
        }
        style={
          styles.back
        }
      >
        <ArrowLeft
          size={18}
        />

        Назад к журналу
      </button>


      <section
        className="content-card"
        style={
          styles.hero
        }
      >
        <div>
          <div
            style={
              styles.eyebrow
            }
          >
            <BookOpen
              size={15}
            />

            Урок
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
              styles.heroMeta
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


        <span
          style={
            canEdit
              ? styles.editBadge
              : styles.viewBadge
          }
        >
          {canEdit
            ? 'Редактирование'
            : 'Просмотр'}
        </span>
      </section>


      {error && (
        <div
          style={
            styles.error
          }
        >
          {error}
        </div>
      )}


      {success && (
        <div
          style={
            styles.success
          }
        >
          <CheckCircle2
            size={17}
          />

          {success}
        </div>
      )}


      <div
        style={
          styles.stats
        }
      >
        <StatCard
          icon={
            Users
          }
          value={
            students.length
          }
          label="Учеников"
        />

        <StatCard
          icon={
            CalendarDays
          }
          value={`${markedCount}/${students.length}`}
          label="Отмечено"
        />

        <StatCard
          icon={
            CheckCircle2
          }
          value={
            presentCount
          }
          label="На уроке"
        />

        <StatCard
          icon={
            GraduationCap
          }
          value={
            grades.length
          }
          label="Оценок"
        />
      </div>


      {/* TOPIC */}

      <section
        className="content-card"
        style={
          styles.section
        }
      >
        <span
          style={
            styles.eyebrowText
          }
        >
          Тема урока
        </span>

        <h2
          style={
            styles.sectionTitle
          }
        >
          Материал урока
        </h2>


        {canEdit ? (
          <div
            style={
              styles.topicEditor
            }
          >
            <input
              value={
                topic
              }
              onChange={(
                event,
              ) =>
                setTopic(
                  event.target.value,
                )
              }
              placeholder="Например: Имя существительное"
            />

            <button
              type="button"
              className="primary-button"
              disabled={
                savingTopic
              }
              onClick={
                handleSaveTopic
              }
            >
              <Save
                size={16}
              />

              {savingTopic
                ? 'Сохраняем...'
                : 'Сохранить'}
            </button>
          </div>
        ) : (
          <div
            style={
              styles.readBox
            }
          >
            {lesson.topic ||
              'Тема пока не указана.'}
          </div>
        )}
      </section>


      {/* STUDENTS */}

      <section
        className="content-card"
        style={{
          ...styles.section,
          padding:
            0,
          overflow:
            'hidden',
        }}
      >

        <div
          style={
            styles.studentsHeader
          }
        >
          <div>
            <span
              style={
                styles.eyebrowText
              }
            >
              Класс
            </span>

            <h2
              style={
                styles.sectionTitle
              }
            >
              Ученики
            </h2>
          </div>


          <div
            style={
              styles.legend
            }
          >
            <span>
              <b>+</b> был
            </span>

            <span>
              <b>−</b> нет
            </span>

            <span>
              <b>УВ</b> уваж.
            </span>

            <span>
              <b>Б</b> болел
            </span>

            <span>
              <b>Оп</b> опоздал
            </span>
          </div>
        </div>


        {/* WORK TYPE */}

        {canEdit && (
          <div
            style={
              styles.workTypeBar
            }
          >
            <label
              style={
                styles.workTypeLabel
              }
            >
              <span>
                Тип работы для оценки
              </span>

              <select
                value={
                  selectedWorkType
                }
                onChange={(
                  event,
                ) => {
                  setSelectedWorkType(
                    event.target.value,
                  )

                  setError('')
                }}
              >
                <option value="">
                  Выберите тип работы
                </option>

                {WORK_TYPES.map(
                  (
                    item,
                  ) => (
                    <option
                      key={
                        item.value
                      }
                      value={
                        item.value
                      }
                    >
                      {item.label}
                    </option>
                  ),
                )}
              </select>
            </label>


            <small
              style={
                styles.muted
              }
            >
              Выберите один раз, затем ставьте оценки ученикам.
            </small>
          </div>
        )}


        <div
          style={
            styles.tableScroll
          }
        >
          <table
            style={
              styles.table
            }
          >
            <thead>
              <tr>
                <th
                  style={{
                    ...styles.th,
                    ...styles.studentColumn,
                  }}
                >
                  Ученик
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Посещаемость
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Оценка
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Выставлено
                </th>
              </tr>
            </thead>


            <tbody>
              {students.map(
                (
                  student,
                  index,
                ) => {
                  const studentAttendance =
                    attendanceMap.get(
                      String(
                        student.id,
                      ),
                    )


                  const studentGrades =
                    gradesMap.get(
                      String(
                        student.id,
                      ),
                    ) ||
                    []


                  const isSaving =
                    String(
                      savingStudentId,
                    ) ===
                    String(
                      student.id,
                    )


                  return (
                    <tr
                      key={
                        student.id
                      }
                    >

                      <td
                        style={{
                          ...styles.td,
                          ...styles.studentColumn,
                        }}
                      >
                        <div
                          style={
                            styles.studentIdentity
                          }
                        >
                          <span
                            style={
                              styles.number
                            }
                          >
                            {index + 1}
                          </span>

                          <div
                            style={{
                              minWidth:
                                0,
                            }}
                          >
                            <strong
                              style={
                                styles.studentName
                              }
                            >
                              {student.name}
                            </strong>

                            <small
                              style={
                                styles.studentLogin
                              }
                            >
                              {student.studentLogin ||
                                student.className}
                            </small>
                          </div>
                        </div>
                      </td>


                      <td
                        style={
                          styles.td
                        }
                      >
                        <div
                          style={
                            styles.quickRow
                          }
                        >
                          {ATTENDANCE_OPTIONS.map(
                            (
                              option,
                            ) => (
                              <button
                                key={
                                  option.value
                                }
                                type="button"
                                disabled={
                                  !canEdit ||
                                  isSaving
                                }
                                title={
                                  option.label
                                }
                                style={
                                  attendanceButtonStyle(
                                    option.value,
                                    studentAttendance
                                      ?.status ===
                                      option.value,
                                  )
                                }
                                onClick={() =>
                                  handleAttendance(
                                    student,
                                    option.value,
                                  )
                                }
                              >
                                {option.short}
                              </button>
                            ),
                          )}
                        </div>
                      </td>


                      <td
                        style={
                          styles.td
                        }
                      >
                        {canEdit ? (
                          <div
                            style={
                              styles.gradeButtons
                            }
                          >
                            {QUICK_GRADES.map(
                              (
                                grade,
                              ) => (
                                <button
                                  key={
                                    grade
                                  }
                                  type="button"
                                  disabled={
                                    isSaving
                                  }
                                  style={{
                                    ...quickGradeStyle(
                                      grade,
                                    ),

                                    opacity:
                                      selectedWorkType
                                        ? 1
                                        : 0.5,
                                  }}
                                  onClick={() =>
                                    handleQuickGrade(
                                      student,
                                      grade,
                                    )
                                  }
                                >
                                  {grade}
                                </button>
                              ),
                            )}
                          </div>
                        ) : (
                          <span
                            style={
                              styles.muted
                            }
                          >
                            Только просмотр
                          </span>
                        )}
                      </td>


                      <td
                        style={
                          styles.td
                        }
                      >
                        {studentGrades.length ===
                        0 ? (
                          <span
                            style={
                              styles.muted
                            }
                          >
                            —
                          </span>
                        ) : (
                          <div
                            style={
                              styles.existingGrades
                            }
                          >
                            {studentGrades.map(
                              (
                                grade,
                              ) => (
                                <div
                                  key={
                                    grade.id
                                  }
                                  style={
                                    styles.existingGrade
                                  }
                                  title={
                                    getWorkTypeName(
                                      grade.workType,
                                    )
                                  }
                                >
                                  <span
                                    style={
                                      gradeBadgeStyle(
                                        grade.value,
                                      )
                                    }
                                  >
                                    {grade.value}
                                  </span>


                                  {canEdit && (
                                    <button
                                      type="button"
                                      title="Удалить оценку"
                                      disabled={
                                        deletingGradeId ===
                                        grade.id
                                      }
                                      style={
                                        styles.deleteGrade
                                      }
                                      onClick={() =>
                                        handleDeleteGrade(
                                          grade,
                                        )
                                      }
                                    >
                                      <Trash2
                                        size={14}
                                      />
                                    </button>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </td>

                    </tr>
                  )
                },
              )}
            </tbody>
          </table>


          {students.length ===
            0 && (
            <div
              style={
                styles.empty
              }
            >
              В классе нет активированных учеников.
            </div>
          )}
        </div>

      </section>


      {/* HOMEWORK */}

      <section
        className="content-card"
        style={
          styles.section
        }
      >
        <span
          style={
            styles.eyebrowText
          }
        >
          Задание
        </span>

        <h2
          style={
            styles.sectionTitle
          }
        >
          Домашняя работа
        </h2>


        {tasks.length >
        0 && (
          <div
            style={
              styles.taskList
            }
          >
            {tasks.map(
              (
                task,
              ) => (
                <div
                  key={
                    task.id
                  }
                  style={
                    styles.task
                  }
                >
                  <ClipboardList
                    size={18}
                  />

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

                    <small
                      style={
                        styles.muted
                      }
                    >
                      {task.deadline
                        ? `Срок: ${formatDate(
                            task.deadline,
                          )}`
                        : 'Без срока'}
                    </small>
                  </div>
                </div>
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
            <label className="form-group">
              <span>
                Задание
              </span>

              <input
                value={
                  homeworkTitle
                }
                onChange={(
                  event,
                ) =>
                  setHomeworkTitle(
                    event.target.value,
                  )
                }
                placeholder="Например: Упр. 25, стр. 48"
              />
            </label>


            <label className="form-group">
              <span>
                Комментарий
              </span>

              <textarea
                rows={2}
                value={
                  homeworkDescription
                }
                onChange={(
                  event,
                ) =>
                  setHomeworkDescription(
                    event.target.value,
                  )
                }
                placeholder="Дополнительные пояснения"
              />
            </label>


            <label className="form-group">
              <span>
                Срок
              </span>

              <input
                type="date"
                value={
                  homeworkDeadline
                }
                onChange={(
                  event,
                ) =>
                  setHomeworkDeadline(
                    event.target.value,
                  )
                }
              />
            </label>


            <button
              type="submit"
              className="primary-button"
              disabled={
                creatingTask
              }
            >
              <ClipboardList
                size={16}
              />

              {creatingTask
                ? 'Добавляем...'
                : 'Добавить домашнее задание'}
            </button>
          </form>
        )}
      </section>

    </div>
  )
}


/* =========================================================
   SMALL COMPONENTS
========================================================= */

function StatCard({
  icon: Icon,
  value,
  label,
}) {
  return (
    <div
      style={
        styles.statCard
      }
    >
      <span
        style={
          styles.statIcon
        }
      >
        <Icon
          size={18}
        />
      </span>

      <div>
        <strong
          style={
            styles.statValue
          }
        >
          {value}
        </strong>

        <small
          style={
            styles.statLabel
          }
        >
          {label}
        </small>
      </div>
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
          className="primary-button"
          onClick={
            onBack
          }
        >
          Назад
        </button>
      </section>
    </div>
  )
}


/* =========================================================
   HELPERS
========================================================= */

function getAttendanceLabel(
  status,
) {
  return (
    ATTENDANCE_OPTIONS.find(
      (
        item,
      ) =>
        item.value ===
        status,
    )?.label ||
    status
  )
}


function getWorkTypeName(
  workType,
) {
  return (
    WORK_TYPES.find(
      (
        item,
      ) =>
        item.value ===
        workType,
    )?.label ||
    'Тип работы'
  )
}


function formatDate(
  value,
) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(
      `${String(
        value,
      ).slice(
        0,
        10,
      )}T12:00:00`,
    )

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


/* =========================================================
   COLORS
========================================================= */

function attendanceColors(
  status,
) {
  const map = {
    present: {
      background:
        '#dcfce7',
      color:
        '#15803d',
    },
    absent: {
      background:
        '#fee2e2',
      color:
        '#b91c1c',
    },
    excused: {
      background:
        '#dbeafe',
      color:
        '#1d4ed8',
    },
    sick: {
      background:
        '#ede9fe',
      color:
        '#6d28d9',
    },
    late: {
      background:
        '#fef3c7',
      color:
        '#b45309',
    },
  }

  return map[status]
}


function attendanceButtonStyle(
  status,
  active,
) {
  return {
    width:
      38,
    height:
      36,
    display:
      'grid',
    placeItems:
      'center',
    flexShrink:
      0,
    border:
      active
        ? '2px solid #2563eb'
        : '1px solid #e2e8f0',
    borderRadius:
      9,
    cursor:
      'pointer',
    fontWeight:
      900,
    fontSize:
      [
        'present',
        'absent',
      ].includes(
        status,
      )
        ? 17
        : 9,
    ...attendanceColors(
      status,
    ),
  }
}


function quickGradeStyle(
  value,
) {
  const map = {
    5: {
      background:
        '#dcfce7',
      color:
        '#15803d',
    },
    4: {
      background:
        '#dbeafe',
      color:
        '#1d4ed8',
    },
    3: {
      background:
        '#fef3c7',
      color:
        '#b45309',
    },
    2: {
      background:
        '#fee2e2',
      color:
        '#b91c1c',
    },
  }

  return {
    width:
      35,
    height:
      35,
    display:
      'grid',
    placeItems:
      'center',
    border:
      '1px solid rgba(15,23,42,.06)',
    borderRadius:
      9,
    cursor:
      'pointer',
    fontWeight:
      900,
    ...map[value],
  }
}


function gradeBadgeStyle(
  value,
) {
  return {
    ...quickGradeStyle(
      Number(
        value,
      ),
    ),
    width:
      30,
    height:
      30,
    cursor:
      'default',
  }
}


/* =========================================================
   STYLES
========================================================= */

const styles = {
  page: {
    width:
      '100%',
    maxWidth:
      'none',
  },

  back: {
    display:
      'inline-flex',
    alignItems:
      'center',
    gap:
      7,
    marginBottom:
      14,
    padding:
      0,
    border:
      'none',
    background:
      'transparent',
    color:
      '#64748b',
    fontWeight:
      800,
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
    marginBottom:
      14,
    padding:
      20,
    flexWrap:
      'wrap',
  },

  eyebrow: {
    display:
      'flex',
    alignItems:
      'center',
    gap:
      6,
    color:
      '#2563eb',
    fontSize:
      10,
    fontWeight:
      900,
    textTransform:
      'uppercase',
  },

  eyebrowText: {
    color:
      '#2563eb',
    fontSize:
      9,
    fontWeight:
      900,
    textTransform:
      'uppercase',
  },

  heroTitle: {
    margin:
      '7px 0 0',
    color:
      '#0f274d',
  },

  heroMeta: {
    margin:
      '6px 0 0',
    color:
      '#718096',
    fontSize:
      12,
  },

  editBadge: {
    padding:
      '8px 12px',
    borderRadius:
      999,
    background:
      '#dcfce7',
    color:
      '#166534',
    fontWeight:
      900,
    fontSize:
      10,
  },

  viewBadge: {
    padding:
      '8px 12px',
    borderRadius:
      999,
    background:
      '#f1f5f9',
    color:
      '#64748b',
    fontWeight:
      900,
    fontSize:
      10,
  },

  error: {
    marginBottom:
      12,
    padding:
      11,
    borderRadius:
      11,
    background:
      '#fff1f2',
    color:
      '#be123c',
  },

  success: {
    display:
      'flex',
    alignItems:
      'center',
    gap:
      7,
    marginBottom:
      12,
    padding:
      11,
    borderRadius:
      11,
    background:
      '#ecfdf5',
    color:
      '#047857',
    fontWeight:
      800,
  },

  stats: {
    display:
      'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(130px, 1fr))',
    gap:
      9,
    marginBottom:
      14,
  },

  statCard: {
    display:
      'flex',
    alignItems:
      'center',
    gap:
      9,
    padding:
      12,
    background:
      '#fff',
    border:
      '1px solid #e2e8f0',
    borderRadius:
      14,
  },

  statIcon: {
    width:
      36,
    height:
      36,
    display:
      'grid',
    placeItems:
      'center',
    borderRadius:
      10,
    background:
      '#eff6ff',
    color:
      '#2563eb',
  },

  statValue: {
    display:
      'block',
    color:
      '#0f274d',
  },

  statLabel: {
    display:
      'block',
    color:
      '#94a3b8',
    fontSize:
      9,
  },

  section: {
    marginBottom:
      14,
  },

  sectionTitle: {
    margin:
      '4px 0 12px',
    color:
      '#0f274d',
  },

  topicEditor: {
    display:
      'grid',
    gridTemplateColumns:
      'minmax(0, 1fr) auto',
    gap:
      9,
  },

  readBox: {
    padding:
      11,
    borderRadius:
      10,
    background:
      '#f8fafc',
  },

  studentsHeader: {
    display:
      'flex',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    gap:
      12,
    padding:
      '14px 16px',
    borderBottom:
      '1px solid #eef2f7',
    flexWrap:
      'wrap',
  },

  legend: {
    display:
      'flex',
    gap:
      8,
    flexWrap:
      'wrap',
    color:
      '#64748b',
    fontSize:
      9,
  },

  workTypeBar: {
    display:
      'flex',
    alignItems:
      'flex-end',
    gap:
      12,
    padding:
      '12px 16px',
    background:
      '#f8fafc',
    borderBottom:
      '1px solid #e2e8f0',
    flexWrap:
      'wrap',
  },

  workTypeLabel: {
    display:
      'grid',
    gap:
      5,
    color:
      '#334155',
    fontSize:
      10,
    fontWeight:
      800,
  },

  tableScroll: {
    width:
      '100%',
    overflowX:
      'auto',
  },

  table: {
    width:
      '100%',
    minWidth:
      850,
    borderCollapse:
      'separate',
    borderSpacing:
      0,
  },

  th: {
    padding:
      '9px 10px',
    background:
      '#f8fafc',
    borderBottom:
      '1px solid #e2e8f0',
    color:
      '#64748b',
    textAlign:
      'left',
    fontSize:
      9,
    whiteSpace:
      'nowrap',
  },

  td: {
    padding:
      '8px 10px',
    borderBottom:
      '1px solid #eef2f7',
  },

  studentColumn: {
    position:
      'sticky',
    left:
      0,
    zIndex:
      2,
    width:
      210,
    minWidth:
      210,
    background:
      '#fff',
  },

  studentIdentity: {
    display:
      'flex',
    alignItems:
      'center',
    gap:
      8,
  },

  number: {
    width:
      28,
    height:
      28,
    display:
      'grid',
    placeItems:
      'center',
    flexShrink:
      0,
    borderRadius:
      8,
    background:
      '#eff6ff',
    color:
      '#2563eb',
    fontWeight:
      900,
  },

  studentName: {
    display:
      'block',
    maxWidth:
      160,
    overflow:
      'hidden',
    textOverflow:
      'ellipsis',
    whiteSpace:
      'nowrap',
    color:
      '#0f274d',
    fontSize:
      11,
  },

  studentLogin: {
    display:
      'block',
    color:
      '#94a3b8',
    fontSize:
      7,
  },

  quickRow: {
    display:
      'flex',
    gap:
      4,
    whiteSpace:
      'nowrap',
  },

  gradeButtons: {
    display:
      'flex',
    gap:
      4,
    whiteSpace:
      'nowrap',
  },

  existingGrades: {
    display:
      'flex',
    gap:
      4,
    flexWrap:
      'wrap',
  },

  existingGrade: {
    display:
      'flex',
    alignItems:
      'center',
    gap:
      2,
  },

  deleteGrade: {
    width:
      25,
    height:
      25,
    display:
      'grid',
    placeItems:
      'center',
    border:
      'none',
    borderRadius:
      7,
    background:
      '#fee2e2',
    color:
      '#dc2626',
    cursor:
      'pointer',
  },

  muted: {
    color:
      '#94a3b8',
    fontSize:
      9,
  },

  empty: {
    padding:
      25,
    color:
      '#94a3b8',
    textAlign:
      'center',
  },

  taskList: {
    display:
      'grid',
    gap:
      7,
    marginBottom:
      14,
  },

  task: {
    display:
      'flex',
    gap:
      9,
    padding:
      10,
    border:
      '1px solid #e2e8f0',
    borderRadius:
      11,
    background:
      '#f8fbff',
    color:
      '#2563eb',
  },

  taskDescription: {
    margin:
      '4px 0',
    color:
      '#64748b',
    fontSize:
      10,
  },

  homeworkForm: {
    display:
      'grid',
    gap:
      9,
  },
}


export default SchoolLessonPage