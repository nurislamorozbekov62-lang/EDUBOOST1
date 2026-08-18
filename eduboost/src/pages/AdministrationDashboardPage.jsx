import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileBarChart,
  GraduationCap,
  RefreshCcw,
  School,
  Settings,
  UserCog,
  Users,
} from 'lucide-react'

import {
  useNavigate,
} from 'react-router-dom'

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
  getAdminSchoolStudents,
} from '../services/supabaseAdminJournalService'


/* ========================================
   MAIN
======================================== */

function AdministrationDashboardPage() {
  const {
    user,
  } = useAuth()

  const navigate =
    useNavigate()

  if (
    user?.role ===
    ROLES.VICE_PRINCIPAL
  ) {
    return (
      <VicePrincipalDashboard
        user={user}
        navigate={navigate}
      />
    )
  }

  return (
    <BasicAdministrationDashboard
      user={user}
      navigate={navigate}
    />
  )
}


/* ========================================
   VICE PRINCIPAL
======================================== */

function VicePrincipalDashboard({
  user,
  navigate,
}) {
  const [
    schedule,
    setSchedule,
  ] = useState([])

  const [
    students,
    setStudents,
  ] = useState([])

  const [
    attendance,
    setAttendance,
  ] = useState([])

  const [
    journalLessons,
    setJournalLessons,
  ] = useState([])

  const [
    substitutions,
    setSubstitutions,
  ] = useState([])

  const [
    sources,
    setSources,
  ] = useState({
    schedule: false,
    students: false,
    attendance: false,
    journal: false,
    substitutions: false,
  })

  const [
    substitutionsReliable,
    setSubstitutionsReliable,
  ] = useState(true)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    refreshKey,
    setRefreshKey,
  ] = useState(0)

  const [
    lastUpdatedAt,
    setLastUpdatedAt,
  ] = useState(null)


  const today =
    getTodayIso()

  const weekdayNumber =
    getWeekdayNumber()

  const weekdayName =
    getWeekdayName()

  const isSunday =
    weekdayNumber === 7


  /* ========================================
     LOAD
  ======================================== */

  useEffect(() => {
    if (
      !user?.id ||
      (
        !user?.schoolId &&
        !user?.school
      )
    ) {
      setLoading(false)

      setError(
        'У пользователя не указана школа.',
      )

      return
    }

    void loadToday()
  }, [
    user?.id,
    user?.schoolId,
    user?.school,
    refreshKey,
  ])


  async function loadToday() {
    try {
      setLoading(true)
      setError('')

      const results =
        await Promise.allSettled([
          loadTodaySchedule(
            user,
            weekdayNumber,
          ),

          getAdminSchoolStudents(
            user,
          ),

          loadTodayAttendance(
            user,
            today,
          ),

          loadTodayJournalLessons(
            user,
            today,
          ),

          loadTodaySubstitutions(
            user,
            today,
          ),
        ])

      const [
        scheduleResult,
        studentsResult,
        attendanceResult,
        journalResult,
        substitutionsResult,
      ] = results


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
          'Vice principal schedule:',
          scheduleResult.reason,
        )

        setSchedule([])
      }


      /* STUDENTS */

      if (
        studentsResult.status ===
        'fulfilled'
      ) {
        setStudents(
          Array.isArray(
            studentsResult.value,
          )
            ? studentsResult.value
            : [],
        )
      } else {
        console.error(
          'Vice principal students:',
          studentsResult.reason,
        )

        setStudents([])
      }


      /* ATTENDANCE */

      if (
        attendanceResult.status ===
        'fulfilled'
      ) {
        setAttendance(
          Array.isArray(
            attendanceResult.value,
          )
            ? attendanceResult.value
            : [],
        )
      } else {
        console.error(
          'Vice principal attendance:',
          attendanceResult.reason,
        )

        setAttendance([])
      }


      /* JOURNAL */

      if (
        journalResult.status ===
        'fulfilled'
      ) {
        setJournalLessons(
          Array.isArray(
            journalResult.value,
          )
            ? journalResult.value
            : [],
        )
      } else {
        console.error(
          'Vice principal journal:',
          journalResult.reason,
        )

        setJournalLessons([])
      }


      /* SUBSTITUTIONS */

      if (
        substitutionsResult.status ===
        'fulfilled'
      ) {
        setSubstitutions(
          Array.isArray(
            substitutionsResult
              .value
              ?.rows,
          )
            ? substitutionsResult
                .value
                .rows
            : [],
        )

        setSubstitutionsReliable(
          substitutionsResult
            .value
            ?.reliable !== false,
        )
      } else {
        console.error(
          'Vice principal substitutions:',
          substitutionsResult.reason,
        )

        setSubstitutions([])

        setSubstitutionsReliable(
          false,
        )
      }


      const newSources = {
        schedule:
          scheduleResult.status ===
          'fulfilled',

        students:
          studentsResult.status ===
          'fulfilled',

        attendance:
          attendanceResult.status ===
          'fulfilled',

        journal:
          journalResult.status ===
          'fulfilled',

        substitutions:
          substitutionsResult.status ===
          'fulfilled',
      }

      setSources(
        newSources,
      )


      const failedSources = []

      if (
        !newSources.schedule
      ) {
        failedSources.push(
          'расписание',
        )
      }

      if (
        !newSources.students
      ) {
        failedSources.push(
          'учеников',
        )
      }

      if (
        !newSources.attendance
      ) {
        failedSources.push(
          'посещаемость',
        )
      }

      if (
        !newSources.journal
      ) {
        failedSources.push(
          'журнал',
        )
      }

      if (
        !newSources.substitutions ||
        (
          substitutionsResult.status ===
            'fulfilled' &&
          substitutionsResult.value
            ?.reliable === false
        )
      ) {
        failedSources.push(
          'замены',
        )
      }


      if (
        failedSources.length >
        0
      ) {
        setError(
          `Не удалось проверить: ${failedSources.join(
            ', ',
          )}. Остальные данные показаны.`,
        )
      }


      setLastUpdatedAt(
        new Date(),
      )
    } catch (
      loadError
    ) {
      console.error(
        'Vice principal dashboard:',
        loadError,
      )

      setError(
        loadError?.message ||
          'Не удалось загрузить данные на сегодня.',
      )
    } finally {
      setLoading(false)
    }
  }


  /* ========================================
     SCHEDULE
  ======================================== */

  const sortedSchedule =
    useMemo(() => {
      return [
        ...schedule,
      ].sort(
        (
          first,
          second,
        ) => {
          const lessonCompare =
            Number(
              first.lesson_number ||
                0,
            ) -
            Number(
              second.lesson_number ||
                0,
            )

          if (
            lessonCompare !==
            0
          ) {
            return lessonCompare
          }

          return String(
            first.start_time ||
              '',
          ).localeCompare(
            String(
              second.start_time ||
                '',
            ),
          )
        },
      )
    }, [
      schedule,
    ])


  /* ========================================
     FINISHED LESSONS
  ======================================== */

  const finishedLessons =
    useMemo(() => {
      const now =
        new Date()

      const currentMinutes =
        now.getHours() *
          60 +
        now.getMinutes()

      return sortedSchedule.filter(
        (lesson) => {
          const endMinutes =
            timeToMinutes(
              lesson.end_time,
            )

          if (
            endMinutes ===
            null
          ) {
            return false
          }

          return (
            endMinutes <=
            currentMinutes
          )
        },
      )
    }, [
      sortedSchedule,
    ])


  /* ========================================
     STUDENTS BY CLASS
  ======================================== */

  const studentsByClass =
    useMemo(() => {
      const map =
        new Map()

      students.forEach(
        (student) => {
          const className =
            normalizeText(
              student.className ||
                student.class_name,
            )

          if (
            !className
          ) {
            return
          }

          if (
            !map.has(
              className,
            )
          ) {
            map.set(
              className,
              [],
            )
          }

          map
            .get(
              className,
            )
            .push(
              student,
            )
        },
      )

      return map
    }, [
      students,
    ])


  /* ========================================
     CHECK FINISHED LESSONS
  ======================================== */

  const lessonChecks =
    useMemo(() => {
      return finishedLessons.map(
        (lesson) => {
          const className =
            lesson.class_name ||
            ''

          const subject =
            lesson.subject ||
            ''

          const teacherName =
            lesson.teacher_name ||
            ''


          const matchingJournal =
            journalLessons.filter(
              (row) =>
                rowsMatchLesson(
                  row,
                  lesson,
                ),
            )


          const topicFilled =
            !sources.journal
              ? null
              : matchingJournal.some(
                  (row) =>
                    Boolean(
                      String(
                        row.topic ||
                          row.lesson_topic ||
                          '',
                      ).trim(),
                    ),
                )


          const classStudents =
            studentsByClass.get(
              normalizeText(
                className,
              ),
            ) ||
            []


          const attendanceRows =
            attendance.filter(
              (row) =>
                rowsMatchLesson(
                  row,
                  lesson,
                ),
            )


          const markedStudentIds =
            new Set(
              attendanceRows
                .map(
                  (row) =>
                    row.student_id ||
                    row.studentId,
                )
                .filter(
                  Boolean,
                )
                .map(
                  String,
                ),
            )


          let attendanceFilled =
            null

          if (
            sources.attendance &&
            sources.students &&
            classStudents.length >
              0
          ) {
            attendanceFilled =
              markedStudentIds.size >=
              classStudents.length
          }


          return {
            lesson,

            className,

            subject,

            teacherName,

            topicFilled,

            attendanceFilled,

            expectedStudents:
              classStudents.length,

            markedStudents:
              markedStudentIds.size,

            complete:
              topicFilled === true &&
              attendanceFilled === true,
          }
        },
      )
    }, [
      finishedLessons,
      journalLessons,
      attendance,
      studentsByClass,
      sources.journal,
      sources.attendance,
      sources.students,
    ])


  const completedLessons =
    lessonChecks.filter(
      (item) =>
        item.complete,
    ).length


  const coreControlAvailable =
    sources.schedule &&
    sources.students &&
    sources.attendance &&
    sources.journal


  const substitutionsAvailable =
    sources.substitutions &&
    substitutionsReliable


  /* ========================================
     REAL ATTENTION ONLY
  ======================================== */

  const attentionItems =
    useMemo(() => {
      const items = []

      lessonChecks.forEach(
        (item) => {
          const reasons = []

          if (
            item.topicFilled ===
            false
          ) {
            reasons.push(
              'не заполнена тема урока',
            )
          }

          if (
            item.attendanceFilled ===
            false
          ) {
            reasons.push(
              `посещаемость ${item.markedStudents} из ${item.expectedStudents}`,
            )
          }


          if (
            reasons.length ===
            0
          ) {
            return
          }


          items.push({
            id:
              `lesson-${item.lesson.id}`,

            title:
              [
                item.className,
                item.subject,
              ]
                .filter(
                  Boolean,
                )
                .join(' · '),

            text:
              reasons.join(
                ' · ',
              ),

            meta:
              [
                formatTime(
                  item.lesson
                    .start_time,
                ),

                item.teacherName,
              ]
                .filter(
                  Boolean,
                )
                .join(' · '),

            path:
              item.topicFilled ===
              false
                ? '/admin/journals'
                : '/admin/attendance',

            level:
              item.attendanceFilled ===
              false
                ? 'danger'
                : 'warning',
          })
        },
      )

      return items.slice(
        0,
        8,
      )
    }, [
      lessonChecks,
    ])


  const sections =
    getSectionsByRole(
      ROLES.VICE_PRINCIPAL,
    )


  /* ========================================
     RENDER
  ======================================== */

  return (
    <div
      className="page-container"
    >

      {/* HEADER */}

      <section
        className="content-card"
        style={styles.header}
      >
        <div
          style={styles.headerTop}
        >
          <div>
            <p
              style={styles.eyebrow}
            >
              Учебный процесс
            </p>

            <h2
              style={styles.title}
            >
              Сегодня
            </h2>

            <p
              style={styles.subtitle}
            >
              {weekdayName}
              {', '}
              {formatLongDate(
                today,
              )}
            </p>
          </div>


          <button
            type="button"
            onClick={() =>
              setRefreshKey(
                (current) =>
                  current + 1,
              )
            }
            disabled={loading}
            style={{
              ...styles.refreshButton,

              opacity:
                loading
                  ? 0.6
                  : 1,

              cursor:
                loading
                  ? 'wait'
                  : 'pointer',
            }}
          >
            <RefreshCcw
              size={17}
            />

            {loading
              ? 'Обновляем'
              : 'Обновить'}
          </button>
        </div>


        <div
          style={styles.context}
        >
          <span
            style={styles.contextItem}
          >
            <School
              size={15}
            />

            {user.school ||
              'Школа'}
          </span>


          <span
            style={styles.contextItem}
          >
            <UserCog
              size={15}
            />

            {user.name ||
              'Завуч'}
          </span>


          {lastUpdatedAt && (
            <span
              style={
                styles.contextItem
              }
            >
              <Clock3
                size={15}
              />

              Обновлено{' '}
              {lastUpdatedAt
                .toLocaleTimeString(
                  'ru-RU',
                  {
                    hour:
                      '2-digit',

                    minute:
                      '2-digit',
                  },
                )}
            </span>
          )}
        </div>
      </section>


      {/* LOAD WARNING */}

      {error && (
        <section
          className="content-card"
        >
          <div
            style={styles.loadWarning}
          >
            <AlertTriangle
              size={18}
            />

            <span>
              {error}
            </span>
          </div>
        </section>
      )}


      {/* KPI */}

      <div
        style={styles.statsGrid}
      >
        <StatCard
          icon={CalendarDays}
          value={
            loading
              ? '…'
              : sources.schedule
                ? sortedSchedule.length
                : '—'
          }
          title="Уроков сегодня"
          text={
            loading
              ? 'Проверяем расписание'
              : !sources.schedule
                ? 'Не удалось проверить'
                : sortedSchedule.length >
                  0
                  ? `${finishedLessons.length} уже завершено`
                  : isSunday
                    ? 'Сегодня выходной'
                    : 'Уроков в расписании нет'
          }
          warning={
            !loading &&
            !sources.schedule
          }
        />


        <StatCard
          icon={BookOpenCheck}
          value={
            loading
              ? '…'
              : !coreControlAvailable
                ? '—'
                : finishedLessons.length >
                  0
                  ? `${completedLessons}/${finishedLessons.length}`
                  : '—'
          }
          title="Заполнено после уроков"
          text={
            loading
              ? 'Проверяем данные'
              : !coreControlAvailable
                ? 'Не удалось полностью проверить'
                : finishedLessons.length ===
                  0
                  ? 'Проверка появится после уроков'
                  : 'Тема + посещаемость'
          }
          warning={
            !loading &&
            coreControlAvailable &&
            finishedLessons.length >
              0 &&
            completedLessons <
              finishedLessons.length
          }
        />


        <StatCard
          icon={RefreshCcw}
          value={
            loading
              ? '…'
              : substitutionsAvailable
                ? substitutions.length
                : '—'
          }
          title="Замены сегодня"
          text={
            loading
              ? 'Проверяем замены'
              : !substitutionsAvailable
                ? 'Не удалось проверить'
                : substitutions.length >
                  0
                  ? 'Есть изменения'
                  : 'Замен нет'
          }
          warning={false}
        />
      </div>


      {/* STATUS */}

      {loading ? (
        <StatusCard
          icon={RefreshCcw}
          title="Проверяем учебный процесс"
          text="Загружаем расписание, журнал, посещаемость и замены."
          type="neutral"
        />
      ) : !sources.schedule ? (
        <StatusCard
          icon={AlertTriangle}
          title="Не удалось проверить учебный день"
          text="Расписание сейчас недоступно. Обновите данные и повторите проверку."
          type="warning"
        />
      ) : sortedSchedule.length ===
        0 ? (
        <StatusCard
          icon={CalendarDays}
          title={
            isSunday
              ? 'Сегодня выходной'
              : 'На сегодня уроков нет'
          }
          text={
            isSunday
              ? 'Отсутствие уроков сегодня не считается проблемой.'
              : 'Если сегодня должны быть занятия, проверьте расписание школы.'
          }
          type="neutral"
        />
      ) : !coreControlAvailable ? (
        <StatusCard
          icon={AlertTriangle}
          title="Не все данные удалось проверить"
          text="EduBoost не будет показывать ложный зелёный статус, пока журнал, посещаемость или список учеников недоступны."
          type="warning"
        />
      ) : attentionItems.length >
        0 ? (
        <section
          className="content-card"
        >
          <div
            style={styles.sectionHeader}
          >
            <div>
              <div
                style={styles.titleLine}
              >
                <h2
                  style={
                    styles.sectionTitle
                  }
                >
                  Требует внимания
                </h2>

                <span
                  style={
                    styles.attentionCount
                  }
                >
                  {
                    attentionItems.length
                  }
                </span>
              </div>

              <p
                style={
                  styles.sectionDescription
                }
              >
                Только реальные проблемы,
                которые нужно проверить.
              </p>
            </div>
          </div>


          <div
            style={
              styles.attentionList
            }
          >
            {attentionItems.map(
              (item) => (
                <AttentionItem
                  key={item.id}
                  item={item}
                  onOpen={() =>
                    navigate(
                      item.path,
                    )
                  }
                />
              ),
            )}
          </div>
        </section>
      ) : finishedLessons.length ===
        0 ? (
        <StatusCard
          icon={Clock3}
          title="Учебный день идёт"
          text="Контроль заполнения начнётся после окончания первых уроков."
          type="neutral"
        />
      ) : (
        <StatusCard
          icon={CheckCircle2}
          title="Сейчас ничего не требует внимания"
          text="По завершённым урокам темы и посещаемость заполнены."
          type="success"
        />
      )}


      {/* SUBSTITUTIONS INFO */}

      {!loading &&
        substitutionsAvailable &&
        substitutions.length >
          0 && (
        <section
          className="content-card"
        >
          <button
            type="button"
            onClick={() =>
              navigate(
                '/admin/substitutions',
              )
            }
            style={
              styles.infoAction
            }
          >
            <div
              style={
                styles.infoActionIcon
              }
            >
              <RefreshCcw
                size={18}
              />
            </div>

            <div
              style={
                styles.infoActionText
              }
            >
              <strong>
                Замены сегодня:{' '}
                {substitutions.length}
              </strong>

              <span>
                Открыть назначенные
                замены
              </span>
            </div>

            <ChevronRight
              size={17}
            />
          </button>
        </section>
      )}


      {/* WORK SECTIONS */}

      <section
        className="content-card"
      >
        <div
          style={styles.sectionHeader}
        >
          <div>
            <h2
              style={
                styles.sectionTitle
              }
            >
              Рабочие разделы
            </h2>

            <p
              style={
                styles.sectionDescription
              }
            >
              Подробности открываются
              только когда они нужны.
            </p>
          </div>
        </div>


        <div
          style={styles.sectionsGrid}
        >
          {sections.map(
            (section) => (
              <SectionButton
                key={section.path}
                section={section}
                onOpen={() =>
                  navigate(
                    section.path,
                  )
                }
              />
            ),
          )}
        </div>
      </section>

    </div>
  )
}


