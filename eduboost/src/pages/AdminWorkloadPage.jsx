import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Info,
  Pencil,
  Plus,
  RefreshCcw,
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
  supabase,
} from '../lib/supabase'

import {
  getAdminSchoolClasses,
} from '../services/supabaseAdminJournalService'

import {
  createWorkload,
  deleteWorkload,
  getSchoolTeachers,
  getSchoolWorkloads,
  updateWorkload,
} from '../services/supabaseWorkloadService'


/* =========================================================
   ACADEMIC YEAR
========================================================= */

function getDefaultAcademicYear() {
  const now =
    new Date()

  const year =
    now.getFullYear()

  const month =
    now.getMonth()

  if (month >= 6) {
    return `${year}/${year + 1}`
  }

  return `${year - 1}/${year}`
}


/* =========================================================
   INITIAL FORM
========================================================= */

const INITIAL_FORM = {
  teacherId: '',
  className: '',
  subject: '',
  weeklyHours: 1,
  groupName: '',
  academicYear:
    getDefaultAcademicYear(),
  notes: '',
}


/* =========================================================
   TEXT HELPERS
========================================================= */

function cleanText(
  value,
) {
  return String(
    value || '',
  )
    .replace(
      /\s+/g,
      ' ',
    )
    .trim()
}


function normalizeText(
  value,
) {
  return cleanText(
    value,
  )
    .toLowerCase()
    .replaceAll(
      'ё',
      'е',
    )
}


/* =========================================================
   SUBJECT NORMALIZATION

   Здесь специально НЕ объединяем
   похожие, но реально разные предметы.

   Например:
   "История" и "История Кыргызстана"
   остаются разными.
========================================================= */

const SUBJECT_ALIASES = {
  'русский':
    'Русский язык',

  'русский язык':
    'Русский язык',

  'русский яз':
    'Русский язык',

  'рус яз':
    'Русский язык',

  'орус тили':
    'Русский язык',


  'кыргызский':
    'Кыргызский язык',

  'кыргызский язык':
    'Кыргызский язык',

  'кыргыз тили':
    'Кыргызский язык',


  'английский':
    'Английский язык',

  'английский язык':
    'Английский язык',

  'англис тили':
    'Английский язык',

  'english':
    'Английский язык',


  'физкультура':
    'Физическая культура',

  'физическая культура':
    'Физическая культура',

  'физ ра':
    'Физическая культура',
}


function getSubjectAliasKey(
  value,
) {
  return normalizeText(
    value,
  )
    .replace(
      /[.\-_]+/g,
      ' ',
    )
    .replace(
      /\s+/g,
      ' ',
    )
    .trim()
}


function getCanonicalSubject(
  value,
) {
  const original =
    cleanText(
      value,
    )

  if (!original) {
    return ''
  }


  const aliasKey =
    getSubjectAliasKey(
      original,
    )


  return (
    SUBJECT_ALIASES[
      aliasKey
    ] ||
    original
  )
}


/* =========================================================
   RUSSIAN WORD FORMS
========================================================= */

function getLessonWord(
  value,
) {
  const number =
    Math.abs(
      Number(
        value,
      ) ||
        0,
    )


  const lastTwo =
    number %
    100


  const last =
    number %
    10


  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return 'уроков'
  }


  if (last === 1) {
    return 'урок'
  }


  if (
    last >= 2 &&
    last <= 4
  ) {
    return 'урока'
  }


  return 'уроков'
}


function formatLessonsPerWeek(
  value,
) {
  const count =
    Number(
      value,
    ) ||
    0

  return `${count} ${getLessonWord(count)}/нед.`
}


function getPositionWord(
  value,
) {
  const number =
    Math.abs(
      Number(
        value,
      ) ||
        0,
    )

  const lastTwo =
    number %
    100

  const last =
    number %
    10


  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return 'позиций'
  }


  if (last === 1) {
    return 'позицию'
  }


  if (
    last >= 2 &&
    last <= 4
  ) {
    return 'позиции'
  }


  return 'позиций'
}


/* =========================================================
   ASSIGNMENT KEYS
========================================================= */

function workloadKey({
  teacherId,
  teacherName,
  className,
  subject,
}) {
  const teacherPart =
    teacherId
      ? `id:${String(
          teacherId,
        )}`
      : `name:${normalizeText(
          teacherName,
        )}`


  return [
    teacherPart,

    normalizeText(
      className,
    ),

    normalizeText(
      getCanonicalSubject(
        subject,
      ),
    ),
  ].join('|')
}


/* =========================================================
   TEACHER RESOLUTION
========================================================= */

