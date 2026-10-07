import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Check,
  Copy,
  RefreshCcw,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  getHomeroomClassesForTeacher,
  getHomeroomStudents,
  getStudentParentCode,
} from '../services/supabaseHomeroomService'


const STORAGE_KEY_PREFIX =
  'homeroom-class-'


function getStorageKey(
  userId,
) {
  return `${STORAGE_KEY_PREFIX}${userId}`
}


function TeacherHomeroomPage() {
  const {
    user,
  } = useAuth()


  const [
    classes,
    setClasses,
  ] = useState([])

  const [
    selectedClassId,
    setSelectedClassId,
  ] = useState('')

  const [
    students,
    setStudents,
  ] = useState([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    refreshing,
    setRefreshing,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    parentCodeModal,
    setParentCodeModal,
  ] = useState(null)

  const [
    copiedParentCode,
    setCopiedParentCode,
  ] = useState(false)

  const [
    loadingParentCodeFor,
    setLoadingParentCodeFor,
  ] = useState(null)


  const isTeacher =
    user?.role === 'Учитель'


  const selectedClass =
    useMemo(
      () =>
        classes.find(
          (
            item,
          ) =>
            String(
              item.classId,
            ) ===
            String(
              selectedClassId,
            ),
        ) ||
        null,
      [
        classes,
        selectedClassId,
      ],
    )


  /* =========================================================
     LOAD CLASSES
  ========================================================= */

  useEffect(() => {
    if (
      !user?.id ||
      !isTeacher
    ) {
      setLoading(false)
      return
    }

    void loadClasses()
  }, [
    user?.id,
    user?.schoolId,
    user?.role,
  ])


  async function loadClasses() {
    try {
      setLoading(true)
      setError('')


      const classRows =
        await getHomeroomClassesForTeacher(
          user,
        )


      const safeClasses =
        Array.isArray(
          classRows,
        )
          ? classRows
          : []


      setClasses(
        safeClasses,
      )


      if (
        safeClasses.length ===
        0
      ) {
        setSelectedClassId('')
        setStudents([])
        return
      }


      const stored =
        window.localStorage.getItem(
          getStorageKey(
            user.id,
          ),
        )


      const storedExists =
        stored &&
        safeClasses.some(
          (
            item,
          ) =>
            String(
              item.classId,
            ) ===
            String(
              stored,
            ),
        )


      const initialClassId =
        storedExists
          ? stored
          : safeClasses[0]
              .classId


      setSelectedClassId(
        initialClassId,
      )
    } catch (
      loadError
    ) {
      console.error(
        'Teacher homeroom classes:',
        loadError,
      )


      setError(
        loadError?.message ||
          'Не удалось загрузить классы.',
      )
    } finally {
      setLoading(false)
    }
  }


  /* =========================================================
     LOAD STUDENTS WHEN CLASS CHANGES
  ========================================================= */

  useEffect(() => {
    if (
      !user?.id ||
      !selectedClassId
    ) {
      setStudents([])
      return
    }

    void loadStudents()
  }, [
    user?.id,
    selectedClassId,
  ])


  async function loadStudents({
    silent = false,
  } = {}) {
    const schoolClass =
      classes.find(
        (
          item,
        ) =>
          String(
            item.classId,
          ) ===
          String(
            selectedClassId,
          ),
      )


    if (!schoolClass) {
      setStudents([])
      return
    }


    try {
      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }


      setError('')


      const rows =
        await getHomeroomStudents(
          user,
          schoolClass.className,
        )


      setStudents(
        Array.isArray(rows)
          ? rows
          : [],
      )
    } catch (
      loadError
    ) {
      console.error(
        'Teacher homeroom students:',
        loadError,
      )


      setError(
        loadError?.message ||
          'Не удалось загрузить учеников.',
      )


      setStudents([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }


  /* =========================================================
     CLASS SELECT
  ========================================================= */

  function handleClassChange(
    nextClassId,
  ) {
    setSelectedClassId(
      nextClassId,
    )

    setSearch('')

    try {
      window.localStorage.setItem(
        getStorageKey(
          user.id,
        ),
        String(
          nextClassId,
        ),
      )
    } catch {
      /* localStorage может быть недоступен — не критично */
    }
  }


  /* =========================================================
     SEARCH
  ========================================================= */

  const visibleStudents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()


      if (!query) {
        return students
      }


      return students.filter(
        (
          student,
        ) =>
          String(
            student?.name ||
              '',
          )
            .toLowerCase()
            .includes(
              query,
            ),
      )
    }, [
      students,
      search,
    ])


  /* =========================================================
     PARENT CODE
  ========================================================= */

  async function handleOpenParentCode(
    student,
  ) {
    if (
      !student?.isActivated ||
      !student?.profileId
    ) {
      setError(
        'Ученик ещё не активирован. Сначала активируйте аккаунт ученика.',
      )

      return
    }


    try {
      setError('')


      setLoadingParentCodeFor(
        student.schoolStudentId,
      )


      const code =
        await getStudentParentCode(
          student.profileId,
        )


      if (!code) {
        throw new Error(
          'Код не был получен.',
        )
      }


      setParentCodeModal({
        fullName:
          student.name,

        className:
          selectedClass?.className ||
          '',

        code,
      })

      setCopiedParentCode(false)
    } catch (
      codeError
    ) {
      console.error(
        'Parent code:',
        codeError,
      )


      setError(
        codeError?.message ||
          'Не удалось получить код для родителя.',
      )
    } finally {
      setLoadingParentCodeFor(
        null,
      )
    }
  }


  function closeParentCodeModal() {
    setParentCodeModal(null)
    setCopiedParentCode(false)
  }


  async function copyParentCode() {
    const code =
      parentCodeModal?.code


    if (!code) {
      return
    }


    try {
      await navigator
        .clipboard
        .writeText(
          code,
        )


      setCopiedParentCode(true)


      window.setTimeout(
        () => {
          setCopiedParentCode(false)
        },
        1500,
      )
    } catch {
      setCopiedParentCode(false)
    }
  }


  /* =========================================================
     ACCESS
  ========================================================= */

  if (!user) {
    return null
  }


  if (!isTeacher) {
    return (
      <div className="page-container">
        <section className="content-card">
          <h2>
            Доступ запрещён
          </h2>

          <p>
            Этот раздел доступен учителю.
          </p>
        </section>
      </div>
    )
  }


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      className="page-container"
      style={{
        width: '100%',
        maxWidth: 'none',
      }}
    >

      {/* HEADER */}

      <section
        className="content-card"
        style={{
          marginBottom: 16,
        }}
      >

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >

          <div>

            <p
              style={{
                margin: 0,
                color: '#2563eb',
                fontSize: 11,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '.05em',
              }}
            >
              Классный руководитель
            </p>


            <h1
              style={{
                margin: '5px 0 0',
                color: '#102343',
                fontSize: 'clamp(24px, 5vw, 32px)',
              }}
            >
              Мой класс
            </h1>


            {selectedClass ? (
              <p
                style={{
                  margin: '7px 0 0',
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                {selectedClass.className}
                {selectedClass.academicYear
                  ? ` · ${selectedClass.academicYear}`
                  : ''}
              </p>
            ) : (
              <p
                style={{
                  margin: '7px 0 0',
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                Список учеников и коды доступа
                для родителей.
              </p>
            )}

          </div>


          {classes.length > 0 && (
            <button
              type="button"
              disabled={
                refreshing || loading
              }
              onClick={() =>
                loadStudents({
                  silent: true,
                })
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                minHeight: 40,
                padding: '0 14px',
                border: '1px solid #dbe2ea',
                borderRadius: 11,
                background: '#fff',
                color: '#526b8a',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >

              <RefreshCcw
                size={16}
              />

              {refreshing
                ? 'Обновляем...'
                : 'Обновить'}

            </button>
          )}

        </div>


        {/* CLASS SELECTOR */}

        {classes.length > 1 && (
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid #edf2f7',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >

            <span
              style={{
                color: '#64748b',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Класс:
            </span>


            {classes.map(
              (
                item,
              ) => {
                const active =
                  String(
                    item.classId,
                  ) ===
                  String(
                    selectedClassId,
                  )

                return (
                  <button
                    key={
                      item.classId
                    }
                    type="button"
                    onClick={() =>
                      handleClassChange(
                        item.classId,
                      )
                    }
                    style={{
                      minHeight: 36,
                      padding: '0 14px',
                      border: active
                        ? '1px solid #2563eb'
                        : '1px solid #dbe2ea',
                      borderRadius: 999,
                      background: active
                        ? '#2563eb'
                        : '#fff',
                      color: active
                        ? '#fff'
                        : '#526b8a',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {item.className}
                  </button>
                )
              },
            )}

          </div>
        )}

      </section>


      {/* ERROR */}

      {error && (
        <section
          className="content-card"
          style={{
            marginBottom: 14,
            color: '#b42318',
            background: '#fff1f1',
            border: '1px solid #ffd2d2',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <X
              size={18}
            />
            {error}
          </div>
        </section>
      )}


      {/* NOT HOMEROOM */}

      {!loading && classes.length === 0 && (
        <section
          className="content-card"
        >
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: '#64748b',
            }}
          >

            <UserRound
              size={40}
              style={{
                color: '#94a3b8',
                marginBottom: 12,
              }}
            />


            <h2
              style={{
                margin: 0,
                color: '#102343',
              }}
            >
              Вы не классный руководитель
            </h2>


            <p
              style={{
                margin: '8px 0 0',
                fontSize: 13,
              }}
            >
              Классного руководителя
              назначает завуч или администратор школы
              в разделе «Классы».
            </p>

          </div>
        </section>
      )}


      {/* LOADING */}

      {loading && classes.length === 0 && (
        <section
          className="content-card"
          style={{
            padding: 40,
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          Загрузка...
        </section>
      )}


      {/* STUDENTS */}

      {!loading && selectedClass && (
        <section className="content-card">

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              flexWrap: 'wrap',
              marginBottom: 14,
            }}
          >

            <div>

              <p
                style={{
                  margin: 0,
                  color: '#64748b',
                  fontSize: 12,
                }}
              >
                Ученики класса
              </p>

              <h2
                style={{
                  margin: '4px 0 0',
                  color: '#102343',
                  fontSize: 20,
                }}
              >
                {selectedClass.className}
              </h2>

            </div>


            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 999,
                background: '#eff6ff',
                color: '#2563eb',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              <Users
                size={15}
              />
              {students.length}
            </div>

          </div>


          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Поиск ученика"
            style={{
              width: '100%',
              minHeight: 42,
              padding: '0 14px',
              border: '1px solid #dbe2ea',
              borderRadius: 11,
              outline: 'none',
              background: '#fff',
              marginBottom: 14,
              fontSize: 13,
            }}
          />


          {visibleStudents.length === 0 ? (
            <div
              style={{
                padding: 30,
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: 13,
              }}
            >
              {search
                ? 'Ученик не найден.'
                : 'В классе пока нет учеников.'}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >

              {visibleStudents.map((student) => (
                <div
                  key={
                    student.schoolStudentId
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    border: '1px solid #e5ebf3',
                    borderRadius: 13,
                    background: '#fff',
                    flexWrap: 'wrap',
                  }}
                >

                  <div
                    style={{
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 12,
                      background: student.isActivated
                        ? '#eef5ff'
                        : '#f1f5f9',
                      color: student.isActivated
                        ? '#2563eb'
                        : '#94a3b8',
                      fontWeight: 800,
                    }}
                  >
                    {String(student.name || 'У')
                      .charAt(0)
                      .toUpperCase()}
                  </div>


                  <div
                    style={{
                      flex: 1,
                      minWidth: 180,
                    }}
                  >
                    <strong
                      style={{
                        display: 'block',
                        color: '#102343',
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {student.name}
                    </strong>

                    <span
                      style={{
                        display: 'block',
                        marginTop: 3,
                        color: '#94a3b8',
                        fontSize: 11,
                      }}
                    >
                      {student.studentLogin || 'Логин не создан'}
                    </span>


                    {!student.isActivated && (
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 5,
                          padding: '3px 8px',
                          borderRadius: 999,
                          background: '#fff7df',
                          color: '#a16207',
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        Ожидает активации
                      </span>
                    )}

                  </div>


                  <button
                    type="button"
                    onClick={() =>
                      handleOpenParentCode(student)
                    }
                    disabled={
                      !student.isActivated ||
                      loadingParentCodeFor ===
                        student.schoolStudentId
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      minHeight: 38,
                      padding: '0 12px',
                      border: student.isActivated
                        ? '1px solid #bfdbfe'
                        : '1px solid #e2e8f0',
                      borderRadius: 10,
                      background: student.isActivated
                        ? '#eff6ff'
                        : '#f8fafc',
                      color: student.isActivated
                        ? '#1d4ed8'
                        : '#94a3b8',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: student.isActivated
                        ? 'pointer'
                        : 'not-allowed',
                    }}
                  >
                    <UserRound size={15} />

                    {loadingParentCodeFor === student.schoolStudentId
                      ? 'Получаем...'
                      : student.isActivated
                        ? 'Код для родителя'
                        : 'Не активирован'}

                  </button>

                </div>
              ))}

            </div>
          )}

        </section>
      )}


      {/* PARENT CODE MODAL */}

      {parentCodeModal && (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeParentCodeModal()
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
            background: 'rgba(15, 30, 55, 0.48)',
          }}
        >

          <div
            style={{
              width: '100%',
              maxWidth: 420,
              padding: 22,
              background: '#fff',
              borderRadius: 20,
              boxShadow:
                '0 24px 70px rgba(15, 42, 82, 0.24)',
              textAlign: 'center',
            }}
          >

            <div
              style={{
                width: 58,
                height: 58,
                margin: '0 auto 12px',
                display: 'grid',
                placeItems: 'center',
                borderRadius: 18,
                background: '#eaf3ff',
                color: '#1267e8',
              }}
            >
              <UserRound size={26} />
            </div>


            <h2
              style={{
                margin: 0,
                color: '#102343',
              }}
            >
              Код для родителя
            </h2>


            <p
              style={{
                margin: '8px 0 0',
                color: '#718096',
                fontSize: 13,
              }}
            >
              Передайте код родителю —
              он вводит его при регистрации.
            </p>


            <strong
              style={{
                display: 'block',
                marginTop: 14,
                color: '#102343',
                fontSize: 15,
              }}
            >
              {parentCodeModal.fullName}
            </strong>


            <span
              style={{
                display: 'block',
                marginTop: 4,
                color: '#64748b',
                fontSize: 12,
              }}
            >
              {parentCodeModal.className}
            </span>


            <div
              style={{
                margin: '16px 0 12px',
                padding: 16,
                borderRadius: 14,
                background: '#f2f7ff',
              }}
            >
              <small
                style={{
                  display: 'block',
                  color: '#64748b',
                  fontSize: 11,
                }}
              >
                Код родителя
              </small>

              <strong
                style={{
                  display: 'block',
                  marginTop: 6,
                  color: '#102343',
                  fontSize: 22,
                  fontFamily: 'monospace',
                }}
              >
                {parentCodeModal.code}
              </strong>

              <button
                type="button"
                onClick={copyParentCode}
                style={{
                  marginTop: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  border: 0,
                  borderRadius: 10,
                  background: '#1267e8',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {copiedParentCode ? (
                  <Check size={15} />
                ) : (
                  <Copy size={15} />
                )}
                {copiedParentCode
                  ? 'Скопировано'
                  : 'Скопировать'}
              </button>
            </div>


            <button
              type="button"
              onClick={closeParentCodeModal}
              style={{
                width: '100%',
                minHeight: 42,
                border: 0,
                borderRadius: 11,
                background: '#1267e8',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Готово
            </button>

          </div>

        </div>
      )}

    </div>
  )
}


export default TeacherHomeroomPage