/* ========================================
   BASIC ADMIN / DIRECTOR FALLBACK
======================================== */

function BasicAdministrationDashboard({
  user,
  navigate,
}) {
  const sections =
    getSectionsByRole(
      user?.role,
    )

  const roleInfo =
    getRoleInfo(
      user?.role,
    )

  return (
    <div
      className="page-container"
    >
      <section
        className="content-card"
      >
        <div
          style={styles.basicHeader}
        >
          <div>
            <p
              style={styles.eyebrow}
            >
              {roleInfo.eyebrow}
            </p>

            <h2
              style={styles.title}
            >
              {roleInfo.title}
            </h2>

            <p
              style={styles.basicText}
            >
              {roleInfo.description}
            </p>
          </div>


          <div
            style={styles.schoolBadge}
          >
            <School
              size={19}
            />

            <div>
              <span
                style={
                  styles.schoolLabel
                }
              >
                Школа
              </span>

              <strong
                style={
                  styles.schoolName
                }
              >
                {user?.school ||
                  'Не указана'}
              </strong>
            </div>
          </div>
        </div>
      </section>


      <section
        className="content-card"
      >
        <div
          style={styles.sectionHeader}
        >
          <div>
            <h2
              style={
                styles.sectionTitle
              }
            >
              Рабочие разделы
            </h2>

            <p
              style={
                styles.sectionDescription
              }
            >
              Выберите нужный раздел.
            </p>
          </div>
        </div>


        <div
          style={styles.sectionsGrid}
        >
          {sections.map(
            (section) => (
              <SectionButton
                key={section.path}
                section={section}
                onOpen={() =>
                  navigate(
                    section.path,
                  )
                }
              />
            ),
          )}
        </div>
      </section>
    </div>
  )
}