function resolveScheduleTeacher(
  lesson,
  teachers,
) {
  const lessonTeacherId =
    cleanText(
      lesson.teacherId,
    )


  if (lessonTeacherId) {
    const found =
      teachers.find(
        (teacher) =>
          String(
            teacher.id,
          ) ===
          String(
            lessonTeacherId,
          ),
      )


    return {
      teacherId:
        lessonTeacherId,

      teacherName:
        found?.name ||
        lesson.teacherName ||
        'Учитель не указан',
    }
  }


  const teacherName =
    normalizeText(
      lesson.teacherName,
    )


  if (!teacherName) {
    return {
      teacherId: '',
      teacherName:
        'Учитель не указан',
    }
  }


  const matches =
    teachers.filter(
      (teacher) =>
        normalizeText(
          teacher.name,
        ) ===
        teacherName,
    )


  /*
    Если одинаковое имя
    у двух учителей,
    автоматически выбирать нельзя.
  */

  if (
    matches.length ===
    1
  ) {
    return {
      teacherId:
        matches[0].id,

      teacherName:
        matches[0].name,
    }
  }


  return {
    teacherId: '',

    teacherName:
      lesson.teacherName ||
      'Учитель не указан',
  }
}


/* =========================================================
   SCHOOL SCHEDULE
========================================================= */

async function getSchoolSchedule(
  user,
) {
  if (!user?.schoolId) {
    return []
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'schedule_lessons',
      )
      .select(`
        id,
        school_id,
        teacher_id,
        teacher_name,
        class_name,
        subject,
        weekday,
        lesson_number,
        start_time,
        end_time,
        room
      `)
      .eq(
        'school_id',
        user.schoolId,
      )
      .order(
        'weekday',
        {
          ascending: true,
        },
      )
      .order(
        'lesson_number',
        {
          ascending: true,
        },
      )


  if (error) {
    throw new Error(
      error.message ||
        'Не удалось загрузить расписание',
    )
  }


  return (
    data || []
  ).map(
    (row) => ({
      id:
        row.id,

      teacherId:
        row.teacher_id ||
        '',

      teacherName:
        row.teacher_name ||
        '',

      className:
        row.class_name ||
        '',

      subject:
        row.subject ||
        '',

      weekday:
        Number(
          row.weekday ||
            0,
        ),

      lessonNumber:
        Number(
          row.lesson_number ||
            0,
        ),

      startTime:
        row.start_time
          ?.slice(
            0,
            5,
          ) ||
        '',

      endTime:
        row.end_time
          ?.slice(
            0,
            5,
          ) ||
        '',

      room:
        row.room ||
        '',
    }),
  )
}


/* =========================================================
   PAGE
========================================================= */

