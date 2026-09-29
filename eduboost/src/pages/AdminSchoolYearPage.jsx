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
  Pencil,
  Plus,
  RefreshCcw,
  Star,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/access'

import {
  createAcademicHoliday,
  createAcademicTerm,
  createAcademicYear,
  deleteAcademicHoliday,
  deleteAcademicTerm,
  deleteAcademicYear,
  getAcademicHolidays,
  getAcademicTerms,
  getAcademicYears,
  setCurrentAcademicYear,
  updateAcademicHoliday,
  updateAcademicTerm,
  updateAcademicYear,
} from '../services/supabaseAcademicYearService'


/* =========================================================
   INITIAL FORMS
========================================================= */

function getDefaultYearForm() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  /* Сентябрь-декабрь → текущий/следующий.
     Январь-август → предыдущий/текущий. */

  const startYear = month >= 8 ? year : year - 1

  return {
    yearLabel: `${startYear}/${startYear + 1}`,
    startsOn: `${startYear}-09-01`,
    endsOn: `${startYear + 1}-05-31`,
  }
}


const EMPTY_TERM_FORM = {
  name: '',
  termNumber: 1,
  startsOn: '',
  endsOn: '',
}


const EMPTY_HOLIDAY_FORM = {
  name: '',
  startsOn: '',
  endsOn: '',
}


/* =========================================================
   PAGE
========================================================= */