/* ========================================
   COMPONENTS
======================================== */

function StatCard({
  icon: Icon,
  value,
  title,
  text,
  warning = false,
}) {
  return (
    <div
      style={{
        ...styles.statCard,

        ...(warning
          ? styles.statCardWarning
          : {}),
      }}
    >
      <div
        style={{
          ...styles.statIcon,

          ...(warning
            ? styles.statIconWarning
            : {}),
        }}
      >
        <Icon
          size={21}
        />
      </div>

      <div>
        <strong
          style={styles.statValue}
        >
          {value}
        </strong>

        <div
          style={styles.statTitle}
        >
          {title}
        </div>

        <p
          style={styles.statText}
        >
          {text}
        </p>
      </div>
    </div>
  )
}


function StatusCard({
  icon: Icon,
  title,
  text,
  type = 'neutral',
}) {
  const variant =
    type === 'success'
      ? styles.statusSuccess
      : type === 'warning'
        ? styles.statusWarning
        : styles.statusNeutral

  return (
    <section
      className="content-card"
    >
      <div
        style={{
          ...styles.statusBase,
          ...variant,
        }}
      >
        <Icon
          size={28}
        />

        <div>
          <strong
            style={styles.statusTitle}
          >
            {title}
          </strong>

          <p
            style={styles.statusText}
          >
            {text}
          </p>
        </div>
      </div>
    </section>
  )
}