function AdminWorkloadPage() {
  const {
    user,
  } = useAuth()


  const [
    workloads,
    setWorkloads,
  ] = useState([])


  const [
    teachers,
    setTeachers,
  ] = useState([])


  const [
    classes,
    setClasses,
  ] = useState([])


  const [
    schedule,
    setSchedule,
  ] = useState([])


  const [
    loading,
    setLoading,
  ] = useState(true)


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
    teacherFilter,
    setTeacherFilter,
  ] = useState('all')


  const [
    classFilter,
    setClassFilter,
  ] = useState('all')


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


  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    if (!user?.id) {
      return
    }

    void loadData()
  }, [
    user?.id,
    user?.schoolId,
  ])


  async function loadData() {
    if (!user) {
      setLoading(false)

      return
    }


    try {
      setLoading(true)
      setError('')


      const [
        workloadResult,
        teacherResult,
        classResult,
        scheduleResult,
      ] =
        await Promise.allSettled([
          getSchoolWorkloads(
            user,
          ),

          getSchoolTeachers(
            user,
          ),

          getAdminSchoolClasses(
            user,
          ),

          getSchoolSchedule(
            user,
          ),
        ])


      /* WORKLOAD */

      if (
        workloadResult.status ===
        'fulfilled'
      ) {
        setWorkloads(
          Array.isArray(
            workloadResult.value,
          )
            ? workloadResult.value
            : [],
        )
      } else {
        console.error(
          'Workload:',
          workloadResult.reason,
        )

        setWorkloads([])
      }


      /* TEACHERS */

      if (
        teacherResult.status ===
        'fulfilled'
      ) {
        setTeachers(
          Array.isArray(
            teacherResult.value,
          )
            ? teacherResult.value
            : [],
        )
      } else {
        console.error(
          'Teachers:',
          teacherResult.reason,
        )

        setTeachers([])
      }


      /* CLASSES */

      if (
        classResult.status ===
        'fulfilled'
      ) {
        setClasses(
          Array.isArray(
            classResult.value,
          )
            ? classResult.value
            : [],
        )
      } else {
        console.error(
          'Classes:',
          classResult.reason,
        )

        setClasses([])
      }


      /* SCHEDULE */

      if (
        scheduleResult.status ===
        'fulfilled'
      ) {
        setSchedule(
          Array.isArray(
            scheduleResult.value,
          )
            ? scheduleResult.value
            : [],
        )
      } else {
        console.error(
          'Schedule:',
          scheduleResult.reason,
        )

        setSchedule([])
      }


      const failed =
        [
          workloadResult,
          teacherResult,
          classResult,
          scheduleResult,
        ].some(
          (result) =>
            result.status ===
            'rejected',
        )


      if (failed) {
        setError(
          'Часть данных не удалось загрузить. Остальная информация показана ниже.',
        )
      }
    } catch (
      loadError
    ) {
      console.error(
        'AdminWorkloadPage:',
        loadError,
      )

      setError(
        loadError?.message ||
          'Не удалось загрузить учебную нагрузку.',
      )
    } finally {
      setLoading(false)
    }
  }


  /* =======================================================
     SCHOOL CLASSES
  ======================================================= */

  const schoolClasses =
    useMemo(() => {
      const workloadClasses =
        workloads
          .map(
            (item) =>
              item.className,
          )
          .filter(Boolean)


      const scheduleClasses =
        schedule
          .map(
            (item) =>
              item.className,
          )
          .filter(Boolean)


      return [
        ...new Set([
          ...classes,
          ...workloadClasses,
          ...scheduleClasses,
        ]),
      ].sort(
        (
          first,
          second,
        ) =>
          String(
            first,
          ).localeCompare(
            String(
              second,
            ),
            'ru',
            {
              numeric: true,
            },
          ),
      )
    }, [
      classes,
      workloads,
      schedule,
    ])


  /* =======================================================
     SCHEDULE CANDIDATES

     Здесь "Русский" +
     "Русский язык" объединятся
     в одну позицию.
  ======================================================= */

  const scheduleCandidates =
    useMemo(() => {
      const map =
        new Map()


      schedule.forEach(
        (lesson) => {
          const className =
            cleanText(
              lesson.className,
            )


          const subject =
            getCanonicalSubject(
              lesson.subject,
            )


          if (
            !className ||
            !subject
          ) {
            return
          }


          const teacher =
            resolveScheduleTeacher(
              lesson,
              teachers,
            )


          const candidate = {
            teacherId:
              teacher.teacherId,

            teacherName:
              teacher.teacherName,

            className,

            subject,

            lessonCount: 0,
          }


          const key =
            workloadKey(
              candidate,
            )


          if (
            !map.has(
              key,
            )
          ) {
            map.set(
              key,
              candidate,
            )
          }


          const existing =
            map.get(
              key,
            )


          existing.lessonCount +=
            1
        },
      )


      return [
        ...map.values(),
      ].sort(
        (
          first,
          second,
        ) => {
          const teacherCompare =
            String(
              first.teacherName,
            ).localeCompare(
              String(
                second.teacherName,
              ),
              'ru',
            )


          if (
            teacherCompare !==
            0
          ) {
            return teacherCompare
          }


          const classCompare =
            String(
              first.className,
            ).localeCompare(
              String(
                second.className,
              ),
              'ru',
              {
                numeric: true,
              },
            )


          if (
            classCompare !==
            0
          ) {
            return classCompare
          }


          return String(
            first.subject,
          ).localeCompare(
            String(
              second.subject,
            ),
            'ru',
          )
        },
      )
    }, [
      schedule,
      teachers,
    ])


  /* =======================================================
     WORKLOAD KEYS
  ======================================================= */

  const existingWorkloadKeys =
    useMemo(
      () =>
        new Set(
          workloads.map(
            (workload) =>
              workloadKey(
                workload,
              ),
          ),
        ),
      [
        workloads,
      ],
    )


  const scheduleCandidateMap =
    useMemo(() => {
      const map =
        new Map()


      scheduleCandidates.forEach(
        (candidate) => {
          map.set(
            workloadKey(
              candidate,
            ),
            candidate,
          )
        },
      )


      return map
    }, [
      scheduleCandidates,
    ])


  /* =======================================================
     MISSING ASSIGNMENTS
  ======================================================= */

  const missingAssignments =
    useMemo(
      () =>
        scheduleCandidates.filter(
          (candidate) =>
            !existingWorkloadKeys.has(
              workloadKey(
                candidate,
              ),
            ),
        ),
      [
        scheduleCandidates,
        existingWorkloadKeys,
      ],
    )


  /* =======================================================
     HOURS MISMATCH
  ======================================================= */

  const hourMismatches =
    useMemo(() => {
      return workloads.filter(
        (workload) => {
          const candidate =
            scheduleCandidateMap.get(
              workloadKey(
                workload,
              ),
            )


          if (!candidate) {
            return false
          }


          return (
            Number(
              workload.weeklyHours ||
                0,
            ) !==
            Number(
              candidate.lessonCount ||
                0,
            )
          )
        },
      )
    }, [
      workloads,
      scheduleCandidateMap,
    ])


  /* =======================================================
     WORKLOAD WITHOUT SCHEDULE

     Не считаем ошибкой,
     если расписание школы вообще пустое.
  ======================================================= */

  const workloadsWithoutSchedule =
    useMemo(() => {
      if (
        scheduleCandidates.length ===
        0
      ) {
        return []
      }


      return workloads.filter(
        (workload) =>
          !scheduleCandidateMap.has(
            workloadKey(
              workload,
            ),
          ),
      )
    }, [
      workloads,
      scheduleCandidates,
      scheduleCandidateMap,
    ])


  /* =======================================================
     TOTAL ISSUES
  ======================================================= */

  const issuesCount =
    missingAssignments.length +
    hourMismatches.length +
    workloadsWithoutSchedule.length


  /* =======================================================
     FILTERS
  ======================================================= */

  const filteredWorkloads =
    useMemo(() => {
      const normalizedSearch =
        normalizeText(
          search,
        )


      return workloads.filter(
        (item) => {
          if (
            teacherFilter !==
              'all' &&
            String(
              item.teacherId,
            ) !==
              String(
                teacherFilter,
              )
          ) {
            return false
          }


          if (
            classFilter !==
              'all' &&
            item.className !==
              classFilter
          ) {
            return false
          }


          if (!normalizedSearch) {
            return true
          }


          const searchable =
            [
              item.teacherName,
              item.className,
              item.subject,
              getCanonicalSubject(
                item.subject,
              ),
              item.groupName,
              item.academicYear,
            ]
              .join(' ')
              .toLowerCase()


          return searchable.includes(
            normalizedSearch,
          )
        },
      )
    }, [
      workloads,
      search,
      teacherFilter,
      classFilter,
    ])


  /* =======================================================
     STATS
  ======================================================= */

  const totalHours =
    useMemo(
      () =>
        workloads.reduce(
          (
            total,
            item,
          ) =>
            total +
            Number(
              item.weeklyHours ||
                0,
            ),
          0,
        ),
      [
        workloads,
      ],
    )


  const teachersWithWorkload =
    useMemo(
      () =>
        new Set(
          workloads
            .map(
              (item) =>
                item.teacherId,
            )
            .filter(Boolean),
        ).size,
      [
        workloads,
      ],
    )


  /* =======================================================
     FORM
  ======================================================= */

  function handleChange(
    event,
  ) {
    const {
      name,
      value,
    } =
      event.target


    setForm(
      (oldForm) => ({
        ...oldForm,

        [name]:
          value,
      }),
    )
  }


  function getSuggestionTeacherId(
    suggestion,
  ) {
    if (
      !suggestion?.teacherId
    ) {
      return ''
    }


    const exists =
      teachers.some(
        (teacher) =>
          String(
            teacher.id,
          ) ===
          String(
            suggestion.teacherId,
          ),
      )


    return exists
      ? suggestion.teacherId
      : ''
  }


  function openCreateForm(
    suggestion = null,
  ) {
    if (!canManage) {
      return
    }


    setEditingId(
      null,
    )


    setForm({
      ...INITIAL_FORM,

      teacherId:
        suggestion
          ? getSuggestionTeacherId(
              suggestion,
            )
          : teachers[0]?.id ||
            '',

      className:
        suggestion?.className ||
        schoolClasses[0] ||
        '',

      subject:
        getCanonicalSubject(
          suggestion?.subject ||
            '',
        ),

      weeklyHours:
        suggestion?.lessonCount ||
        1,

      groupName: '',

      academicYear:
        getDefaultAcademicYear(),

      notes:
        suggestion
          ? 'Создано на основе текущего расписания'
          : '',
    })


    setError('')
    setSuccess('')
    setFormOpen(true)
  }


  function openEditForm(
    workload,
  ) {
    if (!canManage) {
      return
    }


    setEditingId(
      workload.id,
    )


    setForm({
      teacherId:
        workload.teacherId ||
        '',

      className:
        workload.className ||
        '',

      subject:
        getCanonicalSubject(
          workload.subject,
        ),

      weeklyHours:
        workload.weeklyHours ||
        1,

      groupName:
        workload.groupName ||
        '',

      academicYear:
        workload.academicYear ||
        getDefaultAcademicYear(),

      notes:
        workload.notes ||
        '',
    })


    setError('')
    setSuccess('')
    setFormOpen(true)
  }


  function closeForm() {
    setFormOpen(
      false,
    )

    setEditingId(
      null,
    )

    setForm(
      INITIAL_FORM,
    )
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


    try {
      setError('')
      setSuccess('')


      /*
        В БД новую/изменённую
        нагрузку записываем
        с нормализованным названием.
      */

      const preparedForm = {
        ...form,

        className:
          cleanText(
            form.className,
          ),

        subject:
          getCanonicalSubject(
            form.subject,
          ),

        weeklyHours:
          Number(
            form.weeklyHours,
          ),
      }


      if (editingId) {
        await updateWorkload(
          editingId,
          preparedForm,
        )


        setSuccess(
          'Нагрузка успешно изменена.',
        )
      } else {
        await createWorkload(
          preparedForm,
          user,
        )


        setSuccess(
          'Нагрузка успешно назначена.',
        )
      }


      closeForm()

      await loadData()
    } catch (
      submitError
    ) {
      setError(
        submitError?.message ||
          'Не удалось сохранить нагрузку.',
      )
    }
  }


  /* =======================================================
     DELETE
  ======================================================= */

  async function handleDelete(
    workload,
  ) {
    if (!canManage) {
      return
    }


    const confirmed =
      window.confirm(
        `Удалить нагрузку: ${workload.teacherName} — ${getCanonicalSubject(
          workload.subject,
        )} — ${workload.className}?`,
      )


    if (!confirmed) {
      return
    }


    try {
      setError('')
      setSuccess('')


      await deleteWorkload(
        workload.id,
      )


      setSuccess(
        'Нагрузка удалена.',
      )


      await loadData()
    } catch (
      deleteError
    ) {
      setError(
        deleteError?.message ||
          'Не удалось удалить нагрузку.',
      )
    }
  }


  /* =======================================================
     ACCESS
  ======================================================= */

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
      <div className="eb-workload-page">

        <div className="eb-workload-empty">

          <XCircle
            size={34}
          />

          <h2>
            Доступ запрещён
          </h2>

          <p>
            Раздел учебной нагрузки
            доступен только руководству
            школы.
          </p>

        </div>

      </div>
    )
  }


  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="eb-workload-page">

      {/* ===================================================
          HERO
      =================================================== */}

      <section className="eb-workload-hero">

        <div>

          <span className="eb-workload-eyebrow">
            Учебный процесс
          </span>

          <h1>
            Нагрузка
            <br />
            учителей
          </h1>

          <p>
            Кто какой предмет ведёт,
            в каком классе и сколько
            часов в неделю.
          </p>

        </div>


        <div className="eb-workload-hero-icon">

          <BriefcaseBusiness
            size={48}
          />

        </div>

      </section>


      {/* ===================================================
          STATS
      =================================================== */}

      <section className="eb-workload-stats">

        <StatCard
          icon={
            Users
          }
          value={
            teachers.length
          }
          label="Учителей"
          hint="Всего в школе"
        />


        <StatCard
          icon={
            UserRound
          }
          value={
            teachers.length >
            0
              ? `${teachersWithWorkload} из ${teachers.length}`
              : '0'
          }
          label="С нагрузкой"
          hint="Есть хотя бы одно назначение"
        />


        <StatCard
          icon={
            Clock3
          }
          value={
            totalHours
          }
          label="Часов/нед."
          hint="Официально назначено"
        />


        <StatCard
          icon={
            AlertTriangle
          }
          value={
            issuesCount
          }
          label="Проверить"
          hint="Расписание и нагрузка"
          warning={
            issuesCount >
            0
          }
        />

      </section>


      {/* ===================================================
          SCHEDULE WARNING
      =================================================== */}

      {!loading &&
        missingAssignments.length >
          0 && (
        <section
          style={
            scheduleWarningStyle
          }
        >

          <div
            style={
              scheduleWarningHeaderStyle
            }
          >

            <div
              style={
                scheduleWarningIconStyle
              }
            >
              <AlertTriangle
                size={21}
              />
            </div>


            <div>

              <h2
                style={
                  scheduleWarningTitleStyle
                }
              >
                В расписании есть уроки,
                которых ещё нет
                в нагрузке
              </h2>


              <p
                style={
                  scheduleWarningTextStyle
                }
              >
                EduBoost нашёл
                {' '}
                {
                  missingAssignments.length
                }
                {' '}
                {
                  getPositionWord(
                    missingAssignments.length,
                  )
                }
                {' '}
                «учитель — предмет — класс».
                Проверьте их и подтвердите
                количество часов.
              </p>

            </div>

          </div>


          <div
            style={
              suggestionsGridStyle
            }
          >

            {missingAssignments.map(
              (candidate) => (
                <ScheduleSuggestion
                  key={
                    workloadKey(
                      candidate,
                    )
                  }
                  candidate={
                    candidate
                  }
                  teachers={
                    teachers
                  }
                  canManage={
                    canManage
                  }
                  onCreate={() =>
                    openCreateForm(
                      candidate,
                    )
                  }
                />
              ),
            )}

          </div>

        </section>
      )}


      {/* ===================================================
          TOOLBAR
      =================================================== */}

      <section className="eb-workload-toolbar">

        <div className="eb-workload-search">

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
            placeholder="Учитель, предмет или класс"
          />

        </div>


        <select
          value={
            teacherFilter
          }
          onChange={(
            event,
          ) =>
            setTeacherFilter(
              event.target.value,
            )
          }
        >

          <option value="all">
            Все учителя
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


        <select
          value={
            classFilter
          }
          onChange={(
            event,
          ) =>
            setClassFilter(
              event.target.value,
            )
          }
        >

          <option value="all">
            Все классы
          </option>


          {schoolClasses.map(
            (className) => (
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


        <button
          type="button"
          style={
            refreshButtonStyle
          }
          onClick={
            loadData
          }
          disabled={
            loading
          }
          title="Обновить"
          aria-label="Обновить"
        >
          <RefreshCcw
            size={18}
          />
        </button>


        {canManage && (
          <button
            type="button"
            className="eb-workload-add"
            onClick={() =>
              openCreateForm()
            }
          >

            <Plus
              size={18}
            />

            Назначить

          </button>
        )}

      </section>


      {/* ===================================================
          MESSAGES
      =================================================== */}

      {error && (
        <div className="eb-workload-message eb-workload-message-error">

          <XCircle
            size={18}
          />

          {error}

        </div>
      )}


      {success && (
        <div className="eb-workload-message eb-workload-message-success">

          <CheckCircle2
            size={18}
          />

          {success}

        </div>
      )}


      {/* ===================================================
          FORM
      =================================================== */}

      {formOpen &&
        canManage && (
        <WorkloadForm
          form={
            form
          }
          teachers={
            teachers
          }
          classes={
            schoolClasses
          }
          editing={
            Boolean(
              editingId,
            )
          }
          onChange={
            handleChange
          }
          onSubmit={
            handleSubmit
          }
          onClose={
            closeForm
          }
        />
      )}


      {/* ===================================================
          CONTENT
      =================================================== */}

      <section className="eb-workload-content">

        <div className="eb-workload-content-header">

          <div>

            <span>
              Учебный год
            </span>

            <h2>
              {
                getDefaultAcademicYear()
              }
            </h2>

          </div>


          {!canManage && (
            <div className="eb-workload-readonly">
              Только просмотр
            </div>
          )}

        </div>


        {loading ? (
          <div className="eb-workload-loading">
            Загрузка нагрузки...
          </div>
        ) : workloads.length ===
          0 ? (
          <WorkloadEmpty
            canManage={
              canManage
            }
            hasSchedule={
              scheduleCandidates.length >
              0
            }
            onAdd={() =>
              openCreateForm()
            }
          />
        ) : filteredWorkloads.length ===
          0 ? (
          <div
            style={
              noResultsStyle
            }
          >

            <Search
              size={27}
            />

            <strong>
              Ничего не найдено
            </strong>

            <span>
              Измените поиск
              или сбросьте фильтры.
            </span>


            <button
              type="button"
              style={
                resetButtonStyle
              }
              onClick={() => {
                setSearch('')

                setTeacherFilter(
                  'all',
                )

                setClassFilter(
                  'all',
                )
              }}
            >
              Сбросить фильтры
            </button>

          </div>
        ) : (
          <div className="eb-workload-list">

            {filteredWorkloads.map(
              (workload) => {
                const scheduleCandidate =
                  scheduleCandidateMap.get(
                    workloadKey(
                      workload,
                    ),
                  ) ||
                  null


                return (
                  <WorkloadCard
                    key={
                      workload.id
                    }
                    workload={
                      workload
                    }
                    scheduleCandidate={
                      scheduleCandidate
                    }
                    canManage={
                      canManage
                    }
                    onEdit={() =>
                      openEditForm(
                        workload,
                      )
                    }
                    onDelete={() =>
                      handleDelete(
                        workload,
                      )
                    }
                  />
                )
              },
            )}

          </div>
        )}

      </section>

    </div>
  )
}


/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon: Icon,
  value,
  label,
  hint,
  warning = false,
}) {
  return (
    <article
      className="eb-workload-stat"
      style={
        warning
          ? statWarningStyle
          : undefined
      }
    >

      <div
        className="eb-workload-stat-icon"
        style={
          warning
            ? statWarningIconStyle
            : undefined
        }
      >

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


        {hint && (
          <small
            style={
              statHintStyle
            }
          >
            {hint}
          </small>
        )}

      </div>

    </article>
  )
}


