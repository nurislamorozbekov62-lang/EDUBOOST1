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
  CalendarPlus,
  Check,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import TeacherAttendancePanel
  from '../components/TeacherAttendancePanel'

import TeacherJournalMobile
  from '../components/TeacherJournalMobile'

import {
  GRADE_TYPES,
  calculateWeightedAverage,
  confirmQuarterGrade,
  createSupabaseGrade,
  deleteSupabaseGrade,
  getSuggestedQuarterGrade,
  getSupabaseSchoolClassesForTeacher,
  getSupabaseStudentsByClass,
  saveGradingSettings,
} from '../services/supabaseJournalService'

import {
  getGradingMinimum,
  getSupabaseClassGrades,
  getSupabaseClassQuarterGrades,
  updateSupabaseGrade,
} from '../services/supabaseJournalClassService'

import {
  createSupabaseJournalLesson,
  getSupabaseJournalLessons,
} from '../services/supabaseJournalLessonService'


const SUBJECTS = [
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


/* =========================================================
   PAGE
========================================================= */

function TeacherJournalPage() {
  const {
    user,
  } = useAuth()

  const navigate =
    useNavigate()


  const [
    activeTab,
    setActiveTab,
  ] = useState(
    'grades',
  )


  const [
    classes,
    setClasses,
  ] = useState([])

  const [
    students,
    setStudents,
  ] = useState([])


  const [
    isMobile,
    setIsMobile,
  ] = useState(() => {
    if (
      typeof window ===
      'undefined'
    ) {
      return false
    }

    return (
      window.innerWidth <=
      760
    )
  })


  const [
    selectedClass,
    setSelectedClass,
  ] = useState('')

  const [
    selectedSubject,
    setSelectedSubject,
  ] = useState(
    'Математика',
  )

  const [
    selectedQuarter,
    setSelectedQuarter,
  ] = useState(1)


  const [
    grades,
    setGrades,
  ] = useState([])

  const [
    lessons,
    setLessons,
  ] = useState([])

  const [
    finalQuarterGrades,
    setFinalQuarterGrades,
  ] = useState([])


  const [
    minimumGrades,
    setMinimumGrades,
  ] = useState(3)


  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')


  const [
    gradeModal,
    setGradeModal,
  ] = useState(null)

  const [
    selectedGrade,
    setSelectedGrade,
  ] = useState(null)

  const [
    lessonModalOpen,
    setLessonModalOpen,
  ] = useState(false)


  /* =======================================================
     RESPONSIVE
  ======================================================= */

  useEffect(() => {
    function handleResize() {
      setIsMobile(
        window.innerWidth <=
          760,
      )
    }


    handleResize()


    window.addEventListener(
      'resize',
      handleResize,
    )


    return () => {
      window.removeEventListener(
        'resize',
        handleResize,
      )
    }
  }, [])


  /* =======================================================
     LOAD CLASSES
  ======================================================= */

  useEffect(() => {
    if (
      !user?.id ||
      user.role !==
        'Учитель'
    ) {
      return
    }


    void loadClasses()
  }, [
    user?.id,
    user?.school,
    user?.schoolId,
    user?.role,
  ])


  /* =======================================================
     LOAD STUDENTS
  ======================================================= */

  useEffect(() => {
    if (
      !selectedClass ||
      !user?.id
    ) {
      setStudents([])

      return
    }


    void loadStudents()
  }, [
    selectedClass,
    user?.id,
    user?.school,
    user?.schoolId,
  ])


  /* =======================================================
     LOAD JOURNAL
  ======================================================= */

  useEffect(() => {
    if (
      activeTab !==
        'grades' ||
      !selectedClass ||
      !selectedSubject ||
      !user?.id
    ) {
      return
    }


    void loadJournal()
  }, [
    activeTab,
    selectedClass,
    selectedSubject,
    selectedQuarter,
    user?.id,
  ])


  async function loadClasses() {
    try {
      setLoading(true)
      setError('')


      const data =
        await getSupabaseSchoolClassesForTeacher(
          user,
        )


      const safeData =
        Array.isArray(
          data,
        )
          ? data
          : []


      setClasses(
        safeData,
      )


      if (
        safeData.length >
        0
      ) {
        setSelectedClass(
          (
            currentClass,
          ) => {
            if (
              currentClass &&
              safeData.includes(
                currentClass,
              )
            ) {
              return currentClass
            }


            return safeData[0]
          },
        )
      } else {
        setSelectedClass('')
      }
    } catch (
      loadError
    ) {
      setClasses([])

      setError(
        loadError?.message ||
          'Не удалось загрузить классы.',
      )
    } finally {
      setLoading(false)
    }
  }


  async function loadStudents() {
    try {
      setError('')


      const data =
        await getSupabaseStudentsByClass(
          user,
          selectedClass,
        )


      setStudents(
        Array.isArray(
          data,
        )
          ? data
          : [],
      )
    } catch (
      loadError
    ) {
      setStudents([])

      setError(
        loadError?.message ||
          'Не удалось загрузить учеников.',
      )
    }
  }


  async function loadJournal() {
    try {
      setLoading(true)
      setError('')


      const [
        gradeRows,
        lessonRows,
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


      setGrades(
        Array.isArray(
          gradeRows,
        )
          ? gradeRows
          : [],
      )


      setLessons(
        Array.isArray(
          lessonRows,
        )
          ? lessonRows
          : [],
      )


      try {
        const finalRows =
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


        setFinalQuarterGrades(
          Array.isArray(
            finalRows,
          )
            ? finalRows
            : [],
        )
      } catch (
        quarterError
      ) {
        console.error(
          quarterError,
        )

        setFinalQuarterGrades(
          [],
        )
      }


      try {
        const minimum =
          await getGradingMinimum({
            teacher:
              user,

            className:
              selectedClass,

            subject:
              selectedSubject,
          })


        setMinimumGrades(
          Number(
            minimum,
          ) ||
            3,
        )
      } catch (
        settingsError
      ) {
        console.error(
          settingsError,
        )

        setMinimumGrades(
          3,
        )
      }
    } catch (
      loadError
    ) {
      setError(
        loadError?.message ||
          'Не удалось загрузить журнал.',
      )
    } finally {
      setLoading(false)
    }
  }


  /* =======================================================
     JOURNAL COLUMNS
  ======================================================= */

  const columns =
    useMemo(() => {
      const map =
        new Map()


      lessons.forEach(
        (lesson) => {
          if (
            !lesson?.date
          ) {
            return
          }


          map.set(
            lesson.date,
            {
              date:
                lesson.date,

              topic:
                lesson.topic ||
                '',

              lessonId:
                lesson.id,

              isLesson:
                true,
            },
          )
        },
      )


      grades.forEach(
        (grade) => {
          if (
            !grade.date ||
            map.has(
              grade.date,
            )
          ) {
            return
          }


          map.set(
            grade.date,
            {
              date:
                grade.date,

              topic:
                grade.topic ||
                '',

              lessonId:
                null,

              isLesson:
                false,
            },
          )
        },
      )


      return [
        ...map.values(),
      ].sort(
        (
          first,
          second,
        ) =>
          String(
            first.date,
          ).localeCompare(
            String(
              second.date,
            ),
          ),
      )
    }, [
      lessons,
      grades,
    ])


  /* =======================================================
     STUDENT ROWS
  ======================================================= */

  const rows =
    useMemo(() => {
      return students.map(
        (student) => {
          const studentGrades =
            grades.filter(
              (grade) =>
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
            Number(
              minimumGrades,
            )


          const predicted =
            isAttested
              ? getSuggestedQuarterGrade(
                  average,
                )
              : null


          const finalRow =
            finalQuarterGrades.find(
              (item) =>
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
              finalRow
                ?.finalGrade ??
              null,

            isAttested,

            missing:
              Math.max(
                Number(
                  minimumGrades,
                ) -
                  studentGrades.length,
                0,
              ),
          }
        },
      )
    }, [
      students,
      grades,
      finalQuarterGrades,
      minimumGrades,
    ])


  /* =======================================================
     SETTINGS
  ======================================================= */

  async function handleSaveMinimum() {
    try {
      setError('')
      setSuccess('')


      const value =
        Number(
          minimumGrades,
        )


      if (
        !Number.isInteger(
          value,
        ) ||
        value < 1 ||
        value > 30
      ) {
        throw new Error(
          'Минимум должен быть от 1 до 30.',
        )
      }


      await saveGradingSettings(
        user,
        selectedClass,
        selectedSubject,
        value,
      )


      setSuccess(
        'Минимум оценок сохранён.',
      )


      await loadJournal()
    } catch (
      saveError
    ) {
      setError(
        saveError?.message ||
          'Не удалось сохранить минимум.',
      )
    }
  }


  /* =======================================================
     QUARTER
  ======================================================= */

  async function handleConfirmQuarter(
    row,
  ) {
    if (
      !row.predicted
    ) {
      return
    }


    try {
      setError('')
      setSuccess('')


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
        `${row.student.name}: четвертная ${row.predicted} выставлена.`,
      )


      await loadJournal()
    } catch (
      saveError
    ) {
      setError(
        saveError?.message ||
          'Не удалось выставить четвертную.',
      )
    }
  }


  /* =======================================================
     OPEN GRADE
  ======================================================= */

 function openGradeModal(
  student,
  date = '',
) {
  setSuccess('')


  if (
    lessons.length === 0
  ) {
    const message =
      'Сначала добавьте урок в журнал.'

    setError(
      message,
    )

    window.alert(
      message,
    )

    return
  }


  let journalLesson = null


  if (date) {
    journalLesson =
      lessons.find(
        (lesson) =>
          lesson.date ===
          date,
      ) ||
      null


    if (
      !journalLesson
    ) {
      const message =
        'На эту дату нет созданного урока. Сначала нажмите «Добавить урок» и создайте урок на эту дату.'

      setError(
        message,
      )

      window.alert(
        message,
      )

      return
    }
  } else {
    journalLesson =
      [...lessons]
        .sort(
          (
            first,
            second,
          ) =>
            String(
              second.date ||
                '',
            ).localeCompare(
              String(
                first.date ||
                  '',
              ),
            ),
        )[0]
  }


  if (
    !journalLesson?.id
  ) {
    const message =
      'Не удалось определить урок для оценки.'

    setError(
      message,
    )

    window.alert(
      message,
    )

    return
  }


  setError('')


  setGradeModal({
    student,

    date:
      journalLesson.date,

    journalLessonId:
      journalLesson.id,
  })
}


  /* =======================================================
     OPEN SCHOOL LESSON
  ======================================================= */

  function openSchoolLesson(
    lessonId,
  ) {
    if (
      !lessonId
    ) {
      return
    }


    navigate(
      `/school-lessons/${lessonId}`,
    )
  }


  /* =======================================================
     TAB
  ======================================================= */

  function changeTab(
    tab,
  ) {
    setActiveTab(
      tab,
    )

    setError('')
    setSuccess('')
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
    user.role !==
    'Учитель'
  ) {
    return (
      <div className="page-container">

        <section className="content-card">

          <h2>
            Доступ запрещён
          </h2>

          <p>
            Электронный журнал
            доступен только
            учителям.
          </p>

        </section>

      </div>
    )
  }


  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="page-container">

      <header className="page-header">

        <div>

          <h1>
            Электронный журнал
          </h1>

          <p>
            Оценки, уроки,
            четвертные результаты
            и посещаемость класса.
          </p>

        </div>

      </header>


      {/* =================================================
          FILTERS
      ================================================= */}

      <section className="content-card">

        <div
          style={
            filtersGridStyle
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
              onChange={
                (event) =>
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
              onChange={
                (event) =>
                  setSelectedSubject(
                    event.target.value,
                  )
              }
            >

              {SUBJECTS.map(
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


          {activeTab ===
            'grades' && (
            <>

              <label className="form-group">

                <span>
                  Четверть
                </span>

                <select
                  value={
                    selectedQuarter
                  }
                  onChange={
                    (event) =>
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


              <label className="form-group">

                <span>
                  Минимум оценок
                </span>

                <div
                  style={
                    inlineInputStyle
                  }
                >

                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={
                      minimumGrades
                    }
                    onChange={
                      (event) =>
                        setMinimumGrades(
                          Number(
                            event.target.value,
                          ),
                        )
                    }
                  />


                  <button
                    type="button"
                    className="primary-button"
                    onClick={
                      handleSaveMinimum
                    }
                    title="Сохранить минимум"
                  >
                    <Check
                      size={18}
                    />
                  </button>

                </div>

              </label>

            </>
          )}

        </div>

      </section>


      {/* =================================================
          TABS
      ================================================= */}

      <div
        style={
          tabsStyle
        }
      >

        <button
          type="button"
          onClick={() =>
            changeTab(
              'grades',
            )
          }
          style={
            tabButtonStyle(
              activeTab ===
                'grades',
            )
          }
        >
          📘 Оценки
        </button>


        <button
          type="button"
          onClick={() =>
            changeTab(
              'attendance',
            )
          }
          style={
            tabButtonStyle(
              activeTab ===
                'attendance',
            )
          }
        >
          📅 Посещаемость
        </button>

      </div>


      {/* =================================================
          MESSAGES
      ================================================= */}

      {error && (
        <section className="content-card">

          <div className="auth-error">
            {error}
          </div>

        </section>
      )}


      {success && (
        <section className="content-card">

          <p
            style={{
              margin:
                0,
            }}
          >
            ✅ {success}
          </p>

        </section>
      )}


      {/* =================================================
          GRADES
      ================================================= */}

      {activeTab ===
        'grades' && (
        <section className="content-card">

          <div
            style={
              journalHeaderStyle
            }
          >

            <div>

              <p
                style={
                  journalEyebrowStyle
                }
              >
                {selectedClass ||
                  'Класс'}
                {' · '}
                {selectedSubject}
              </p>


              <h2
                style={{
                  margin:
                    '4px 0 0',
                }}
              >
                {selectedQuarter}
                {' четверть'}
              </h2>

            </div>


            <div
              style={
                journalActionsStyle
              }
            >

              <span
                style={
                  studentCountStyle
                }
              >
                Учеников:{' '}
                {students.length}
              </span>


              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  setLessonModalOpen(
                    true,
                  )
                }
                disabled={
                  !selectedClass
                }
              >
                <CalendarPlus
                  size={18}
                />

                Добавить урок
              </button>

            </div>

          </div>


          <div
            style={
              hintStyle
            }
          >
            {isMobile
              ? '📱 Выберите дату урока и нажмите «Поставить» возле нужного ученика.'
              : '💡 Нажмите на пустую клетку журнала, чтобы поставить оценку за выбранный урок.'}
          </div>


          {/* =============================================
              REAL LESSONS
          ============================================= */}

          {!loading &&
            lessons.length >
              0 && (
            <JournalLessonsPanel
              lessons={
                lessons
              }
              onOpen={
                openSchoolLesson
              }
            />
          )}


          {/* =============================================
              JOURNAL
          ============================================= */}

          {loading ? (
            <p className="empty-text">
              Загрузка журнала...
            </p>
          ) : students.length ===
          0 ? (
            <p className="empty-text">
              В этом классе пока
              нет учеников.
            </p>
          ) : isMobile ? (
            <TeacherJournalMobile
              rows={
                rows
              }
              columns={
                columns
              }
              selectedSubject={
                selectedSubject
              }
              selectedQuarter={
                selectedQuarter
              }
              onAddGrade={
                openGradeModal
              }
              onEditGrade={
                setSelectedGrade
              }
              onConfirmQuarter={
                handleConfirmQuarter
              }
            />
          ) : (
            <JournalTable
              rows={
                rows
              }
              columns={
                columns
              }
              selectedSubject={
                selectedSubject
              }
              selectedQuarter={
                selectedQuarter
              }
              onAddGrade={
                openGradeModal
              }
              onEditGrade={
                setSelectedGrade
              }
              onConfirmQuarter={
                handleConfirmQuarter
              }
              onOpenLesson={
                openSchoolLesson
              }
            />
          )}

        </section>
      )}


      {/* =================================================
          ATTENDANCE
      ================================================= */}

      {activeTab ===
        'attendance' && (
        <section className="content-card">

          <TeacherAttendancePanel
            teacher={
              user
            }
            students={
              students
            }
            className={
              selectedClass
            }
            subject={
              selectedSubject
            }
          />

        </section>
      )}


      {/* =================================================
          CREATE LESSON MODAL
      ================================================= */}

      {lessonModalOpen && (
        <CreateLessonModal
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
                'Урок добавлен в журнал.',
              )

              await loadJournal()
            }
          }
        />
      )}


      {/* =================================================
          CREATE GRADE MODAL
      ================================================= */}

      {gradeModal && (
        <CreateGradeModal
          teacher={
            user
          }
          student={
            gradeModal.student
          }
          subject={
            selectedSubject
          }
          quarter={
            selectedQuarter
          }
          defaultDate={
            gradeModal.date
          }
          journalLessonId={
            gradeModal
              .journalLessonId
          }
          onClose={() =>
            setGradeModal(
              null,
            )
          }
          onSaved={
            async () => {
              setGradeModal(
                null,
              )

              setSuccess(
                'Оценка сохранена.',
              )

              await loadJournal()
            }
          }
        />
      )}


      {/* =================================================
          EDIT GRADE MODAL
      ================================================= */}

      {selectedGrade && (
        <EditGradeModal
          grade={
            selectedGrade
          }
          canDelete={
            String(
              selectedGrade
                .teacherId,
            ) ===
            String(
              user.id,
            )
          }
          onClose={() =>
            setSelectedGrade(
              null,
            )
          }
          onSaved={
            async () => {
              setSelectedGrade(
                null,
              )

              setSuccess(
                'Оценка изменена.',
              )

              await loadJournal()
            }
          }
          onDeleted={
            async () => {
              setSelectedGrade(
                null,
              )

              setSuccess(
                'Оценка удалена.',
              )

              await loadJournal()
            }
          }
        />
      )}

    </div>
  )
}


/* =========================================================
   JOURNAL LESSONS PANEL
========================================================= */

function JournalLessonsPanel({
  lessons,
  onOpen,
}) {
  const sortedLessons =
    [...lessons].sort(
      (
        first,
        second,
      ) =>
        String(
          second.date ||
            '',
        ).localeCompare(
          String(
            first.date ||
              '',
          ),
        ),
    )


  return (
    <div
      style={
        lessonsPanelStyle
      }
    >

      <div
        style={
          lessonsPanelHeaderStyle
        }
      >

        <div>

          <strong
            style={
              lessonsPanelTitleStyle
            }
          >
            Уроки журнала
          </strong>

          <small
            style={
              lessonsPanelSubtitleStyle
            }
          >
            Откройте конкретный
            урок для темы,
            посещаемости, оценок
            и домашнего задания
          </small>

        </div>


        <span
          style={
            lessonsCountStyle
          }
        >
          {lessons.length}{' '}
          {getLessonsWord(
            lessons.length,
          )}
        </span>

      </div>


      <div
        style={
          lessonsGridStyle
        }
      >

        {sortedLessons.map(
          (lesson) => (
            <button
              key={
                lesson.id
              }
              type="button"
              onClick={() =>
                onOpen(
                  lesson.id,
                )
              }
              style={
                lessonOpenCardStyle
              }
            >

              <div
                style={
                  lessonOpenMainStyle
                }
              >

                <div
                  style={
                    lessonOpenIconStyle
                  }
                >
                  <BookOpen
                    size={18}
                  />
                </div>


                <div
                  style={{
                    minWidth:
                      0,
                  }}
                >

                  <strong
                    style={
                      lessonOpenDateStyle
                    }
                  >
                    {formatFullDate(
                      lesson.date,
                    )}
                  </strong>


                  <small
                    style={
                      lessonOpenTopicStyle
                    }
                  >
                    {lesson.topic ||
                      'Тема не заполнена'}
                  </small>

                </div>

              </div>


              <ChevronRight
                size={18}
                color="#2563eb"
              />

            </button>
          ),
        )}

      </div>

    </div>
  )
}


/* =========================================================
   DESKTOP JOURNAL TABLE
========================================================= */

function JournalTable({
  rows,
  columns,
  selectedSubject,
  selectedQuarter,
  onAddGrade,
  onEditGrade,
  onConfirmQuarter,
  onOpenLesson,
}) {
  return (
    <div
      style={
        tableWrapperStyle
      }
    >

      <table
        style={{
          width:
            '100%',

          borderCollapse:
            'collapse',

          minWidth:
            Math.max(
              900,
              440 +
                columns.length *
                  100,
            ),
        }}
      >

        <thead>

          <tr>

            <th
              style={
                stickyNameHeaderStyle
              }
            >
              Ученик
            </th>


            {columns.map(
              (column) => (
                <th
                  key={
                    column.date
                  }
                  style={
                    dateHeaderStyle
                  }
                  title={
                    column.topic ||
                    formatFullDate(
                      column.date,
                    )
                  }
                >

                  {column.lessonId ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenLesson(
                          column.lessonId,
                        )
                      }
                      style={
                        dateLessonButtonStyle
                      }
                      title="Открыть карточку урока"
                    >

                      <div>
                        {formatShortDate(
                          column.date,
                        )}
                      </div>

                      <small
                        style={
                          dateTopicStyle
                        }
                      >
                        {column.topic ||
                          'Урок'}
                      </small>

                      <BookOpen
                        size={13}
                      />

                    </button>
                  ) : (
                    <>
                      <div>
                        {formatShortDate(
                          column.date,
                        )}
                      </div>

                      <small
                        style={
                          dateTopicStyle
                        }
                      >
                        {column.topic ||
                          'Дата'}
                      </small>
                    </>
                  )}

                </th>
              ),
            )}


            <th
              style={
                headerCellStyle
              }
            >
              Ср.
            </th>


            <th
              style={
                headerCellStyle
              }
            >
              Прогноз
            </th>


            <th
              style={
                headerCellStyle
              }
            >
              Четверть
            </th>


            <th
              style={
                headerCellStyle
              }
            >
              +
            </th>

          </tr>

        </thead>


        <tbody>

          {rows.map(
            (row) => (
              <tr
                key={
                  row.student.id
                }
              >

                <td
                  style={
                    stickyNameCellStyle
                  }
                >

                  <div
                    style={
                      studentCellStyle
                    }
                  >

                    <div
                      style={
                        avatarStyle
                      }
                    >
                      {String(
                        row.student
                          .name ||
                          'У',
                      )
                        .charAt(
                          0,
                        )
                        .toUpperCase()}
                    </div>


                    <div>

                      <strong>
                        {row.student.name}
                      </strong>

                      <div
                        style={
                          studentMetaStyle
                        }
                      >
                        {selectedSubject}
                        {' · '}
                        {selectedQuarter}
                        {' четв.'}
                      </div>

                    </div>

                  </div>

                </td>


                {columns.map(
                  (column) => {
                    const cellGrades =
                      row.grades.filter(
                        (grade) => {
                          if (
                            grade
                              .journalLessonId &&
                            column
                              .lessonId
                          ) {
                            return (
                              String(
                                grade
                                  .journalLessonId,
                              ) ===
                              String(
                                column
                                  .lessonId,
                              )
                            )
                          }


                          return (
                            grade.date ===
                            column.date
                          )
                        },
                      )


                    return (
                      <td
                        key={
                          column.date
                        }
                        style={
                          bodyCellStyle
                        }
                      >

                        {cellGrades.length ===
                        0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              onAddGrade(
                                row.student,
                                column.date,
                              )
                            }
                            style={
                              emptyCellButtonStyle
                            }
                            title={`Поставить оценку за ${formatFullDate(
                              column.date,
                            )}`}
                          >
                            <Plus
                              size={17}
                            />
                          </button>
                        ) : (
                          <div
                            style={
                              cellGradesStyle
                            }
                          >

                            {cellGrades.map(
                              (
                                grade,
                              ) => (
                                <button
                                  type="button"
                                  key={
                                    grade.id
                                  }
                                  onClick={() =>
                                    onEditGrade(
                                      grade,
                                    )
                                  }
                                  title={
                                    grade
                                      .journalLessonId
                                      ? 'Изменить оценку этого урока'
                                      : 'Изменить оценку'
                                  }
                                  style={
                                    gradeButtonStyle(
                                      grade.value,
                                    )
                                  }
                                >
                                  {grade.value}
                                </button>
                              ),
                            )}


                            <button
                              type="button"
                              onClick={() =>
                                onAddGrade(
                                  row.student,
                                  column.date,
                                )
                              }
                              style={
                                smallAddButtonStyle
                              }
                              title="Добавить ещё одну оценку"
                            >
                              <Plus
                                size={13}
                              />
                            </button>

                          </div>
                        )}

                      </td>
                    )
                  },
                )}


                <td
                  style={
                    bodyCellStyle
                  }
                >
                  <strong>
                    {row.average ??
                      '—'}
                  </strong>
                </td>


                <td
                  style={
                    bodyCellStyle
                  }
                >

                  {row.isAttested ? (
                    <span
                      style={
                        resultBadgeStyle(
                          row.predicted,
                        )
                      }
                    >
                      {row.predicted}
                    </span>
                  ) : (
                    <span
                      style={
                        naBadgeStyle
                      }
                      title={`Не хватает оценок: ${row.missing}`}
                    >
                      Н/А
                    </span>
                  )}

                </td>


                <td
                  style={
                    bodyCellStyle
                  }
                >

                  {row.finalGrade !==
                  null ? (
                    <span
                      style={
                        resultBadgeStyle(
                          row.finalGrade,
                        )
                      }
                    >
                      {row.finalGrade}
                    </span>
                  ) : row.isAttested ? (
                    <button
                      type="button"
                      onClick={() =>
                        onConfirmQuarter(
                          row,
                        )
                      }
                      style={
                        confirmButtonStyle
                      }
                      title="Подтвердить четвертную"
                    >
                      {row.predicted}

                      <ChevronRight
                        size={15}
                      />
                    </button>
                  ) : (
                    <span
                      style={{
                        opacity:
                          0.35,
                      }}
                    >
                      —
                    </span>
                  )}

                </td>


                <td
                  style={
                    bodyCellStyle
                  }
                >

                  <button
                    type="button"
                    onClick={() =>
                      onAddGrade(
                        row.student,
                      )
                    }
                    style={
                      addButtonStyle
                    }
                    title="Добавить оценку"
                  >
                    <Plus
                      size={18}
                    />
                  </button>

                </td>

              </tr>
            ),
          )}

        </tbody>

      </table>


      {columns.length ===
        0 && (
        <div
          style={
            noDatesStyle
          }
        >

          <CalendarPlus
            size={30}
          />

          <strong>
            Пока нет уроков
          </strong>

          <p>
            Нажмите «Добавить
            урок», чтобы создать
            первую колонку журнала.
          </p>

        </div>
      )}

    </div>
  )
}