function AttentionItem({
  item,
  onOpen,
}) {
  const danger =
    item.level ===
    'danger'

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        ...styles.attentionRow,

        ...(danger
          ? styles.attentionDanger
          : styles.attentionWarning),
      }}
    >
      <div
        style={{
          ...styles.attentionIcon,

          ...(danger
            ? styles.attentionDangerIcon
            : styles.attentionWarningIcon),
        }}
      >
        <AlertTriangle
          size={18}
        />
      </div>


      <div
        style={styles.attentionBody}
      >
        <strong
          style={styles.attentionTitle}
        >
          {item.title}
        </strong>

        <span
          style={styles.attentionText}
        >
          {item.text}
        </span>

        {item.meta && (
          <span
            style={styles.attentionMeta}
          >
            {item.meta}
          </span>
        )}
      </div>


      <span
        style={styles.openText}
      >
        Открыть

        <ChevronRight
          size={15}
        />
      </span>
    </button>
  )
}


function SectionButton({
  section,
  onOpen,
}) {
  const Icon =
    section.icon

  return (
    <button
      type="button"
      onClick={onOpen}
      style={styles.sectionButton}
    >
      <div
        style={styles.sectionIcon}
      >
        <Icon
          size={20}
        />
      </div>


      <div
        style={styles.sectionText}
      >
        <strong
          style={styles.sectionButtonTitle}
        >
          {section.title}
        </strong>

        <span
          style={styles.sectionButtonText}
        >
          {section.shortDescription}
        </span>
      </div>


      <ChevronRight
        size={17}
        style={{
          color:
            '#94a3b8',
        }}
      />
    </button>
  )
}