/* =========================================================
   SCHEDULE SUGGESTION
========================================================= */

function ScheduleSuggestion({
  candidate,
  teachers,
  canManage,
  onCreate,
}) {
  const teacherAvailable =
    candidate.teacherId &&
    teachers.some(
      (teacher) =>
        String(
          teacher.id,
        ) ===
        String(
          candidate.teacherId,
        ),
    )


  return (
    <article
      style={
        suggestionCardStyle
      }
    >

      <div
        style={
          suggestionTopStyle
        }
      >

        <div
          style={
            suggestionAvatarStyle
          }
        >

          {String(
            candidate.teacherName ||
              'У',
          )
            .charAt(0)
            .toUpperCase()}

        </div>


        <div>

          <strong
            style={
              suggestionTeacherStyle
            }
          >
            {
              candidate.teacherName
            }
          </strong>


          <span
            style={
              suggestionMetaStyle
            }
          >
            {
              candidate.className
            }
            {' · '}
            {
              candidate.subject
            }
          </span>

        </div>

      </div>


      <div
        style={
          suggestionBottomStyle
        }
      >

        <span
          style={
            scheduleLessonsBadgeStyle
          }
        >

          <Clock3
            size={14}
          />

          {
            formatLessonsPerWeek(
              candidate.lessonCount,
            )
          }

        </span>


        {!teacherAvailable && (
          <span
            style={
              selectTeacherHintStyle
            }
          >
            Учителя нужно выбрать
            в форме
          </span>
        )}


        {canManage && (
          <button
            type="button"
            style={
              suggestionButtonStyle
            }
            onClick={
              onCreate
            }
          >

            <Plus
              size={15}
            />

            Назначить

          </button>
        )}

      </div>

    </article>
  )
}