/* =========================================================
   CREATE LESSON
========================================================= */

function CreateLessonModal({
  teacher,
  className,
  subject,
  quarter,
  onClose,
  onSaved,
}) {
  const [
    form,
    setForm,
  ] = useState({
    date:
      getToday(),

    topic:
      '',
  })


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


    try {
      setSaving(true)
      setError('')


      await createSupabaseJournalLesson({
        teacher,

        className,

        subject,

        quarter,

        date:
          form.date,

        topic:
          form.topic,
      })


      await onSaved()
    } catch (
      saveError
    ) {
      setError(
        saveError?.message ||
          'Не удалось добавить урок.',
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

        <ModalHeader
          subtitle={`${className} · ${subject}`}
          title="Добавить урок"
          onClose={
            onClose
          }
        />


        <div
          style={
            lessonInfoStyle
          }
        >
          📅 После сохранения
          урок появится в журнале
          и получит собственную
          карточку.
        </div>


        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}


        <label className="form-group">

          <span>
            Дата урока
          </span>

          <input
            type="date"
            required
            value={
              form.date
            }
            onChange={
              (event) =>
                setForm(
                  (
                    currentForm,
                  ) => ({
                    ...currentForm,

                    date:
                      event.target.value,
                  }),
                )
            }
          />

        </label>


        <label className="form-group">

          <span>
            Тема урока
          </span>

          <input
            value={
              form.topic
            }
            onChange={
              (event) =>
                setForm(
                  (
                    currentForm,
                  ) => ({
                    ...currentForm,

                    topic:
                      event.target.value,
                  }),
                )
            }
            placeholder="Например: Квадратные уравнения"
          />

        </label>


        <button
          type="submit"
          className="primary-button"
          disabled={
            saving
          }
          style={{
            width:
              '100%',
          }}
        >

          <CalendarPlus
            size={18}
          />

          {saving
            ? 'Добавляем...'
            : 'Добавить урок'}

        </button>

      </form>

    </ModalShell>
  )
}


