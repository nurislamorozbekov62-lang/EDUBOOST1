import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  CalendarPlus,
  Check,
  RefreshCcw,
  Trash2,
  X,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  supabase,
} from '../lib/supabase'

import {
  calculateWeightedAverage,
  confirmQuarterGrade,
  createSupabaseJournalLessonGrade,
  deleteSupabaseGrade,
  getSuggestedQuarterGrade,
} from '../services/supabaseJournalService'

import {
  getGradingMinimum,
  getSupabaseClassGrades,
  getSupabaseClassQuarterGrades,
} from '../services/supabaseJournalClassService'

import {
  createSupabaseJournalLesson,
  getSupabaseJournalLessons,
} from '../services/supabaseJournalLessonService'

import {
  getSupabaseStudentsByClass,
} from '../services/schoolRosterService'

import {
  getTeacherWorkloads,
} from '../services/supabaseWorkloadService'

import {
  getSupabaseClassAttendance,
  saveSupabaseAttendanceRecord,
  updateSupabaseAttendanceRecord,
} from '../services/supabaseAttendanceService'


/* =========================================================
   CONSTANTS
========================================================= */

const QUICK_GRADES = [
  5,
  4,
  3,
  2,
]


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


/* =========================================================
   PAGE
========================================================= */

function TeacherJournalPage() {
  const {
    user,
  } = useAuth()


  const isTeacher =
    user?.role ===
    'Учитель'


  /* =======================================================
     MAIN DATA
  ======================================================= */

  const [
    workloads,
    setWorkloads,
  ] = useState([])


  const [
    students,
    setStudents,
  ] = useState([])


  const [
    lessons,
    setLessons,
  ] = useState([])


  const [
    grades,
    setGrades,
  ] = useState([])


  const [
    attendance,
    setAttendance,
  ] = useState([])


  const [
    quarterGrades,
    setQuarterGrades,
  ] = useState([])


  /* =======================================================
     FILTERS
  ======================================================= */

  const [
    selectedClass,
    setSelectedClass,
  ] = useState('')


  const [
    selectedSubject,
    setSelectedSubject,
  ] = useState('')


  const [
    selectedQuarter,
    setSelectedQuarter,
  ] = useState(1)


  const [
    minimumGrades,
    setMinimumGrades,
  ] = useState(3)


  /* =======================================================
     UI
  ======================================================= */

  const [
    initialLoading,
    setInitialLoading,
  ] = useState(true)


  const [
    journalLoading,
    setJournalLoading,
  ] = useState(false)


  const [
    journalRefreshing,
    setJournalRefreshing,
  ] = useState(false)


  const [
    saving,
    setSaving,
  ] = useState(false)


  const [
    syncStatus,
    setSyncStatus,
  ] = useState('idle')


  const [
    error,
    setError,
  ] = useState('')


  const [
    success,
    setSuccess,
  ] = useState('')


  const [
    selectedCell,
    setSelectedCell,
  ] = useState(null)


  const [
    lessonModalOpen,
    setLessonModalOpen,
  ] = useState(false)


  /* =======================================================
     WORKLOAD
  ======================================================= */

  useEffect(() => {
    if (
      !user?.id ||
      !user?.schoolId ||
      !isTeacher
    ) {
      return
    }

    void loadWorkloads()
  }, [
    user?.id,
    user?.schoolId,
    user?.role,
  ])


  async function loadWorkloads() {
    try {
      setInitialLoading(true)
      setError('')


      const result =
        await getTeacherWorkloads(
          user,
        )


      const academicYear =
        getCurrentAcademicYear()


      const safe =
        (
          Array.isArray(result)
            ? result
            : []
        ).filter(
          (
            item,
          ) =>
            !item.academicYear ||
            item.academicYear ===
              academicYear,
        )


      setWorkloads(
        safe,
      )


      const classNames = [
        ...new Set(
          safe
            .map(
              (
                item,
              ) =>
                String(
                  item.className ||
                    '',
                ).trim(),
            )
            .filter(Boolean),
        ),
      ].sort(
        compareClasses,
      )


      setSelectedClass(
        (
          current,
        ) =>
          current &&
          classNames.includes(
            current,
          )
            ? current
            : classNames[0] ||
              '',
      )
    } catch (
      loadError
    ) {
      console.error(
        'Workloads:',
        loadError,
      )

      setWorkloads([])
      setSelectedClass('')

      setError(
        loadError?.message ||
          'Не удалось загрузить нагрузку учителя.',
      )
    } finally {
      setInitialLoading(false)
    }
  }


  const classes =
    useMemo(
      () =>
        [
          ...new Set(
            workloads
              .map(
                (
                  item,
                ) =>
                  String(
                    item.className ||
                      '',
                  ).trim(),
              )
              .filter(Boolean),
          ),
        ].sort(
          compareClasses,
        ),
      [
        workloads,
      ],
    )


  const subjects =
    useMemo(() => {
      if (
        !selectedClass
      ) {
        return []
      }


      return [
        ...new Set(
          workloads
            .filter(
              (
                item,
              ) =>
                String(
                  item.className ||
                    '',
                ).trim() ===
                String(
                  selectedClass,
                ).trim(),
            )
            .map(
              (
                item,
              ) =>
                String(
                  item.subject ||
                    '',
                ).trim(),
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
    }, [
      workloads,
      selectedClass,
    ])


  useEffect(() => {
    setSelectedSubject(
      (
        current,
      ) =>
        current &&
        subjects.includes(
          current,
        )
          ? current
          : subjects[0] ||
            '',
    )
  }, [
    subjects,
  ])


  /* =======================================================
     STUDENTS
  ======================================================= */

  useEffect(() => {
    if (
      !user?.id ||
      !selectedClass
    ) {
      setStudents([])
      return
    }

    void loadStudents()
  }, [
    user?.id,
    user?.schoolId,
    selectedClass,
  ])


  async function loadStudents() {
    try {
      const result =
        await getSupabaseStudentsByClass(
          user,
          selectedClass,
        )


      setStudents(
        Array.isArray(result)
          ? result
          : [],
      )
    } catch (
      loadError
    ) {
      console.error(
        'Students:',
        loadError,
      )

      /*
        Не очищаем уже показанный
        список при временном сбое.
      */
      setError(
        loadError?.message ||
          'Не удалось обновить список учеников.',
      )
    }
  }


  /* =======================================================
     SCHEDULE -> JOURNAL

     ВАЖНО:
     эта операция НЕ блокирует
     загрузку существующего журнала.
  ======================================================= */

  async function syncTodaySchedule() {
    if (
      !user?.id
    ) {
      return
    }


    try {
      setSyncStatus(
        'loading',
      )


      const {
        error:
          syncError,
      } =
        await supabase.rpc(
          'sync_my_schedule_to_journal',
          {
            p_lesson_date:
              getToday(),

            p_quarter:
              Number(
                selectedQuarter,
              ),
          },
        )


      if (
        syncError
      ) {
        throw syncError
      }


      setSyncStatus(
        'success',
      )
    } catch (
      syncError
    ) {
      console.error(
        'Schedule -> journal:',
        syncError,
      )

      setSyncStatus(
        'error',
      )
    }
  }


  /* =======================================================
     JOURNAL LOAD
  ======================================================= */

  useEffect(() => {
    if (
      !user?.id ||
      !selectedClass ||
      !selectedSubject
    ) {
      setLessons([])
      setGrades([])
      setAttendance([])
      setQuarterGrades([])

      return
    }


    void loadJournal()
  }, [
    user?.id,
    user?.schoolId,
    selectedClass,
    selectedSubject,
    selectedQuarter,
  ])


  async function loadJournal({
    silent = false,
  } = {}) {
    if (
      !user?.id ||
      !selectedClass ||
      !selectedSubject
    ) {
      return
    }


    const alreadyHasData =
      lessons.length > 0 ||
      grades.length > 0


    try {
      setError('')


      if (
        !silent &&
        !alreadyHasData
      ) {
        setJournalLoading(
          true,
        )
      } else {
        setJournalRefreshing(
          true,
        )
      }


      /*
        Не ждём sync.
        Существующий журнал должен
        открываться независимо.
      */
      void syncTodaySchedule()


      /*
        Критичные данные:
        оценки + уроки.

        Они идут одновременно.
      */
      const [
        gradeResult,
        lessonResult,
      ] =
        await Promise.all([
          getSupabaseClassGrades({
            teacher:
              user,

            className:
              selectedClass,

            subject:
              selectedSubject,

            quarter:
              selectedQuarter,
          }),

          getSupabaseJournalLessons({
            teacher:
              user,

            className:
              selectedClass,

            subject:
              selectedSubject,

            quarter:
              selectedQuarter,
          }),
        ])


      const ownGrades =
        filterTeacherRows(
          gradeResult,
          user.id,
        )


      const ownLessons =
        filterTeacherRows(
          lessonResult,
          user.id,
        )


      /*
        Основная таблица появляется
        сразу после двух запросов.
      */
      setGrades(
        ownGrades,
      )

      setLessons(
        ownLessons,
      )


      setJournalLoading(
        false,
      )


      /*
        Остальное грузится фоном.
      */
      void loadBackgroundData(
        ownLessons,
        ownGrades,
      )
    } catch (
      loadError
    ) {
      console.error(
        'Journal:',
        loadError,
      )


      /*
        Старые данные НЕ удаляем.
        При плохом интернете журнал
        остаётся на экране.
      */
      setError(
        loadError?.message ||
          'Не удалось обновить журнал.',
      )
    } finally {
      setJournalLoading(
        false,
      )

      setJournalRefreshing(
        false,
      )
    }
  }


  /* =======================================================
     BACKGROUND DATA
  ======================================================= */

  async function loadBackgroundData(
    currentLessons,
    currentGrades,
  ) {
    const results =
      await Promise.allSettled([
        loadQuarterGrades(),

        loadMinimumSetting(),

        loadAttendance(
          currentLessons,
          currentGrades,
        ),
      ])


    results.forEach(
      (
        result,
      ) => {
        if (
          result.status ===
          'rejected'
        ) {
          console.error(
            'Journal background:',
            result.reason,
          )
        }
      },
    )
  }


  async function loadQuarterGrades() {
    try {
      const result =
        await getSupabaseClassQuarterGrades({
          teacher:
            user,

          className:
            selectedClass,

          subject:
            selectedSubject,

          quarter:
            selectedQuarter,
        })


      setQuarterGrades(
        filterTeacherRows(
          result,
          user.id,
        ),
      )
    } catch (
      loadError
    ) {
      console.error(
        'Quarter grades:',
        loadError,
      )
    }
  }


  async function loadMinimumSetting() {
    try {
      const result =
        await getGradingMinimum({
          teacher:
            user,

          className:
            selectedClass,

          subject:
            selectedSubject,
        })


      const value =
        Number(
          result,
        )


      setMinimumGrades(
        Number.isFinite(
          value,
        ) &&
        value > 0
          ? value
          : 3,
      )
    } catch (
      loadError
    ) {
      console.error(
        'Minimum grades:',
        loadError,
      )

      setMinimumGrades(
        3,
      )
    }
  }


  /* =======================================================
     ATTENDANCE LOAD
  ======================================================= */

  async function loadAttendance(
    currentLessons = lessons,
    currentGrades = grades,
  ) {
    const dates = [
      ...(
        currentLessons ||
        []
      ).map(
        (
          lesson,
        ) =>
          lesson.date,
      ),

      ...(
        currentGrades ||
        []
      ).map(
        (
          grade,
        ) =>
          grade.date,
      ),
    ]
      .filter(Boolean)
      .sort()


    if (
      dates.length ===
      0
    ) {
      setAttendance([])
      return
    }


    try {
      const result =
        await getSupabaseClassAttendance({
          teacher:
            user,

          className:
            selectedClass,

          subject:
            selectedSubject,

          dateFrom:
            dates[0],

          dateTo:
            dates[
              dates.length -
                1
            ],
        })


      setAttendance(
        filterTeacherRows(
          result,
          user.id,
        ),
      )
    } catch (
      loadError
    ) {
      console.error(
        'Attendance:',
        loadError,
      )

      /*
        Старую посещаемость
        намеренно не удаляем.
      */
    }
  }


  /* =======================================================
     REFRESH

     Старый журнал остаётся на экране.
  ======================================================= */

  async function handleRefresh() {
    if (
      saving ||
      journalRefreshing
    ) {
      return
    }


    setSuccess('')
    setError('')


    setJournalRefreshing(
      true,
    )


    await Promise.allSettled([
      loadStudents(),

      loadJournal({
        silent:
          true,
      }),
    ])


    setJournalRefreshing(
      false,
    )
  }


  /* =======================================================
     COLUMNS

     Колонки создаются ТОЛЬКО
     настоящими journal_lessons.

     Legacy grades не создают
     отдельную "мёртвую" дату.
  ======================================================= */

  const columns =
    useMemo(() => {
      const result = []

      const ids =
        new Set()


      lessons.forEach(
        (
          lesson,
        ) => {
          if (
            !lesson?.id ||
            !lesson?.date
          ) {
            return
          }


          const id =
            String(
              lesson.id,
            )


          if (
            ids.has(
              id,
            )
          ) {
            return
          }


          ids.add(
            id,
          )


          result.push({
            key:
              `lesson:${id}`,

            lessonId:
              lesson.id,

            date:
              lesson.date,

            topic:
              lesson.topic ||
              '',

            scheduleLessonId:
              lesson.scheduleLessonId ||
              null,
          })
        },
      )


      return result.sort(
        (
          first,
          second,
        ) => {
          const dateCompare =
            String(
              first.date,
            ).localeCompare(
              String(
                second.date,
              ),
            )


          if (
            dateCompare !==
            0
          ) {
            return dateCompare
          }


          return String(
            first.lessonId,
          ).localeCompare(
            String(
              second.lessonId,
            ),
          )
        },
      )
    }, [
      lessons,
    ])


  /* =======================================================
     ATTENDANCE MAP
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
            createAttendanceKey(
              record.studentId,
              record.date,
            ),
            record,
          )
        },
      )


      return map
    }, [
      attendance,
    ])


  /* =======================================================
     ROWS
  ======================================================= */

  const rows =
    useMemo(
      () =>
        students.map(
          (
            student,
          ) => {
            const studentGrades =
              grades.filter(
                (
                  grade,
                ) =>
                  String(
                    grade.studentId,
                  ) ===
                  String(
                    student.id,
                  ),
              )


            const average =
              calculateWeightedAverage(
                studentGrades,
              )


            const isAttested =
              studentGrades.length >=
              minimumGrades


            const predicted =
              isAttested
                ? getSuggestedQuarterGrade(
                    average,
                  )
                : null


            const finalRow =
              quarterGrades.find(
                (
                  item,
                ) =>
                  String(
                    item.studentId,
                  ) ===
                  String(
                    student.id,
                  ),
              )


            return {
              student,

              grades:
                studentGrades,

              average,

              predicted,

              finalGrade:
                finalRow?.finalGrade ??
                null,

              isAttested,

              missing:
                Math.max(
                  minimumGrades -
                    studentGrades.length,
                  0,
                ),
            }
          },
        ),
      [
        students,
        grades,
        quarterGrades,
        minimumGrades,
      ],
    )


  /* =======================================================
     OPEN CELL
  ======================================================= */

  function openCell(
    row,
    column,
  ) {
    setError('')
    setSuccess('')


    if (
      !column?.lessonId
    ) {
      setError(
        'Для этой даты нет связанного урока.',
      )

      return
    }


    const currentAttendance =
      attendanceMap.get(
        createAttendanceKey(
          row.student.id,
          column.date,
        ),
      ) ||
      null


    setSelectedCell({
      student:
        row.student,

      column,

      grades:
        getCellGrades(
          row.grades,
          column,
        ),

      attendance:
        currentAttendance,
    })
  }


  /* =======================================================
     ATTENDANCE SAVE
  ======================================================= */

  async function setAttendanceStatus(
    status,
  ) {
    if (
      !selectedCell
    ) {
      return
    }


    try {
      setSaving(true)
      setError('')


      const existing =
        selectedCell.attendance


      if (
        existing?.id
      ) {
        await updateSupabaseAttendanceRecord(
          existing.id,
          {
            subject:
              selectedSubject,

            status,

            comment:
              existing.comment ||
              '',

            date:
              selectedCell
                .column
                .date,
          },
        )
      } else {
        await saveSupabaseAttendanceRecord(
          user,
          selectedCell.student,
          {
            subject:
              selectedSubject,

            status,

            comment:
              '',

            date:
              selectedCell
                .column
                .date,
          },
        )
      }


      const studentName =
        selectedCell
          .student
          .name


      /*
        Оптимистично обновляем UI
        сразу, без ожидания полного
        reloadJournal.
      */
      setAttendance(
        (
          current,
        ) => {
          const key =
            createAttendanceKey(
              selectedCell
                .student
                .id,
              selectedCell
                .column
                .date,
            )


          const exists =
            current.some(
              (
                item,
              ) =>
                createAttendanceKey(
                  item.studentId,
                  item.date,
                ) ===
                key,
            )


          if (
            exists
          ) {
            return current.map(
              (
                item,
              ) =>
                createAttendanceKey(
                  item.studentId,
                  item.date,
                ) ===
                key
                  ? {
                      ...item,
                      status,
                    }
                  : item,
            )
          }


          return [
            ...current,
            {
              id:
                existing?.id ||
                `temp-${Date.now()}`,

              studentId:
                selectedCell
                  .student
                  .id,

              date:
                selectedCell
                  .column
                  .date,

              status,

              teacherId:
                user.id,

              subject:
                selectedSubject,
            },
          ]
        },
      )


      setSelectedCell(
        null,
      )


      setSuccess(
        `${studentName}: ${getAttendanceLabel(
          status,
        )}.`,
      )


      /*
        Фоновая сверка с Supabase.
      */
      void loadAttendance(
        lessons,
        grades,
      )
    } catch (
      saveError
    ) {
      console.error(
        'Attendance save:',
        saveError,
      )

      setError(
        saveError?.message ||
          'Не удалось сохранить посещаемость.',
      )
    } finally {
      setSaving(false)
    }
  }


  /* =======================================================
     GRADE SAVE
  ======================================================= */

  async function setQuickGrade(
    gradeValue,
    workType,
  ) {
    if (
      !selectedCell
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
        'Можно поставить только 2, 3, 4 или 5.',
      )

      return
    }


    if (
      !WORK_TYPES.some(
        (
          item,
        ) =>
          item.value ===
          workType,
      )
    ) {
      setError(
        'Сначала выберите тип работы.',
      )

      return
    }


    const currentStatus =
      selectedCell
        .attendance
        ?.status ||
      null


    const attendanceConflict =
      [
        'absent',
        'excused',
        'sick',
      ].includes(
        currentStatus,
      )


    if (
      attendanceConflict
    ) {
      const confirmed =
        window.confirm(
          `${selectedCell.student.name} отмечен как «${getAttendanceLabel(
            currentStatus,
          )}».\n\nПоставить оценку ${numericGrade} и изменить посещаемость на «Присутствовал»?`,
        )


      if (
        !confirmed
      ) {
        return
      }
    }


    try {
      setSaving(true)
      setError('')


      const lesson = {
        id:
          selectedCell
            .column
            .lessonId,

        teacherId:
          user.id,

        className:
          selectedClass,

        subject:
          selectedSubject,

        quarter:
          selectedQuarter,

        date:
          selectedCell
            .column
            .date,

        topic:
          selectedCell
            .column
            .topic ||
          '',
      }


      await createSupabaseJournalLessonGrade({
        teacher:
          user,

        student:
          selectedCell.student,

        lesson,

        grade:
          numericGrade,

        workType,

        comment:
          '',
      })


      /*
        Оценка означает присутствие.

        late сохраняем как late.
      */
      if (
        !currentStatus ||
        attendanceConflict
      ) {
        const existing =
          selectedCell.attendance


        if (
          existing?.id
        ) {
          await updateSupabaseAttendanceRecord(
            existing.id,
            {
              subject:
                selectedSubject,

              status:
                'present',

              comment:
                existing.comment ||
                '',

              date:
                selectedCell
                  .column
                  .date,
            },
          )
        } else {
          await saveSupabaseAttendanceRecord(
            user,
            selectedCell.student,
            {
              subject:
                selectedSubject,

              status:
                'present',

              comment:
                '',

              date:
                selectedCell
                  .column
                  .date,
            },
          )
        }
      }


      const studentName =
        selectedCell
          .student
          .name


      setSelectedCell(
        null,
      )


      setSuccess(
        `${studentName}: оценка ${numericGrade}.`,
      )


      /*
        Не блокируем интерфейс.
        После записи получаем актуальные
        оценки в фоне.
      */
      void loadJournal({
        silent:
          true,
      })
    } catch (
      saveError
    ) {
      console.error(
        'Grade save:',
        saveError,
      )

      setError(
        saveError?.message ||
          'Не удалось поставить оценку.',
      )
    } finally {
      setSaving(false)
    }
  }


  /* =======================================================
     DELETE GRADE
  ======================================================= */

  async function handleDeleteGrade(
    grade,
  ) {
    if (
      !grade?.id
    ) {
      return
    }


    const confirmed =
      window.confirm(
        `Удалить оценку ${grade.value}?`,
      )


    if (
      !confirmed
    ) {
      return
    }


    try {
      setSaving(true)
      setError('')


      await deleteSupabaseGrade(
        grade.id,
      )


      /*
        Убираем оценку мгновенно.
      */
      setGrades(
        (
          current,
        ) =>
          current.filter(
            (
              item,
            ) =>
              String(
                item.id,
              ) !==
              String(
                grade.id,
              ),
          ),
      )


      setSelectedCell(
        null,
      )


      setSuccess(
        'Оценка удалена.',
      )


      void loadJournal({
        silent:
          true,
      })
    } catch (
      deleteError
    ) {
      console.error(
        'Delete grade:',
        deleteError,
      )

      setError(
        deleteError?.message ||
          'Не удалось удалить оценку.',
      )
    } finally {
      setSaving(false)
    }
  }


  /* =======================================================
     QUARTER GRADE
  ======================================================= */

  async function confirmQuarter(
    row,
  ) {
    if (
      !row.predicted
    ) {
      return
    }


    const confirmed =
      window.confirm(
        `Выставить ${row.student.name} четвертную оценку ${row.predicted}?`,
      )


    if (
      !confirmed
    ) {
      return
    }


    try {
      setSaving(true)
      setError('')


      await confirmQuarterGrade({
        teacher:
          user,

        student:
          row.student,

        subject:
          selectedSubject,

        quarter:
          selectedQuarter,

        finalGrade:
          row.predicted,
      })


      setSuccess(
        `${row.student.name}: четвертная ${row.predicted}.`,
      )


      void loadQuarterGrades()
    } catch (
      saveError
    ) {
      console.error(
        'Quarter:',
        saveError,
      )

      setError(
        saveError?.message ||
          'Не удалось выставить четвертную оценку.',
      )
    } finally {
      setSaving(false)
    }
  }


  /* =======================================================
     ACCESS
  ======================================================= */

  if (
    !user
  ) {
    return null
  }


  if (
    !isTeacher
  ) {
    return (
      <div className="page-container">
        <section className="content-card">
          <h2>
            Доступ запрещён
          </h2>

          <p>
            Журнал доступен только учителю.
          </p>
        </section>
      </div>
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
      <style>{`
        @keyframes teacher-journal-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .teacher-journal-refreshing {
          animation:
            teacher-journal-spin
            0.8s
            linear
            infinite;
        }
      `}</style>


      <header
        style={
          styles.header
        }
      >
        <div>
          <span
            style={
              styles.eyebrow
            }
          >
            Журнал учителя
          </span>

          <h1
            style={
              styles.title
            }
          >
            Электронный журнал
          </h1>

          <p
            style={
              styles.subtitle
            }
          >
            Уроки из расписания появляются автоматически.
          </p>
        </div>


        <SyncBadge
          status={
            syncStatus
          }
        />
      </header>


      <section
        className="content-card"
        style={
          styles.filterCard
        }
      >
        <div
          style={
            styles.filters
          }
        >
          <label className="form-group">
            <span>
              Класс
            </span>

            <select
              value={
                selectedClass
              }
              disabled={
                initialLoading
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
                  Нет классов
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
          </label>


          <label className="form-group">
            <span>
              Предмет
            </span>

            <select
              value={
                selectedSubject
              }
              disabled={
                subjects.length ===
                0
              }
              onChange={(
                event,
              ) =>
                setSelectedSubject(
                  event.target.value,
                )
              }
            >
              {subjects.length ===
                0 && (
                <option value="">
                  Нет предметов
                </option>
              )}

              {subjects.map(
                (
                  subject,
                ) => (
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


          <label className="form-group">
            <span>
              Четверть
            </span>

            <select
              value={
                selectedQuarter
              }
              onChange={(
                event,
              ) =>
                setSelectedQuarter(
                  Number(
                    event.target.value,
                  ),
                )
              }
            >
              <option value={1}>
                1 четверть
              </option>

              <option value={2}>
                2 четверть
              </option>

              <option value={3}>
                3 четверть
              </option>

              <option value={4}>
                4 четверть
              </option>
            </select>
          </label>
        </div>
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
          <Check
            size={16}
          />

          {success}
        </div>
      )}


      <section
        className="content-card"
        style={
          styles.journalCard
        }
      >
        <div
          style={
            styles.journalHeader
          }
        >
          <div>
            <span
              style={
                styles.eyebrow
              }
            >
              {selectedClass ||
                'Класс'}

              {' · '}

              {selectedSubject ||
                'Предмет'}
            </span>


            <h2
              style={
                styles.quarterTitle
              }
            >
              {selectedQuarter}
              {' четверть'}
            </h2>


            <small
              style={
                styles.meta
              }
            >
              Учеников: {students.length}
              {' · '}
              Уроков: {columns.length}
            </small>
          </div>


          <div
            style={
              styles.actions
            }
          >
            <button
              type="button"
              style={
                styles.secondaryButton
              }
              disabled={
                saving ||
                journalRefreshing
              }
              onClick={
                handleRefresh
              }
            >
              <RefreshCcw
                size={15}
                className={
                  journalRefreshing
                    ? 'teacher-journal-refreshing'
                    : ''
                }
              />

              {journalRefreshing
                ? 'Обновляем'
                : 'Обновить'}
            </button>


            <button
              type="button"
              style={
                styles.additionalButton
              }
              disabled={
                !selectedClass ||
                !selectedSubject
              }
              onClick={() =>
                setLessonModalOpen(
                  true,
                )
              }
            >
              <CalendarPlus
                size={15}
              />

              Доп. урок
            </button>
          </div>
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


        {journalLoading &&
        students.length ===
          0 &&
        lessons.length ===
          0 &&
        grades.length ===
          0 ? (
          <JournalSkeleton />
        ) : students.length ===
          0 ? (
          <EmptyState
            text="В классе нет активированных учеников."
          />
        ) : columns.length ===
          0 ? (
          <EmptyState
            text="В этой четверти пока нет уроков."
          />
        ) : (
          <JournalTable
            rows={
              rows
            }

            columns={
              columns
            }

            attendanceMap={
              attendanceMap
            }

            onOpenCell={
              openCell
            }

            onConfirmQuarter={
              confirmQuarter
            }
          />
        )}
      </section>


      {selectedCell && (
        <CellModal
          cell={
            selectedCell
          }

          saving={
            saving
          }

          onClose={() =>
            setSelectedCell(
              null,
            )
          }

          onGrade={
            setQuickGrade
          }

          onAttendance={
            setAttendanceStatus
          }

          onDeleteGrade={
            handleDeleteGrade
          }
        />
      )}


      {lessonModalOpen && (
        <AdditionalLessonModal
          teacher={
            user
          }

          className={
            selectedClass
          }

          subject={
            selectedSubject
          }

          quarter={
            selectedQuarter
          }

          onClose={() =>
            setLessonModalOpen(
              false,
            )
          }

          onSaved={
            async () => {
              setLessonModalOpen(
                false,
              )

              setSuccess(
                'Дополнительный урок добавлен.',
              )

              await loadJournal({
                silent:
                  true,
              })
            }
          }
        />
      )}
    </div>
  )
}


/* =========================================================
   TABLE
========================================================= */

function JournalTable({
  rows,
  columns,
  attendanceMap,
  onOpenCell,
  onConfirmQuarter,
}) {
  return (
    <div
      style={
        styles.tableScroll
      }
    >
      <table
        style={{
          ...styles.table,

          minWidth:
            Math.max(
              620,
              220 +
                columns.length *
                  60 +
                120,
            ),
        }}
      >
        <thead>
          <tr>
            <th
              style={
                styles.studentHeader
              }
            >
              Ученик
            </th>


            {columns.map(
              (
                column,
              ) => (
                <th
                  key={
                    column.key
                  }
                  style={
                    styles.dateHeader
                  }
                  title={
                    column.topic ||
                    formatFullDate(
                      column.date,
                    )
                  }
                >
                  <div>
                    {formatShortDate(
                      column.date,
                    )}
                  </div>

                  {column.topic && (
                    <small
                      style={
                        styles.topicHint
                      }
                    >
                      {truncate(
                        column.topic,
                        10,
                      )}
                    </small>
                  )}
                </th>
              ),
            )}


            <th
              style={
                styles.resultHeader
              }
            >
              Ср.
            </th>

            <th
              style={
                styles.resultHeader
              }
            >
              Четв.
            </th>
          </tr>
        </thead>


        <tbody>
          {rows.map(
            (
              row,
              index,
            ) => (
              <tr
                key={
                  row.student.id
                }
              >
                <td
                  style={
                    styles.studentCell
                  }
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
                        {row.student.name}
                      </strong>


                      {row.student
                        .studentLogin && (
                        <small
                          style={
                            styles.studentLogin
                          }
                        >
                          {
                            row.student
                              .studentLogin
                          }
                        </small>
                      )}
                    </div>
                  </div>
                </td>


                {columns.map(
                  (
                    column,
                  ) => {
                    const cellGrades =
                      getCellGrades(
                        row.grades,
                        column,
                      )


                    const attendance =
                      attendanceMap.get(
                        createAttendanceKey(
                          row.student.id,
                          column.date,
                        ),
                      )


                    return (
                      <td
                        key={
                          column.key
                        }
                        style={
                          styles.cell
                        }
                      >
                        <button
                          type="button"
                          style={
                            styles.cellButton
                          }
                          onClick={() =>
                            onOpenCell(
                              row,
                              column,
                            )
                          }
                        >
                          <CellValue
                            grades={
                              cellGrades
                            }

                            attendance={
                              attendance
                            }
                          />
                        </button>
                      </td>
                    )
                  },
                )}


                <td
                  style={
                    styles.resultCell
                  }
                >
                  <strong>
                    {row.average ??
                      '—'}
                  </strong>
                </td>


                <td
                  style={
                    styles.resultCell
                  }
                >
                  {row.finalGrade !==
                  null ? (
                    <GradeBadge
                      value={
                        row.finalGrade
                      }
                    />
                  ) : row.isAttested ? (
                    <button
                      type="button"
                      style={
                        styles.quarterButton
                      }
                      title="Подтвердить четвертную"
                      onClick={() =>
                        onConfirmQuarter(
                          row,
                        )
                      }
                    >
                      {
                        row.predicted
                      }
                    </button>
                  ) : (
                    <span
                      style={
                        styles.notAttested
                      }
                      title={`Не хватает оценок: ${row.missing}`}
                    >
                      Н/А
                    </span>
                  )}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}


/* =========================================================
   CELL
========================================================= */

function CellValue({
  grades,
  attendance,
}) {
  if (
    grades.length >
    0
  ) {
    return (
      <div
        style={
          styles.cellValue
        }
      >
        {grades
          .slice(
            0,
            2,
          )
          .map(
            (
              grade,
            ) => (
              <GradeBadge
                key={
                  grade.id
                }
                value={
                  grade.value
                }
              />
            ),
          )}


        {grades.length >
          2 && (
          <small
            style={
              styles.moreGrades
            }
          >
            +{grades.length - 2}
          </small>
        )}


        {attendance?.status ===
          'late' && (
          <small
            style={
              styles.late
            }
          >
            Оп
          </small>
        )}
      </div>
    )
  }


  if (
    attendance?.status
  ) {
    return (
      <AttendanceBadge
        status={
          attendance.status
        }
      />
    )
  }


  return (
    <span
      style={
        styles.emptyCell
      }
    >
      ·
    </span>
  )
}


/* =========================================================
   CELL MODAL
========================================================= */

function CellModal({
  cell,
  saving,
  onClose,
  onGrade,
  onAttendance,
  onDeleteGrade,
}) {
  const [
    workType,
    setWorkType,
  ] = useState('')


  return (
    <ModalShell
      onClose={
        onClose
      }
    >
      <div
        style={
          styles.modalHeader
        }
      >
        <div>
          <span
            style={
              styles.eyebrow
            }
          >
            {formatFullDate(
              cell.column.date,
            )}
          </span>

          <h2
            style={
              styles.modalTitle
            }
          >
            {cell.student.name}
          </h2>

          {cell.column.topic && (
            <p
              style={
                styles.muted
              }
            >
              {cell.column.topic}
            </p>
          )}
        </div>


        <button
          type="button"
          style={
            styles.closeButton
          }
          onClick={
            onClose
          }
        >
          <X
            size={20}
          />
        </button>
      </div>


      <section
        style={
          styles.modalSection
        }
      >
        <strong>
          Тип работы
        </strong>


        <select
          value={
            workType
          }
          onChange={(
            event,
          ) =>
            setWorkType(
              event.target.value,
            )
          }
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


        {!workType && (
          <small
            style={
              styles.warning
            }
          >
            Перед оценкой выберите тип работы.
          </small>
        )}
      </section>


      <section
        style={
          styles.modalSection
        }
      >
        <strong>
          Оценка
        </strong>


        <div
          style={
            styles.optionRow
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
                  saving ||
                  !workType
                }
                style={{
                  ...quickGradeStyle(
                    grade,
                  ),

                  opacity:
                    saving ||
                    !workType
                      ? 0.45
                      : 1,
                }}
                onClick={() =>
                  onGrade(
                    grade,
                    workType,
                  )
                }
              >
                {grade}
              </button>
            ),
          )}
        </div>
      </section>


      <section
        style={
          styles.modalSection
        }
      >
        <strong>
          Посещаемость
        </strong>


        <div
          style={
            styles.optionRow
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
                  saving
                }
                title={
                  option.label
                }
                style={
                  attendanceButtonStyle(
                    option.value,
                    cell.attendance
                      ?.status ===
                      option.value,
                  )
                }
                onClick={() =>
                  onAttendance(
                    option.value,
                  )
                }
              >
                {option.short}
              </button>
            ),
          )}
        </div>
      </section>


      {cell.grades.length >
        0 && (
        <section
          style={
            styles.modalSection
          }
        >
          <strong>
            Выставленные оценки
          </strong>


          <div
            style={
              styles.gradeList
            }
          >
            {cell.grades.map(
              (
                grade,
              ) => (
                <div
                  key={
                    grade.id
                  }
                  style={
                    styles.gradeRow
                  }
                >
                  <GradeBadge
                    value={
                      grade.value
                    }
                  />


                  <div
                    style={{
                      flex:
                        1,
                    }}
                  >
                    <strong
                      style={
                        styles.gradeType
                      }
                    >
                      {getWorkTypeName(
                        grade.workType,
                      )}
                    </strong>

                    {grade.comment && (
                      <small
                        style={
                          styles.muted
                        }
                      >
                        {grade.comment}
                      </small>
                    )}
                  </div>


                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    style={
                      styles.deleteButton
                    }
                    onClick={() =>
                      onDeleteGrade(
                        grade,
                      )
                    }
                  >
                    <Trash2
                      size={15}
                    />
                  </button>
                </div>
              ),
            )}
          </div>
        </section>
      )}
    </ModalShell>
  )
}


/* =========================================================
   ADDITIONAL LESSON
========================================================= */

function AdditionalLessonModal({
  teacher,
  className,
  subject,
  quarter,
  onClose,
  onSaved,
}) {
  const [
    date,
    setDate,
  ] = useState(
    getToday(),
  )


  const [
    topic,
    setTopic,
  ] = useState('')


  const [
    saving,
    setSaving,
  ] = useState(false)


  const [
    error,
    setError,
  ] = useState('')


  async function handleSubmit(
    event,
  ) {
    event.preventDefault()


    if (
      !date
    ) {
      setError(
        'Выберите дату.',
      )

      return
    }


    try {
      setSaving(true)
      setError('')


      await createSupabaseJournalLesson({
        teacher,

        className,

        subject,

        quarter,

        date,

        topic:
          topic.trim(),
      })


      await onSaved()
    } catch (
      saveError
    ) {
      setError(
        saveError?.message ||
          'Не удалось создать дополнительный урок.',
      )
    } finally {
      setSaving(false)
    }
  }


  return (
    <ModalShell
      onClose={
        onClose
      }
    >
      <form
        onSubmit={
          handleSubmit
        }
      >
        <div
          style={
            styles.modalHeader
          }
        >
          <div>
            <span
              style={
                styles.eyebrow
              }
            >
              Вне расписания
            </span>

            <h2
              style={
                styles.modalTitle
              }
            >
              Дополнительный урок
            </h2>
          </div>


          <button
            type="button"
            style={
              styles.closeButton
            }
            onClick={
              onClose
            }
          >
            <X
              size={20}
            />
          </button>
        </div>


        <div
          style={
            styles.infoBox
          }
        >
          Используйте только для урока,
          которого нет в основном расписании.
        </div>


        {error && (
          <div
            style={
              styles.error
            }
          >
            {error}
          </div>
        )}


        <label className="form-group">
          <span>
            Дата
          </span>

          <input
            type="date"
            required
            value={
              date
            }
            onChange={(
              event,
            ) =>
              setDate(
                event.target.value,
              )
            }
          />
        </label>


        <label className="form-group">
          <span>
            Тема
          </span>

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
            placeholder="Например: консультация"
          />
        </label>


        <button
          type="submit"
          className="primary-button"
          disabled={
            saving
          }
          style={
            styles.fullButton
          }
        >
          {saving
            ? 'Создаём...'
            : 'Создать дополнительный урок'}
        </button>
      </form>
    </ModalShell>
  )
}


/* =========================================================
   SMALL COMPONENTS
========================================================= */

function SyncBadge({
  status,
}) {
  if (
    status ===
    'loading'
  ) {
    return (
      <div
        style={
          styles.syncLoading
        }
      >
        Синхронизация...
      </div>
    )
  }


  if (
    status ===
    'error'
  ) {
    return (
      <div
        style={
          styles.syncError
        }
      >
        Ошибка синхронизации
      </div>
    )
  }


  if (
    status ===
    'success'
  ) {
    return (
      <div
        style={
          styles.syncSuccess
        }
      >
        <Check
          size={14}
        />

        Связан с расписанием
      </div>
    )
  }


  return null
}


function JournalSkeleton() {
  return (
    <div
      style={
        styles.skeleton
      }
    >
      <div
        style={
          styles.skeletonLine
        }
      />

      <div
        style={{
          ...styles.skeletonLine,
          width:
            '72%',
        }}
      />

      <div
        style={{
          ...styles.skeletonLine,
          width:
            '84%',
        }}
      />
    </div>
  )
}


function EmptyState({
  text,
}) {
  return (
    <div
      style={
        styles.empty
      }
    >
      {text}
    </div>
  )
}


function ModalShell({
  children,
  onClose,
}) {
  return (
    <div
      style={
        styles.backdrop
      }
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose()
        }
      }}
    >
      <div
        style={
          styles.modal
        }
      >
        {children}
      </div>
    </div>
  )
}


