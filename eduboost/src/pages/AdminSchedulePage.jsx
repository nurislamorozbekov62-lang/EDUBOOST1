import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  DoorOpen,
  GraduationCap,
  Pencil,
  Plus,
  School,
  Trash2,
  UserRound,
  XCircle,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  ROLES,
} from '../config/access'

import {
  getSchoolClasses,
} from '../services/journalService'

import {
  createScheduleLesson,
  deleteScheduleLesson,
  getSchoolSchedule,
  updateScheduleLesson,
} from '../services/supabaseScheduleService'

import {
  getSchoolTeachers,
  getSchoolWorkloads,
} from '../services/supabaseWorkloadService'


const DAYS = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
]


const SHORT_DAYS = {
  Понедельник: 'Пн',
  Вторник: 'Вт',
  Среда: 'Ср',
  Четверг: 'Чт',
  Пятница: 'Пт',
  Суббота: 'Сб',
}


const INITIAL_FORM = {
  className: '',
  teacherId: '',
  teacherName: '',
  lessonNumber: 1,
  startTime: '08:00',
  endTime: '08:45',
  subject: '',
  classroom: '',
  description: '',
}


function AdminSchedulePage() {
  const {
    user,
  } = useAuth()

  const [
    allLessons,
    setAllLessons,
  ] = useState([])

  const [
    teachers,
    setTeachers,
  ] = useState([])

  const [
    workloads,
    setWorkloads,
  ] = useState([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    selectedClass,
    setSelectedClass,
  ] = useState('')

  const [
    selectedDay,
    setSelectedDay,
  ] = useState('Понедельник')

  const [
    formOpen,
    setFormOpen,
  ] = useState(false)

  const [
    editingLessonId,
    setEditingLessonId,
  ] = useState(null)

  const [
    form,
    setForm,
  ] = useState(
    INITIAL_FORM,
  )

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')


  const canManage =
    user?.role ===
    ROLES.VICE_PRINCIPAL


  useEffect(() => {
    void loadData()
  }, [user])


  async function loadData() {
    if (!user) {
      setAllLessons([])
      setTeachers([])
      setWorkloads([])
      setLoading(false)

      return
    }

    try {
      setLoading(true)
      setError('')

      const [
        lessonsData,
        teachersData,
        workloadsData,
      ] =
        await Promise.all([
          getSchoolSchedule(
            user,
          ),

          getSchoolTeachers(
            user,
          ),

          getSchoolWorkloads(
            user,
          ),
        ])

      setAllLessons(
        Array.isArray(
          lessonsData,
        )
          ? lessonsData
          : [],
      )

      setTeachers(
        Array.isArray(
          teachersData,
        )
          ? teachersData
          : [],
      )

      setWorkloads(
        Array.isArray(
          workloadsData,
        )
          ? workloadsData
          : [],
      )
    } catch (
      loadError
    ) {
      setError(
        loadError.message ||
          'Не удалось загрузить расписание',
      )
    } finally {
      setLoading(false)
    }
  }


  const classes =
    useMemo(
      () => {
        let storedClasses = []

        try {
          const result =
            user
              ? getSchoolClasses(
                  user,
                )
              : []

          storedClasses =
            Array.isArray(
              result,
            )
              ? result
              : []
        } catch {
          storedClasses = []
        }

        const scheduleClasses =
          allLessons
            .map(
              (lesson) =>
                lesson.className,
            )
            .filter(Boolean)

        const workloadClasses =
          workloads
            .map(
              (workload) =>
                workload.className,
            )
            .filter(Boolean)

        return [
          ...new Set([
            ...storedClasses,
            ...scheduleClasses,
            ...workloadClasses,
          ]),
        ].sort(
          (
            first,
            second,
          ) =>
            first.localeCompare(
              second,
              'ru',
              {
                numeric: true,
              },
            ),
        )
      },
      [
        user,
        allLessons,
        workloads,
      ],
    )


  useEffect(() => {
    if (
      !selectedClass &&
      classes.length > 0
    ) {
      setSelectedClass(
        classes[0],
      )
    }
  }, [
    classes,
    selectedClass,
  ])


  const lessons =
    useMemo(
      () => {
        if (!selectedClass) {
          return []
        }

        return allLessons
          .filter(
            (lesson) =>
              lesson.className ===
                selectedClass &&
              lesson.day ===
                selectedDay,
          )
          .sort(
            (
              first,
              second,
            ) =>
              Number(
                first.lessonNumber ||
                  999,
              ) -
              Number(
                second.lessonNumber ||
                  999,
              ),
          )
      },
      [
        allLessons,
        selectedClass,
        selectedDay,
      ],
    )


  const totalForClass =
    useMemo(
      () =>
        allLessons.filter(
          (lesson) =>
            lesson.className ===
            selectedClass,
        ).length,
      [
        allLessons,
        selectedClass,
      ],
    )


  /*
    Предметы, которые назначены
    выбранному классу.
  */
  const availableSubjects =
    useMemo(
      () => {
        if (!form.className) {
          return []
        }

        let items =
          workloads.filter(
            (workload) =>
              workload.className ===
              form.className,
          )

        if (form.teacherId) {
          items =
            items.filter(
              (workload) =>
                workload.teacherId ===
                form.teacherId,
            )
        }

        return [
          ...new Set(
            items
              .map(
                (workload) =>
                  workload.subject,
              )
              .filter(Boolean),
          ),
        ].sort(
          (
            first,
            second,
          ) =>
            first.localeCompare(
              second,
              'ru',
            ),
        )
      },
      [
        workloads,
        form.className,
        form.teacherId,
      ],
    )


  /*
    Если выбран класс и предмет,
    можем определить учителей,
    которым такая нагрузка назначена.
  */
  const availableTeachers =
    useMemo(
      () => {
        if (
          !form.className
        ) {
          return teachers
        }

        const workloadTeacherIds =
          workloads
            .filter(
              (workload) =>
                workload.className ===
                  form.className &&
                (
                  !form.subject ||
                  workload.subject ===
                    form.subject
                ),
            )
            .map(
              (workload) =>
                workload.teacherId,
            )
            .filter(Boolean)

        const uniqueIds =
          [
            ...new Set(
              workloadTeacherIds,
            ),
          ]

        if (
          uniqueIds.length === 0
        ) {
          return teachers
        }

        return teachers.filter(
          (teacher) =>
            uniqueIds.includes(
              teacher.id,
            ),
        )
      },
      [
        teachers,
        workloads,
        form.className,
        form.subject,
      ],
    )


  function handleChange(
    event,
  ) {
    const {
      name,
      value,
    } = event.target

    setForm(
      (oldForm) => ({
        ...oldForm,
        [name]: value,
      }),
    )
  }


  function handleClassChange(
    event,
  ) {
    const className =
      event.target.value

    setForm(
      (oldForm) => ({
        ...oldForm,
        className,
        subject: '',
        teacherId: '',
        teacherName: '',
      }),
    )
  }


  function handleSubjectChange(
    event,
  ) {
    const subject =
      event.target.value

    setForm(
      (oldForm) => ({
        ...oldForm,
        subject,
        teacherId: '',
        teacherName: '',
      }),
    )
  }


  function handleTeacherChange(
    event,
  ) {
    const teacherId =
      event.target.value

    const teacher =
      teachers.find(
        (item) =>
          item.id ===
          teacherId,
      )

    setForm(
      (oldForm) => ({
        ...oldForm,

        teacherId,

        teacherName:
          teacher?.name ||
          '',
      }),
    )
  }


  function openCreateForm() {
    if (!canManage) {
      return
    }

    const className =
      selectedClass ||
      classes[0] ||
      ''

    setEditingLessonId(
      null,
    )

    setForm({
      ...INITIAL_FORM,

      className,

      lessonNumber:
        lessons.length > 0
          ? Math.max(
              ...lessons.map(
                (lesson) =>
                  Number(
                    lesson.lessonNumber,
                  ) || 0,
              ),
            ) + 1
          : 1,
    })

    setError('')
    setSuccess('')
    setFormOpen(true)
  }


  function openEditForm(
    lesson,
  ) {
    if (!canManage) {
      return
    }

    setEditingLessonId(
      lesson.id,
    )

    setSelectedClass(
      lesson.className,
    )

    setSelectedDay(
      lesson.day,
    )

    setForm({
      className:
        lesson.className ||
        '',

      teacherId:
        lesson.teacherId ||
        '',

      teacherName:
        lesson.teacherName ||
        '',

      lessonNumber:
        lesson.lessonNumber ||
        1,

      startTime:
        lesson.startTime ||
        '08:00',

      endTime:
        lesson.endTime ||
        '08:45',

      subject:
        lesson.subject ||
        '',

      classroom:
        lesson.classroom ||
        '',

      description:
        lesson.description ||
        '',
    })

    setError('')
    setSuccess('')
    setFormOpen(true)
  }


  function closeForm() {
    setFormOpen(false)

    setEditingLessonId(
      null,
    )

    setForm(
      INITIAL_FORM,
    )
  }


  async function handleSubmit(
    event,
  ) {
    event.preventDefault()

    if (!canManage) {
      return
    }

    if (
      !form.className.trim()
    ) {
      setError(
        'Выберите класс',
      )

      return
    }

    if (
      !form.subject.trim()
    ) {
      setError(
        'Выберите предмет',
      )

      return
    }

    if (!form.teacherId) {
      setError(
        'Выберите учителя',
      )

      return
    }

    try {
      setError('')
      setSuccess('')

      const payload = {
        ...form,

        className:
          form.className.trim(),

        day:
          selectedDay,
      }

      if (
        editingLessonId
      ) {
        await updateScheduleLesson(
          editingLessonId,
          payload,
        )

        setSuccess(
          'Урок успешно изменён',
        )
      } else {
        await createScheduleLesson(
          payload,
          user,
        )

        setSuccess(
          'Урок успешно добавлен',
        )
      }

      setSelectedClass(
        form.className.trim(),
      )

      closeForm()

      await loadData()
    } catch (
      submitError
    ) {
      setError(
        submitError.message ||
          'Не удалось сохранить урок',
      )
    }
  }


  async function handleDelete(
    lessonId,
  ) {
    if (!canManage) {
      return
    }

    const confirmed =
      window.confirm(
        'Удалить этот урок из школьного расписания?',
      )

    if (!confirmed) {
      return
    }

    try {
      setError('')
      setSuccess('')

      await deleteScheduleLesson(
        lessonId,
      )

      setSuccess(
        'Урок удалён',
      )

      await loadData()
    } catch (
      deleteError
    ) {
      setError(
        deleteError.message ||
          'Не удалось удалить урок',
      )
    }
  }


  if (!user) {
    return null
  }


  const allowedRoles = [
    ROLES.VICE_PRINCIPAL,
    ROLES.DIRECTOR,
  ]


  if (
    !allowedRoles.includes(
      user.role,
    )
  ) {
    return (
      <div className="eb-ts-page">

        <div className="eb-ts-empty">

          <XCircle
            size={32}
          />

          <h2>
            Доступ запрещён
          </h2>

          <p>
            Этот раздел доступен
            только руководству школы.
          </p>

        </div>

      </div>
    )
  }


  return (
    <div className="eb-ts-page">

      {/* =========================
          HEADER
      ========================= */}

      <section className="eb-ts-header">

        <div>

          <span className="eb-ts-eyebrow">
            Учебный процесс
          </span>

          <h1>
            Расписание
            <br />
            школы
          </h1>

          <p>
            {canManage
              ? 'Формируйте расписание классов на основе учебной нагрузки педагогов.'
              : 'Просматривайте общее расписание школы.'}
          </p>

        </div>


        <div className="eb-ts-header-icon">

          <CalendarDays
            size={48}
          />

        </div>

      </section>


      {/* =========================
          STATS
      ========================= */}

      <section className="eb-ts-overview">

        <div className="eb-ts-overview-card">

          <div className="eb-ts-overview-icon eb-ts-blue">

            <School
              size={20}
            />

          </div>

          <div>

            <strong>
              {classes.length}
            </strong>

            <span>
              Классов
            </span>

          </div>

        </div>


        <div className="eb-ts-overview-card">

          <div className="eb-ts-overview-icon eb-ts-green">

            <UserRound
              size={20}
            />

          </div>

          <div>

            <strong>
              {teachers.length}
            </strong>

            <span>
              Учителей
            </span>

          </div>

        </div>


        <div className="eb-ts-overview-card">

          <div className="eb-ts-overview-icon eb-ts-blue">

            <BookOpen
              size={20}
            />

          </div>

          <div>

            <strong>
              {selectedClass
                ? totalForClass
                : allLessons.length}
            </strong>

            <span>
              Уроков
            </span>

          </div>

        </div>

      </section>


      {/* =========================
          CLASS
      ========================= */}

      <section className="eb-ts-class-section">

        <label>

          <span>
            Выберите класс
          </span>

          <div className="eb-ts-select-wrap">

            <GraduationCap
              size={18}
            />

            <select
              value={
                selectedClass
              }
              onChange={(
                event,
              ) =>
                setSelectedClass(
                  event.target.value,
                )
              }
            >

              {classes.length ===
                0 && (
                <option value="">
                  Классов пока нет
                </option>
              )}

              {classes.map(
                (
                  className,
                ) => (
                  <option
                    key={
                      className
                    }
                    value={
                      className
                    }
                  >
                    {className}
                  </option>
                ),
              )}

            </select>

            <ChevronDown
              size={17}
            />

          </div>

        </label>

      </section>


      {/* =========================
          DAYS
      ========================= */}

      <section className="eb-ts-days">

        {DAYS.map(
          (day) => {
            const count =
              allLessons.filter(
                (lesson) =>
                  lesson.className ===
                    selectedClass &&
                  lesson.day ===
                    day,
              ).length

            return (
              <button
                key={day}
                type="button"
                className={
                  selectedDay ===
                  day
                    ? 'eb-ts-day eb-ts-day-active'
                    : 'eb-ts-day'
                }
                onClick={() =>
                  setSelectedDay(
                    day,
                  )
                }
              >

                <span>
                  {
                    SHORT_DAYS[
                      day
                    ]
                  }
                </span>

                <small>
                  {count}
                </small>

              </button>
            )
          },
        )}

      </section>


      {/* =========================
          SCHEDULE
      ========================= */}

      <section className="eb-ts-section">

        <div className="eb-ts-section-header">

          <div>

            <span>
              {selectedClass ||
                'Класс не выбран'}
            </span>

            <h2>
              {selectedDay}
            </h2>

          </div>


          {canManage && (
            <button
              type="button"
              className="eb-ts-add-button"
              onClick={
                openCreateForm
              }
            >

              <Plus
                size={17}
              />

              Урок

            </button>
          )}

        </div>


        {error && (
          <div className="eb-ts-message eb-ts-error">

            <XCircle
              size={18}
            />

            {error}

          </div>
        )}


        {success && (
          <div className="eb-ts-message eb-ts-success">

            <CheckCircle2
              size={18}
            />

            {success}

          </div>
        )}


        {formOpen &&
          canManage && (
            <LessonForm
              form={form}
              classes={
                classes
              }
              teachers={
                availableTeachers
              }
              subjects={
                availableSubjects
              }
              selectedDay={
                selectedDay
              }
              isEditing={
                Boolean(
                  editingLessonId,
                )
              }
              onChange={
                handleChange
              }
              onClassChange={
                handleClassChange
              }
              onSubjectChange={
                handleSubjectChange
              }
              onTeacherChange={
                handleTeacherChange
              }
              onSubmit={
                handleSubmit
              }
              onClose={
                closeForm
              }
            />
          )}


        {loading ? (
          <div className="eb-ts-loading">
            Загрузка расписания...
          </div>
        ) : lessons.length ===
          0 ? (
          <ScheduleEmpty
            canManage={
              canManage
            }
            onAdd={
              openCreateForm
            }
          />
        ) : (
          <div className="eb-ts-lessons">

            {lessons.map(
              (lesson) => (
                <LessonCard
                  key={
                    lesson.id
                  }
                  lesson={
                    lesson
                  }
                  canManage={
                    canManage
                  }
                  onEdit={() =>
                    openEditForm(
                      lesson,
                    )
                  }
                  onDelete={() =>
                    handleDelete(
                      lesson.id,
                    )
                  }
                />
              ),
            )}

          </div>
        )}

      </section>

    </div>
  )
}


/* =========================================================
   LESSON FORM
========================================================= */

function LessonForm({
  form,
  classes,
  teachers,
  subjects,
  selectedDay,
  isEditing,
  onChange,
  onClassChange,
  onSubjectChange,
  onTeacherChange,
  onSubmit,
  onClose,
}) {
  return (
    <form
      className="eb-ts-form"
      onSubmit={
        onSubmit
      }
    >

      <div className="eb-ts-form-header">

        <div>

          <span>
            {isEditing
              ? 'Редактирование'
              : 'Новый урок'}
          </span>

          <h3>
            {isEditing
              ? 'Изменить урок'
              : 'Добавить в расписание'}
          </h3>

        </div>


        <button
          type="button"
          onClick={
            onClose
          }
          className="eb-ts-form-close"
          aria-label="Закрыть"
        >
          ×
        </button>

      </div>


      <div className="eb-ts-form-grid">

        <label>

          <span>
            Класс
          </span>

          <input
            name="className"
            value={
              form.className
            }
            onChange={
              onClassChange
            }
            list="eb-admin-schedule-classes"
            placeholder="Например: 8А"
            required
          />

          <datalist id="eb-admin-schedule-classes">

            {classes.map(
              (
                className,
              ) => (
                <option
                  key={
                    className
                  }
                  value={
                    className
                  }
                />
              ),
            )}

          </datalist>

        </label>


        <label>

          <span>
            Предмет
          </span>

          <input
            name="subject"
            value={
              form.subject
            }
            onChange={
              onSubjectChange
            }
            list="eb-admin-schedule-subjects"
            placeholder="Математика"
            required
          />

          <datalist id="eb-admin-schedule-subjects">

            {subjects.map(
              (subject) => (
                <option
                  key={
                    subject
                  }
                  value={
                    subject
                  }
                />
              ),
            )}

          </datalist>

        </label>


        <label>

          <span>
            Учитель
          </span>

          <select
            name="teacherId"
            value={
              form.teacherId
            }
            onChange={
              onTeacherChange
            }
            required
          >

            <option value="">
              Выберите учителя
            </option>

            {teachers.map(
              (teacher) => (
                <option
                  key={
                    teacher.id
                  }
                  value={
                    teacher.id
                  }
                >
                  {teacher.name}
                </option>
              ),
            )}

          </select>

        </label>


        <label>

          <span>
            № урока
          </span>

          <input
            type="number"
            name="lessonNumber"
            min="1"
            max="12"
            value={
              form.lessonNumber
            }
            onChange={
              onChange
            }
            required
          />

        </label>


        <label>

          <span>
            Начало
          </span>

          <input
            type="time"
            name="startTime"
            value={
              form.startTime
            }
            onChange={
              onChange
            }
            required
          />

        </label>


        <label>

          <span>
            Конец
          </span>

          <input
            type="time"
            name="endTime"
            value={
              form.endTime
            }
            onChange={
              onChange
            }
            required
          />

        </label>

      </div>


      <label>

        <span>
          День недели
        </span>

        <input
          value={
            selectedDay
          }
          readOnly
        />

      </label>


      <label>

        <span>
          Кабинет
        </span>

        <input
          name="classroom"
          value={
            form.classroom
          }
          onChange={
            onChange
          }
          placeholder="Например: 204"
        />

      </label>


      <label>

        <span>
          Комментарий
        </span>

        <textarea
          name="description"
          value={
            form.description
          }
          onChange={
            onChange
          }
          placeholder="Дополнительная информация"
        />

      </label>


      <button
        type="submit"
        className="eb-ts-submit"
      >

        {isEditing ? (
          <>
            <Pencil
              size={18}
            />

            Сохранить изменения
          </>
        ) : (
          <>
            <Plus
              size={18}
            />

            Добавить урок
          </>
        )}

      </button>

    </form>
  )
}


/* =========================================================
   LESSON CARD
========================================================= */

function LessonCard({
  lesson,
  canManage,
  onEdit,
  onDelete,
}) {
  return (
    <article className="eb-ts-lesson">

      <div className="eb-ts-lesson-number">
        {lesson.lessonNumber}
      </div>


      <div className="eb-ts-lesson-main">

        <div className="eb-ts-lesson-top">

          <div>

            <span>
              Урок №
              {lesson.lessonNumber}
            </span>

            <h3>
              {lesson.subject}
            </h3>

          </div>


          {canManage && (
            <div
              style={{
                display: 'flex',
                gap: '6px',
              }}
            >

              <button
                type="button"
                className="eb-ts-delete"
                onClick={
                  onEdit
                }
                aria-label="Редактировать урок"
              >
                <Pencil
                  size={17}
                />
              </button>


              <button
                type="button"
                className="eb-ts-delete"
                onClick={
                  onDelete
                }
                aria-label="Удалить урок"
              >
                <Trash2
                  size={17}
                />
              </button>

            </div>
          )}

        </div>


        <div className="eb-ts-lesson-meta">

          <div>

            <Clock3
              size={15}
            />

            <span>
              {lesson.startTime}
              {' — '}
              {lesson.endTime}
            </span>

          </div>


          {lesson.teacherName && (
            <div>

              <UserRound
                size={15}
              />

              <span>
                {lesson.teacherName}
              </span>

            </div>
          )}


          {lesson.classroom && (
            <div>

              <DoorOpen
                size={15}
              />

              <span>
                Кабинет{' '}
                {lesson.classroom}
              </span>

            </div>
          )}

        </div>


        {lesson.description && (
          <p>
            {lesson.description}
          </p>
        )}

      </div>

    </article>
  )
}


/* =========================================================
   EMPTY
========================================================= */

function ScheduleEmpty({
  canManage,
  onAdd,
}) {
  return (
    <div className="eb-ts-empty">

      <div className="eb-ts-empty-icon">

        <CalendarDays
          size={29}
        />

      </div>

      <h3>
        Расписание пустое
      </h3>

      <p>
        На этот день ещё нет
        добавленных уроков.
      </p>


      {canManage && (
        <button
          type="button"
          onClick={
            onAdd
          }
        >

          <Plus
            size={17}
          />

          Добавить первый урок

        </button>
      )}

    </div>
  )
}


export default AdminSchedulePage