/* =========================================================
   CREATE GRADE
========================================================= */

function CreateGradeModal({
  teacher,
  student,
  subject,
  quarter,
  defaultDate,
  journalLessonId,
  onClose,
  onSaved,
}) {
  const [
    form,
    setForm,
  ] = useState({
    value:
      '5',

    workType:
      'homework',

    topic:
      '',

    comment:
      '',

    date:
      defaultDate ||
      getToday(),
  })


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


    try {
      setSaving(true)
      setError('')


      if (
        !journalLessonId
      ) {
        throw new Error(
          'Оценка должна быть привязана к уроку.',
        )
      }


      await createSupabaseGrade(
        teacher,
        student,
        {
          ...form,

          subject,

          quarter,

          journalLessonId,
        },
      )


      await onSaved()
    } catch (
      saveError
    ) {
      setError(
        saveError?.message ||
          'Не удалось сохранить оценку.',
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

        <ModalHeader
          subtitle={
            student.name
          }
          title="Новая оценка"
          onClose={
            onClose
          }
        />


        <p
          style={
            modalSubtitleStyle
          }
        >
          {subject}
          {' · '}
          {quarter}
          {' четверть · '}
          {formatFullDate(
            form.date,
          )}
        </p>


        <div
          style={
            lessonInfoStyle
          }
        >
          📘 Оценка будет
          привязана к конкретному
          уроку.
        </div>


        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}


        <GradeFormFields
          form={
            form
          }
          setForm={
            setForm
          }
          disableDate
        />


        <button
          type="submit"
          className="primary-button"
          disabled={
            saving
          }
          style={{
            width:
              '100%',
          }}
        >
          {saving
            ? 'Сохраняем...'
            : 'Сохранить оценку'}
        </button>

      </form>

    </ModalShell>
  )
}