function AdminSchoolYearPage() {
  const { user } = useAuth()

  const [years, setYears] = useState([])
  const [selectedYearId, setSelectedYearId] = useState('')

  const [terms, setTerms] = useState([])
  const [holidays, setHolidays] = useState([])

  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] =
    useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  /* Модалка «год» */
  const [yearModalOpen, setYearModalOpen] =
    useState(false)
  const [editingYearId, setEditingYearId] =
    useState(null)
  const [yearForm, setYearForm] = useState(
    getDefaultYearForm(),
  )

  /* Модалка «четверть» */
  const [termModalOpen, setTermModalOpen] =
    useState(false)
  const [editingTermId, setEditingTermId] =
    useState(null)
  const [termForm, setTermForm] = useState(
    EMPTY_TERM_FORM,
  )

  /* Модалка «каникулы» */
  const [holidayModalOpen, setHolidayModalOpen] =
    useState(false)
  const [editingHolidayId, setEditingHolidayId] =
    useState(null)
  const [holidayForm, setHolidayForm] = useState(
    EMPTY_HOLIDAY_FORM,
  )


  const canManage = useMemo(() => {
    if (!user?.role) {
      return false
    }

    return [
      ROLES.SCHOOL_ADMIN,
      ROLES.DIRECTOR,
      ROLES.VICE_PRINCIPAL,
    ].includes(user.role)
  }, [user?.role])


  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    if (!user?.id) {
      return
    }

    void loadYears()
  }, [user?.id, user?.schoolId])


  useEffect(() => {
    if (!selectedYearId) {
      setTerms([])
      setHolidays([])
      return
    }

    void loadDetails(selectedYearId)
  }, [selectedYearId])


  async function loadYears() {
    try {
      setLoading(true)
      setError('')

      const rows = await getAcademicYears(user)

      setYears(rows)

      setSelectedYearId((current) => {
        if (
          current &&
          rows.some((year) => year.id === current)
        ) {
          return current
        }

        const currentYear = rows.find(
          (year) => year.isCurrent,
        )

        return currentYear?.id || rows[0]?.id || ''
      })
    } catch (loadError) {
      console.error('Academic years load:', loadError)

      setYears([])

      setError(
        loadError?.message ||
          'Не удалось загрузить учебные годы',
      )
    } finally {
      setLoading(false)
    }
  }


  async function loadDetails(yearId) {
    try {
      setLoadingDetails(true)

      const [termRows, holidayRows] =
        await Promise.all([
          getAcademicTerms(yearId),
          getAcademicHolidays(yearId),
        ])

      setTerms(termRows)
      setHolidays(holidayRows)
    } catch (loadError) {
      console.error('Academic year details:', loadError)

      setError(
        loadError?.message ||
          'Не удалось загрузить данные года',
      )
    } finally {
      setLoadingDetails(false)
    }
  }


  /* =======================================================
     SUCCESS AUTO-HIDE
  ======================================================= */

  useEffect(() => {
    if (!success) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setSuccess('')
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [success])


  useEffect(() => {
    if (!error) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setError('')
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [error])


  /* =======================================================
     YEAR — CREATE / EDIT
  ======================================================= */

  function openCreateYear() {
    setEditingYearId(null)
    setYearForm(getDefaultYearForm())
    setYearModalOpen(true)
  }


  function openEditYear(year) {
    setEditingYearId(year.id)

    setYearForm({
      yearLabel: year.yearLabel,
      startsOn: year.startsOn,
      endsOn: year.endsOn,
    })

    setYearModalOpen(true)
  }


  function closeYearModal() {
    setYearModalOpen(false)
    setEditingYearId(null)
  }


  async function handleYearSubmit(event) {
    event.preventDefault()

    try {
      setError('')

      if (editingYearId) {
        await updateAcademicYear(
          editingYearId,
          yearForm,
        )

        setSuccess('Учебный год обновлён')
      } else {
        await createAcademicYear(
          yearForm,
          user,
        )

        setSuccess('Учебный год создан')
      }

      closeYearModal()

      await loadYears()
    } catch (submitError) {
      setError(
        submitError?.message ||
          'Не удалось сохранить год',
      )
    }
  }


  async function handleSetCurrent(yearId) {
    const confirmed = window.confirm(
      'Сделать этот год текущим? Он будет отмечен как активный для всей школы.',
    )

    if (!confirmed) {
      return
    }

    try {
      setError('')

      await setCurrentAcademicYear(yearId, user)

      setSuccess('Текущий год обновлён')

      await loadYears()
    } catch (setError_) {
      setError(
        setError_?.message ||
          'Не удалось сделать год текущим',
      )
    }
  }


  async function handleDeleteYear(year) {
    const confirmed = window.confirm(
      `Удалить учебный год «${year.yearLabel}»? Все четверти и каникулы этого года тоже удалятся.`,
    )

    if (!confirmed) {
      return
    }

    try {
      setError('')

      await deleteAcademicYear(year.id)

      setSuccess('Учебный год удалён')

      await loadYears()
    } catch (deleteError) {
      setError(
        deleteError?.message ||
          'Не удалось удалить год',
      )
    }
  }


  /* =======================================================
     TERM — CREATE / EDIT
  ======================================================= */

  function openCreateTerm() {
    if (!selectedYearId) {
      return
    }

    setEditingTermId(null)

    setTermForm({
      ...EMPTY_TERM_FORM,
      termNumber: (terms.length || 0) + 1,
    })

    setTermModalOpen(true)
  }


  function openEditTerm(term) {
    setEditingTermId(term.id)

    setTermForm({
      name: term.name,
      termNumber: term.termNumber,
      startsOn: term.startsOn,
      endsOn: term.endsOn,
    })

    setTermModalOpen(true)
  }


  function closeTermModal() {
    setTermModalOpen(false)
    setEditingTermId(null)
  }


  async function handleTermSubmit(event) {
    event.preventDefault()

    try {
      setError('')

      if (editingTermId) {
        await updateAcademicTerm(
          editingTermId,
          termForm,
        )

        setSuccess('Четверть обновлена')
      } else {
        await createAcademicTerm(
          {
            ...termForm,
            academicYearId: selectedYearId,
          },
          user,
        )

        setSuccess('Четверть создана')
      }

      closeTermModal()

      await loadDetails(selectedYearId)
    } catch (submitError) {
      setError(
        submitError?.message ||
          'Не удалось сохранить четверть',
      )
    }
  }


  async function handleDeleteTerm(term) {
    const confirmed = window.confirm(
      `Удалить «${term.name}»?`,
    )

    if (!confirmed) {
      return
    }

    try {
      setError('')

      await deleteAcademicTerm(term.id)

      setSuccess('Четверть удалена')

      await loadDetails(selectedYearId)
    } catch (deleteError) {
      setError(
        deleteError?.message ||
          'Не удалось удалить четверть',
      )
    }
  }


  /* =======================================================
     HOLIDAY — CREATE / EDIT
  ======================================================= */

  function openCreateHoliday() {
    if (!selectedYearId) {
      return
    }

    setEditingHolidayId(null)
    setHolidayForm(EMPTY_HOLIDAY_FORM)
    setHolidayModalOpen(true)
  }


  function openEditHoliday(holiday) {
    setEditingHolidayId(holiday.id)

    setHolidayForm({
      name: holiday.name,
      startsOn: holiday.startsOn,
      endsOn: holiday.endsOn,
    })

    setHolidayModalOpen(true)
  }


  function closeHolidayModal() {
    setHolidayModalOpen(false)
    setEditingHolidayId(null)
  }


  async function handleHolidaySubmit(event) {
    event.preventDefault()

    try {
      setError('')

      if (editingHolidayId) {
        await updateAcademicHoliday(
          editingHolidayId,
          holidayForm,
        )

        setSuccess('Обновлено')
      } else {
        await createAcademicHoliday(
          {
            ...holidayForm,
            academicYearId: selectedYearId,
          },
          user,
        )

        setSuccess('Добавлено')
      }

      closeHolidayModal()

      await loadDetails(selectedYearId)
    } catch (submitError) {
      setError(
        submitError?.message ||
          'Не удалось сохранить',
      )
    }
  }


  async function handleDeleteHoliday(holiday) {
    const confirmed = window.confirm(
      `Удалить «${holiday.name}»?`,
    )

    if (!confirmed) {
      return
    }

    try {
      setError('')

      await deleteAcademicHoliday(holiday.id)

      setSuccess('Удалено')

      await loadDetails(selectedYearId)
    } catch (deleteError) {
      setError(
        deleteError?.message ||
          'Не удалось удалить',
      )
    }
  }


  /* =======================================================
     DERIVED
  ======================================================= */

  const selectedYear = useMemo(
    () => years.find((y) => y.id === selectedYearId) || null,
    [years, selectedYearId],
  )


  /* =======================================================
     ACCESS
  ======================================================= */

  if (!user) {
    return null
  }


  const allowedRoles = [
    ROLES.SCHOOL_ADMIN,
    ROLES.DIRECTOR,
    ROLES.VICE_PRINCIPAL,
  ]


  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="page-container">
        <section className="content-card">
          <div className="eb-workload-empty">
            <XCircle size={34} />

            <h2>Доступ запрещён</h2>

            <p>
              Раздел учебного года доступен
              руководству школы.
            </p>
          </div>
        </section>
      </div>
    )
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="page-container">

      {/* =============================================
          HEADER
      ============================================= */}

      <section
        className="content-card"
        style={{ marginBottom: 18 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: '#64748b',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              УЧЕБНЫЙ ПРОЦЕСС
            </p>

            <h1
              style={{
                margin: '6px 0 0',
                color: '#102343',
                fontSize: 26,
              }}
            >
              Учебный год
            </h1>

            <p
              style={{
                margin: '8px 0 0',
                color: '#64748b',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              Годы, четверти и каникулы школы.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={loadYears}
              disabled={loading}
              style={secondaryButtonStyle}
            >
              <RefreshCcw size={17} />
              Обновить
            </button>

            {canManage && (
              <button
                type="button"
                onClick={openCreateYear}
                style={primaryButtonStyle}
              >
                <Plus size={17} />
                Добавить год
              </button>
            )}
          </div>
        </div>
      </section>


      {/* =============================================
          MESSAGES
      ============================================= */}

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
            <XCircle size={18} />
            {error}
          </div>
        </section>
      )}

      {success && (
        <section
          className="content-card"
          style={{
            marginBottom: 14,
            color: '#087443',
            background: '#eafff4',
            border: '1px solid #c5f2dc',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <CheckCircle2 size={18} />
            {success}
          </div>
        </section>
      )}


      {/* =============================================
          MAIN GRID
      ============================================= */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(240px, 0.8fr) minmax(0, 2fr)',
          gap: 18,
          alignItems: 'start',
        }}
      >
        {/* ---------- YEARS LIST ---------- */}

        <section className="content-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
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
                Список
              </p>

              <h2
                style={{
                  margin: '4px 0 0',
                  fontSize: 19,
                }}
              >
                Учебные годы
              </h2>
            </div>

            <span
              style={{
                minWidth: 34,
                height: 34,
                display: 'grid',
                placeItems: 'center',
                padding: '0 10px',
                background: '#eff6ff',
                color: '#2563eb',
                fontWeight: 700,
                borderRadius: 999,
                fontSize: 13,
              }}
            >
              {years.length}
            </span>
          </div>


          {loading ? (
            <div
              style={{
                padding: 20,
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              Загрузка...
            </div>
          ) : years.length === 0 ? (
            <div
              style={{
                padding: 20,
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              <GraduationCap
                size={30}
                style={{ marginBottom: 8 }}
              />
              <div>Учебных годов пока нет</div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {years.map((year) => {
                const active =
                  selectedYearId === year.id

                return (
                  <button
                    key={year.id}
                    type="button"
                    onClick={() =>
                      setSelectedYearId(year.id)
                    }
                    style={{
                      ...yearItemStyle,
                      ...(active
                        ? yearItemActiveStyle
                        : {}),
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                        }}
                      >
                        <strong
                          style={{
                            color: '#102343',
                            fontSize: 15,
                          }}
                        >
                          {year.yearLabel}
                        </strong>

                        {year.isCurrent && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 7px',
                              borderRadius: 6,
                              background: '#dcfce7',
                              color: '#166534',
                              fontSize: 10,
                              fontWeight: 800,
                            }}
                          >
                            <Star size={11} />
                            ТЕКУЩИЙ
                          </span>
                        )}
                      </div>

                      <span
                        style={{
                          display: 'block',
                          marginTop: 4,
                          color: '#64748b',
                          fontSize: 11,
                        }}
                      >
                        {formatDateRange(
                          year.startsOn,
                          year.endsOn,
                        )}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}


          {selectedYear && canManage && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid #e5e7eb',
                flexWrap: 'wrap',
              }}
            >
              {!selectedYear.isCurrent && (
                <button
                  type="button"
                  onClick={() =>
                    handleSetCurrent(selectedYear.id)
                  }
                  style={smallSuccessButtonStyle}
                >
                  <Star size={14} />
                  Сделать текущим
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  openEditYear(selectedYear)
                }
                style={smallButtonStyle}
              >
                <Pencil size={14} />
                Изменить
              </button>

              {!selectedYear.isCurrent && (
                <button
                  type="button"
                  onClick={() =>
                    handleDeleteYear(selectedYear)
                  }
                  style={smallDangerButtonStyle}
                >
                  <Trash2 size={14} />
                  Удалить
                </button>
              )}
            </div>
          )}
        </section>


        {/* ---------- YEAR DETAILS ---------- */}

        <section>
          {!selectedYear ? (
            <div className="content-card">
              <div
                style={{
                  padding: 30,
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                Выберите учебный год слева
                или создайте новый.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* ---------- TERMS ---------- */}

              <div className="content-card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
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
                      Периоды обучения
                    </p>

                    <h2
                      style={{
                        margin: '4px 0 0',
                        fontSize: 19,
                      }}
                    >
                      Четверти
                    </h2>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={openCreateTerm}
                      style={primaryButtonStyle}
                    >
                      <Plus size={15} />
                      Четверть
                    </button>
                  )}
                </div>

                {loadingDetails ? (
                  <div
                    style={{
                      padding: 20,
                      textAlign: 'center',
                      color: '#64748b',
                    }}
                  >
                    Загрузка...
                  </div>
                ) : terms.length === 0 ? (
                  <div
                    style={{
                      padding: 24,
                      textAlign: 'center',
                      color: '#64748b',
                      background: '#f8fafc',
                      borderRadius: 12,
                    }}
                  >
                    <CalendarDays
                      size={26}
                      style={{ marginBottom: 6 }}
                    />
                    <div>
                      Четверти пока не заданы
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {terms.map((term) => (
                      <TermRow
                        key={term.id}
                        term={term}
                        canManage={canManage}
                        onEdit={() =>
                          openEditTerm(term)
                        }
                        onDelete={() =>
                          handleDeleteTerm(term)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>


              {/* ---------- HOLIDAYS ---------- */}

              <div className="content-card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
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
                      Дни без занятий
                    </p>

                    <h2
                      style={{
                        margin: '4px 0 0',
                        fontSize: 19,
                      }}
                    >
                      Каникулы и праздники
                    </h2>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={openCreateHoliday}
                      style={primaryButtonStyle}
                    >
                      <Plus size={15} />
                      Добавить
                    </button>
                  )}
                </div>

                {loadingDetails ? (
                  <div
                    style={{
                      padding: 20,
                      textAlign: 'center',
                      color: '#64748b',
                    }}
                  >
                    Загрузка...
                  </div>
                ) : holidays.length === 0 ? (
                  <div
                    style={{
                      padding: 24,
                      textAlign: 'center',
                      color: '#64748b',
                      background: '#f8fafc',
                      borderRadius: 12,
                    }}
                  >
                    <AlertTriangle
                      size={26}
                      style={{ marginBottom: 6 }}
                    />
                    <div>
                      Каникулы пока не заданы
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {holidays.map((holiday) => (
                      <HolidayRow
                        key={holiday.id}
                        holiday={holiday}
                        canManage={canManage}
                        onEdit={() =>
                          openEditHoliday(holiday)
                        }
                        onDelete={() =>
                          handleDeleteHoliday(holiday)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>


      {/* =============================================
          YEAR MODAL
      ============================================= */}

      {yearModalOpen && (
        <Modal
          title={
            editingYearId
              ? 'Изменить учебный год'
              : 'Новый учебный год'
          }
          onClose={closeYearModal}
        >
          <form onSubmit={handleYearSubmit}>
            <Field label="Название">
              <input
                type="text"
                value={yearForm.yearLabel}
                onChange={(event) =>
                  setYearForm((old) => ({
                    ...old,
                    yearLabel: event.target.value,
                  }))
                }
                placeholder="2026/2027"
                required
              />
            </Field>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              <Field label="Начало">
                <input
                  type="date"
                  value={yearForm.startsOn}
                  onChange={(event) =>
                    setYearForm((old) => ({
                      ...old,
                      startsOn: event.target.value,
                    }))
                  }
                  required
                />
              </Field>

              <Field label="Окончание">
                <input
                  type="date"
                  value={yearForm.endsOn}
                  onChange={(event) =>
                    setYearForm((old) => ({
                      ...old,
                      endsOn: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
            </div>

            <ModalActions
              onCancel={closeYearModal}
              submitLabel={
                editingYearId
                  ? 'Сохранить'
                  : 'Создать'
              }
            />
          </form>
        </Modal>
      )}


      {/* =============================================
          TERM MODAL
      ============================================= */}

      {termModalOpen && (
        <Modal
          title={
            editingTermId
              ? 'Изменить четверть'
              : 'Новая четверть'
          }
          onClose={closeTermModal}
        >
          <form onSubmit={handleTermSubmit}>
            <Field label="Название">
              <input
                type="text"
                value={termForm.name}
                onChange={(event) =>
                  setTermForm((old) => ({
                    ...old,
                    name: event.target.value,
                  }))
                }
                placeholder="I четверть"
                required
              />
            </Field>

            <Field label="Номер">
              <input
                type="number"
                min="1"
                max="20"
                value={termForm.termNumber}
                onChange={(event) =>
                  setTermForm((old) => ({
                    ...old,
                    termNumber:
                      Number(event.target.value) || 1,
                  }))
                }
                required
              />
            </Field>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              <Field label="Начало">
                <input
                  type="date"
                  value={termForm.startsOn}
                  onChange={(event) =>
                    setTermForm((old) => ({
                      ...old,
                      startsOn: event.target.value,
                    }))
                  }
                  required
                />
              </Field>

              <Field label="Окончание">
                <input
                  type="date"
                  value={termForm.endsOn}
                  onChange={(event) =>
                    setTermForm((old) => ({
                      ...old,
                      endsOn: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
            </div>

            <ModalActions
              onCancel={closeTermModal}
              submitLabel={
                editingTermId
                  ? 'Сохранить'
                  : 'Создать'
              }
            />
          </form>
        </Modal>
      )}


      {/* =============================================
          HOLIDAY MODAL
      ============================================= */}

      {holidayModalOpen && (
        <Modal
          title={
            editingHolidayId
              ? 'Изменить'
              : 'Добавить каникулы / праздник'
          }
          onClose={closeHolidayModal}
        >
          <form onSubmit={handleHolidaySubmit}>
            <Field label="Название">
              <input
                type="text"
                value={holidayForm.name}
                onChange={(event) =>
                  setHolidayForm((old) => ({
                    ...old,
                    name: event.target.value,
                  }))
                }
                placeholder="Осенние каникулы"
                required
              />
            </Field>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              <Field label="С">
                <input
                  type="date"
                  value={holidayForm.startsOn}
                  onChange={(event) =>
                    setHolidayForm((old) => ({
                      ...old,
                      startsOn: event.target.value,
                    }))
                  }
                  required
                />
              </Field>

              <Field label="По">
                <input
                  type="date"
                  value={holidayForm.endsOn}
                  onChange={(event) =>
                    setHolidayForm((old) => ({
                      ...old,
                      endsOn: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
            </div>

            <ModalActions
              onCancel={closeHolidayModal}
              submitLabel={
                editingHolidayId
                  ? 'Сохранить'
                  : 'Добавить'
              }
            />
          </form>
        </Modal>
      )}
    </div>
  )
}


/* =========================================================
   SUB-COMPONENTS
========================================================= */

function TermRow({
  term,
  canManage,
  onEdit,
  onDelete,
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        background: '#ffffff',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          background: '#eff6ff',
          color: '#2563eb',
          borderRadius: 11,
          fontWeight: 800,
        }}
      >
        {term.termNumber}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <strong
          style={{
            display: 'block',
            color: '#102343',
            fontSize: 14,
          }}
        >
          {term.name}
        </strong>

        <span
          style={{
            display: 'block',
            marginTop: 3,
            color: '#64748b',
            fontSize: 11,
          }}
        >
          {formatDateRange(term.startsOn, term.endsOn)}
        </span>
      </div>

      {canManage && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={onEdit}
            style={iconButtonStyle}
            aria-label="Изменить"
          >
            <Pencil size={15} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            style={{
              ...iconButtonStyle,
              color: '#b42318',
            }}
            aria-label="Удалить"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  )
}


function HolidayRow({
  holiday,
  canManage,
  onEdit,
  onDelete,
}) {
  const days = calculateDays(
    holiday.startsOn,
    holiday.endsOn,
  )

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        background: '#ffffff',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          background: '#fff3d6',
          color: '#c98200',
          borderRadius: 11,
        }}
      >
        <Clock3 size={19} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <strong
          style={{
            display: 'block',
            color: '#102343',
            fontSize: 14,
          }}
        >
          {holiday.name}
        </strong>

        <span
          style={{
            display: 'block',
            marginTop: 3,
            color: '#64748b',
            fontSize: 11,
          }}
        >
          {formatDateRange(
            holiday.startsOn,
            holiday.endsOn,
          )}
          {' · '}
          {days}{' '}
          {plural(days, 'день', 'дня', 'дней')}
        </span>
      </div>

      {canManage && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={onEdit}
            style={iconButtonStyle}
            aria-label="Изменить"
          >
            <Pencil size={15} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            style={{
              ...iconButtonStyle,
              color: '#b42318',
            }}
            aria-label="Удалить"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  )
}


function Modal({ title, onClose, children }) {
  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      style={modalOverlayStyle}
    >
      <div style={modalCardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: '#102343',
              fontSize: 18,
            }}
          >
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            style={iconButtonStyle}
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}


function Field({ label, children }) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        marginBottom: 12,
      }}
    >
      <span
        style={{
          color: '#526176',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {label}
      </span>

      {children}
    </label>
  )
}


function ModalActions({
  onCancel,
  submitLabel,
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 18,
      }}
    >
      <button
        type="button"
        onClick={onCancel}
        style={secondaryButtonStyle}
      >
        Отмена
      </button>

      <button
        type="submit"
        style={primaryButtonStyle}
      >
        {submitLabel}
      </button>
    </div>
  )
}


/* =========================================================
   HELPERS
========================================================= */

function formatDateRange(startsOn, endsOn) {
  if (!startsOn || !endsOn) {
    return ''
  }

  return `${formatDate(startsOn)} — ${formatDate(endsOn)}`
}


function formatDate(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}


function calculateDays(startsOn, endsOn) {
  if (!startsOn || !endsOn) {
    return 0
  }

  const start = new Date(startsOn)
  const end = new Date(endsOn)

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return 0
  }

  return Math.max(
    1,
    Math.round(
      (end - start) / (1000 * 60 * 60 * 24),
    ) + 1,
  )
}


function plural(n, one, few, many) {
  const abs = Math.abs(n) % 100
  const last = abs % 10

  if (abs >= 11 && abs <= 14) {
    return many
  }

  if (last === 1) {
    return one
  }

  if (last >= 2 && last <= 4) {
    return few
  }

  return many
}


/* =========================================================
   STYLES
========================================================= */

const primaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  minHeight: 42,
  padding: '0 14px',
  border: 0,
  borderRadius: 11,
  background: '#2563eb',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
}


const secondaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  minHeight: 42,
  padding: '0 14px',
  border: '1px solid #bfdbfe',
  borderRadius: 11,
  background: '#eff6ff',
  color: '#1d4ed8',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
}


const smallButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 34,
  padding: '0 10px',
  border: '1px solid #dbe2ea',
  borderRadius: 9,
  background: '#ffffff',
  color: '#334155',
  fontWeight: 700,
  fontSize: 11,
  cursor: 'pointer',
}


const smallSuccessButtonStyle = {
  ...smallButtonStyle,
  border: '1px solid #bbf7d0',
  background: '#f0fdf4',
  color: '#166534',
}


const smallDangerButtonStyle = {
  ...smallButtonStyle,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#b42318',
}


const iconButtonStyle = {
  width: 34,
  height: 34,
  display: 'grid',
  placeItems: 'center',
  padding: 0,
  border: '1px solid #dbe2ea',
  borderRadius: 9,
  background: '#ffffff',
  color: '#475569',
  cursor: 'pointer',
}


const yearItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: 12,
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  background: '#ffffff',
  cursor: 'pointer',
}


const yearItemActiveStyle = {
  border: '1px solid #93c5fd',
  background: '#eff6ff',
}


const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 2000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 18,
  background: 'rgba(15, 30, 55, 0.48)',
}


const modalCardStyle = {
  width: '100%',
  maxWidth: 460,
  padding: 22,
  background: '#ffffff',
  borderRadius: 20,
  boxShadow: '0 24px 70px rgba(15, 42, 82, 0.24)',
}


export default AdminSchoolYearPage