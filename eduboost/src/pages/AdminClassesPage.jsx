import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  RefreshCcw,
  Search,
  School,
  UserRound,
  Users,
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


      /*
       * Классы берём через уже существующий
       * leadership service.
       *
       * Не читаем profiles.class_name.
       */
      const classRows =
        await getAdminSchoolClasses(
          user,
        )


      const safeClasses =
        Array.isArray(
          classRows,
        )
          ? classRows
          : []


      /*
       * Для каждого класса загружаем
       * официальный текущий roster.
       *
       * Используется тот же service,
       * который уже исправил legacy-учеников
       * в журналах и отчётах.
       */
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