/* =========================================================
   EDIT GRADE
========================================================= */

function EditGradeModal({
  grade,
  canDelete,
  onClose,
  onSaved,
  onDeleted,
}) {
  const [
    form,
    setForm,
  ] = useState({
    value:
      String(
        grade.value,
      ),

    workType:
      grade.workType ||
      'homework',

    topic:
      grade.topic ||
      '',

    comment:
      grade.comment ||
      '',

    date:
      grade.date ||
      getToday(),
  })


  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    deleting,
    setDeleting,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')


  const linkedToLesson =
    Boolean(
      grade
        .journalLessonId,
    )


  async function handleSubmit(
    event,
  ) {
    event.preventDefault()


    try {
      setSaving(true)
      setError('')


      await updateSupabaseGrade(
        grade.id,
        form,
      )


      await onSaved()
    } catch (
      saveError
    ) {
      setError(
        saveError?.message ||
          'Не удалось изменить оценку.',
      )
    } finally {
      setSaving(false)
    }
  }


  async function handleDelete() {
    const confirmed =
      window.confirm(
        'Удалить эту оценку?',
      )


    if (
      !confirmed
    ) {
      return
    }


    try {
      setDeleting(true)
      setError('')


      await deleteSupabaseGrade(
        grade.id,
      )


      await onDeleted()
    } catch (
      deleteError
    ) {
      setError(
        deleteError?.message ||
          'Не удалось удалить оценку.',
      )
    } finally {
      setDeleting(false)
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

        <ModalHeader
          subtitle={
            grade.subject
          }
          title={`Редактировать оценку ${grade.value}`}
          onClose={
            onClose
          }
        />


        <div
          style={
            editInfoStyle
          }
        >

          <Pencil
            size={17}
          />

          <span>
            Изменения сразу
            увидит ученик.
          </span>

        </div>


        {linkedToLesson && (
          <div
            style={
              lessonInfoStyle
            }
          >
            📘 Эта оценка привязана
            к конкретному уроку.
            Дата фиксирована.
          </div>
        )}


        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}


        <GradeFormFields
          form={
            form
          }
          setForm={
            setForm
          }
          disableDate={
            linkedToLesson
          }
        />


        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              canDelete
                ? '1fr 1fr'
                : '1fr',

            gap:
              10,
          }}
        >

          <button
            type="submit"
            className="primary-button"
            disabled={
              saving ||
              deleting
            }
          >
            {saving
              ? 'Сохраняем...'
              : 'Сохранить изменения'}
          </button>


          {canDelete && (
            <button
              type="button"
              onClick={
                handleDelete
              }
              disabled={
                saving ||
                deleting
              }
              style={
                deleteButtonStyle
              }
            >

              <Trash2
                size={18}
              />

              {deleting
                ? 'Удаляем...'
                : 'Удалить'}

            </button>
          )}

        </div>

      </form>

    </ModalShell>
  )
}