/* =========================================================
   WORKLOAD FORM
========================================================= */

function WorkloadForm({
  form,
  teachers,
  classes,
  editing,
  onChange,
  onSubmit,
  onClose,
}) {
  return (
    <form
      className="eb-workload-form"
      onSubmit={
        onSubmit
      }
    >

      <div className="eb-workload-form-header">

        <div>

          <span>
            {editing
              ? 'Редактирование'
              : 'Новое назначение'}
          </span>

          <h3>
            {editing
              ? 'Изменить нагрузку'
              : 'Назначить нагрузку'}
          </h3>

        </div>


        <button
          type="button"
          className="eb-workload-close"
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


      <div className="eb-workload-form-grid">

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
              onChange
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
            required
          >

            <option value="">
              Выберите класс
            </option>


            {classes.map(
              (className) => (
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
              onChange
            }
            placeholder="Например: Математика"
            required
          />

        </label>


        <label>

          <span>
            Часов в неделю
          </span>

          <input
            type="number"
            name="weeklyHours"
            min="1"
            max="40"
            value={
              form.weeklyHours
            }
            onChange={
              onChange
            }
            required
          />

        </label>


        <label>

          <span>
            Подгруппа
          </span>

          <input
            name="groupName"
            value={
              form.groupName
            }
            onChange={
              onChange
            }
            placeholder="Необязательно"
          />

        </label>


        <label>

          <span>
            Учебный год
          </span>

          <input
            name="academicYear"
            value={
              form.academicYear
            }
            onChange={
              onChange
            }
            placeholder="2026/2027"
          />

        </label>

      </div>


      <label className="eb-workload-notes">

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
          placeholder="Необязательно"
        />

      </label>


      <button
        type="submit"
        className="eb-workload-submit"
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

            Назначить нагрузку
          </>
        )}

      </button>

    </form>
  )
}


