import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  RefreshCcw,
  Search,
  UserRound,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  ROLES,
} from '../config/access'

import {
  getAdminSchoolClasses,
  getAdminSchoolStudents,
  getAdminSchoolTeachers,
  getAdminStudentsByClass,
} from '../services/supabaseAdminJournalService'

import {
  calculateSupabaseAttendanceStats,
  getAttendanceStatusLabel,
  getSupabaseClassAttendance,
} from '../services/supabaseAttendanceService'


const DEFAULT_SUBJECTS = [
  'Математика',
  'Русский язык',
  'Кыргызский язык',
  'Английский язык',
  'История',
  'Информатика',
  'Физика',
  'Химия',
  'Биология',
  'География',
  'Физическая культура',
  'Другое',
]


function getToday() {
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


function AdminAttendancePage() {
  const {
    user,
  } = useAuth()


  const [
    classes,
    setClasses,
  ] = useState([])

  const [
    teachers,
    setTeachers,
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
    selectedDate,
    setSelectedDate,
  ] = useState(
    getToday(),
  )

  const [
    selectedClass,
    setSelectedClass,
  ] = useState(
    'all',
  )

  const [
    selectedTeacherId,
    setSelectedTeacherId,
  ] = useState(
    'all',
  )

  const [
    selectedSubject,
    setSelectedSubject,
  ] = useState(
    'all',
  )

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState(
    'all',
  )

  const [
    search,
    setSearch,
  ] = useState('')


  const [
    baseLoading,
    setBaseLoading,
  ] = useState(true)

  const [
    attendanceLoading,
    setAttendanceLoading,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    warning,
    setWarning,
  ] = useState('')

  const [
    refreshKey,
    setRefreshKey,
  ] = useState(0)


  const allowed =
    user?.role ===
      ROLES.VICE_PRINCIPAL ||
    user?.role ===
      ROLES.DIRECTOR


  /* ========================================
     INITIAL DATA
  ======================================== */

  useEffect(() => {
    if (
      !user?.id ||
      !allowed
    ) {
      return
    }

    void loadBaseData()
  }, [
    user?.id,
    user?.schoolId,
    user?.school,
    user?.role,
  ])


  async function loadBaseData() {
    try {
      setBaseLoading(true)
      setError('')
      setWarning('')

      const [
        classesResult,
        teachersResult,
        studentsResult,
      ] =
        await Promise.allSettled([
          getAdminSchoolClasses(
            user,
          ),

          getAdminSchoolTeachers(
            user,
          ),

          getAdminSchoolStudents(
            user,
          ),
        ])


      if (
        classesResult.status !==
        'fulfilled'
      ) {
        throw classesResult.reason
      }


      const safeClasses =
        Array.isArray(
          classesResult.value,
        )
          ? classesResult.value
          : []


      setClasses(
        safeClasses,
      )

      setAttendance([])


      setSelectedClass(
        (current) =>
          current === 'all' ||
          safeClasses.includes(
            current,
          )
            ? current
            : 'all',
      )


      /* TEACHERS */

      if (
        teachersResult.status ===
        'fulfilled'
      ) {
        const safeTeachers =
          Array.isArray(
            teachersResult.value,
          )
            ? teachersResult.value
            : []

        setTeachers(
          safeTeachers,
        )

        setSelectedTeacherId(
          (current) =>
            current === 'all' ||
            safeTeachers.some(
              (teacher) =>
                String(
                  teacher.id,
                ) ===
                String(
                  current,
                ),
            )
              ? current
              : 'all',
        )
      } else {
        console.error(
          'Admin attendance teachers:',
          teachersResult.reason,
        )

        setTeachers([])
        setSelectedTeacherId(
          'all',
        )

        setWarning(
          'Список учителей не загрузился. Общая посещаемость доступна.',
        )
      }


      /* STUDENTS */

      if (
        studentsResult.status ===
        'fulfilled'
      ) {
        const safeStudents =
          Array.isArray(
            studentsResult.value,
          )
            ? studentsResult.value
            : []

        setStudents(
          deduplicateStudents(
            safeStudents,
          ),
        )

        return
      }


      console.error(
        'Admin attendance students:',
        studentsResult.reason,
      )


      /*
        Fallback:
        если общий список учеников
        не загрузился, загружаем
        учеников отдельно по классам.
      */

      const fallbackResults =
        await Promise.allSettled(
          safeClasses.map(
            (className) =>
              getAdminStudentsByClass(
                user,
                className,
              ),
          ),
        )


      const fallbackStudents =
        fallbackResults
          .filter(
            (result) =>
              result.status ===
              'fulfilled',
          )
          .flatMap(
            (result) =>
              Array.isArray(
                result.value,
              )
                ? result.value
                : [],
          )


      const uniqueFallbackStudents =
        deduplicateStudents(
          fallbackStudents,
        )

      setStudents(
        uniqueFallbackStudents,
      )


      if (
        uniqueFallbackStudents.length ===
          0 &&
        safeClasses.length >
          0
      ) {
        setWarning(
          'Классы загрузились, но список учеников получить не удалось.',
        )
      }
    } catch (
      loadError
    ) {
      console.error(
        'Admin attendance initial:',
        loadError,
      )

      setClasses([])
      setTeachers([])
      setStudents([])
      setAttendance([])

      setError(
        loadError?.message ||
          'Не удалось загрузить данные школы.',
      )
    } finally {
      setBaseLoading(false)
    }
  }


  /* ========================================
     LOAD ATTENDANCE
  ======================================== */

  useEffect(() => {
    if (
      !user?.id ||
      !allowed ||
      baseLoading ||
      classes.length === 0 ||
      !selectedDate
    ) {
      return
    }

    void loadAttendance()
  }, [
    user?.id,
    user?.schoolId,
    user?.school,
    selectedDate,
    selectedClass,
    selectedSubject,
    classes,
    baseLoading,
    refreshKey,
  ])


  async function loadAttendance() {
    try {
      setAttendanceLoading(
        true,
      )

      setError('')


      const targetClasses =
        selectedClass ===
        'all'
          ? classes
          : [
              selectedClass,
            ]


      const results = []

      const batchSize = 8


      for (
        let index = 0;
        index <
        targetClasses.length;
        index += batchSize
      ) {
        const batch =
          targetClasses.slice(
            index,
            index +
              batchSize,
          )


        const batchResults =
          await Promise.allSettled(
            batch.map(
              (className) =>
                getSupabaseClassAttendance({
                  teacher:
                    user,

                  className,

                  subject:
                    selectedSubject ===
                    'all'
                      ? undefined
                      : selectedSubject,

                  dateFrom:
                    selectedDate,

                  dateTo:
                    selectedDate,
                }),
            ),
          )


        results.push(
          ...batchResults,
        )
      }


      const failedResults =
        results.filter(
          (result) =>
            result.status ===
            'rejected',
        )

      const successfulResults =
        results.filter(
          (result) =>
            result.status ===
            'fulfilled',
        )


      if (
        successfulResults.length ===
          0 &&
        failedResults.length >
          0
      ) {
        throw (
          failedResults[0]
            .reason
        )
      }


      if (
        failedResults.length >
        0
      ) {
        setWarning(
          `Не удалось загрузить посещаемость для ${failedResults.length} класс(ов). Остальные данные показаны.`,
        )
      } else {
        setWarning('')
      }


      /*
        Убираем дубли.
      */

      const recordMap =
        new Map()


      successfulResults
        .flatMap(
          (result) =>
            Array.isArray(
              result.value,
            )
              ? result.value
              : [],
        )
        .forEach(
          (record) => {
            if (
              !record
            ) {
              return
            }


            if (
              record.id
            ) {
              recordMap.set(
                String(
                  record.id,
                ),
                record,
              )

              return
            }


            const fallbackKey =
              [
                record.studentId,
                record.className,
                record.subject,
                record.teacherId,
                record.date,
                record.status,
              ].join('|')


            recordMap.set(
              fallbackKey,
              record,
            )
          },
        )


      setAttendance(
        [
          ...recordMap.values(),
        ],
      )
    } catch (
      loadError
    ) {
      console.error(
        'Admin school attendance:',
        loadError,
      )

      setAttendance([])

      setError(
        loadError?.message ||
          'Не удалось загрузить посещаемость школы.',
      )
    } finally {
      setAttendanceLoading(
        false,
      )
    }
  }


  /* ========================================
     STUDENT MAPS
  ======================================== */

  const studentsMap =
    useMemo(() => {
      const map =
        new Map()

      students.forEach(
        (student) => {
          if (
            !student?.id
          ) {
            return
          }

          map.set(
            String(
              student.id,
            ),
            student,
          )
        },
      )

      return map
    }, [
      students,
    ])


  const studentsByClass =
    useMemo(() => {
      const map =
        new Map()

      students.forEach(
        (student) => {
          const className =
            getStudentClassName(
              student,
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
     TEACHER
  ======================================== */

  const selectedTeacher =
    useMemo(() => {
      if (
        selectedTeacherId ===
        'all'
      ) {
        return null
      }

      return (
        teachers.find(
          (teacher) =>
            String(
              teacher.id,
            ) ===
            String(
              selectedTeacherId,
            ),
        ) ||
        null
      )
    }, [
      teachers,
      selectedTeacherId,
    ])


  /* ========================================
     SUBJECT OPTIONS
  ======================================== */

  const subjectOptions =
    useMemo(() => {
      const subjects =
        new Set(
          DEFAULT_SUBJECTS,
        )

      attendance.forEach(
        (record) => {
          if (
            record?.subject
          ) {
            subjects.add(
              record.subject,
            )
          }
        },
      )

      return [
        ...subjects,
      ]
    }, [
      attendance,
    ])


  /* ========================================
     TEACHER FILTER
  ======================================== */

  const scopedAttendance =
    useMemo(() => {
      if (
        selectedTeacherId ===
        'all'
      ) {
        return attendance
      }


      return attendance.filter(
        (record) => {
          const sameTeacherId =
            String(
              record.teacherId ||
                '',
            ) ===
            String(
              selectedTeacherId,
            )


          const sameTeacherName =
            selectedTeacher?.name &&
            normalizeText(
              record.teacherName,
            ) ===
              normalizeText(
                selectedTeacher.name,
              )


          return (
            sameTeacherId ||
            sameTeacherName
          )
        },
      )
    }, [
      attendance,
      selectedTeacherId,
      selectedTeacher,
    ])


  /* ========================================
     DETAIL FILTERS
  ======================================== */

  const visibleAttendance =
    useMemo(() => {
      const searchValue =
        normalizeText(
          search,
        )


      return scopedAttendance.filter(
        (record) => {
          if (
            selectedStatus !==
              'all' &&
            record.status !==
              selectedStatus
          ) {
            return false
          }


          if (
            !searchValue
          ) {
            return true
          }


          const student =
            studentsMap.get(
              String(
                record.studentId,
              ),
            )


          const searchable =
            [
              student?.name,
              record.teacherName,
              record.className,
              record.subject,
              record.comment,
              getAttendanceStatusLabel(
                record.status,
              ),
            ]
              .filter(
                Boolean,
              )
              .join(' ')
              .toLowerCase()


          return searchable.includes(
            searchValue,
          )
        },
      )
    }, [
      scopedAttendance,
      selectedStatus,
      search,
      studentsMap,
    ])


  /* ========================================
     SELECTED STUDENTS
  ======================================== */

  const scopedStudents =
    useMemo(() => {
      if (
        selectedClass ===
        'all'
      ) {
        return students
      }

      return students.filter(
        (student) =>
          normalizeText(
            getStudentClassName(
              student,
            ),
          ) ===
          normalizeText(
            selectedClass,
          ),
      )
    }, [
      students,
      selectedClass,
    ])


  const totalStudentsInScope =
    scopedStudents.length


  /* ========================================
     STATS
  ======================================== */

  const stats =
    useMemo(
      () =>
        calculateSupabaseAttendanceStats(
          scopedAttendance,
        ),
      [
        scopedAttendance,
      ],
    )


  const uniqueMarkedStudents =
    useMemo(() => {
      return new Set(
        scopedAttendance
          .map(
            (record) =>
              record.studentId,
          )
          .filter(
            Boolean,
          )
          .map(
            String,
          ),
      ).size
    }, [
      scopedAttendance,
    ])


  const attendancePercent =
    scopedAttendance.length >
    0
      ? `${stats.percent || 0}%`
      : '—'


  /* ========================================
     CLASS STATS
  ======================================== */

  const classStats =
    useMemo(() => {
      const targetClassNames =
        selectedClass ===
        'all'
          ? classes
          : [
              selectedClass,
            ]


      return targetClassNames.map(
        (className) => {
          const classStudents =
            studentsByClass.get(
              normalizeText(
                className,
              ),
            ) ||
            studentsByClass.get(
              className,
            ) ||
            []


          /*
            StudentsByClass map ниже
            нормализуем через дополнительный
            безопасный поиск.
          */

          const realStudents =
            classStudents.length >
            0
              ? classStudents
              : students.filter(
                  (student) =>
                    normalizeText(
                      getStudentClassName(
                        student,
                      ),
                    ) ===
                    normalizeText(
                      className,
                    ),
                )


          const records =
            scopedAttendance.filter(
              (record) => {
                const recordClass =
                  getRecordClassName(
                    record,
                    studentsMap,
                  )

                return (
                  normalizeText(
                    recordClass,
                  ) ===
                  normalizeText(
                    className,
                  )
                )
              },
            )


          const classAttendance =
            calculateSupabaseAttendanceStats(
              records,
            )


          const markedStudents =
            new Set(
              records
                .map(
                  (record) =>
                    record.studentId,
                )
                .filter(
                  Boolean,
                )
                .map(
                  String,
                ),
            ).size


          return {
            className,

            totalStudents:
              realStudents.length,

            totalMarks:
              records.length,

            markedStudents,

            ...classAttendance,
          }
        },
      )
    }, [
      classes,
      selectedClass,
      scopedAttendance,
      students,
      studentsByClass,
      studentsMap,
    ])


  /* ========================================
     MISSING MARKS
  ======================================== */

  const canJudgeClassCompletion =
    selectedTeacherId ===
      'all' &&
    selectedSubject ===
      'all'


  const missingClassRows =
    useMemo(() => {
      if (
        !canJudgeClassCompletion
      ) {
        return []
      }


      return classStats.filter(
        (row) =>
          row.totalStudents >
            0 &&
          row.totalMarks ===
            0,
      )
    }, [
      classStats,
      canJudgeClassCompletion,
    ])


  /* ========================================
     ATTENTION
  ======================================== */

  const attentionRecords =
    useMemo(() => {
      return scopedAttendance
        .filter(
          (record) =>
            record.status ===
              'absent' ||
            record.status ===
              'late',
        )
        .sort(
          (
            first,
            second,
          ) => {
            if (
              first.status ===
                'absent' &&
              second.status !==
                'absent'
            ) {
              return -1
            }

            if (
              second.status ===
                'absent' &&
              first.status !==
                'absent'
            ) {
              return 1
            }

            return getStudentName(
              first.studentId,
              studentsMap,
            ).localeCompare(
              getStudentName(
                second.studentId,
                studentsMap,
              ),
              'ru',
            )
          },
        )
    }, [
      scopedAttendance,
      studentsMap,
    ])


  /* ========================================
     DETAILS
  ======================================== */

  const sortedAttendance =
    useMemo(() => {
      return [
        ...visibleAttendance,
      ].sort(
        (
          first,
          second,
        ) => {
          const firstClass =
            getRecordClassName(
              first,
              studentsMap,
            )

          const secondClass =
            getRecordClassName(
              second,
              studentsMap,
            )


          const classCompare =
            String(
              firstClass,
            ).localeCompare(
              String(
                secondClass,
              ),
              'ru',
              {
                numeric:
                  true,
              },
            )


          if (
            classCompare !==
            0
          ) {
            return classCompare
          }


          return getStudentName(
            first.studentId,
            studentsMap,
          ).localeCompare(
            getStudentName(
              second.studentId,
              studentsMap,
            ),
            'ru',
          )
        },
      )
    }, [
      visibleAttendance,
      studentsMap,
    ])


  const hasDetailFilters =
    selectedStatus !==
      'all' ||
    search.trim() !==
      ''


  function resetDetailFilters() {
    setSelectedStatus(
      'all',
    )

    setSearch('')
  }


  function handleRefresh() {
    setRefreshKey(
      (current) =>
        current + 1,
    )
  }


  /* ========================================
     ACCESS
  ======================================== */

  if (
    !user
  ) {
    return null
  }


  if (
    !allowed
  ) {
    return (
      <div
        className="page-container"
      >
        <section
          className="content-card"
        >
          <h2>
            Доступ запрещён
          </h2>

          <p>
            Посещаемость школы доступна
            завучу и директору.
          </p>
        </section>
      </div>
    )
  }


  const isLoading =
    baseLoading ||
    attendanceLoading


  /* ========================================
     PAGE
  ======================================== */

  return (
    <div
      className="page-container"
    >

      <div
        style={
          topActionsStyle
        }
      >
        <div>
          <strong
            style={
              dateTitleStyle
            }
          >
            {formatDate(
              selectedDate,
            )}
          </strong>

          <span
            style={
              dateSubtitleStyle
            }
          >
            Контроль посещаемости
            по школе
          </span>
        </div>


        <button
          type="button"
          onClick={
            handleRefresh
          }
          disabled={
            isLoading
          }
          style={
            refreshButtonStyle(
              isLoading,
            )
          }
        >
          <RefreshCcw
            size={17}
          />

          {attendanceLoading
            ? 'Обновляем...'
            : 'Обновить'}
        </button>
      </div>


      {/* STATS */}

      <div
        style={
          statsGridStyle
        }
      >
        <StatCard
          icon={
            GraduationCap
          }
          value={
            totalStudentsInScope
          }
          label="Учеников"
          helper={
            selectedClass ===
            'all'
              ? 'В выбранных классах'
              : selectedClass
          }
        />


        <StatCard
          icon={
            CalendarDays
          }
          value={
            scopedAttendance.length
          }
          label="Отметок"
          helper={
            `${uniqueMarkedStudents} отмечено учеников`
          }
        />


        <StatCard
          icon={
            CheckCircle2
          }
          value={
            stats.present ||
            0
          }
          label="Присутствовали"
        />


        <StatCard
          icon={
            AlertTriangle
          }
          value={
            stats.absent ||
            0
          }
          label="Отсутствовали"
          danger={
            Number(
              stats.absent ||
                0,
            ) >
            0
          }
        />


        <StatCard
          icon={
            Clock3
          }
          value={
            stats.late ||
            0
          }
          label="Опоздали"
          warning={
            Number(
              stats.late ||
                0,
            ) >
            0
          }
        />


        <StatCard
          icon={
            GraduationCap
          }
          value={
            attendancePercent
          }
          label="Посещаемость"
          helper={
            scopedAttendance.length >
            0
              ? 'По имеющимся отметкам'
              : 'Данных пока нет'
          }
        />
      </div>


      {/* FILTERS */}

      <section
        className="content-card"
      >
        <div
          style={
            filterHeaderStyle
          }
        >
          <div>
            <strong
              style={
                filterTitleStyle
              }
            >
              Фильтры
            </strong>

            <span
              style={
                filterSubtitleStyle
              }
            >
              Выбери дату, класс,
              учителя или предмет
            </span>
          </div>


          {hasDetailFilters && (
            <button
              type="button"
              onClick={
                resetDetailFilters
              }
              style={
                resetButtonStyle
              }
            >
              Сбросить поиск и статус
            </button>
          )}
        </div>


        <div
          style={
            filtersStyle
          }
        >
          <label
            className="form-group"
          >
            <span>
              Дата
            </span>

            <input
              type="date"
              value={
                selectedDate
              }
              onChange={
                (event) =>
                  setSelectedDate(
                    event.target.value,
                  )
              }
              disabled={
                baseLoading
              }
            />
          </label>


          <label
            className="form-group"
          >
            <span>
              Класс
            </span>

            <select
              value={
                selectedClass
              }
              onChange={
                (event) =>
                  setSelectedClass(
                    event.target.value,
                  )
              }
              disabled={
                baseLoading
              }
            >
              <option
                value="all"
              >
                Все классы
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


          <label
            className="form-group"
          >
            <span>
              Учитель
            </span>

            <select
              value={
                selectedTeacherId
              }
              onChange={
                (event) =>
                  setSelectedTeacherId(
                    event.target.value,
                  )
              }
              disabled={
                baseLoading
              }
            >
              <option
                value="all"
              >
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
          </label>


          <label
            className="form-group"
          >
            <span>
              Предмет
            </span>

            <select
              value={
                selectedSubject
              }
              onChange={
                (event) =>
                  setSelectedSubject(
                    event.target.value,
                  )
              }
              disabled={
                baseLoading
              }
            >
              <option
                value="all"
              >
                Все предметы
              </option>

              {subjectOptions.map(
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
          </label>


          <label
            className="form-group"
          >
            <span>
              Статус
            </span>

            <select
              value={
                selectedStatus
              }
              onChange={
                (event) =>
                  setSelectedStatus(
                    event.target.value,
                  )
              }
            >
              <option
                value="all"
              >
                Все статусы
              </option>

              <option
                value="present"
              >
                Присутствует
              </option>

              <option
                value="absent"
              >
                Отсутствует
              </option>

              <option
                value="late"
              >
                Опоздал
              </option>

              <option
                value="excused"
              >
                Уважительная
              </option>
            </select>
          </label>


          <label
            className="form-group"
          >
            <span>
              Поиск
            </span>

            <div
              style={
                searchBoxStyle
              }
            >
              <Search
                size={18}
              />

              <input
                value={
                  search
                }
                onChange={
                  (event) =>
                    setSearch(
                      event.target.value,
                    )
                }
                placeholder="Ученик или учитель"
                style={
                  searchInputStyle
                }
              />
            </div>
          </label>
        </div>
      </section>


      {error && (
        <section
          className="content-card"
        >
          <div
            className="auth-error"
          >
            {error}
          </div>
        </section>
      )}


      {warning &&
        !error && (
        <section
          style={
            warningCardStyle
          }
        >
          <AlertTriangle
            size={18}
          />

          <span>
            {warning}
          </span>
        </section>
      )}


      {/* CLASS SUMMARY */}

      <section
        className="content-card"
      >
        <div
          style={
            sectionHeaderStyle
          }
        >
          <div>
            <p
              style={
                eyebrowStyle
              }
            >
              {formatDate(
                selectedDate,
              )}
            </p>

            <h2
              style={
                sectionTitleStyle
              }
            >
              Сводка по классам
            </h2>
          </div>


          <div
            style={
              readonlyStyle
            }
          >
            Только просмотр
          </div>
        </div>


        {isLoading ? (
          <p
            className="empty-text"
          >
            Загружаем посещаемость...
          </p>
        ) : classStats.length ===
          0 ? (
          <EmptyState
            icon={
              CalendarDays
            }
            title="Классы не найдены"
            text="Для выбранной школы пока нет классов."
          />
        ) : (
          <div
            style={
              tableWrapperStyle
            }
          >
            <table
              style={{
                ...tableStyle,

                minWidth:
                  950,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={
                      headerLeftStyle
                    }
                  >
                    Класс
                  </th>

                  <th
                    style={
                      headerStyle
                    }
                  >
                    Ученики
                  </th>

                  <th
                    style={
                      headerStyle
                    }
                  >
                    Отмечено
                  </th>

                  <th
                    style={
                      headerStyle
                    }
                  >
                    Отметок
                  </th>

                  <th
                    style={
                      headerStyle
                    }
                  >
                    Были
                  </th>

                  <th
                    style={
                      headerStyle
                    }
                  >
                    Нет
                  </th>

                  <th
                    style={
                      headerStyle
                    }
                  >
                    Опоздали
                  </th>

                  <th
                    style={
                      headerStyle
                    }
                  >
                    Уваж.
                  </th>

                  <th
                    style={
                      headerStyle
                    }
                  >
                    %
                  </th>
                </tr>
              </thead>


              <tbody>
                {classStats.map(
                  (row) => (
                    <tr
                      key={
                        row.className
                      }
                    >
                      <td
                        style={
                          bodyLeftStyle
                        }
                      >
                        <div
                          style={
                            classNameCellStyle
                          }
                        >
                          <strong>
                            {row.className}
                          </strong>


                          {row.totalStudents ===
                            0 && (
                            <span
                              style={
                                emptyClassBadgeStyle
                              }
                            >
                              Нет учеников
                            </span>
                          )}


                          {row.totalStudents >
                            0 &&
                            row.totalMarks ===
                              0 && (
                            <span
                              style={
                                notFilledBadgeStyle
                              }
                            >
                              Нет отметок
                            </span>
                          )}
                        </div>
                      </td>


                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {
                          row.totalStudents
                        }
                      </td>


                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {
                          row.markedStudents
                        }
                      </td>


                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {
                          row.totalMarks
                        }
                      </td>


                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {
                          row.present ||
                          0
                        }
                      </td>


                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {
                          row.absent ||
                          0
                        }
                      </td>


                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {
                          row.late ||
                          0
                        }
                      </td>


                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {
                          row.excused ||
                          0
                        }
                      </td>


                      <td
                        style={
                          bodyStyle
                        }
                      >
                        <strong>
                          {row.totalMarks >
                          0
                            ? `${row.percent || 0}%`
                            : '—'}
                        </strong>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>


      {/* ATTENTION */}

      <section
        className="content-card"
      >
        <div
          style={
            sectionHeaderStyle
          }
        >
          <div>
            <p
              style={
                eyebrowStyle
              }
            >
              Контроль
            </p>

            <h2
              style={
                sectionTitleStyle
              }
            >
              Требуют внимания
            </h2>
          </div>


          <div
            style={
              attentionCounterStyle
            }
          >
            {
              attentionRecords.length +
              missingClassRows.length
            }
          </div>
        </div>


        {isLoading ? (
          <p
            className="empty-text"
          >
            Проверяем данные...
          </p>
        ) : attentionRecords.length ===
            0 &&
          missingClassRows.length ===
            0 &&
          canJudgeClassCompletion ? (
          <div
            style={
              successStateStyle
            }
          >
            <CheckCircle2
              size={22}
            />

            <div>
              <strong>
                Критичных отметок нет
              </strong>

              <span>
                Нет пропусков,
                опозданий и классов
                с учениками без отметок.
              </span>
            </div>
          </div>
        ) : (
          <div
            style={
              attentionGridStyle
            }
          >
            <div
              style={
                attentionPanelStyle
              }
            >
              <div
                style={
                  attentionPanelHeaderStyle
                }
              >
                <AlertTriangle
                  size={18}
                />

                <strong>
                  Пропуски и опоздания
                </strong>
              </div>


              {attentionRecords.length ===
                0 ? (
                <p
                  style={
                    smallMutedStyle
                  }
                >
                  Нет проблемных отметок.
                </p>
              ) : (
                <div
                  style={
                    attentionListStyle
                  }
                >
                  {attentionRecords
                    .slice(
                      0,
                      6,
                    )
                    .map(
                      (record) => {
                        const student =
                          studentsMap.get(
                            String(
                              record.studentId,
                            ),
                          )

                        return (
                          <div
                            key={
                              record.id ||
                              `${record.studentId}-${record.subject}-${record.teacherId}`
                            }
                            style={
                              attentionItemStyle
                            }
                          >
                            <div
                              style={
                                attentionStudentStyle
                              }
                            >
                              <strong>
                                {student?.name ||
                                  'Ученик'}
                              </strong>

                              <span>
                                {getRecordClassName(
                                  record,
                                  studentsMap,
                                )}

                                {record.subject
                                  ? ` · ${record.subject}`
                                  : ''}
                              </span>
                            </div>


                            <AttendanceBadge
                              status={
                                record.status
                              }
                            />
                          </div>
                        )
                      },
                    )}


                  {attentionRecords.length >
                    6 && (
                    <span
                      style={
                        moreTextStyle
                      }
                    >
                      Ещё{' '}
                      {
                        attentionRecords.length -
                        6
                      }{' '}
                      отметок
                    </span>
                  )}
                </div>
              )}
            </div>


            <div
              style={
                attentionPanelStyle
              }
            >
              <div
                style={
                  attentionPanelHeaderStyle
                }
              >
                <CalendarDays
                  size={18}
                />

                <strong>
                  Классы без отметок
                </strong>
              </div>


              {!canJudgeClassCompletion ? (
                <p
                  style={
                    smallMutedStyle
                  }
                >
                  Для проверки выбери
                  «Все учителя» и
                  «Все предметы».
                </p>
              ) : missingClassRows.length ===
                0 ? (
                <p
                  style={
                    smallMutedStyle
                  }
                >
                  Нет классов с учениками
                  без отметок.
                </p>
              ) : (
                <div
                  style={
                    classChipListStyle
                  }
                >
                  {missingClassRows.map(
                    (row) => (
                      <span
                        key={
                          row.className
                        }
                        style={
                          classChipStyle
                        }
                      >
                        {row.className}
                      </span>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>


      {/* DETAILS */}

      <section
        className="content-card"
      >
        <div
          style={
            sectionHeaderStyle
          }
        >
          <div>
            <p
              style={
                eyebrowStyle
              }
            >
              Детализация
            </p>

            <h2
              style={
                sectionTitleStyle
              }
            >
              Отметки посещаемости
            </h2>
          </div>


          <div
            style={
              detailsHeaderRightStyle
            }
          >
            {hasDetailFilters && (
              <span
                style={
                  filteredBadgeStyle
                }
              >
                Фильтр включён
              </span>
            )}

            <strong
              style={
                counterStyle
              }
            >
              {
                sortedAttendance.length
              }
            </strong>
          </div>
        </div>


        {isLoading ? (
          <p
            className="empty-text"
          >
            Загружаем данные...
          </p>
        ) : sortedAttendance.length ===
          0 ? (
          <EmptyState
            icon={
              Search
            }
            title="Ничего не найдено"
            text={
              hasDetailFilters
                ? 'Измени поиск или статус.'
                : 'На выбранную дату отметок посещаемости пока нет.'
            }
          />
        ) : (
          <div
            style={
              tableWrapperStyle
            }
          >
            <table
              style={{
                ...tableStyle,

                minWidth:
                  940,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={
                      headerLeftStyle
                    }
                  >
                    Ученик
                  </th>

                  <th
                    style={
                      headerLeftStyle
                    }
                  >
                    Класс
                  </th>

                  <th
                    style={
                      headerLeftStyle
                    }
                  >
                    Предмет
                  </th>

                  <th
                    style={
                      headerLeftStyle
                    }
                  >
                    Статус
                  </th>

                  <th
                    style={
                      headerLeftStyle
                    }
                  >
                    Учитель
                  </th>

                  <th
                    style={
                      headerLeftStyle
                    }
                  >
                    Комментарий
                  </th>
                </tr>
              </thead>


              <tbody>
                {sortedAttendance.map(
                  (record) => {
                    const student =
                      studentsMap.get(
                        String(
                          record.studentId,
                        ),
                      )

                    return (
                      <tr
                        key={
                          record.id ||
                          [
                            record.studentId,
                            record.className,
                            record.subject,
                            record.teacherId,
                            record.date,
                          ].join(
                            '-',
                          )
                        }
                      >
                        <td
                          style={
                            bodyLeftStyle
                          }
                        >
                          <div
                            style={
                              personStyle
                            }
                          >
                            <div
                              style={
                                avatarStyle
                              }
                            >
                              {String(
                                student?.name ||
                                  'У',
                              )
                                .charAt(
                                  0,
                                )
                                .toUpperCase()}
                            </div>

                            <strong>
                              {student?.name ||
                                'Ученик'}
                            </strong>
                          </div>
                        </td>


                        <td
                          style={
                            bodyLeftStyle
                          }
                        >
                          {getRecordClassName(
                            record,
                            studentsMap,
                          ) ||
                            '—'}
                        </td>


                        <td
                          style={
                            bodyLeftStyle
                          }
                        >
                          {record.subject ||
                            '—'}
                        </td>


                        <td
                          style={
                            bodyLeftStyle
                          }
                        >
                          <AttendanceBadge
                            status={
                              record.status
                            }
                          />
                        </td>


                        <td
                          style={
                            bodyLeftStyle
                          }
                        >
                          <div
                            style={
                              teacherStyle
                            }
                          >
                            <UserRound
                              size={16}
                            />

                            <span>
                              {record.teacherName ||
                                '—'}
                            </span>
                          </div>
                        </td>


                        <td
                          style={
                            bodyLeftStyle
                          }
                        >
                          {record.comment ||
                            '—'}
                        </td>
                      </tr>
                    )
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
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
  label,
  helper = '',
  danger = false,
  warning = false,
}) {
  return (
    <div
      style={
        statCardStyle
      }
    >
      <div
        style={
          statIconStyle({
            danger,
            warning,
          })
        }
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
          {value}
        </strong>

        <div
          style={
            statLabelStyle
          }
        >
          {label}
        </div>

        {helper && (
          <div
            style={
              statHelperStyle
            }
          >
            {helper}
          </div>
        )}
      </div>
    </div>
  )
}


function AttendanceBadge({
  status,
}) {
  const icons = {
    present:
      '✅',

    absent:
      '❌',

    late:
      '⏰',

    excused:
      '📄',
  }

  return (
    <span
      style={
        badgeStyle(
          status,
        )
      }
    >
      {icons[
        status
      ] ||
        '➖'}{' '}

      {getAttendanceStatusLabel(
        status,
      )}
    </span>
  )
}


function EmptyState({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div
      style={
        emptyStateStyle
      }
    >
      <Icon
        size={32}
      />

      <h3
        style={
          emptyTitleStyle
        }
      >
        {title}
      </h3>

      <p
        style={
          emptyTextStyle
        }
      >
        {text}
      </p>
    </div>
  )
}


/* ========================================
   HELPERS
======================================== */

function deduplicateStudents(
  rows,
) {
  const map =
    new Map()

  rows.forEach(
    (student) => {
      if (
        !student?.id
      ) {
        return
      }

      map.set(
        String(
          student.id,
        ),
        student,
      )
    },
  )

  return [
    ...map.values(),
  ]
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


function getStudentClassName(
  student,
) {
  return (
    student?.className ||
    student?.class_name ||
    ''
  )
}


function getStudentName(
  studentId,
  studentsMap,
) {
  return (
    studentsMap.get(
      String(
        studentId,
      ),
    )?.name ||
    'Ученик'
  )
}


function getRecordClassName(
  record,
  studentsMap,
) {
  return (
    record?.className ||
    record?.class_name ||
    studentsMap.get(
      String(
        record?.studentId,
      ),
    )?.className ||
    studentsMap.get(
      String(
        record?.studentId,
      ),
    )?.class_name ||
    ''
  )
}


function formatDate(
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
        '2-digit',

      month:
        'long',

      year:
        'numeric',
    },
  )
}


/* ========================================
   STYLES
======================================== */

const topActionsStyle = {
  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    14,

  flexWrap:
    'wrap',

  marginBottom:
    16,
}


const dateTitleStyle = {
  display:
    'block',

  color:
    '#0f274d',

  fontSize:
    16,
}


const dateSubtitleStyle = {
  display:
    'block',

  marginTop:
    4,

  color:
    '#718096',

  fontSize:
    13,
}


function refreshButtonStyle(
  disabled,
) {
  return {
    display:
      'inline-flex',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap:
      8,

    minHeight:
      40,

    padding:
      '0 14px',

    border:
      '1px solid #dbeafe',

    borderRadius:
      12,

    background:
      '#eff6ff',

    color:
      '#1d4ed8',

    fontWeight:
      800,

    cursor:
      disabled
        ? 'default'
        : 'pointer',

    opacity:
      disabled
        ? 0.6
        : 1,
  }
}


const statsGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(150px, 1fr))',

  gap:
    12,

  marginBottom:
    18,
}


const statCardStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    12,

  minHeight:
    90,

  padding:
    18,

  border:
    '1px solid #e2e8f0',

  borderRadius:
    18,

  background:
    '#ffffff',
}


function statIconStyle({
  danger,
  warning,
}) {
  let background =
    '#eff6ff'

  let color =
    '#2563eb'

  if (
    danger
  ) {
    background =
      '#fff1f2'

    color =
      '#dc2626'
  } else if (
    warning
  ) {
    background =
      '#fffbeb'

    color =
      '#d97706'
  }

  return {
    width:
      46,

    height:
      46,

    flexShrink:
      0,

    display:
      'grid',

    placeItems:
      'center',

    borderRadius:
      14,

    background,

    color,
  }
}


const statValueStyle = {
  display:
    'block',

  color:
    '#0f274d',

  fontSize:
    23,

  lineHeight:
    1,
}


const statLabelStyle = {
  marginTop:
    7,

  color:
    '#64748b',

  fontSize:
    12,
}


const statHelperStyle = {
  marginTop:
    3,

  color:
    '#94a3b8',

  fontSize:
    10,
}


const filterHeaderStyle = {
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

  marginBottom:
    16,
}


const filterTitleStyle = {
  display:
    'block',

  color:
    '#0f274d',

  fontSize:
    16,
}


const filterSubtitleStyle = {
  display:
    'block',

  marginTop:
    4,

  color:
    '#718096',

  fontSize:
    12,
}


const resetButtonStyle = {
  border:
    'none',

  borderRadius:
    10,

  padding:
    '8px 11px',

  background:
    '#f1f5f9',

  color:
    '#475569',

  cursor:
    'pointer',

  fontSize:
    12,

  fontWeight:
    700,
}


const filtersStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(170px, 1fr))',

  gap:
    16,
}


const searchBoxStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    8,

  padding:
    '0 12px',

  border:
    '1px solid #dbe2ea',

  borderRadius:
    12,

  background:
    '#ffffff',
}


const searchInputStyle = {
  width:
    '100%',

  border:
    'none',

  outline:
    'none',

  boxShadow:
    'none',

  background:
    'transparent',

  paddingLeft:
    0,

  paddingRight:
    0,
}


const warningCardStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    9,

  marginBottom:
    16,

  padding:
    '12px 14px',

  border:
    '1px solid #fde68a',

  borderRadius:
    14,

  background:
    '#fffbeb',

  color:
    '#92400e',

  fontSize:
    13,
}


const sectionHeaderStyle = {
  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    14,

  flexWrap:
    'wrap',

  marginBottom:
    16,
}


const eyebrowStyle = {
  margin:
    0,

  color:
    '#64748b',

  fontSize:
    13,
}


const sectionTitleStyle = {
  margin:
    '4px 0 0',

  color:
    '#0f274d',
}


const readonlyStyle = {
  padding:
    '8px 12px',

  borderRadius:
    10,

  background:
    '#f1f5f9',

  color:
    '#475569',

  fontSize:
    12,

  fontWeight:
    800,
}


const classNameCellStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    8,

  flexWrap:
    'wrap',
}


const notFilledBadgeStyle = {
  display:
    'inline-flex',

  padding:
    '4px 7px',

  borderRadius:
    999,

  background:
    '#fff7ed',

  color:
    '#c2410c',

  fontSize:
    10,

  fontWeight:
    800,

  whiteSpace:
    'nowrap',
}


const emptyClassBadgeStyle = {
  ...notFilledBadgeStyle,

  background:
    '#f1f5f9',

  color:
    '#64748b',
}


const attentionCounterStyle = {
  display:
    'inline-grid',

  placeItems:
    'center',

  minWidth:
    40,

  height:
    36,

  padding:
    '0 10px',

  borderRadius:
    10,

  background:
    '#fff7ed',

  color:
    '#c2410c',

  fontWeight:
    800,
}


const attentionGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(260px, 1fr))',

  gap:
    12,
}


const attentionPanelStyle = {
  padding:
    14,

  border:
    '1px solid #e2e8f0',

  borderRadius:
    14,

  background:
    '#f8fafc',
}


const attentionPanelHeaderStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    7,

  color:
    '#334155',

  marginBottom:
    12,
}


const attentionListStyle = {
  display:
    'grid',

  gap:
    8,
}


const attentionItemStyle = {
  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    10,

  padding:
    '9px 10px',

  borderRadius:
    11,

  background:
    '#ffffff',

  border:
    '1px solid #eef2f7',
}


const attentionStudentStyle = {
  minWidth:
    0,

  display:
    'grid',

  gap:
    3,

  color:
    '#0f274d',

  fontSize:
    12,
}


const smallMutedStyle = {
  margin:
    0,

  color:
    '#64748b',

  fontSize:
    12,
}


const moreTextStyle = {
  color:
    '#64748b',

  fontSize:
    11,
}


const classChipListStyle = {
  display:
    'flex',

  flexWrap:
    'wrap',

  gap:
    7,
}


const classChipStyle = {
  display:
    'inline-flex',

  padding:
    '7px 10px',

  borderRadius:
    999,

  background:
    '#fff7ed',

  color:
    '#c2410c',

  fontSize:
    12,

  fontWeight:
    800,
}


const successStateStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    10,

  padding:
    14,

  border:
    '1px solid #bbf7d0',

  borderRadius:
    14,

  background:
    '#f0fdf4',

  color:
    '#166534',
}


const detailsHeaderRightStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    8,
}


const filteredBadgeStyle = {
  padding:
    '6px 9px',

  borderRadius:
    999,

  background:
    '#eff6ff',

  color:
    '#2563eb',

  fontSize:
    11,

  fontWeight:
    800,
}


const counterStyle = {
  display:
    'inline-grid',

  placeItems:
    'center',

  minWidth:
    42,

  height:
    36,

  padding:
    '0 10px',

  borderRadius:
    10,

  background:
    '#eff6ff',

  color:
    '#2563eb',
}


const emptyStateStyle = {
  display:
    'grid',

  justifyItems:
    'center',

  textAlign:
    'center',

  gap:
    6,

  padding:
    '30px 15px',

  color:
    '#64748b',
}


const emptyTitleStyle = {
  margin:
    '4px 0 0',

  color:
    '#334155',
}


const emptyTextStyle = {
  maxWidth:
    520,

  margin:
    0,

  color:
    '#64748b',

  lineHeight:
    1.5,
}


const tableWrapperStyle = {
  width:
    '100%',

  overflowX:
    'auto',

  border:
    '1px solid #e5e7eb',

  borderRadius:
    16,

  background:
    '#ffffff',
}


const tableStyle = {
  width:
    '100%',

  minWidth:
    720,

  borderCollapse:
    'collapse',
}


const headerStyle = {
  padding:
    11,

  textAlign:
    'center',

  background:
    '#f8fafc',

  color:
    '#334155',

  borderBottom:
    '1px solid #e5e7eb',

  whiteSpace:
    'nowrap',

  fontSize:
    12,
}


const headerLeftStyle = {
  ...headerStyle,

  textAlign:
    'left',
}


const bodyStyle = {
  padding:
    11,

  textAlign:
    'center',

  borderBottom:
    '1px solid #eef2f7',

  color:
    '#334155',

  fontSize:
    13,
}


const bodyLeftStyle = {
  ...bodyStyle,

  textAlign:
    'left',
}


const personStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    9,
}


const avatarStyle = {
  width:
    34,

  height:
    34,

  flexShrink:
    0,

  borderRadius:
    '50%',

  display:
    'grid',

  placeItems:
    'center',

  background:
    '#eef5ff',

  color:
    '#2563eb',

  fontWeight:
    800,
}


const teacherStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    6,

  whiteSpace:
    'nowrap',
}


function badgeStyle(
  status,
) {
  const background =
    status ===
    'present'
      ? '#dcfce7'
      : status ===
        'absent'
        ? '#fee2e2'
        : status ===
          'late'
          ? '#fef3c7'
          : '#dbeafe'


  const color =
    status ===
    'present'
      ? '#166534'
      : status ===
        'absent'
        ? '#991b1b'
        : status ===
          'late'
          ? '#92400e'
          : '#1e40af'


  return {
    display:
      'inline-flex',

    alignItems:
      'center',

    gap:
      4,

    padding:
      '6px 9px',

    borderRadius:
      9,

    background,

    color,

    fontSize:
      12,

    fontWeight:
      700,

    whiteSpace:
      'nowrap',
  }
}


export default AdminAttendancePage