/* =========================================================
   GRADE FIELDS
========================================================= */

function GradeFormFields({
  form,
  setForm,
  disableDate = false,
}) {
  return (
    <>

      <div
        style={
          twoColumnStyle
        }
      >

        <label className="form-group">

          <span>
            Оценка
          </span>

          <select
            value={
              form.value
            }
            onChange={
              (event) =>
                setForm(
                  (
                    currentForm,
                  ) => ({
                    ...currentForm,

                    value:
                      event.target.value,
                  }),
                )
            }
          >

            <option value="5">
              5
            </option>

            <option value="4">
              4
            </option>

            <option value="3">
              3
            </option>

            <option value="2">
              2
            </option>

            <option value="1">
              1
            </option>

          </select>

        </label>


        <label className="form-group">

          <span>
            Дата
          </span>

          <input
            type="date"
            required
            disabled={
              disableDate
            }
            value={
              form.date
            }
            onChange={
              (event) =>
                setForm(
                  (
                    currentForm,
                  ) => ({
                    ...currentForm,

                    date:
                      event.target.value,
                  }),
                )
            }
          />

        </label>

      </div>


      <label className="form-group">

        <span>
          Тип работы
        </span>

        <select
          value={
            form.workType
          }
          onChange={
            (event) =>
              setForm(
                (
                  currentForm,
                ) => ({
                  ...currentForm,

                  workType:
                    event.target.value,
                }),
              )
          }
        >

          {GRADE_TYPES.map(
            (
              type,
            ) => (
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

      </label>


      <label className="form-group">

        <span>
          Тема
        </span>

        <input
          value={
            form.topic
          }
          onChange={
            (event) =>
              setForm(
                (
                  currentForm,
                ) => ({
                  ...currentForm,

                  topic:
                    event.target.value,
                }),
              )
          }
          placeholder="Например: Квадратные уравнения"
        />

      </label>


      <label className="form-group">

        <span>
          Комментарий
        </span>

        <textarea
          value={
            form.comment
          }
          onChange={
            (event) =>
              setForm(
                (
                  currentForm,
                ) => ({
                  ...currentForm,

                  comment:
                    event.target.value,
                }),
              )
          }
          placeholder="Комментарий для ученика"
        />

      </label>

    </>
  )
}


/* =========================================================
   MODAL
========================================================= */

function ModalHeader({
  subtitle,
  title,
  onClose,
}) {
  return (
    <div
      style={
        modalHeaderStyle
      }
    >

      <div>

        <p
          style={{
            margin:
              0,

            opacity:
              0.6,
          }}
        >
          {subtitle}
        </p>


        <h2
          style={{
            margin:
              '4px 0 0',
          }}
        >
          {title}
        </h2>

      </div>


      <button
        type="button"
        onClick={
          onClose
        }
        style={
          iconButtonStyle
        }
      >
        <X
          size={20}
        />
      </button>

    </div>
  )
}


function ModalShell({
  children,
  onClose,
}) {
  return (
    <div
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
      style={
        modalBackdropStyle
      }
    >

      <div
        style={
          modalCardStyle
        }
      >
        {children}
      </div>

    </div>
  )
}


/* =========================================================
   DATE
========================================================= */

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
    return '—'
  }


  return date.toLocaleDateString(
    'ru-RU',
    {
      day:
        '2-digit',

      month:
        '2-digit',
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
    return 'Дата не указана'
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


function getLessonsWord(
  count,
) {
  const value =
    Math.abs(
      Number(
        count,
      ),
    )


  const mod100 =
    value %
    100

  const mod10 =
    value %
    10


  if (
    mod100 >= 11 &&
    mod100 <= 14
  ) {
    return 'уроков'
  }


  if (
    mod10 === 1
  ) {
    return 'урок'
  }


  if (
    mod10 >= 2 &&
    mod10 <= 4
  ) {
    return 'урока'
  }


  return 'уроков'
}


/* =========================================================
   STYLES
========================================================= */

function tabButtonStyle(
  active,
) {
  return {
    border:
      'none',

    borderRadius:
      12,

    padding:
      '11px 18px',

    cursor:
      'pointer',

    fontWeight:
      800,

    fontSize:
      14,

    background:
      active
        ? '#2563eb'
        : '#f1f5f9',

    color:
      active
        ? '#ffffff'
        : '#334155',

    boxShadow:
      active
        ? '0 6px 18px rgba(37, 99, 235, 0.18)'
        : 'none',
  }
}


function gradeButtonStyle(
  value,
) {
  const backgrounds = {
    5:
      '#dcfce7',

    4:
      '#dbeafe',

    3:
      '#fef3c7',

    2:
      '#fee2e2',

    1:
      '#fecaca',
  }


  return {
    border:
      'none',

    width:
      34,

    height:
      34,

    borderRadius:
      10,

    cursor:
      'pointer',

    fontWeight:
      800,

    fontSize:
      15,

    background:
      backgrounds[
        value
      ] ||
      '#f1f5f9',

    color:
      '#0f172a',
  }
}


function resultBadgeStyle(
  value,
) {
  return {
    display:
      'inline-grid',

    placeItems:
      'center',

    minWidth:
      36,

    height:
      36,

    padding:
      '0 10px',

    borderRadius:
      10,

    fontWeight:
      800,

    background:
      Number(
        value,
      ) >= 5
        ? '#dcfce7'
        : Number(
              value,
            ) >= 4
          ? '#dbeafe'
          : Number(
                value,
              ) >= 3
            ? '#fef3c7'
            : '#fee2e2',
  }
}


const filtersGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(190px, 1fr))',

  gap:
    16,
}


const inlineInputStyle = {
  display:
    'flex',

  gap:
    8,
}


const tabsStyle = {
  display:
    'flex',

  gap:
    10,

  marginBottom:
    18,

  flexWrap:
    'wrap',
}


const journalHeaderStyle = {
  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    16,

  flexWrap:
    'wrap',

  marginBottom:
    16,
}


const journalEyebrowStyle = {
  margin:
    0,

  opacity:
    0.65,
}


const journalActionsStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    10,

  flexWrap:
    'wrap',
}


const studentCountStyle = {
  padding:
    '8px 11px',

  borderRadius:
    10,

  background:
    '#f8fafc',

  fontSize:
    13,

  fontWeight:
    700,
}


const hintStyle = {
  padding:
    '11px 13px',

  marginBottom:
    16,

  borderRadius:
    12,

  background:
    '#eff6ff',

  color:
    '#1e40af',

  fontSize:
    13,
}


/* LESSONS */

const lessonsPanelStyle = {
  padding:
    14,

  marginBottom:
    18,

  border:
    '1px solid #dbeafe',

  borderRadius:
    16,

  background:
    '#f8fbff',
}


const lessonsPanelHeaderStyle = {
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
    12,
}


const lessonsPanelTitleStyle = {
  display:
    'block',

  color:
    '#0f274d',

  fontSize:
    16,
}


const lessonsPanelSubtitleStyle = {
  display:
    'block',

  marginTop:
    3,

  color:
    '#64748b',

  lineHeight:
    1.4,
}


const lessonsCountStyle = {
  padding:
    '7px 10px',

  borderRadius:
    9,

  background:
    '#e2e8f0',

  color:
    '#475569',

  fontSize:
    12,

  fontWeight:
    700,
}


const lessonsGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(220px, 1fr))',

  gap:
    10,
}


