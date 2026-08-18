import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  BookOpen,
  CalendarDays,
  Clock3,
  DoorOpen,
  GraduationCap,
  LoaderCircle,
  School,
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
  getScheduleForTeacher,
  getTodayName,
} from '../services/supabaseScheduleService'

import {
  createSupabaseJournalLesson,
  getSupabaseJournalLessonBySchedule,
} from '../services/supabaseJournalLessonService'


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


const DAY_NUMBERS = {
  Понедельник: 1,
  Вторник: 2,
  Среда: 3,
  Четверг: 4,
  Пятница: 5,
  Суббота: 6,
}


/* =========================================================
   PAGE
========================================================= */

function TeacherSchedulePage() {
  const {
    user,
  } = useAuth()

  const navigate =
    useNavigate()


  const [
    allLessons,
    setAllLessons,
  ] = useState([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    selectedDay,
    setSelectedDay,
  ] = useState(() => {
    const today =
      getTodayName()

    return DAYS.includes(
      today,
    )
      ? today
      : 'Понедельник'
  })


  useEffect(() => {
    void loadLessons()
  }, [
    user?.id,
    user?.role,
    user?.school,
    user?.schoolId,
  ])


  async function loadLessons() {
    if (
      !user ||
      user.role !==
        ROLES.TEACHER
    ) {
      setAllLessons([])
      setLoading(false)

      return
    }


    try {
      setLoading(true)
      setError('')


      const lessons =
        await getScheduleForTeacher(
          user,
        )


      setAllLessons(
        Array.isArray(
          lessons,
        )
          ? lessons
          : [],
      )
    } catch (
      loadError
    ) {
      setError(
        loadError?.message ||
          'Не удалось загрузить расписание.',
      )

      setAllLessons([])
    } finally {
      setLoading(false)
    }
  }


  const lessonsForDay =
    useMemo(
      () =>
        allLessons
          .filter(
            (lesson) =>
              lesson.day ===
              selectedDay,
          )
          .sort(
            (
              first,
              second,
            ) => {
              const firstNumber =
                Number(
                  first.lessonNumber,
                ) || 999


              const secondNumber =
                Number(
                  second.lessonNumber,
                ) || 999


              if (
                firstNumber !==
                secondNumber
              ) {
                return (
                  firstNumber -
                  secondNumber
                )
              }


              return String(
                first.startTime ||
                  '',
              ).localeCompare(
                String(
                  second.startTime ||
                    '',
                ),
              )
            },
          ),
      [
        allLessons,
        selectedDay,
      ],
    )


  const classes =
    useMemo(
      () =>
        [
          ...new Set(
            allLessons
              .map(
                (lesson) =>
                  lesson.className,
              )
              .filter(
                Boolean,
              ),
          ),
        ].sort(
          (
            first,
            second,
          ) =>
            first.localeCompare(
              second,
              'ru',
              {
                numeric:
                  true,
              },
            ),
        ),
      [
        allLessons,
      ],
    )


  const today =
    getTodayName()


  const todayLessonsCount =
    useMemo(
      () =>
        allLessons.filter(
          (lesson) =>
            lesson.day ===
            today,
        ).length,
      [
        allLessons,
        today,
      ],
    )


  if (!user) {
    return null
  }


  if (
    user.role !==
    ROLES.TEACHER
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
            только учителям.
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
            Кабинет учителя
          </span>

          <h1>
            Моё
            <br />
            расписание
          </h1>

          <p>
            Выберите день и откройте
            конкретный урок для работы
            с темой, посещаемостью,
            оценками и домашним заданием.
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

            <BookOpen
              size={20}
            />

          </div>

          <div>

            <strong>
              {allLessons.length}
            </strong>

            <span>
              Уроков в неделю
            </span>

          </div>

        </div>


        <div className="eb-ts-overview-card">

          <div className="eb-ts-overview-icon eb-ts-green">

            <School
              size={20}
            />

          </div>

          <div>

            <strong>
              {classes.length}
            </strong>

            <span>
              Моих классов
            </span>

          </div>

        </div>


        <div className="eb-ts-overview-card">

          <div className="eb-ts-overview-icon eb-ts-blue">

            <GraduationCap
              size={20}
            />

          </div>

          <div>

            <strong>
              {todayLessonsCount}
            </strong>

            <span>
              Уроков сегодня
            </span>

          </div>

        </div>

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
                  {SHORT_DAYS[
                    day
                  ]}
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
          DAY SCHEDULE
      ========================= */}

      <section className="eb-ts-section">

        <div className="eb-ts-section-header">

          <div>

            <span>
              Моё расписание
            </span>

            <h2>
              {selectedDay}
            </h2>

            <p
              style={{
                margin:
                  '5px 0 0',

                color:
                  '#718096',

                fontSize:
                  13,
              }}
            >
              {formatDate(
                getDateForDay(
                  selectedDay,
                ),
              )}
            </p>

          </div>

        </div>


        {error && (
          <div className="eb-ts-message eb-ts-error">

            <XCircle
              size={18}
            />

            {error}

          </div>
        )}


        {loading ? (
          <div className="eb-ts-loading">
            Загрузка расписания...
          </div>
        ) : lessonsForDay.length ===
        0 ? (
          <TeacherScheduleEmpty />
        ) : (
          <div className="eb-ts-lessons">

            {lessonsForDay.map(
              (lesson) => (
                <TeacherLessonCard
                  key={
                    lesson.id
                  }
                  lesson={
                    lesson
                  }
                  selectedDay={
                    selectedDay
                  }
                  teacher={
                    user
                  }
                  navigate={
                    navigate
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
   LESSON CARD
========================================================= */

function TeacherLessonCard({
  lesson,
  selectedDay,
  teacher,
  navigate,
}) {
  const [
    opening,
    setOpening,
  ] = useState(false)

  const [
    openError,
    setOpenError,
  ] = useState('')


  const lessonDate =
    getDateForDay(
      selectedDay,
    )


  async function handleOpenLesson() {
    if (
      !lesson?.id ||
      !teacher?.id
    ) {
      return
    }


    try {
      setOpening(true)
      setOpenError('')


      /*
        1. Сначала ищем фактический урок,
           уже связанный с этой строкой
           расписания на конкретную дату.
      */

      let journalLesson =
        await getSupabaseJournalLessonBySchedule({
          scheduleLessonId:
            lesson.id,

          date:
            lessonDate,
        })


      /*
        2. Если такого урока ещё нет,
           создаём journal_lesson.
      */

      if (!journalLesson) {
        journalLesson =
          await createSupabaseJournalLesson({
            teacher,

            className:
              lesson.className,

            subject:
              lesson.subject,

            quarter:
              getQuarterForDate(
                lessonDate,
              ),

            date:
              lessonDate,

            topic:
              '',

            scheduleLessonId:
              lesson.id,
          })
      }


      if (
        !journalLesson?.id
      ) {
        throw new Error(
          'Не удалось получить карточку урока.',
        )
      }


      navigate(
        `/school-lessons/${journalLesson.id}`,
      )
    } catch (
      error
    ) {
      console.error(
        'Open school lesson:',
        error,
      )

      setOpenError(
        error?.message ||
          'Не удалось открыть урок.',
      )
    } finally {
      setOpening(false)
    }
  }


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


          {lesson.className && (
            <div>

              <GraduationCap
                size={15}
              />

              <span>
                {lesson.className}
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

        </div>


        {lesson.description && (
          <p>
            {lesson.description}
          </p>
        )}


        <div
          style={{
            display:
              'flex',

            alignItems:
              'center',

            justifyContent:
              'space-between',

            gap:
              12,

            flexWrap:
              'wrap',

            marginTop:
              14,

            paddingTop:
              14,

            borderTop:
              '1px solid #edf2f7',
          }}
        >
          <div>
            <small
              style={{
                display:
                  'block',

                marginBottom:
                  3,

                color:
                  '#94a3b8',

                fontSize:
                  11,

                fontWeight:
                  700,

                textTransform:
                  'uppercase',
              }}
            >
              Дата урока
            </small>

            <strong
              style={{
                color:
                  '#334155',

                fontSize:
                  13,
              }}
            >
              {formatDate(
                lessonDate,
              )}
            </strong>
          </div>


          <button
            type="button"
            disabled={
              opening
            }
            onClick={
              handleOpenLesson
            }
            style={{
              display:
                'inline-flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              gap:
                7,

              minHeight:
                40,

              padding:
                '9px 14px',

              border:
                'none',

              borderRadius:
                10,

              background:
                '#2563eb',

              color:
                '#ffffff',

              fontSize:
                13,

              fontWeight:
                800,

              cursor:
                opening
                  ? 'wait'
                  : 'pointer',

              opacity:
                opening
                  ? 0.7
                  : 1,
            }}
          >
            {opening ? (
              <LoaderCircle
                size={17}
              />
            ) : (
              <BookOpen
                size={17}
              />
            )}

            {opening
              ? 'Открываем...'
              : 'Открыть урок'}
          </button>
        </div>


        {openError && (
          <div
            style={{
              marginTop:
                10,

              padding:
                '9px 11px',

              borderRadius:
                9,

              background:
                '#fff1f2',

              color:
                '#be123c',

              fontSize:
                12,

              lineHeight:
                1.45,
            }}
          >
            {openError}
          </div>
        )}

      </div>

    </article>
  )
}


/* =========================================================
   EMPTY
========================================================= */

function TeacherScheduleEmpty() {
  return (
    <div className="eb-ts-empty">

      <div className="eb-ts-empty-icon">

        <CalendarDays
          size={29}
        />

      </div>

      <h3>
        Уроков нет
      </h3>

      <p>
        На этот день вам пока
        не назначены уроки.
        Если расписание должно
        быть другим, обратитесь
        к завучу.
      </p>

    </div>
  )
}


/* =========================================================
   DATE HELPERS
========================================================= */

function getDateForDay(
  dayName,
) {
  const targetDay =
    DAY_NUMBERS[
      dayName
    ] ||
    1


  const today =
    new Date()


  const currentDay =
    today.getDay()


  /*
    JS:
    Sunday = 0
    Monday = 1
    ...
    Saturday = 6

    Получаем понедельник
    текущей недели.
  */

  const distanceToMonday =
    currentDay === 0
      ? -6
      : 1 -
        currentDay


  const monday =
    new Date(
      today,
    )


  monday.setHours(
    12,
    0,
    0,
    0,
  )


  monday.setDate(
    today.getDate() +
      distanceToMonday,
  )


  const result =
    new Date(
      monday,
    )


  result.setDate(
    monday.getDate() +
      targetDay -
      1,
  )


  return toLocalDateString(
    result,
  )
}


function toLocalDateString(
  date,
) {
  const year =
    date.getFullYear()


  const month =
    String(
      date.getMonth() +
        1,
    ).padStart(
      2,
      '0',
    )


  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    )


  return `${year}-${month}-${day}`
}


/*
  Пока это резервный расчёт четверти.

  Позже четверть будет приходить
  из настроек учебного года школы.

  Для текущего MVP:
  сентябрь–октябрь = 1
  ноябрь–декабрь = 2
  январь–март = 3
  апрель–июнь = 4

  Июль/август → 1 для тестирования.
*/

function getQuarterForDate(
  dateString,
) {
  const date =
    new Date(
      `${dateString}T12:00:00`,
    )


  const month =
    date.getMonth() +
    1


  if (
    month >= 9 &&
    month <= 10
  ) {
    return 1
  }


  if (
    month >= 11 &&
    month <= 12
  ) {
    return 2
  }


  if (
    month >= 1 &&
    month <= 3
  ) {
    return 3
  }


  if (
    month >= 4 &&
    month <= 6
  ) {
    return 4
  }


  return 1
}


function formatDate(
  value,
) {
  if (!value) {
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


export default TeacherSchedulePage