/* =========================================================
   WORKLOAD CARD
========================================================= */

function WorkloadCard({
  workload,
  scheduleCandidate,
  canManage,
  onEdit,
  onDelete,
}) {
  const scheduleLessons =
    Number(
      scheduleCandidate
        ?.lessonCount ||
        0,
    )


  const weeklyHours =
    Number(
      workload.weeklyHours ||
        0,
    )


  const scheduleMatches =
    scheduleLessons >
      0 &&
    scheduleLessons ===
      weeklyHours


  const scheduleMismatch =
    scheduleLessons >
      0 &&
    scheduleLessons !==
      weeklyHours


  const canonicalSubject =
    getCanonicalSubject(
      workload.subject,
    )


  return (
    <article className="eb-workload-card">

      <div className="eb-workload-card-teacher">

        <div className="eb-workload-avatar">

          {String(
            workload.teacherName ||
              'У',
          )
            .charAt(0)
            .toUpperCase()}

        </div>


        <div>

          <span>
            Учитель
          </span>

          <strong>
            {workload.teacherName ||
              'Не указан'}
          </strong>

        </div>

      </div>


      <div className="eb-workload-card-main">

        <div className="eb-workload-subject">

          <BookOpen
            size={17}
          />

          <strong>
            {canonicalSubject}
          </strong>

        </div>


        <div className="eb-workload-card-meta">

          <span>

            <GraduationCap
              size={15}
            />

            {workload.className}

          </span>


          <span>

            <Clock3
              size={15}
            />

            {workload.weeklyHours}
            {' '}
            ч/нед.

          </span>


          {workload.groupName && (
            <span>

              <Users
                size={15}
              />

              {workload.groupName}

            </span>
          )}


          {workload.academicYear && (
            <span>

              <BriefcaseBusiness
                size={15}
              />

              {workload.academicYear}

            </span>
          )}

        </div>


        <div
          style={
            workloadScheduleStyle
          }
        >

          {scheduleMatches && (
            <span
              style={
                matchBadgeStyle
              }
            >

              <CheckCircle2
                size={14}
              />

              Расписание совпадает:
              {' '}
              {
                formatLessonsPerWeek(
                  scheduleLessons,
                )
              }

            </span>
          )}


          {scheduleMismatch && (
            <span
              style={
                mismatchBadgeStyle
              }
            >

              <AlertTriangle
                size={14}
              />

              Нагрузка:
              {' '}
              {weeklyHours}
              {' ч/нед. · расписание: '}
              {
                formatLessonsPerWeek(
                  scheduleLessons,
                )
              }
              {' · проверьте'}

            </span>
          )}


          {!scheduleCandidate && (
            <span
              style={
                noScheduleBadgeStyle
              }
            >

              <Info
                size={14}
              />

              В расписании уроков
              по этому назначению пока нет

            </span>
          )}

        </div>


        {workload.notes && (
          <p>
            {workload.notes}
          </p>
        )}

      </div>


      {canManage && (
        <div className="eb-workload-actions">

          <button
            type="button"
            onClick={
              onEdit
            }
            aria-label="Редактировать"
            title="Редактировать"
          >

            <Pencil
              size={17}
            />

          </button>


          <button
            type="button"
            onClick={
              onDelete
            }
            aria-label="Удалить"
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
   EMPTY
========================================================= */

function WorkloadEmpty({
  canManage,
  hasSchedule,
  onAdd,
}) {
  return (
    <div className="eb-workload-empty">

      <div className="eb-workload-empty-icon">

        {hasSchedule ? (
          <AlertTriangle
            size={30}
          />
        ) : (
          <UserRound
            size={30}
          />
        )}

      </div>


      <h3>
        {hasSchedule
          ? 'Расписание есть, нагрузка ещё не распределена'
          : 'Нагрузка пока не назначена'}
      </h3>


      <p>
        {hasSchedule
          ? 'EduBoost нашёл уроки в расписании. Проверьте предложения выше и подтвердите официальную нагрузку.'
          : 'Здесь появятся связи «учитель — предмет — класс — количество часов».'}
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

          Назначить нагрузку

        </button>
      )}

    </div>
  )
}


/* =========================================================
   INLINE STYLES
========================================================= */

const statWarningStyle = {
  borderColor:
    '#fed7aa',

  background:
    '#fffaf5',
}


const statWarningIconStyle = {
  background:
    '#ffedd5',

  color:
    '#ea580c',
}


const statHintStyle = {
  display:
    'block',

  marginTop:
    3,

  color:
    '#94a3b8',

  fontSize:
    9,

  lineHeight:
    1.3,
}


const scheduleWarningStyle = {
  marginBottom:
    20,

  padding:
    20,

  border:
    '1px solid #fed7aa',

  borderRadius:
    18,

  background:
    '#fffaf5',
}


const scheduleWarningHeaderStyle = {
  display:
    'flex',

  alignItems:
    'flex-start',

  gap:
    12,
}


const scheduleWarningIconStyle = {
  width:
    44,

  height:
    44,

  flexShrink:
    0,

  display:
    'grid',

  placeItems:
    'center',

  borderRadius:
    13,

  background:
    '#ffedd5',

  color:
    '#ea580c',
}


const scheduleWarningTitleStyle = {
  margin:
    0,

  color:
    '#9a3412',

  fontSize:
    18,
}


const scheduleWarningTextStyle = {
  margin:
    '6px 0 0',

  maxWidth:
    720,

  color:
    '#9a3412',

  fontSize:
    12,

  lineHeight:
    1.5,
}


const suggestionsGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(260px, 1fr))',

  gap:
    10,

  marginTop:
    16,
}