const lessonOpenCardStyle = {
  width:
    '100%',

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    12,

  padding:
    13,

  border:
    '1px solid #dbeafe',

  borderRadius:
    13,

  background:
    '#ffffff',

  cursor:
    'pointer',

  textAlign:
    'left',
}


const lessonOpenMainStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    10,

  minWidth:
    0,
}


const lessonOpenIconStyle = {
  width:
    38,

  height:
    38,

  flexShrink:
    0,

  display:
    'grid',

  placeItems:
    'center',

  borderRadius:
    10,

  background:
    '#dbeafe',

  color:
    '#2563eb',
}


const lessonOpenDateStyle = {
  display:
    'block',

  color:
    '#0f274d',

  whiteSpace:
    'nowrap',

  overflow:
    'hidden',

  textOverflow:
    'ellipsis',
}


const lessonOpenTopicStyle = {
  display:
    'block',

  marginTop:
    3,

  color:
    '#64748b',

  whiteSpace:
    'nowrap',

  overflow:
    'hidden',

  textOverflow:
    'ellipsis',
}


/* TABLE */

const tableWrapperStyle = {
  position:
    'relative',

  overflowX:
    'auto',

  border:
    '1px solid #e5e7eb',

  borderRadius:
    16,
}


const headerCellStyle = {
  padding:
    12,

  textAlign:
    'center',

  borderBottom:
    '1px solid #e5e7eb',

  background:
    '#f8fafc',

  whiteSpace:
    'nowrap',

  fontSize:
    13,
}