/* ========================================
   SUPABASE LOADERS
======================================== */

async function querySchoolRows({
  table,
  user,
  configure,
}) {
  let firstError =
    null


  async function runQuery(
    field,
    value,
  ) {
    let query =
      supabase
        .from(table)
        .select('*')
        .eq(
          field,
          value,
        )

    if (
      configure
    ) {
      query =
        configure(
          query,
        )
    }

    return await query
  }


  if (
    user?.schoolId
  ) {
    const result =
      await runQuery(
        'school_id',
        user.schoolId,
      )

    if (
      !result.error
    ) {
      return (
        result.data ||
        []
      )
    }

    firstError =
      result.error
  }


  /*
    Старые таблицы могут
    использовать school text.
  */

  if (
    user?.school
  ) {
    const result =
      await runQuery(
        'school',
        user.school,
      )

    if (
      !result.error
    ) {
      return (
        result.data ||
        []
      )
    }

    if (
      !firstError
    ) {
      firstError =
        result.error
    }
  }


  throw new Error(
    firstError?.message ||
      `Не удалось загрузить ${table}.`,
  )
}


async function loadTodaySchedule(
  user,
  weekdayNumber,
) {
  const rows =
    await querySchoolRows({
      table:
        'schedule_lessons',

      user,

      configure:
        (query) =>
          query
            .eq(
              'weekday',
              weekdayNumber,
            )
            .limit(
              1000,
            ),
    })

  return rows.filter(
    (row) =>
      Number(
        row.weekday,
      ) ===
      Number(
        weekdayNumber,
      ),
  )
}


async function loadTodayAttendance(
  user,
  today,
) {
  return await querySchoolRows({
    table:
      'attendance_records',

    user,

    configure:
      (query) =>
        query
          .eq(
            'attendance_date',
            today,
          )
          .limit(
            10000,
          ),
  })
}


async function loadTodayJournalLessons(
  user,
  today,
) {
  try {
    return await querySchoolRows({
      table:
        'journal_lessons',

      user,

      configure:
        (query) =>
          query
            .eq(
              'lesson_date',
              today,
            )
            .limit(
              2000,
            ),
    })
  } catch (
    dateColumnError
  ) {
    console.warn(
      'journal_lessons date fallback:',
      dateColumnError,
    )

    const rows =
      await querySchoolRows({
        table:
          'journal_lessons',

        user,

        configure:
          (query) =>
            query.limit(
              2000,
            ),
      })

    return rows.filter(
      (row) =>
        getRowDate(
          row,
        ) ===
        today,
    )
  }
}


async function loadTodaySubstitutions(
  user,
  today,
) {
  const rows =
    await querySchoolRows({
      table:
        'teacher_substitutions',

      user,

      configure:
        (query) =>
          query.limit(
            1000,
          ),
    })


  if (
    rows.length ===
    0
  ) {
    return {
      rows: [],
      reliable: true,
    }
  }


  const datedRows =
    rows.filter(
      (row) =>
        Boolean(
          getSubstitutionDate(
            row,
          ),
        ),
    )


  if (
    datedRows.length ===
    0
  ) {
    return {
      rows: [],
      reliable: false,
    }
  }


  return {
    rows:
      datedRows.filter(
        (row) =>
          getSubstitutionDate(
            row,
          ) ===
          today,
      ),

    reliable:
      true,
  }
}


/* ========================================
   MATCHING
======================================== */

