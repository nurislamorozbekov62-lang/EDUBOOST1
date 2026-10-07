import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Pencil,
  RefreshCcw,
  Search,
  School,
  UserCog,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  ROLES,
} from '../config/access'

import {
  getAdminSchoolClasses,
  getAdminStudentsByClass,
} from '../services/supabaseAdminJournalService'

import {
  getHomeroomInfo,
  getSchoolTeachersForHomeroom,
  setHomeroomTeacher,
} from '../services/supabaseHomeroomService'


function AdminClassesPage() {
  const {
    user,
  } = useAuth()


  const [
    classes,
    setClasses,
  ] = useState([])


  const [
    studentsByClass,
    setStudentsByClass,
  ] = useState({})


  const [
    homeroomByClass,
    setHomeroomByClass,
  ] = useState({})


  const [
    teachers,
    setTeachers,
  ] = useState([])


  const [
    selectedClass,
    setSelectedClass,
  ] = useState('')


  const [
    search,
    setSearch,
  ] = useState('')


  const [
    loading,
    setLoading,
  ] = useState(true)


  const [
    error,
    setError,
  ] = useState('')


  /* =========================================================
     HOMEROOM MODAL STATE
  ========================================================= */

  const [
    homeroomModalOpen,
    setHomeroomModalOpen,
  ] = useState(false)


  const [
    homeroomModalClass,
    setHomeroomModalClass,
  ] = useState('')


  const [
    selectedTeacherId,
    setSelectedTeacherId,
  ] = useState('')


  const [
    savingHomeroom,
    setSavingHomeroom,
  ] = useState(false)


  const [
    homeroomError,
    setHomeroomError,
  ] = useState('')


  const allowed =
    user?.role ===
      ROLES.SCHOOL_ADMIN ||
    user?.role ===
      ROLES.VICE_PRINCIPAL ||
    user?.role ===
      ROLES.DIRECTOR


  /* =========================================================
     LOAD
  ========================================================= */

  useEffect(() => {
    if (
      !user?.id ||
      !allowed
    ) {
      return
    }

    void loadData()
  }, [
    user?.id,
    user?.schoolId,
    user?.role,
  ])


  async function loadData() {
    try {
      setLoading(true)
      setError('')


      const [
        classRows,
        homeroomResult,
        teacherResult,
      ] =
        await Promise.allSettled([
          getAdminSchoolClasses(
            user,
          ),

          getHomeroomInfo(
            user,
          ),

          getSchoolTeachersForHomeroom(
            user.schoolId,
          ),
        ])


      const safeClasses =
        classRows.status ===
          'fulfilled' &&
        Array.isArray(
          classRows.value,
        )
          ? classRows.value
          : []


      if (
        classRows.status ===
        'rejected'
      ) {
        console.error(
          'Admin classes:',
          classRows.reason,
        )
      }


      /* HOMEROOM MAP */

      if (
        homeroomResult.status ===
        'fulfilled'
      ) {
        setHomeroomByClass(
          homeroomResult.value ||
            {},
        )
      } else {
        console.error(
          'Admin homeroom:',
          homeroomResult.reason,
        )

        setHomeroomByClass({})
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
          'Admin homeroom teachers:',
          teacherResult.reason,
        )

        setTeachers([])
      }


      /* STUDENTS */

      const results =
        await Promise.allSettled(
          safeClasses.map(
            (
              className,
            ) =>
              getAdminStudentsByClass(
                user,
                className,
              ),
          ),
        )


      const nextStudents =
        {}


      safeClasses.forEach(
        (
          className,
          index,
        ) => {
          const result =
            results[index]


          if (
            result?.status ===
            'fulfilled'
          ) {
            nextStudents[
              className
            ] =
              Array.isArray(
                result.value,
              )
                ? result.value
                : []

            return
          }


          console.error(
            `Admin classes: ${className}`,
            result?.reason,
          )


          nextStudents[
            className
          ] = []
        },
      )


      setClasses(
        safeClasses,
      )

      setStudentsByClass(
        nextStudents,
      )


      setSelectedClass(
        (
          current,
        ) => {
          if (
            current &&
            safeClasses.includes(
              current,
            )
          ) {
            return current
          }


          return (
            safeClasses[0] ||
            ''
          )
        },
      )
    } catch (
      loadError
    ) {
      console.error(
        'Admin classes load:',
        loadError,
      )


      setClasses([])
      setStudentsByClass({})
      setHomeroomByClass({})
      setTeachers([])
      setSelectedClass('')


      setError(
        loadError?.message ||
          'Не удалось загрузить классы школы.',
      )
    } finally {
      setLoading(false)
    }
  }


  /* =========================================================
     HOMEROOM MODAL
  ========================================================= */

  function openHomeroomModal(
    className,
  ) {
    const info =
      homeroomByClass[
        className
      ]


    if (!info?.classId) {
      setError(
        'Класс не найден в базе. Обновите данные.',
      )

      return
    }


    setHomeroomModalClass(
      className,
    )

    setSelectedTeacherId(
      info.teacherId ||
        '',
    )

    setHomeroomError('')
    setHomeroomModalOpen(true)
  }


  function closeHomeroomModal() {
    if (savingHomeroom) {
      return
    }

    setHomeroomModalOpen(
      false,
    )

    setHomeroomModalClass('')
    setSelectedTeacherId('')
    setHomeroomError('')
  }


  async function handleSaveHomeroom() {
    if (!homeroomModalClass) {
      return
    }


    const info =
      homeroomByClass[
        homeroomModalClass
      ]


    if (!info?.classId) {
      setHomeroomError(
        'Класс не найден в базе.',
      )

      return
    }


    try {
      setSavingHomeroom(
        true,
      )

      setHomeroomError('')


      await setHomeroomTeacher(
        info.classId,
        selectedTeacherId ||
          null,
      )


      setHomeroomModalOpen(
        false,
      )

      setHomeroomModalClass('')
      setSelectedTeacherId('')


      await loadData()
    } catch (
      saveError
    ) {
      console.error(
        'Save homeroom:',
        saveError,
      )


      setHomeroomError(
        saveError?.message ||
          'Не удалось сохранить',
      )
    } finally {
      setSavingHomeroom(
        false,
      )
    }
  }


  async function handleClearHomeroom() {
    if (!homeroomModalClass) {
      return
    }


    const info =
      homeroomByClass[
        homeroomModalClass
      ]


    if (!info?.classId) {
      return
    }


    const confirmed =
      window.confirm(
        `Снять классного руководителя с «${homeroomModalClass}»?`,
      )


    if (!confirmed) {
      return
    }


    try {
      setSavingHomeroom(
        true,
      )

      setHomeroomError('')


      await setHomeroomTeacher(
        info.classId,
        null,
      )


      setHomeroomModalOpen(
        false,
      )

      setHomeroomModalClass('')
      setSelectedTeacherId('')


      await loadData()
    } catch (
      clearError
    ) {
      console.error(
        'Clear homeroom:',
        clearError,
      )


      setHomeroomError(
        clearError?.message ||
          'Не удалось снять',
      )
    } finally {
      setSavingHomeroom(
        false,
      )
    }
  }


  /* =========================================================
     COUNTS
  ========================================================= */

  const totalStudents =
    useMemo(() => {
      return Object
        .values(
          studentsByClass,
        )
        .reduce(
          (
            total,
            students,
          ) =>
            total +
            (
              Array.isArray(
                students,
              )
                ? students.length
                : 0
            ),
          0,
        )
    }, [
      studentsByClass,
    ])


  const selectedStudents =
    useMemo(() => {
      if (
        !selectedClass
      ) {
        return []
      }


      return (
        studentsByClass[
          selectedClass
        ] || []
      )
    }, [
      studentsByClass,
      selectedClass,
    ])


  /* =========================================================
     SEARCH
  ========================================================= */

  const visibleStudents =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase()


      if (!value) {
        return selectedStudents
      }


      return selectedStudents.filter(
        (
          student,
        ) =>
          String(
            student?.name ||
              '',
          )
            .toLowerCase()
            .includes(
              value,
            ),
      )
    }, [
      selectedStudents,
      search,
    ])


  /* =========================================================
     ACCESS
  ========================================================= */

  if (!user) {
    return null
  }


  if (!allowed) {
    return (
      <div className="page-container">

        <section className="content-card">

          <h2>
            Доступ запрещён
          </h2>

          <p>
            Структура классов
            доступна администрации школы.
          </p>

        </section>

      </div>
    )
  }


  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="page-container">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section
        className="content-card"
        style={
          headerCardStyle
        }
      >

        <div
          style={
            headerStyle
          }
        >

          <div>

            <p
              style={
                eyebrowStyle
              }
            >
              Структура школы
            </p>


            <h1
              style={
                pageTitleStyle
              }
            >
              Классы
            </h1>


            <p
              style={
                descriptionStyle
              }
            >
              Официальные классы
              и текущий состав
              учеников школы.
            </p>

          </div>


          <button
            type="button"
            onClick={
              loadData
            }
            disabled={
              loading
            }
            style={
              refreshButtonStyle
            }
          >

            <RefreshCcw
              size={17}
            />

            {loading
              ? 'Загрузка...'
              : 'Обновить'}

          </button>

        </div>

      </section>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <section className="content-card">

          <div className="auth-error">
            {error}
          </div>

        </section>
      )}


      {/* =====================================================
          STATS
      ===================================================== */}

      <div
        style={
          statsGridStyle
        }
      >

        <StatCard
          icon={
            School
          }
          value={
            classes.length
          }
          label="Классов"
        />


        <StatCard
          icon={
            Users
          }
          value={
            totalStudents
          }
          label="Учеников"
        />


        <StatCard
          icon={
            GraduationCap
          }
          value={
            selectedClass ||
            '—'
          }
          label="Выбранный класс"
        />


        <StatCard
          icon={
            UserRound
          }
          value={
            selectedClass
              ? selectedStudents.length
              : '—'
          }
          label="В классе"
        />

      </div>


      {/* =====================================================
          BODY
      ===================================================== */}

      <div
        style={
          pageGridStyle
        }
      >

        {/* ===================================================
            CLASSES
        =================================================== */}

        <section
          className="content-card"
          style={
            classesPanelStyle
          }
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
                Школа
              </p>

              <h2
                style={
                  sectionTitleStyle
                }
              >
                Список классов
              </h2>

            </div>

          </div>


          {loading ? (
            <div
              style={
                emptyStyle
              }
            >
              Загружаем классы...
            </div>
          ) : classes.length ===
            0 ? (
            <div
              style={
                emptyStateStyle
              }
            >

              <School
                size={36}
              />

              <strong>
                Классов пока нет
              </strong>

              <span>
                Активные классы
                школы появятся здесь.
              </span>

            </div>
          ) : (
            <div
              style={
                classListStyle
              }
            >

              {classes.map(
                (
                  className,
                ) => {
                  const students =
                    studentsByClass[
                      className
                    ] || []


                  const active =
                    selectedClass ===
                    className


                  return (
                    <button
                      type="button"
                      key={
                        className
                      }
                      onClick={() => {
                        setSelectedClass(
                          className,
                        )

                        setSearch('')
                      }}
                      style={{
                        ...classButtonStyle,

                        ...(active
                          ? activeClassButtonStyle
                          : {}),
                      }}
                    >

                      <div
                        style={
                          classIconStyle
                        }
                      >
                        <BookOpen
                          size={19}
                        />
                      </div>


                      <div
                        style={
                          classInfoStyle
                        }
                      >

                        <strong
                          style={
                            classNameStyle
                          }
                        >
                          {className}
                        </strong>


                        <span
                          style={
                            classMetaStyle
                          }
                        >
                          {students.length}
                          {' '}
                          {
                            getStudentWord(
                              students.length,
                            )
                          }
                        </span>

                      </div>


                      <ChevronRight
                        size={18}
                        style={{
                          color:
                            active
                              ? '#2563eb'
                              : '#94a3b8',
                        }}
                      />

                    </button>
                  )
                },
              )}

            </div>
          )}

        </section>


        {/* ===================================================
            STUDENTS
        =================================================== */}

        <section
          className="content-card"
          style={
            studentsPanelStyle
          }
        >

          <div
            style={
              studentHeaderStyle
            }
          >

            <div>

              <p
                style={
                  eyebrowStyle
                }
              >
                {selectedClass ||
                  'Класс не выбран'}
              </p>


              <h2
                style={
                  sectionTitleStyle
                }
              >
                Ученики
              </h2>

            </div>


            <div
              style={
                searchBoxStyle
              }
            >

              <Search
                size={17}
                style={
                  searchIconStyle
                }
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
                placeholder="Поиск ученика"
                disabled={
                  !selectedClass
                }
                style={
                  searchInputStyle
                }
              />

            </div>

          </div>


          {/* =================================================
              HOMEROOM BLOCK
          ================================================= */}

          {selectedClass &&
            homeroomByClass[
              selectedClass
            ] && (
            <div
              style={
                homeroomBlockStyle
              }
            >

              <div
                style={
                  homeroomIconStyle
                }
              >
                <UserCog
                  size={19}
                />
              </div>


              <div
                style={
                  homeroomInfoStyle
                }
              >

                <span
                  style={
                    homeroomEyebrowStyle
                  }
                >
                  Классный руководитель
                </span>


                {homeroomByClass[
                  selectedClass
                ]?.teacherName ? (
                  <strong
                    style={
                      homeroomNameStyle
                    }
                  >
                    {
                      homeroomByClass[
                        selectedClass
                      ]
                        .teacherName
                    }
                  </strong>
                ) : (
                  <span
                    style={
                      homeroomEmptyStyle
                    }
                  >
                    Не назначен
                  </span>
                )}

              </div>


              <button
                type="button"
                onClick={() =>
                  openHomeroomModal(
                    selectedClass,
                  )
                }
                disabled={
                  loading
                }
                style={
                  homeroomButtonStyle
                }
              >

                <Pencil
                  size={15}
                />

                {homeroomByClass[
                  selectedClass
                ]?.teacherName
                  ? 'Сменить'
                  : 'Назначить'}

              </button>

            </div>
          )}


          {!selectedClass ? (
            <div
              style={
                emptyStateStyle
              }
            >

              <GraduationCap
                size={36}
              />

              <strong>
                Выберите класс
              </strong>

              <span>
                Справа появится
                официальный состав.
              </span>

            </div>
          ) : loading ? (
            <div
              style={
                emptyStyle
              }
            >
              Загружаем учеников...
            </div>
          ) : visibleStudents.length ===
            0 ? (
            <div
              style={
                emptyStateStyle
              }
            >

              <Users
                size={36}
              />

              <strong>
                {search
                  ? 'Ученик не найден'
                  : 'В классе нет учеников'}
              </strong>


              <span>
                {search
                  ? 'Попробуйте изменить запрос.'
                  : 'Активные ученики появятся здесь.'}
              </span>

            </div>
          ) : (
            <div
              style={
                tableWrapperStyle
              }
            >

              <table
                style={
                  tableStyle
                }
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
                        tableHeaderCellStyle
                      }
                    >
                      Класс
                    </th>


                    <th
                      style={
                        tableHeaderCellStyle
                      }
                    >
                      Статус
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {visibleStudents.map(
                    (
                      student,
                    ) => (
                      <tr
                        key={
                          student.id ||
                          student.schoolStudentId ||
                          student.name
                        }
                      >

                        <td
                          style={
                            bodyLeftStyle
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
                                student?.name ||
                                  'У',
                              )
                                .charAt(
                                  0,
                                )
                                .toUpperCase()}
                            </div>


                            <div>

                              <strong>
                                {student.name}
                              </strong>


                              <span
                                style={
                                  studentMetaStyle
                                }
                              >
                                Ученик
                              </span>

                            </div>

                          </div>

                        </td>


                        <td
                          style={
                            bodyStyle
                          }
                        >
                          {student.className ||
                            selectedClass}
                        </td>


                        <td
                          style={
                            bodyStyle
                          }
                        >

                          <span
                            style={
                              activeBadgeStyle
                            }
                          >
                            В классе
                          </span>

                        </td>

                      </tr>
                    ),
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>


      {/* =====================================================
          HOMEROOM MODAL
      ===================================================== */}

      {homeroomModalOpen && (
        <div
          style={
            modalOverlayStyle
          }
          onClick={
            closeHomeroomModal
          }
        >

          <div
            style={
              modalCardStyle
            }
            onClick={(
              event,
            ) =>
              event.stopPropagation()
            }
          >

            <div
              style={
                modalHeaderStyle
              }
            >

              <div>

                <p
                  style={
                    modalEyebrowStyle
                  }
                >
                  Класс{' '}
                  {
                    homeroomModalClass
                  }
                </p>

                <h3
                  style={
                    modalTitleStyle
                  }
                >
                  Назначить классного
                  руководителя
                </h3>

              </div>


              <button
                type="button"
                onClick={
                  closeHomeroomModal
                }
                disabled={
                  savingHomeroom
                }
                style={
                  modalCloseStyle
                }
                aria-label="Закрыть"
              >

                <X
                  size={18}
                />

              </button>

            </div>


            <label
              style={
                modalFieldStyle
              }
            >

              <span>
                Учитель
              </span>


              <select
                value={
                  selectedTeacherId
                }
                onChange={(
                  event,
                ) =>
                  setSelectedTeacherId(
                    event.target.value,
                  )
                }
                disabled={
                  savingHomeroom ||
                  teachers.length ===
                    0
                }
                style={
                  modalSelectStyle
                }
              >

                <option value="">
                  {teachers.length === 0
                    ? 'В школе нет учителей'
                    : '— Не выбран —'}
                </option>


                {teachers.map(
                  (
                    teacher,
                  ) => (
                    <option
                      key={
                        teacher.id
                      }
                      value={
                        teacher.id
                      }
                    >
                      {teacher.name}
                      {teacher.position
                        ? ` · ${teacher.position}`
                        : ''}
                    </option>
                  ),
                )}

              </select>

            </label>


            {homeroomError && (
              <div
                style={
                  modalErrorStyle
                }
              >
                {homeroomError}
              </div>
            )}


            <div
              style={
                modalActionsStyle
              }
            >

              {homeroomByClass[
                homeroomModalClass
              ]?.teacherId && (
                <button
                  type="button"
                  onClick={
                    handleClearHomeroom
                  }
                  disabled={
                    savingHomeroom
                  }
                  style={
                    modalClearButtonStyle
                  }
                >
                  Снять
                </button>
              )}


              <button
                type="button"
                onClick={
                  closeHomeroomModal
                }
                disabled={
                  savingHomeroom
                }
                style={
                  modalCancelButtonStyle
                }
              >
                Отмена
              </button>


              <button
                type="button"
                onClick={
                  handleSaveHomeroom
                }
                disabled={
                  savingHomeroom ||
                  !selectedTeacherId
                }
                style={
                  modalSaveButtonStyle
                }
              >
                {savingHomeroom
                  ? 'Сохраняем...'
                  : 'Назначить'}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}


/* =========================================================
   COMPONENTS
========================================================= */

function StatCard({
  icon: Icon,
  value,
  label,
}) {
  return (
    <div
      style={
        statCardStyle
      }
    >

      <div
        style={
          statIconStyle
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


        <span
          style={
            statLabelStyle
          }
        >
          {label}
        </span>

      </div>

    </div>
  )
}


/* =========================================================
   HELPERS
========================================================= */

function getStudentWord(
  count,
) {
  const value =
    Math.abs(
      Number(
        count || 0,
      ),
    )


  const lastTwo =
    value %
    100


  const last =
    value %
    10


  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return 'учеников'
  }


  if (
    last === 1
  ) {
    return 'ученик'
  }


  if (
    last >= 2 &&
    last <= 4
  ) {
    return 'ученика'
  }


  return 'учеников'
}


/* =========================================================
   STYLES
========================================================= */

const headerCardStyle = {
  marginBottom:
    18,
}


const headerStyle = {
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
}


const eyebrowStyle = {
  margin:
    0,

  color:
    '#64748b',

  fontSize:
    12,
}


const pageTitleStyle = {
  margin:
    '5px 0 0',

  color:
    '#102343',

  fontSize:
    26,
}


const descriptionStyle = {
  margin:
    '8px 0 0',

  color:
    '#64748b',

  lineHeight:
    1.5,

  fontSize:
    14,
}


const refreshButtonStyle = {
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
    '0 14px',

  border:
    '1px solid #bfdbfe',

  borderRadius:
    11,

  background:
    '#eff6ff',

  color:
    '#1d4ed8',

  fontWeight:
    700,

  cursor:
    'pointer',
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
    84,

  padding:
    16,

  border:
    '1px solid #e2e8f0',

  borderRadius:
    17,

  background:
    '#ffffff',
}


const statIconStyle = {
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
    '#eff6ff',

  color:
    '#2563eb',
}


const statValueStyle = {
  display:
    'block',

  color:
    '#102343',

  fontSize:
    21,

  lineHeight:
    1.1,
}


const statLabelStyle = {
  display:
    'block',

  marginTop:
    5,

  color:
    '#64748b',

  fontSize:
    12,
}


const pageGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'minmax(230px, 0.8fr) minmax(0, 2fr)',

  gap:
    18,

  alignItems:
    'start',
}


const classesPanelStyle = {
  minWidth:
    0,
}


const studentsPanelStyle = {
  minWidth:
    0,
}


const sectionHeaderStyle = {
  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  marginBottom:
    15,
}


const sectionTitleStyle = {
  margin:
    '4px 0 0',

  color:
    '#102343',

  fontSize:
    20,
}


const classListStyle = {
  display:
    'grid',

  gap:
    8,
}


const classButtonStyle = {
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
    13,

  background:
    '#ffffff',

  textAlign:
    'left',

  cursor:
    'pointer',
}


const activeClassButtonStyle = {
  borderColor:
    '#93c5fd',

  background:
    '#eff6ff',
}


const classIconStyle = {
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
    11,

  background:
    '#eef5ff',

  color:
    '#2563eb',
}


const classInfoStyle = {
  flex:
    1,

  minWidth:
    0,
}


const classNameStyle = {
  display:
    'block',

  color:
    '#102343',

  fontSize:
    14,
}


const classMetaStyle = {
  display:
    'block',

  marginTop:
    3,

  color:
    '#64748b',

  fontSize:
    11,
}


const studentHeaderStyle = {
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


const searchBoxStyle = {
  position:
    'relative',

  minWidth:
    220,
}


const searchIconStyle = {
  position:
    'absolute',

  left:
    12,

  top:
    '50%',

  transform:
    'translateY(-50%)',

  color:
    '#94a3b8',

  pointerEvents:
    'none',
}


const searchInputStyle = {
  width:
    '100%',

  minHeight:
    42,

  padding:
    '0 12px 0 38px',

  border:
    '1px solid #dbe2ea',

  borderRadius:
    11,

  outline:
    'none',

  background:
    '#ffffff',
}


/* =========================================================
   HOMEROOM BLOCK STYLES
========================================================= */

const homeroomBlockStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    12,

  padding:
    12,

  marginBottom:
    14,

  border:
    '1px solid #dbeafe',

  borderRadius:
    14,

  background:
    '#f8fbff',
}


const homeroomIconStyle = {
  width:
    40,

  height:
    40,

  flexShrink:
    0,

  display:
    'grid',

  placeItems:
    'center',

  borderRadius:
    12,

  background:
    '#eaf3ff',

  color:
    '#2563eb',
}


const homeroomInfoStyle = {
  flex:
    1,

  minWidth:
    0,
}


const homeroomEyebrowStyle = {
  display:
    'block',

  marginBottom:
    3,

  color:
    '#64748b',

  fontSize:
    11,

  fontWeight:
    700,
}


const homeroomNameStyle = {
  display:
    'block',

  color:
    '#102343',

  fontSize:
    14,

  fontWeight:
    800,
}


const homeroomEmptyStyle = {
  display:
    'block',

  color:
    '#94a3b8',

  fontSize:
    13,

  fontStyle:
    'italic',
}


const homeroomButtonStyle = {
  display:
    'inline-flex',

  alignItems:
    'center',

  gap:
    6,

  minHeight:
    38,

  padding:
    '0 12px',

  border:
    '1px solid #bfdbfe',

  borderRadius:
    10,

  background:
    '#eff6ff',

  color:
    '#1d4ed8',

  fontWeight:
    700,

  fontSize:
    12,

  cursor:
    'pointer',
}


/* =========================================================
   MODAL STYLES
========================================================= */

const modalOverlayStyle = {
  position:
    'fixed',

  inset:
    0,

  zIndex:
    2000,

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  padding:
    18,

  background:
    'rgba(15, 30, 55, 0.48)',
}


const modalCardStyle = {
  width:
    '100%',

  maxWidth:
    460,

  padding:
    22,

  background:
    '#ffffff',

  borderRadius:
    20,

  boxShadow:
    '0 24px 70px rgba(15, 42, 82, 0.24)',
}


const modalHeaderStyle = {
  display:
    'flex',

  alignItems:
    'flex-start',

  justifyContent:
    'space-between',

  gap:
    12,

  marginBottom:
    18,
}


const modalEyebrowStyle = {
  margin:
    0,

  color:
    '#1267e8',

  fontSize:
    11,

  fontWeight:
    800,

  textTransform:
    'uppercase',
}


const modalTitleStyle = {
  margin:
    '4px 0 0',

  color:
    '#102343',

  fontSize:
    18,
}


const modalCloseStyle = {
  width:
    34,

  height:
    34,

  display:
    'grid',

  placeItems:
    'center',

  padding:
    0,

  border:
    0,

  borderRadius:
    10,

  background:
    '#f1f5f9',

  color:
    '#526b8a',

  cursor:
    'pointer',
}


const modalFieldStyle = {
  display:
    'flex',

  flexDirection:
    'column',

  gap:
    6,
}


const modalSelectStyle = {
  width:
    '100%',

  minHeight:
    44,

  padding:
    '0 12px',

  border:
    '1px solid #dbe2ea',

  borderRadius:
    11,

  background:
    '#ffffff',

  outline:
    'none',

  fontSize:
    14,
}


const modalErrorStyle = {
  marginTop:
    12,

  padding:
    '10px 12px',

  borderRadius:
    10,

  background:
    '#fff1f1',

  border:
    '1px solid #ffd2d2',

  color:
    '#b42318',

  fontSize:
    12,
}


const modalActionsStyle = {
  display:
    'flex',

  justifyContent:
    'flex-end',

  gap:
    8,

  marginTop:
    18,
}


const modalClearButtonStyle = {
  minHeight:
    42,

  padding:
    '0 14px',

  border:
    '1px solid #fecaca',

  borderRadius:
    11,

  background:
    '#fff1f1',

  color:
    '#b42318',

  fontWeight:
    700,

  fontSize:
    13,

  cursor:
    'pointer',

  marginRight:
    'auto',
}


const modalCancelButtonStyle = {
  minHeight:
    42,

  padding:
    '0 14px',

  border:
    '1px solid #dbe2ea',

  borderRadius:
    11,

  background:
    '#ffffff',

  color:
    '#475569',

  fontWeight:
    700,

  fontSize:
    13,

  cursor:
    'pointer',
}


const modalSaveButtonStyle = {
  minHeight:
    42,

  padding:
    '0 16px',

  border:
    0,

  borderRadius:
    11,

  background:
    '#2563eb',

  color:
    '#ffffff',

  fontWeight:
    700,

  fontSize:
    13,

  cursor:
    'pointer',
}

/* =========================================================
   TABLE STYLES
========================================================= */

const tableWrapperStyle = {
  width:
    '100%',

  overflowX:
    'auto',

  border:
    '1px solid #e5e7eb',

  borderRadius:
    14,
}


const tableStyle = {
  width:
    '100%',

  minWidth:
    600,

  borderCollapse:
    'collapse',

  background:
    '#ffffff',
}


const tableHeaderCellStyle = {
  padding:
    11,

  textAlign:
    'center',

  color:
    '#334155',

  background:
    '#f8fafc',

  borderBottom:
    '1px solid #e5e7eb',

  fontSize:
    12,

  whiteSpace:
    'nowrap',
}


const headerLeftStyle = {
  ...tableHeaderCellStyle,

  textAlign:
    'left',
}


const bodyStyle = {
  padding:
    11,

  textAlign:
    'center',

  color:
    '#334155',

  borderBottom:
    '1px solid #eef2f7',

  fontSize:
    13,
}


const bodyLeftStyle = {
  ...bodyStyle,

  textAlign:
    'left',
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
    36,

  height:
    36,

  flexShrink:
    0,

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
    800,
}


const studentMetaStyle = {
  display:
    'block',

  marginTop:
    3,

  color:
    '#94a3b8',

  fontSize:
    10,
}


const activeBadgeStyle = {
  display:
    'inline-flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  padding:
    '5px 8px',

  borderRadius:
    8,

  background:
    '#dcfce7',

  color:
    '#166534',

  fontSize:
    11,

  fontWeight:
    700,
}


const emptyStyle = {
  padding:
    20,

  textAlign:
    'center',

  color:
    '#64748b',
}


const emptyStateStyle = {
  minHeight:
    180,

  display:
    'grid',

  placeItems:
    'center',

  alignContent:
    'center',

  gap:
    7,

  padding:
    24,

  textAlign:
    'center',

  color:
    '#64748b',
}

export default AdminClassesPage