const suggestionCardStyle = {
  padding:
    14,

  border:
    '1px solid #fed7aa',

  borderRadius:
    14,

  background:
    '#ffffff',
}


const suggestionTopStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    10,
}


const suggestionAvatarStyle = {
  width:
    38,

  height:
    38,

  display:
    'grid',

  placeItems:
    'center',

  flexShrink:
    0,

  borderRadius:
    11,

  background:
    '#eff6ff',

  color:
    '#2563eb',

  fontWeight:
    800,
}


const suggestionTeacherStyle = {
  display:
    'block',

  color:
    '#0f274d',

  fontSize:
    13,
}


const suggestionMetaStyle = {
  display:
    'block',

  marginTop:
    3,

  color:
    '#64748b',

  fontSize:
    11,
}


const suggestionBottomStyle = {
  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    8,

  flexWrap:
    'wrap',

  marginTop:
    12,
}


const scheduleLessonsBadgeStyle = {
  display:
    'inline-flex',

  alignItems:
    'center',

  gap:
    5,

  color:
    '#475569',

  fontSize:
    11,

  fontWeight:
    700,
}


const selectTeacherHintStyle = {
  color:
    '#c2410c',

  fontSize:
    9,

  fontWeight:
    700,
}


const suggestionButtonStyle = {
  display:
    'inline-flex',

  alignItems:
    'center',

  gap:
    5,

  padding:
    '7px 10px',

  border:
    'none',

  borderRadius:
    9,

  background:
    '#2563eb',

  color:
    '#ffffff',

  fontSize:
    11,

  fontWeight:
    800,

  cursor:
    'pointer',
}