function rowsMatchLesson(
  row,
  lesson,
) {
  const scheduleLessonId =
    row.schedule_lesson_id ||
    row.scheduleLessonId


  /*
    Если существует точная связь
    с расписанием — используем её.
  */

  if (
    scheduleLessonId &&
    lesson?.id
  ) {
    return (
      String(
        scheduleLessonId,
      ) ===
      String(
        lesson.id,
      )
    )
  }


  const sameClass =
    normalizeText(
      row.class_name ||
        row.className,
    ) ===
    normalizeText(
      lesson.class_name ||
        lesson.className,
    )


  const sameSubject =
    normalizeSubject(
      row.subject,
    ) ===
    normalizeSubject(
      lesson.subject,
    )


  if (
    !sameClass ||
    !sameSubject
  ) {
    return false
  }


  const lessonTeacherId =
    lesson.teacher_id ||
    lesson.teacherId

  const rowTeacherId =
    row.teacher_id ||
    row.teacherId


  if (
    lessonTeacherId &&
    rowTeacherId
  ) {
    return (
      String(
        lessonTeacherId,
      ) ===
      String(
        rowTeacherId,
      )
    )
  }


  const lessonTeacherName =
    normalizeText(
      lesson.teacher_name ||
        lesson.teacherName,
    )

  const rowTeacherName =
    normalizeText(
      row.teacher_name ||
        row.teacherName,
    )


  if (
    lessonTeacherName &&
    rowTeacherName
  ) {
    return (
      lessonTeacherName ===
      rowTeacherName
    )
  }


  return true
}