const dateHeaderStyle = {
  ...headerCellStyle,

  minWidth:
    95,

  maxWidth:
    110,
}


const dateLessonButtonStyle = {
  width:
    '100%',

  display:
    'grid',

  justifyItems:
    'center',

  gap:
    3,

  padding:
    0,

  border:
    'none',

  background:
    'transparent',

  color:
    '#0f274d',

  cursor:
    'pointer',

  fontWeight:
    700,
}


const dateTopicStyle = {
  display:
    'block',

  marginTop:
    4,

  maxWidth:
    90,

  overflow:
    'hidden',

  textOverflow:
    'ellipsis',

  whiteSpace:
    'nowrap',

  opacity:
    0.55,

  fontWeight:
    500,
}


const bodyCellStyle = {
  padding:
    8,

  textAlign:
    'center',

  borderBottom:
    '1px solid #eef2f7',

  minWidth:
    68,
}


const stickyNameHeaderStyle = {
  ...headerCellStyle,

  position:
    'sticky',

  left:
    0,

  zIndex:
    3,

  textAlign:
    'left',

  minWidth:
    230,
}


const stickyNameCellStyle = {
  ...bodyCellStyle,

  position:
    'sticky',

  left:
    0,

  zIndex:
    2,

  textAlign:
    'left',

  minWidth:
    230,

  background:
    '#ffffff',
}


const studentCellStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    10,
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

  fontWeight:
    800,
}


const studentMetaStyle = {
  fontSize:
    12,

  opacity:
    0.6,

  marginTop:
    2,
}


const emptyCellButtonStyle = {
  width:
    42,

  height:
    38,

  borderRadius:
    10,

  border:
    '1px dashed #cbd5e1',

  background:
    '#ffffff',

  color:
    '#94a3b8',

  cursor:
    'pointer',

  display:
    'inline-grid',

  placeItems:
    'center',
}


const cellGradesStyle = {
  display:
    'flex',

  justifyContent:
    'center',

  alignItems:
    'center',

  gap:
    4,

  flexWrap:
    'wrap',
}


const smallAddButtonStyle = {
  width:
    25,

  height:
    25,

  borderRadius:
    8,

  border:
    '1px dashed #cbd5e1',

  background:
    '#ffffff',

  color:
    '#64748b',

  cursor:
    'pointer',

  display:
    'grid',

  placeItems:
    'center',
}


const addButtonStyle = {
  width:
    36,

  height:
    36,

  borderRadius:
    10,

  border:
    '1px solid #dbeafe',

  background:
    '#eff6ff',

  color:
    '#2563eb',

  display:
    'inline-grid',

  placeItems:
    'center',

  cursor:
    'pointer',
}


const confirmButtonStyle = {
  border:
    'none',

  borderRadius:
    10,

  minHeight:
    36,

  padding:
    '0 10px',

  cursor:
    'pointer',

  background:
    '#eff6ff',

  color:
    '#1d4ed8',

  fontWeight:
    800,

  display:
    'inline-flex',

  alignItems:
    'center',

  gap:
    4,
}


const naBadgeStyle = {
  display:
    'inline-grid',

  placeItems:
    'center',

  height:
    36,

  padding:
    '0 10px',

  borderRadius:
    10,

  fontWeight:
    800,

  background:
    '#fee2e2',

  color:
    '#991b1b',
}


const noDatesStyle = {
  minHeight:
    180,

  display:
    'flex',

  flexDirection:
    'column',

  alignItems:
    'center',

  justifyContent:
    'center',

  gap:
    8,

  color:
    '#64748b',

  padding:
    30,
}


/* MODAL */

const twoColumnStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(2, minmax(0, 1fr))',

  gap:
    12,
}


const modalBackdropStyle = {
  position:
    'fixed',

  inset:
    0,

  zIndex:
    1000,

  background:
    'rgba(15, 23, 42, 0.45)',

  display:
    'grid',

  placeItems:
    'center',

  padding:
    20,
}


const modalCardStyle = {
  width:
    'min(520px, 100%)',

  maxHeight:
    '90vh',

  overflowY:
    'auto',

  background:
    '#ffffff',

  borderRadius:
    20,

  padding:
    22,

  boxShadow:
    '0 24px 80px rgba(15, 23, 42, 0.22)',
}


const modalHeaderStyle = {
  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    16,

  marginBottom:
    18,
}


const modalSubtitleStyle = {
  marginTop:
    0,

  opacity:
    0.7,
}


const iconButtonStyle = {
  width:
    38,

  height:
    38,

  borderRadius:
    10,

  border:
    '1px solid #e2e8f0',

  background:
    '#ffffff',

  cursor:
    'pointer',

  display:
    'grid',

  placeItems:
    'center',
}


const lessonInfoStyle = {
  padding:
    '10px 12px',

  marginBottom:
    16,

  borderRadius:
    12,

  background:
    '#eff6ff',

  color:
    '#1d4ed8',

  fontSize:
    13,

  lineHeight:
    1.5,
}


const editInfoStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    8,

  marginBottom:
    16,

  padding:
    '10px 12px',

  borderRadius:
    12,

  background:
    '#eff6ff',

  color:
    '#1d4ed8',
}


const deleteButtonStyle = {
  border:
    '1px solid #fecaca',

  borderRadius:
    12,

  minHeight:
    44,

  background:
    '#fff1f2',

  color:
    '#be123c',

  cursor:
    'pointer',

  fontWeight:
    700,

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  gap:
    8,
}


export default TeacherJournalPage