const refreshButtonStyle = {
  minWidth:
    46,

  height:
    46,

  display:
    'grid',

  placeItems:
    'center',

  border:
    '1px solid #dbeafe',

  borderRadius:
    12,

  background:
    '#eff6ff',

  color:
    '#2563eb',

  cursor:
    'pointer',
}


const workloadScheduleStyle = {
  display:
    'flex',

  flexWrap:
    'wrap',

  gap:
    7,

  marginTop:
    10,
}


const matchBadgeStyle = {
  display:
    'inline-flex',

  alignItems:
    'center',

  gap:
    5,

  padding:
    '6px 8px',

  borderRadius:
    8,

  background:
    '#dcfce7',

  color:
    '#166534',

  fontSize:
    10,

  fontWeight:
    700,
}


const mismatchBadgeStyle = {
  ...matchBadgeStyle,

  background:
    '#ffedd5',

  color:
    '#9a3412',
}


const noScheduleBadgeStyle = {
  ...matchBadgeStyle,

  background:
    '#f1f5f9',

  color:
    '#475569',
}


const noResultsStyle = {
  display:
    'grid',

  justifyItems:
    'center',

  gap:
    7,

  padding:
    32,

  textAlign:
    'center',

  color:
    '#64748b',
}


const resetButtonStyle = {
  marginTop:
    7,

  padding:
    '8px 12px',

  border:
    '1px solid #dbeafe',

  borderRadius:
    9,

  background:
    '#eff6ff',

  color:
    '#2563eb',

  fontWeight:
    700,

  cursor:
    'pointer',
}


export default AdminWorkloadPage