function normalizeSubject(
  value,
) {
  const subject =
    normalizeText(
      value,
    )
      .replaceAll(
        'ё',
        'е',
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


  const aliases = {
    'русский':
      'русский язык',

    'русский язык':
      'русский язык',

    'орус тили':
      'русский язык',

    'кыргызский':
      'кыргызский язык',

    'кыргызский язык':
      'кыргызский язык',

    'кыргыз тили':
      'кыргызский язык',

    'английский':
      'английский язык',

    'английский язык':
      'английский язык',

    'english':
      'английский язык',

    'англис тили':
      'английский язык',

    'физкультура':
      'физическая культура',

    'физическая культура':
      'физическая культура',
  }


  return (
    aliases[
      subject
    ] ||
    subject
  )
}


/* ========================================
   DATE HELPERS
======================================== */

function getTodayIso() {
  const now =
    new Date()

  const local =
    new Date(
      now.getTime() -
        now.getTimezoneOffset() *
          60000,
    )

  return local
    .toISOString()
    .slice(
      0,
      10,
    )
}


function getWeekdayNumber() {
  const day =
    new Date()
      .getDay()

  return (
    day === 0
      ? 7
      : day
  )
}


function getWeekdayName() {
  const names = [
    'Воскресенье',
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
  ]

  return (
    names[
      new Date()
        .getDay()
    ] ||
    ''
  )
}


function formatLongDate(
  value,
) {
  if (
    !value
  ) {
    return ''
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


function getRowDate(
  row,
) {
  return normalizeDate(
    row.lesson_date ||
      row.date ||
      row.journal_date ||
      '',
  )
}


function getSubstitutionDate(
  row,
) {
  return normalizeDate(
    row.substitution_date ||
      row.substitute_date ||
      row.lesson_date ||
      row.date ||
      '',
  )
}


function normalizeDate(
  value,
) {
  if (
    !value
  ) {
    return ''
  }

  return String(
    value,
  ).slice(
    0,
    10,
  )
}


function formatTime(
  value,
) {
  if (
    !value
  ) {
    return ''
  }

  return String(
    value,
  ).slice(
    0,
    5,
  )
}


function timeToMinutes(
  value,
) {
  if (
    !value
  ) {
    return null
  }

  const [
    hours,
    minutes,
  ] =
    String(
      value,
    )
      .slice(
        0,
        5,
      )
      .split(':')
      .map(Number)


  if (
    Number.isNaN(
      hours,
    ) ||
    Number.isNaN(
      minutes,
    )
  ) {
    return null
  }

  return (
    hours *
      60 +
    minutes
  )
}


function normalizeText(
  value,
) {
  return String(
    value ||
      '',
  )
    .trim()
    .toLowerCase()
}


/* ========================================
   ROLE SECTIONS
======================================== */

function getSectionsByRole(
  role,
) {
  if (
    role ===
    ROLES.SCHOOL_ADMIN
  ) {
    return [
      {
        path:
          '/admin/users',

        title:
          'Пользователи',

        shortDescription:
          'Ученики и родители',

        icon:
          Users,
      },

      {
        path:
          '/admin/classes',

        title:
          'Классы',

        shortDescription:
          'Состав классов',

        icon:
          School,
      },

      {
        path:
          '/admin/staff',

        title:
          'Сотрудники',

        shortDescription:
          'Учителя и администрация',

        icon:
          UserCog,
      },

      {
        path:
          '/admin/school-year',

        title:
          'Учебный год',

        shortDescription:
          'Четверти и каникулы',

        icon:
          CalendarDays,
      },

      {
        path:
          '/admin/import',

        title:
          'Импорт данных',

        shortDescription:
          'Массовая загрузка',

        icon:
          ClipboardList,
      },

      {
        path:
          '/admin/settings',

        title:
          'Настройки школы',

        shortDescription:
          'Параметры школы',

        icon:
          Settings,
      },
    ]
  }


  if (
    role ===
    ROLES.VICE_PRINCIPAL
  ) {
    return [
      {
        path:
          '/admin/schedule',

        title:
          'Расписание',

        shortDescription:
          'Уроки и кабинеты',

        icon:
          CalendarDays,
      },

      {
        path:
          '/admin/workload',

        title:
          'Нагрузка',

        shortDescription:
          'Часы учителей',

        icon:
          UserCog,
      },

      {
        path:
          '/admin/substitutions',

        title:
          'Замены',

        shortDescription:
          'Замены учителей',

        icon:
          RefreshCcw,
      },

      {
        path:
          '/admin/journals',

        title:
          'Журналы',

        shortDescription:
          'Темы и оценки',

        icon:
          BookOpenCheck,
      },

      {
        path:
          '/admin/attendance',

        title:
          'Посещаемость',

        shortDescription:
          'Пропуски и опоздания',

        icon:
          CheckCircle2,
      },

      {
        path:
          '/admin/reports',

        title:
          'Отчёты',

        shortDescription:
          'Итоги и показатели',

        icon:
          FileBarChart,
      },
    ]
  }


  if (
    role ===
    ROLES.DIRECTOR
  ) {
    return [
      {
        path:
          '/admin/analytics',

        title:
          'Аналитика',

        shortDescription:
          'Показатели школы',

        icon:
          BarChart3,
      },

      {
        path:
          '/admin/reports',

        title:
          'Отчёты',

        shortDescription:
          'Учебные итоги',

        icon:
          FileBarChart,
      },

      {
        path:
          '/admin/journals',

        title:
          'Журналы',

        shortDescription:
          'Контроль журналов',

        icon:
          GraduationCap,
      },

      {
        path:
          '/admin/attendance',

        title:
          'Посещаемость',

        shortDescription:
          'Пропуски',

        icon:
          CheckCircle2,
      },

      {
        path:
          '/admin/staff',

        title:
          'Сотрудники',

        shortDescription:
          'Состав школы',

        icon:
          UserCog,
      },

      {
        path:
          '/admin/schedule',

        title:
          'Расписание',

        shortDescription:
          'Расписание школы',

        icon:
          CalendarDays,
      },
    ]
  }

  return []
}


function getRoleInfo(
  role,
) {
  if (
    role ===
    ROLES.SCHOOL_ADMIN
  ) {
    return {
      eyebrow:
        'Администрирование',

      title:
        'Панель администратора',

      description:
        'Пользователи, структура школы и системные настройки.',
    }
  }


  if (
    role ===
    ROLES.DIRECTOR
  ) {
    return {
      eyebrow:
        'Управление школой',

      title:
        'Кабинет директора',

      description:
        'Основные показатели и контроль работы школы.',
    }
  }


  return {
    eyebrow:
      'EduBoost',

    title:
      'Администрация',

    description:
      'Управление образовательной организацией.',
  }
}


/* ========================================
   STYLES
======================================== */

const styles = {
  header: {
    marginBottom:
      16,
  },

  headerTop: {
    display:
      'flex',

    alignItems:
      'flex-start',

    justifyContent:
      'space-between',

    gap:
      16,

    flexWrap:
      'wrap',
  },

  eyebrow: {
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

  title: {
    margin:
      '5px 0 0',

    color:
      '#0f274d',

    fontSize:
      25,
  },

  subtitle: {
    margin:
      '6px 0 0',

    color:
      '#64748b',

    fontSize:
      13,
  },

  refreshButton: {
    display:
      'inline-flex',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap:
      7,

    minHeight:
      41,

    padding:
      '0 13px',

    border:
      '1px solid #dbeafe',

    borderRadius:
      11,

    background:
      '#eff6ff',

    color:
      '#1d4ed8',

    fontWeight:
      800,
  },

  context: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      14,

    flexWrap:
      'wrap',

    marginTop:
      16,

    paddingTop:
      13,

    borderTop:
      '1px solid #eef2f7',
  },

  contextItem: {
    display:
      'inline-flex',

    alignItems:
      'center',

    gap:
      5,

    color:
      '#64748b',

    fontSize:
      11,
  },

  loadWarning: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      9,

    color:
      '#9a3412',

    fontSize:
      12,
  },

  statsGrid: {
    display:
      'grid',

    gridTemplateColumns:
      'repeat(auto-fit, minmax(220px, 1fr))',

    gap:
      11,

    marginBottom:
      16,
  },

  statCard: {
    display:
      'flex',

    alignItems:
      'flex-start',

    gap:
      12,

    minHeight:
      115,

    padding:
      17,

    border:
      '1px solid #e2e8f0',

    borderRadius:
      17,

    background:
      '#ffffff',
  },

  statCardWarning: {
    background:
      '#fffaf5',

    borderColor:
      '#fed7aa',
  },

  statIcon: {
    width:
      43,

    height:
      43,

    flexShrink:
      0,

    display:
      'grid',

    placeItems:
      'center',

    borderRadius:
      12,

    background:
      '#eff6ff',

    color:
      '#2563eb',
  },

  statIconWarning: {
    background:
      '#ffedd5',

    color:
      '#c2410c',
  },

  statValue: {
    display:
      'block',

    color:
      '#0f274d',

    fontSize:
      24,

    lineHeight:
      1,
  },

  statTitle: {
    marginTop:
      6,

    color:
      '#334155',

    fontSize:
      13,

    fontWeight:
      800,
  },

  statText: {
    margin:
      '5px 0 0',

    color:
      '#64748b',

    fontSize:
      10,

    lineHeight:
      1.45,
  },

  statusBase: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      12,

    padding:
      17,

    borderRadius:
      13,

    margin:
      0,
  },

  statusNeutral: {
    border:
      '1px solid #e2e8f0',

    background:
      '#f8fafc',

    color:
      '#64748b',
  },

  statusSuccess: {
    border:
      '1px solid #bbf7d0',

    background:
      '#f0fdf4',

    color:
      '#16a34a',
  },

  statusWarning: {
    border:
      '1px solid #fed7aa',

    background:
      '#fff7ed',

    color:
      '#ea580c',
  },

  statusTitle: {
    display:
      'block',

    color:
      '#334155',

    fontSize:
      12,

    fontWeight:
      800,
  },

  statusText: {
    margin:
      '4px 0 0',

    color:
      '#64748b',

    fontSize:
      10,

    lineHeight:
      1.45,
  },

  sectionHeader: {
    display:
      'flex',

    alignItems:
      'flex-start',

    justifyContent:
      'space-between',

    gap:
      12,

    flexWrap:
      'wrap',

    marginBottom:
      15,
  },

  titleLine: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      8,
  },

  sectionTitle: {
    margin:
      0,

    color:
      '#0f274d',

    fontSize:
      20,
  },

  sectionDescription: {
    margin:
      '5px 0 0',

    color:
      '#64748b',

    fontSize:
      11,
  },

  attentionCount: {
    display:
      'inline-grid',

    placeItems:
      'center',

    minWidth:
      24,

    height:
      24,

    padding:
      '0 7px',

    borderRadius:
      999,

    background:
      '#fee2e2',

    color:
      '#991b1b',

    fontSize:
      10,

    fontWeight:
      800,
  },

  attentionList: {
    display:
      'grid',

    gap:
      8,
  },

  attentionRow: {
    width:
      '100%',

    display:
      'flex',

    alignItems:
      'center',

    gap:
      10,

    padding:
      12,

    borderRadius:
      12,

    textAlign:
      'left',

    cursor:
      'pointer',
  },

  attentionDanger: {
    border:
      '1px solid #fecaca',

    background:
      '#fff7f7',
  },

  attentionWarning: {
    border:
      '1px solid #fed7aa',

    background:
      '#fffaf5',
  },

  attentionIcon: {
    width:
      37,

    height:
      37,

    flexShrink:
      0,

    display:
      'grid',

    placeItems:
      'center',

    borderRadius:
      10,
  },

  attentionDangerIcon: {
    background:
      '#fee2e2',

    color:
      '#dc2626',
  },

  attentionWarningIcon: {
    background:
      '#ffedd5',

    color:
      '#ea580c',
  },

  attentionBody: {
    flex:
      1,

    minWidth:
      0,
  },

  attentionTitle: {
    display:
      'block',

    color:
      '#0f274d',

    fontSize:
      12,

    fontWeight:
      800,
  },

  attentionText: {
    display:
      'block',

    marginTop:
      3,

    color:
      '#64748b',

    fontSize:
      10,
  },

  attentionMeta: {
    display:
      'block',

    marginTop:
      4,

    color:
      '#94a3b8',

    fontSize:
      9,
  },

  openText: {
    display:
      'inline-flex',

    alignItems:
      'center',

    gap:
      2,

    color:
      '#2563eb',

    fontSize:
      10,

    fontWeight:
      800,
  },

  infoAction: {
    width:
      '100%',

    display:
      'flex',

    alignItems:
      'center',

    gap:
      11,

    padding:
      12,

    border:
      '1px solid #bfdbfe',

    borderRadius:
      12,

    background:
      '#f8fbff',

    color:
      '#2563eb',

    textAlign:
      'left',

    cursor:
      'pointer',
  },

  infoActionIcon: {
    width:
      38,

    height:
      38,

    display:
      'grid',

    placeItems:
      'center',

    borderRadius:
      10,

    background:
      '#dbeafe',
  },

  infoActionText: {
    display:
      'grid',

    gap:
      2,

    flex:
      1,

    color:
      '#0f274d',

    fontSize:
      11,
  },

  sectionsGrid: {
    display:
      'grid',

    gridTemplateColumns:
      'repeat(auto-fit, minmax(230px, 1fr))',

    gap:
      9,
  },

  sectionButton: {
    width:
      '100%',

    display:
      'flex',

    alignItems:
      'center',

    gap:
      10,

    padding:
      12,

    border:
      '1px solid #e2e8f0',

    borderRadius:
      12,

    background:
      '#ffffff',

    textAlign:
      'left',

    cursor:
      'pointer',
  },

  sectionIcon: {
    width:
      39,

    height:
      39,

    flexShrink:
      0,

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

  sectionText: {
    flex:
      1,

    minWidth:
      0,
  },

  sectionButtonTitle: {
    display:
      'block',

    color:
      '#0f274d',

    fontSize:
      12,
  },

  sectionButtonText: {
    display:
      'block',

    marginTop:
      3,

    color:
      '#64748b',

    fontSize:
      9,
  },

  basicHeader: {
    display:
      'flex',

    alignItems:
      'flex-start',

    justifyContent:
      'space-between',

    gap:
      16,

    flexWrap:
      'wrap',
  },

  basicText: {
    margin:
      '7px 0 0',

    maxWidth:
      600,

    color:
      '#64748b',

    fontSize:
      12,
  },

  schoolBadge: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      9,

    padding:
      '10px 12px',

    border:
      '1px solid #e2e8f0',

    borderRadius:
      12,

    background:
      '#f8fafc',

    color:
      '#2563eb',
  },

  schoolLabel: {
    display:
      'block',

    color:
      '#94a3b8',

    fontSize:
      9,

    textTransform:
      'uppercase',
  },

  schoolName: {
    display:
      'block',

    marginTop:
      2,

    color:
      '#0f274d',

    fontSize:
      12,
  },
}


export default AdministrationDashboardPage