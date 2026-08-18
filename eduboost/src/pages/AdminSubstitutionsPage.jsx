import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ArrowRightLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DoorOpen,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
  XCircle,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  ROLES,
} from '../config/access'

import {
  getSchoolTeachers,
} from '../services/supabaseWorkloadService'

import {
  getScheduleForDate,
} from '../services/supabaseScheduleService'

import {
  createSubstitution,
  deleteSubstitution,
  getSchoolSubstitutions,
  updateSubstitution,
  updateSubstitutionStatus,
} from '../services/supabaseSubstitutionService'


function getTodayDate() {
  const now =
    new Date()

  const year =
    now.getFullYear()

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(
      2,
      '0',
    )

  const day =
    String(
      now.getDate(),
    ).padStart(
      2,
      '0',
    )

  return `${year}-${month}-${day}`
}


const INITIAL_FORM = {
  scheduleLessonId: '',

  lessonDate:
    getTodayDate(),

  originalTeacherId:
    '',

  substituteTeacherId:
    '',

  className:
    '',

  subject:
    '',

  lessonNumber:
    1,

  startTime:
    '',

  endTime:
    '',

  room:
    '',

  reason:
    '',

  notes:
    '',

  status:
    'active',
}


function AdminSubstitutionsPage() {
  const {
    user,
  } = useAuth()


  const [
    substitutions,
    setSubstitutions,
  ] = useState([])


  const [
    teachers,
    setTeachers,
  ] = useState([])


  const [
    scheduleLessons,
    setScheduleLessons,
  ] = useState([])


  const [
    loading,
    setLoading,
  ] = useState(true)


  const [
    scheduleLoading,
    setScheduleLoading,
  ] = useState(false)


  const [
    formOpen,
    setFormOpen,
  ] = useState(false)


  const [
    editingId,
    setEditingId,
  ] = useState(null)


  const [
    form,
    setForm,
  ] = useState(
    INITIAL_FORM,
  )


  const [
    search,
    setSearch,
  ] = useState('')


  const [
    dateFilter,
    setDateFilter,
  ] = useState(
    getTodayDate(),
  )


  const [
    statusFilter,
    setStatusFilter,
  ] = useState('all')


  const [
    error,
    setError,
  ] = useState('')


  const [
    scheduleError,
    setScheduleError,
  ] = useState('')


  const [
    success,
    setSuccess,
  ] = useState('')


  const canManage =
    user?.role ===
    ROLES.VICE_PRINCIPAL


  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    void loadData()
  }, [user])


  async function loadData() {
    if (!user) {
      setSubstitutions([])
      setTeachers([])
      setLoading(false)

      return
    }

    try {
      setLoading(true)
      setError('')

      const [
        substitutionsData,
        teachersData,
      ] =
        await Promise.all([
          getSchoolSubstitutions(
            user,
          ),

          getSchoolTeachers(
            user,
          ),
        ])

      setSubstitutions(
        Array.isArray(
          substitutionsData,
        )
          ? substitutionsData
          : [],
      )

      setTeachers(
        Array.isArray(
          teachersData,
        )
          ? teachersData
          : [],
      )
    } catch (
      loadError
    ) {
      setError(
        loadError.message ||
          'Не удалось загрузить замены',
      )
    } finally {
      setLoading(false)
    }
  }


  /* =======================================================
     LOAD SCHEDULE FOR FORM DATE
  ======================================================= */

  useEffect(() => {
    if (
      !formOpen ||
      !form.lessonDate ||
      !user
    ) {
      return
    }

    void loadScheduleLessons(
      form.lessonDate,
    )
  }, [
    formOpen,
    form.lessonDate,
    user,
  ])


  async function loadScheduleLessons(
    date,
  ) {
    if (
      !user ||
      !date
    ) {
      setScheduleLessons([])
      return
    }

    try {
      setScheduleLoading(true)
      setScheduleError('')

      const lessons =
        await getScheduleForDate(
          user,
          date,
        )

      setScheduleLessons(
        Array.isArray(
          lessons,
        )
          ? lessons
          : [],
      )
    } catch (
      loadError
    ) {
      setScheduleLessons([])

      setScheduleError(
        loadError.message ||
          'Не удалось загрузить расписание на эту дату',
      )
    } finally {
      setScheduleLoading(false)
    }
  }


  /* =======================================================
     FILTERS
  ======================================================= */

  const filteredSubstitutions =
    useMemo(
      () => {
        const normalizedSearch =
          search
            .trim()
            .toLowerCase()

        return substitutions.filter(
          (item) => {
            if (
              dateFilter &&
              item.lessonDate !==
                dateFilter
            ) {
              return false
            }

            if (
              statusFilter !==
                'all' &&
              item.status !==
                statusFilter
            ) {
              return false
            }

            if (
              !normalizedSearch
            ) {
              return true
            }

            const searchable =
              [
                item.originalTeacherName,
                item.substituteTeacherName,
                item.className,
                item.subject,
                item.reason,
                item.room,
              ]
                .join(' ')
                .toLowerCase()

            return searchable.includes(
              normalizedSearch,
            )
          },
        )
      },
      [
        substitutions,
        search,
        dateFilter,
        statusFilter,
      ],
    )


  /* =======================================================
     STATS
  ======================================================= */

  const today =
    getTodayDate()


  const activeToday =
    useMemo(
      () =>
        substitutions.filter(
          (item) =>
            item.lessonDate ===
              today &&
            item.status ===
              'active',
        ).length,
      [
        substitutions,
        today,
      ],
    )


  const completedCount =
    useMemo(
      () =>
        substitutions.filter(
          (item) =>
            item.status ===
            'completed',
        ).length,
      [substitutions],
    )


  const cancelledCount =
    useMemo(
      () =>
        substitutions.filter(
          (item) =>
            item.status ===
            'cancelled',
        ).length,
      [substitutions],
    )


  /* =======================================================
     SELECTED LESSON
  ======================================================= */

  const selectedLesson =
    useMemo(
      () =>
        scheduleLessons.find(
          (lesson) =>
            lesson.id ===
            form.scheduleLessonId,
        ) ||
        null,
      [
        scheduleLessons,
        form.scheduleLessonId,
      ],
    )


  /* =======================================================
     AVAILABLE SUBSTITUTE TEACHERS
  ======================================================= */

  const substituteTeachers =
    useMemo(
      () =>
        teachers.filter(
          (teacher) =>
            teacher.id !==
            form.originalTeacherId,
        ),
      [
        teachers,
        form.originalTeacherId,
      ],
    )


  /* =======================================================
     CHECK EXISTING SUBSTITUTION
  ======================================================= */

  function lessonHasActiveSubstitution(
    lesson,
  ) {
    return substitutions.some(
      (substitution) =>
        substitution.id !==
          editingId &&
        substitution.status ===
          'active' &&
        substitution.lessonDate ===
          form.lessonDate &&
        substitution.scheduleLessonId ===
          lesson.id,
    )
  }


  /* =======================================================
     GENERAL FORM CHANGE
  ======================================================= */

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


  /* =======================================================
     DATE CHANGE

     При смене даты старый урок очищается.
  ======================================================= */

  function handleDateChange(
    event,
  ) {
    const lessonDate =
      event.target.value

    setForm(
      (oldForm) => ({
        ...oldForm,

        lessonDate,

        scheduleLessonId:
          '',

        originalTeacherId:
          '',

        substituteTeacherId:
          '',

        className:
          '',

        subject:
          '',

        lessonNumber:
          1,

        startTime:
          '',

        endTime:
          '',

        room:
          '',
      }),
    )

    setScheduleError('')
  }


  /* =======================================================
     SELECT SCHEDULE LESSON

     Здесь происходит главное:
     выбран урок -> данные подставляются автоматически.
  ======================================================= */

  function handleLessonChange(
    event,
  ) {
    const scheduleLessonId =
      event.target.value

    if (
      !scheduleLessonId
    ) {
      setForm(
        (oldForm) => ({
          ...oldForm,

          scheduleLessonId:
            '',

          originalTeacherId:
            '',

          substituteTeacherId:
            '',

          className:
            '',

          subject:
            '',

          lessonNumber:
            1,

          startTime:
            '',

          endTime:
            '',

          room:
            '',
        }),
      )

      return
    }

    const lesson =
      scheduleLessons.find(
        (item) =>
          item.id ===
          scheduleLessonId,
      )

    if (!lesson) {
      return
    }

    setForm(
      (oldForm) => ({
        ...oldForm,

        scheduleLessonId:
          lesson.id,

        originalTeacherId:
          lesson.teacherId ||
          '',

        substituteTeacherId:
          '',

        className:
          lesson.className ||
          '',

        subject:
          lesson.subject ||
          '',

        lessonNumber:
          lesson.lessonNumber ||
          1,

        startTime:
          lesson.startTime ||
          '',

        endTime:
          lesson.endTime ||
          '',

        room:
          lesson.room ||
          lesson.classroom ||
          '',
      }),
    )

    setScheduleError('')
  }


  /* =======================================================
     OPEN CREATE
  ======================================================= */

  function openCreateForm() {
    if (!canManage) {
      return
    }

    setEditingId(
      null,
    )

    setScheduleLessons([])

    setForm({
      ...INITIAL_FORM,

      lessonDate:
        dateFilter ||
        getTodayDate(),
    })

    setError('')
    setScheduleError('')
    setSuccess('')

    setFormOpen(true)
  }


  /* =======================================================
     OPEN EDIT
  ======================================================= */

  function openEditForm(
    substitution,
  ) {
    if (!canManage) {
      return
    }

    setEditingId(
      substitution.id,
    )

    setScheduleLessons([])

    setForm({
      scheduleLessonId:
        substitution.scheduleLessonId ||
        '',

      lessonDate:
        substitution.lessonDate ||
        getTodayDate(),

      originalTeacherId:
        substitution.originalTeacherId ||
        '',

      substituteTeacherId:
        substitution.substituteTeacherId ||
        '',

      className:
        substitution.className ||
        '',

      subject:
        substitution.subject ||
        '',

      lessonNumber:
        substitution.lessonNumber ||
        1,

      startTime:
        substitution.startTime ||
        '',

      endTime:
        substitution.endTime ||
        '',

      room:
        substitution.room ||
        '',

      reason:
        substitution.reason ||
        '',

      notes:
        substitution.notes ||
        '',

      status:
        substitution.status ||
        'active',
    })

    setError('')
    setScheduleError('')
    setSuccess('')

    setFormOpen(true)
  }


  /* =======================================================
     CLOSE FORM
  ======================================================= */

  function closeForm() {
    setFormOpen(false)

    setEditingId(
      null,
    )

    setScheduleLessons([])

    setForm(
      INITIAL_FORM,
    )

    setScheduleError('')
  }


  /* =======================================================
     SAVE
  ======================================================= */

  async function handleSubmit(
    event,
  ) {
    event.preventDefault()

    if (!canManage) {
      return
    }

    if (
      !form.scheduleLessonId
    ) {
      setError(
        'Выберите урок из расписания',
      )

      return
    }

    if (
      !form.originalTeacherId
    ) {
      setError(
        'У выбранного урока не назначен учитель',
      )

      return
    }

    if (
      !form.substituteTeacherId
    ) {
      setError(
        'Выберите заменяющего учителя',
      )

      return
    }

    try {
      setError('')
      setSuccess('')

      if (editingId) {
        await updateSubstitution(
          editingId,
          form,
        )

        setSuccess(
          'Замена успешно изменена',
        )
      } else {
        await createSubstitution(
          form,
          user,
        )

        setSuccess(
          'Замена успешно назначена',
        )
      }

      setDateFilter(
        form.lessonDate,
      )

      closeForm()

      await loadData()
    } catch (
      submitError
    ) {
      setError(
        submitError.message ||
          'Не удалось сохранить замену',
      )
    }
  }


  /* =======================================================
     STATUS
  ======================================================= */

  async function handleStatus(
    substitution,
    status,
  ) {
    if (!canManage) {
      return
    }

    try {
      setError('')
      setSuccess('')

      await updateSubstitutionStatus(
        substitution.id,
        status,
      )

      if (
        status ===
        'completed'
      ) {
        setSuccess(
          'Замена отмечена выполненной',
        )
      } else if (
        status ===
        'cancelled'
      ) {
        setSuccess(
          'Замена отменена',
        )
      } else {
        setSuccess(
          'Замена снова активна',
        )
      }

      await loadData()
    } catch (
      statusError
    ) {
      setError(
        statusError.message ||
          'Не удалось изменить статус',
      )
    }
  }


  /* =======================================================
     DELETE
  ======================================================= */

  async function handleDelete(
    substitution,
  ) {
    if (!canManage) {
      return
    }

    const confirmed =
      window.confirm(
        `Удалить замену: ${substitution.className}, ${substitution.subject}, урок №${substitution.lessonNumber}?`,
      )

    if (!confirmed) {
      return
    }

    try {
      setError('')
      setSuccess('')

      await deleteSubstitution(
        substitution.id,
      )

      setSuccess(
        'Замена удалена',
      )

      await loadData()
    } catch (
      deleteError
    ) {
      setError(
        deleteError.message ||
          'Не удалось удалить замену',
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
      <div className="eb-sub-page">

        <div className="eb-sub-empty">

          <XCircle
            size={34}
          />

          <h2>
            Доступ запрещён
          </h2>

          <p>
            Раздел замен доступен
            только руководству школы.
          </p>

        </div>

      </div>
    )
  }


  return (
    <div className="eb-sub-page">

      {/* =========================
          HERO
      ========================= */}

      <section className="eb-sub-hero">

        <div>

          <span className="eb-sub-eyebrow">
            Учебный процесс
          </span>

          <h1>
            Замены
            <br />
            учителей
          </h1>

          <p>
            Выберите урок из школьного
            расписания и назначьте
            заменяющего педагога.
          </p>

        </div>


        <div className="eb-sub-hero-icon">

          <ArrowRightLeft
            size={48}
          />

        </div>

      </section>


      {/* =========================
          STATS
      ========================= */}

      <section className="eb-sub-stats">

        <SubStat
          icon={
            CalendarDays
          }
          value={
            activeToday
          }
          label="Активных сегодня"
        />

        <SubStat
          icon={
            Users
          }
          value={
            substitutions.length
          }
          label="Всего замен"
        />

        <SubStat
          icon={
            CheckCircle2
          }
          value={
            completedCount
          }
          label="Выполнено"
        />

        <SubStat
          icon={
            XCircle
          }
          value={
            cancelledCount
          }
          label="Отменено"
        />

      </section>


      {/* =========================
          TOOLBAR
      ========================= */}

      <section className="eb-sub-toolbar">

        <div className="eb-sub-search">

          <Search
            size={18}
          />

          <input
            value={
              search
            }
            onChange={(
              event,
            ) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Учитель, класс или предмет"
          />

        </div>


        <input
          className="eb-sub-date"
          type="date"
          value={
            dateFilter
          }
          onChange={(
            event,
          ) =>
            setDateFilter(
              event.target.value,
            )
          }
        />


        <select
          value={
            statusFilter
          }
          onChange={(
            event,
          ) =>
            setStatusFilter(
              event.target.value,
            )
          }
        >

          <option value="all">
            Все статусы
          </option>

          <option value="active">
            Активные
          </option>

          <option value="completed">
            Выполненные
          </option>

          <option value="cancelled">
            Отменённые
          </option>

        </select>


        {canManage && (
          <button
            type="button"
            className="eb-sub-add"
            onClick={
              openCreateForm
            }
          >

            <Plus
              size={18}
            />

            Назначить замену

          </button>
        )}

      </section>


      {/* =========================
          MESSAGES
      ========================= */}

      {error && (
        <div className="eb-sub-message eb-sub-message-error">

          <XCircle
            size={18}
          />

          {error}

        </div>
      )}


      {success && (
        <div className="eb-sub-message eb-sub-message-success">

          <CheckCircle2
            size={18}
          />

          {success}

        </div>
      )}


      {/* =========================
          FORM
      ========================= */}

      {formOpen &&
        canManage && (
          <SubstitutionForm
            form={form}
            scheduleLessons={
              scheduleLessons
            }
            selectedLesson={
              selectedLesson
            }
            substituteTeachers={
              substituteTeachers
            }
            substitutions={
              substitutions
            }
            editingId={
              editingId
            }
            scheduleLoading={
              scheduleLoading
            }
            scheduleError={
              scheduleError
            }
            editing={
              Boolean(
                editingId,
              )
            }
            onChange={
              handleChange
            }
            onDateChange={
              handleDateChange
            }
            onLessonChange={
              handleLessonChange
            }
            lessonHasActiveSubstitution={
              lessonHasActiveSubstitution
            }
            onSubmit={
              handleSubmit
            }
            onClose={
              closeForm
            }
          />
        )}


      {/* =========================
          CONTENT
      ========================= */}

      <section className="eb-sub-content">

        <div className="eb-sub-content-header">

          <div>

            <span>
              Журнал замен
            </span>

            <h2>
              {formatDate(
                dateFilter,
              )}
            </h2>

          </div>


          {!canManage && (
            <div className="eb-sub-readonly">
              Режим просмотра
            </div>
          )}

        </div>


        {loading ? (
          <div className="eb-sub-loading">
            Загрузка замен...
          </div>
        ) : filteredSubstitutions.length ===
          0 ? (
          <SubstitutionEmpty
            canManage={
              canManage
            }
            onAdd={
              openCreateForm
            }
          />
        ) : (
          <div className="eb-sub-list">

            {filteredSubstitutions.map(
              (
                substitution,
              ) => (
                <SubstitutionCard
                  key={
                    substitution.id
                  }
                  substitution={
                    substitution
                  }
                  canManage={
                    canManage
                  }
                  onEdit={() =>
                    openEditForm(
                      substitution,
                    )
                  }
                  onDelete={() =>
                    handleDelete(
                      substitution,
                    )
                  }
                  onComplete={() =>
                    handleStatus(
                      substitution,
                      'completed',
                    )
                  }
                  onCancel={() =>
                    handleStatus(
                      substitution,
                      'cancelled',
                    )
                  }
                  onActivate={() =>
                    handleStatus(
                      substitution,
                      'active',
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
   STAT
========================================================= */

function SubStat({
  icon: Icon,
  value,
  label,
}) {
  return (
    <article className="eb-sub-stat">

      <div className="eb-sub-stat-icon">

        <Icon
          size={20}
        />

      </div>

      <div>

        <strong>
          {value}
        </strong>

        <span>
          {label}
        </span>

      </div>

    </article>
  )
}


/* =========================================================
   FORM
========================================================= */

function SubstitutionForm({
  form,
  scheduleLessons,
  selectedLesson,
  substituteTeachers,
  scheduleLoading,
  scheduleError,
  editing,
  onChange,
  onDateChange,
  onLessonChange,
  lessonHasActiveSubstitution,
  onSubmit,
  onClose,
}) {
  return (
    <form
      className="eb-sub-form"
      onSubmit={
        onSubmit
      }
    >

      <div className="eb-sub-form-header">

        <div>

          <span>
            {editing
              ? 'Редактирование'
              : 'Новая замена'}
          </span>

          <h3>
            {editing
              ? 'Изменить замену'
              : 'Назначить замену'}
          </h3>

        </div>


        <button
          type="button"
          className="eb-sub-close"
          onClick={
            onClose
          }
          aria-label="Закрыть"
        >

          <X
            size={20}
          />

        </button>

      </div>


      <div className="eb-sub-form-grid">

        {/* DATE */}

        <label>

          <span>
            Дата замены
          </span>

          <input
            type="date"
            name="lessonDate"
            value={
              form.lessonDate
            }
            onChange={
              onDateChange
            }
            required
          />

        </label>


        {/* SCHEDULE LESSON */}

        <label>

          <span>
            Урок из расписания
          </span>

          <select
            name="scheduleLessonId"
            value={
              form.scheduleLessonId
            }
            onChange={
              onLessonChange
            }
            disabled={
              scheduleLoading
            }
            required
          >

            <option value="">
              {scheduleLoading
                ? 'Загрузка уроков...'
                : 'Выберите урок'}
            </option>

            {scheduleLessons.map(
              (lesson) => {
                const hasSubstitution =
                  lessonHasActiveSubstitution(
                    lesson,
                  )

                const missingTeacher =
                  !lesson.teacherId

                return (
                  <option
                    key={
                      lesson.id
                    }
                    value={
                      lesson.id
                    }
                    disabled={
                      hasSubstitution ||
                      missingTeacher
                    }
                  >
                    {lesson.lessonNumber}.
                    {' '}
                    {lesson.className}
                    {' · '}
                    {lesson.subject}
                    {' · '}
                    {lesson.teacherName ||
                      'Учитель не назначен'}
                    {' · '}
                    {lesson.startTime}

                    {hasSubstitution
                      ? ' · замена уже есть'
                      : ''}

                    {missingTeacher
                      ? ' · нет teacher_id'
                      : ''}
                  </option>
                )
              },
            )}

          </select>

        </label>


        {/* SUBSTITUTE */}

        <label>

          <span>
            Кто заменяет
          </span>

          <select
            name="substituteTeacherId"
            value={
              form.substituteTeacherId
            }
            onChange={
              onChange
            }
            disabled={
              !form.originalTeacherId
            }
            required
          >

            <option value="">
              Выберите учителя
            </option>

            {substituteTeachers.map(
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


        {/* REASON */}

        <label>

          <span>
            Причина
          </span>

          <input
            name="reason"
            value={
              form.reason
            }
            onChange={
              onChange
            }
            placeholder="Например: больничный"
          />

        </label>


        {/* STATUS */}

        <label>

          <span>
            Статус
          </span>

          <select
            name="status"
            value={
              form.status
            }
            onChange={
              onChange
            }
          >

            <option value="active">
              Активна
            </option>

            <option value="completed">
              Выполнена
            </option>

            <option value="cancelled">
              Отменена
            </option>

          </select>

        </label>

      </div>


      {/* SCHEDULE ERROR */}

      {scheduleError && (
        <div className="eb-sub-message eb-sub-message-error">

          <XCircle
            size={18}
          />

          {scheduleError}

        </div>
      )}


      {/* NO LESSONS */}

      {!scheduleLoading &&
        !scheduleError &&
        form.lessonDate &&
        scheduleLessons.length ===
          0 && (
          <div className="eb-sub-message">

            <CalendarDays
              size={18}
            />

            На эту дату уроков
            в расписании нет.

          </div>
        )}


      {/* SELECTED LESSON PREVIEW */}

      {form.scheduleLessonId && (
        <div
          style={{
            marginTop: '16px',
            padding: '15px',
            background: '#f7faff',
            border: '1px solid #dfe9f7',
            borderRadius: '14px',
          }}
        >

          <div
            style={{
              marginBottom: '10px',
              color: '#1769e8',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Выбранный урок
          </div>


          <div className="eb-sub-teachers">

            <div>

              <UserRound
                size={17}
              />

              <div>

                <small>
                  Отсутствует
                </small>

                <strong>
                  {selectedLesson?.teacherName ||
                    'Учитель'}
                </strong>

              </div>

            </div>


            <ArrowRightLeft
              size={18}
            />


            <div>

              <GraduationCap
                size={17}
              />

              <div>

                <small>
                  Класс
                </small>

                <strong>
                  {form.className ||
                    '—'}
                </strong>

              </div>

            </div>

          </div>


          <div className="eb-sub-meta">

            <span>

              <GraduationCap
                size={15}
              />

              {form.subject ||
                'Предмет'}

            </span>


            <span>

              <Clock3
                size={15}
              />

              Урок №
              {form.lessonNumber}

            </span>


            {(form.startTime ||
              form.endTime) && (
              <span>

                <Clock3
                  size={15}
                />

                {form.startTime ||
                  '—'}

                {' — '}

                {form.endTime ||
                  '—'}

              </span>
            )}


            {form.room && (
              <span>

                <DoorOpen
                  size={15}
                />

                Кабинет{' '}
                {form.room}

              </span>
            )}

          </div>

        </div>
      )}


      {/* NOTES */}

      <label className="eb-sub-notes">

        <span>
          Примечание
        </span>

        <textarea
          name="notes"
          value={
            form.notes
          }
          onChange={
            onChange
          }
          placeholder="Дополнительная информация"
        />

      </label>


      <button
        type="submit"
        className="eb-sub-submit"
        disabled={
          !form.scheduleLessonId ||
          !form.originalTeacherId ||
          !form.substituteTeacherId
        }
      >

        {editing ? (
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

            Назначить замену
          </>
        )}

      </button>

    </form>
  )
}


/* =========================================================
   CARD
========================================================= */

function SubstitutionCard({
  substitution,
  canManage,
  onEdit,
  onDelete,
  onComplete,
  onCancel,
  onActivate,
}) {
  return (
    <article
      className={`eb-sub-card eb-sub-card-${substitution.status}`}
    >

      <div className="eb-sub-number">

        {
          substitution.lessonNumber
        }

      </div>


      <div className="eb-sub-card-main">

        <div className="eb-sub-card-top">

          <div>

            <span>
              {substitution.className}
              {' · '}
              урок №
              {
                substitution.lessonNumber
              }
            </span>

            <h3>
              {
                substitution.subject
              }
            </h3>

          </div>


          <StatusBadge
            status={
              substitution.status
            }
          />

        </div>


        <div className="eb-sub-teachers">

          <div>

            <UserRound
              size={17}
            />

            <div>

              <small>
                Отсутствует
              </small>

              <strong>
                {
                  substitution.originalTeacherName ||
                  'Не указан'
                }
              </strong>

            </div>

          </div>


          <ArrowRightLeft
            size={18}
          />


          <div>

            <UserRound
              size={17}
            />

            <div>

              <small>
                Заменяет
              </small>

              <strong>
                {
                  substitution.substituteTeacherName ||
                  'Не указан'
                }
              </strong>

            </div>

          </div>

        </div>


        <div className="eb-sub-meta">

          {(substitution.startTime ||
            substitution.endTime) && (
            <span>

              <Clock3
                size={15}
              />

              {
                substitution.startTime ||
                '—'
              }

              {' — '}

              {
                substitution.endTime ||
                '—'
              }

            </span>
          )}


          {substitution.room && (
            <span>

              <DoorOpen
                size={15}
              />

              Кабинет{' '}
              {
                substitution.room
              }

            </span>
          )}


          {substitution.className && (
            <span>

              <GraduationCap
                size={15}
              />

              {
                substitution.className
              }

            </span>
          )}

        </div>


        {substitution.reason && (
          <p className="eb-sub-reason">

            <strong>
              Причина:
            </strong>{' '}

            {
              substitution.reason
            }

          </p>
        )}


        {substitution.notes && (
          <p className="eb-sub-notes-text">
            {
              substitution.notes
            }
          </p>
        )}

      </div>


      {canManage && (
        <div className="eb-sub-actions">

          {substitution.status ===
            'active' && (
            <>
              <button
                type="button"
                className="eb-sub-action-complete"
                onClick={
                  onComplete
                }
                title="Выполнена"
              >

                <CheckCircle2
                  size={17}
                />

              </button>


              <button
                type="button"
                className="eb-sub-action-cancel"
                onClick={
                  onCancel
                }
                title="Отменить"
              >

                <XCircle
                  size={17}
                />

              </button>
            </>
          )}


          {substitution.status !==
            'active' && (
            <button
              type="button"
              onClick={
                onActivate
              }
              title="Сделать активной"
            >

              <ArrowRightLeft
                size={17}
              />

            </button>
          )}


          <button
            type="button"
            onClick={
              onEdit
            }
            title="Редактировать"
          >

            <Pencil
              size={17}
            />

          </button>


          <button
            type="button"
            className="eb-sub-action-delete"
            onClick={
              onDelete
            }
            title="Удалить"
          >

            <Trash2
              size={17}
            />

          </button>

        </div>
      )}

    </article>
  )
}


/* =========================================================
   STATUS
========================================================= */

function StatusBadge({
  status,
}) {
  const labels = {
    active:
      'Активна',

    completed:
      'Выполнена',

    cancelled:
      'Отменена',
  }

  return (
    <span
      className={`eb-sub-status eb-sub-status-${status}`}
    >
      {labels[status] ||
        status}
    </span>
  )
}


/* =========================================================
   EMPTY
========================================================= */

function SubstitutionEmpty({
  canManage,
  onAdd,
}) {
  return (
    <div className="eb-sub-empty">

      <div className="eb-sub-empty-icon">

        <ArrowRightLeft
          size={30}
        />

      </div>

      <h3>
        Замен нет
      </h3>

      <p>
        На выбранную дату
        замены учителей пока
        не назначены.
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

          Назначить замену

        </button>
      )}

    </div>
  )
}


/* =========================================================
   DATE
========================================================= */

function formatDate(
  value,
) {
  if (!value) {
    return 'Дата не выбрана'
  }

  const date =
    new Date(
      `${value}T00:00:00`,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    'ru-RU',
    {
      day:
        'numeric',

      month:
        'long',

      year:
        'numeric',
    },
  ).format(
    date,
  )
}


export default AdminSubstitutionsPage