function GradeBadge({
  value,
}) {
  return (
    <span
      style={
        gradeBadgeStyle(
          value,
        )
      }
    >
      {value}
    </span>
  )
}


function AttendanceBadge({
  status,
}) {
  return (
    <span
      style={
        attendanceBadgeStyle(
          status,
        )
      }
    >
      {getAttendanceShort(
        status,
      )}
    </span>
  )
}


/* =========================================================
   HELPERS
========================================================= */

function filterTeacherRows(
  rows,
  teacherId,
) {
  return (
    Array.isArray(rows)
      ? rows
      : []
  ).filter(
    (
      row,
    ) =>
      !row?.teacherId ||
      String(
        row.teacherId,
      ) ===
        String(
          teacherId,
        ),
  )
}


function createAttendanceKey(
  studentId,
  date,
) {
  return `${String(
    studentId ||
      '',
  )}|${String(
    date ||
      '',
  )}`
}


function getCellGrades(
  grades,
  column,
) {
  return (
    grades ||
    []
  ).filter(
    (
      grade,
    ) => {
      /*
        Новая запись:
        строго по journalLessonId.
      */
      if (
        grade.journalLessonId
      ) {
        return (
          String(
            grade.journalLessonId,
          ) ===
          String(
            column.lessonId,
          )
        )
      }


      /*
        Старые оценки без lesson id
        показываем внутри реального
        урока той же даты.
      */
      return (
        String(
          grade.date,
        ) ===
        String(
          column.date,
        )
      )
    },
  )
}


function getAttendanceShort(
  status,
) {
  return (
    ATTENDANCE_OPTIONS.find(
      (
        item,
      ) =>
        item.value ===
        status,
    )?.short ||
    '·'
  )
}


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
    'Не отмечен'
  )
}


function getWorkTypeName(
  value,
) {
  return (
    WORK_TYPES.find(
      (
        item,
      ) =>
        item.value ===
        value,
    )?.label ||
    'Тип работы'
  )
}


function getCurrentAcademicYear() {
  const now =
    new Date()

  const year =
    now.getFullYear()

  const month =
    now.getMonth()


  return month >= 6
    ? `${year}/${year + 1}`
    : `${year - 1}/${year}`
}


function compareClasses(
  first,
  second,
) {
  return String(
    first,
  ).localeCompare(
    String(
      second,
    ),
    'ru',
    {
      numeric:
        true,
    },
  )
}


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


function formatShortDate(
  value,
) {
  const parts =
    String(
      value ||
        '',
    ).split('-')


  if (
    parts.length !==
    3
  ) {
    return value ||
      '—'
  }


  return `${parts[2]}.${parts[1]}`
}


function formatFullDate(
  value,
) {
  if (
    !value
  ) {
    return '—'
  }


  return new Date(
    `${value}T12:00:00`,
  ).toLocaleDateString(
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


function truncate(
  value,
  maxLength,
) {
  const safe =
    String(
      value ||
        '',
    ).trim()


  if (
    safe.length <=
    maxLength
  ) {
    return safe
  }


  return `${safe.slice(
    0,
    maxLength,
  )}…`
}


/* =========================================================
   COLOR HELPERS
========================================================= */

function gradeColors(
  value,
) {
  const grade =
    Number(
      value,
    )


  if (
    grade === 5
  ) {
    return {
      background:
        '#dcfce7',

      color:
        '#15803d',
    }
  }


  if (
    grade === 4
  ) {
    return {
      background:
        '#dbeafe',

      color:
        '#1d4ed8',
    }
  }


  if (
    grade === 3
  ) {
    return {
      background:
        '#fef3c7',

      color:
        '#b45309',
    }
  }


  return {
    background:
      '#fee2e2',

    color:
      '#b91c1c',
  }
}


function attendanceColors(
  status,
) {
  const colors = {
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


  return (
    colors[status] || {
      background:
        '#f1f5f9',

      color:
        '#64748b',
    }
  )
}


function gradeBadgeStyle(
  value,
) {
  return {
    width:
      28,

    height:
      28,

    display:
      'inline-grid',

    placeItems:
      'center',

    borderRadius:
      8,

    fontSize:
      13,

    fontWeight:
      900,

    ...gradeColors(
      value,
    ),
  }
}


function attendanceBadgeStyle(
  status,
) {
  return {
    minWidth:
      30,

    height:
      28,

    padding:
      '0 5px',

    display:
      'inline-grid',

    placeItems:
      'center',

    borderRadius:
      8,

    fontSize:
      11,

    fontWeight:
      900,

    ...attendanceColors(
      status,
    ),
  }
}


function quickGradeStyle(
  grade,
) {
  return {
    width:
      46,

    height:
      42,

    border:
      'none',

    borderRadius:
      11,

    cursor:
      'pointer',

    fontSize:
      16,

    fontWeight:
      900,

    ...gradeColors(
      grade,
    ),
  }
}


function attendanceButtonStyle(
  status,
  active,
) {
  return {
    minWidth:
      48,

    height:
      40,

    padding:
      '0 10px',

    border:
      active
        ? '2px solid currentColor'
        : '1px solid transparent',

    borderRadius:
      11,

    cursor:
      'pointer',

    fontSize:
      12,

    fontWeight:
      900,

    ...attendanceColors(
      status,
    ),
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


  header: {
    display:
      'flex',

    alignItems:
      'flex-start',

    justifyContent:
      'space-between',

    gap:
      14,

    flexWrap:
      'wrap',

    marginBottom:
      16,
  },


  eyebrow: {
    color:
      '#2563eb',

    fontSize:
      10,

    fontWeight:
      900,

    textTransform:
      'uppercase',

    letterSpacing:
      '.05em',
  },


  title: {
    margin:
      '5px 0 0',

    color:
      '#102343',

    fontSize:
      'clamp(25px, 5vw, 35px)',

    lineHeight:
      1.1,
  },


  subtitle: {
    margin:
      '7px 0 0',

    color:
      '#64748b',

    fontSize:
      12,
  },


  filterCard: {
    marginBottom:
      14,
  },


  filters: {
    display:
      'grid',

    gridTemplateColumns:
      'repeat(auto-fit, minmax(150px, 1fr))',

    gap:
      12,
  },


  error: {
    marginBottom:
      12,

    padding:
      11,

    color:
      '#b91c1c',

    background:
      '#fef2f2',

    border:
      '1px solid #fecaca',

    borderRadius:
      12,

    fontSize:
      11,

    fontWeight:
      700,
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

    color:
      '#15803d',

    background:
      '#ecfdf5',

    border:
      '1px solid #bbf7d0',

    borderRadius:
      12,

    fontSize:
      11,

    fontWeight:
      800,
  },


  journalCard: {
    overflow:
      'hidden',
  },


  journalHeader: {
    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'space-between',

    flexWrap:
      'wrap',

    gap:
      12,

    marginBottom:
      12,
  },


  quarterTitle: {
    margin:
      '4px 0 0',

    color:
      '#102343',
  },


  meta: {
    display:
      'block',

    marginTop:
      5,

    color:
      '#94a3b8',

    fontSize:
      9,
  },


  actions: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      7,

    flexWrap:
      'wrap',
  },


  secondaryButton: {
    minHeight:
      36,

    display:
      'inline-flex',

    alignItems:
      'center',

    gap:
      6,

    padding:
      '0 11px',

    border:
      '1px solid #e2e8f0',

    borderRadius:
      10,

    background:
      '#f8fafc',

    color:
      '#334155',

    cursor:
      'pointer',

    fontSize:
      10,

    fontWeight:
      800,
  },


  additionalButton: {
    minHeight:
      36,

    display:
      'inline-flex',

    alignItems:
      'center',

    gap:
      6,

    padding:
      '0 11px',

    border:
      '1px solid #bfdbfe',

    borderRadius:
      10,

    background:
      '#eff6ff',

    color:
      '#2563eb',

    cursor:
      'pointer',

    fontSize:
      10,

    fontWeight:
      800,
  },


  legend: {
    display:
      'flex',

    flexWrap:
      'wrap',

    gap:
      9,

    marginBottom:
      12,

    color:
      '#64748b',

    fontSize:
      9,
  },


  tableScroll: {
    width:
      '100%',

    overflowX:
      'auto',

    border:
      '1px solid #e8eef6',

    borderRadius:
      14,
  },


  table: {
    width:
      '100%',

    borderCollapse:
      'separate',

    borderSpacing:
      0,

    background:
      '#fff',
  },


  studentHeader: {
    position:
      'sticky',

    left:
      0,

    zIndex:
      6,

    minWidth:
      210,

    padding:
      11,

    textAlign:
      'left',

    background:
      '#f8fafc',

    borderBottom:
      '1px solid #e8eef6',

    color:
      '#475569',

    fontSize:
      10,

    fontWeight:
      900,
  },


  dateHeader: {
    minWidth:
      60,

    padding:
      9,

    textAlign:
      'center',

    background:
      '#f8fafc',

    borderBottom:
      '1px solid #e8eef6',

    color:
      '#475569',

    fontSize:
      10,

    fontWeight:
      900,
  },


  topicHint: {
    display:
      'block',

    marginTop:
      3,

    color:
      '#94a3b8',

    fontSize:
      7,
  },


  resultHeader: {
    minWidth:
      55,

    padding:
      9,

    background:
      '#f8fafc',

    borderBottom:
      '1px solid #e8eef6',

    textAlign:
      'center',

    fontSize:
      10,
  },


  studentCell: {
    position:
      'sticky',

    left:
      0,

    zIndex:
      4,

    minWidth:
      210,

    padding:
      '9px 10px',

    background:
      '#fff',

    borderBottom:
      '1px solid #edf2f7',
  },


  studentIdentity: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      9,
  },


  number: {
    width:
      22,

    height:
      22,

    display:
      'grid',

    placeItems:
      'center',

    flexShrink:
      0,

    borderRadius:
      7,

    background:
      '#f1f5f9',

    color:
      '#64748b',

    fontSize:
      9,

    fontWeight:
      800,
  },


  studentName: {
    display:
      'block',

    overflow:
      'hidden',

    color:
      '#102343',

    fontSize:
      11,

    textOverflow:
      'ellipsis',

    whiteSpace:
      'nowrap',
  },


  studentLogin: {
    display:
      'block',

    marginTop:
      2,

    color:
      '#94a3b8',

    fontSize:
      8,
  },


  cell: {
    height:
      48,

    padding:
      3,

    textAlign:
      'center',

    borderBottom:
      '1px solid #edf2f7',

    borderLeft:
      '1px solid #f1f5f9',
  },


  cellButton: {
    width:
      '100%',

    minWidth:
      48,

    minHeight:
      40,

    display:
      'grid',

    placeItems:
      'center',

    border:
      'none',

    borderRadius:
      9,

    background:
      'transparent',

    cursor:
      'pointer',
  },


  cellValue: {
    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap:
      2,
  },


  moreGrades: {
    color:
      '#64748b',

    fontSize:
      8,

    fontWeight:
      800,
  },


  late: {
    color:
      '#b45309',

    fontSize:
      8,

    fontWeight:
      900,
  },


  emptyCell: {
    color:
      '#cbd5e1',

    fontSize:
      18,
  },


  resultCell: {
    minWidth:
      55,

    padding:
      5,

    textAlign:
      'center',

    borderBottom:
      '1px solid #edf2f7',

    borderLeft:
      '1px solid #f1f5f9',

    color:
      '#334155',

    fontSize:
      11,
  },


  quarterButton: {
    width:
      30,

    height:
      30,

    border:
      '1px solid #bfdbfe',

    borderRadius:
      8,

    background:
      '#dbeafe',

    color:
      '#1d4ed8',

    cursor:
      'pointer',

    fontWeight:
      900,
  },


  notAttested: {
    color:
      '#94a3b8',

    fontSize:
      9,

    fontWeight:
      800,
  },


  empty: {
    minHeight:
      130,

    display:
      'grid',

    placeItems:
      'center',

    padding:
      20,

    color:
      '#94a3b8',

    textAlign:
      'center',

    fontSize:
      11,
  },


  skeleton: {
    display:
      'grid',

    gap:
      10,

    padding:
      '30px 18px',
  },


  skeletonLine: {
    width:
      '100%',

    height:
      18,

    borderRadius:
      8,

    background:
      '#eef2f7',
  },


  backdrop: {
    position:
      'fixed',

    inset:
      0,

    zIndex:
      1000,

    display:
      'grid',

    placeItems:
      'center',

    padding:
      16,

    background:
      'rgba(15,23,42,.45)',
  },


  modal: {
    width:
      'min(100%, 470px)',

    maxHeight:
      '88vh',

    overflowY:
      'auto',

    padding:
      18,

    border:
      '1px solid #e2e8f0',

    borderRadius:
      18,

    background:
      '#fff',

    boxShadow:
      '0 24px 70px rgba(15,23,42,.18)',
  },


  modalHeader: {
    display:
      'flex',

    justifyContent:
      'space-between',

    alignItems:
      'flex-start',

    gap:
      12,

    marginBottom:
      13,
  },


  modalTitle: {
    margin:
      '5px 0 0',

    color:
      '#102343',

    fontSize:
      20,
  },


  modalSection: {
    display:
      'grid',

    gap:
      8,

    padding:
      '13px 0',

    borderTop:
      '1px solid #edf2f7',
  },


  optionRow: {
    display:
      'flex',

    flexWrap:
      'wrap',

    gap:
      7,
  },


  muted: {
    display:
      'block',

    margin:
      '5px 0 0',

    color:
      '#94a3b8',

    fontSize:
      9,
  },


  warning: {
    color:
      '#b45309',

    fontSize:
      9,
  },


  closeButton: {
    width:
      34,

    height:
      34,

    display:
      'grid',

    placeItems:
      'center',

    border:
      '1px solid #e2e8f0',

    borderRadius:
      10,

    background:
      '#f8fafc',

    color:
      '#64748b',

    cursor:
      'pointer',
  },


  gradeList: {
    display:
      'grid',

    gap:
      7,
  },


  gradeRow: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      9,

    padding:
      9,

    border:
      '1px solid #edf2f7',

    borderRadius:
      11,

    background:
      '#f8fafc',
  },


  gradeType: {
    display:
      'block',

    fontSize:
      10,
  },


  deleteButton: {
    width:
      31,

    height:
      31,

    display:
      'grid',

    placeItems:
      'center',

    border:
      '1px solid #fecaca',

    borderRadius:
      9,

    background:
      '#fef2f2',

    color:
      '#dc2626',

    cursor:
      'pointer',
  },


  infoBox: {
    marginBottom:
      14,

    padding:
      11,

    border:
      '1px solid #e2e8f0',

    borderRadius:
      11,

    background:
      '#f8fafc',

    color:
      '#64748b',

    fontSize:
      10,

    lineHeight:
      1.5,
  },


  fullButton: {
    width:
      '100%',

    marginTop:
      12,
  },


  syncSuccess: {
    display:
      'inline-flex',

    alignItems:
      'center',

    gap:
      6,

    padding:
      '9px 11px',

    border:
      '1px solid #bbf7d0',

    borderRadius:
      999,

    background:
      '#ecfdf5',

    color:
      '#15803d',

    fontSize:
      10,

    fontWeight:
      800,
  },


  syncLoading: {
    padding:
      '9px 11px',

    border:
      '1px solid #bfdbfe',

    borderRadius:
      999,

    background:
      '#eff6ff',

    color:
      '#2563eb',

    fontSize:
      10,

    fontWeight:
      800,
  },


  syncError: {
    padding:
      '9px 11px',

    border:
      '1px solid #fecaca',

    borderRadius:
      999,

    background:
      '#fef2f2',

    color:
      '#b91c1c',

    fontSize:
      10,

    fontWeight:
      800,
  },
}


export default TeacherJournalPage