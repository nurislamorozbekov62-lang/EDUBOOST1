import { useEffect, useMemo, useState } from 'react'
import {
  CalendarPlus,
  Check,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import TeacherAttendancePanel from '../components/TeacherAttendancePanel'

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

function TeacherJournalPage() {
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState('grades')

  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])

  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('Математика')
  const [selectedQuarter, setSelectedQuarter] = useState(1)

  const [grades, setGrades] = useState([])
  const [lessons, setLessons] = useState([])
  const [finalQuarterGrades, setFinalQuarterGrades] = useState([])

  const [minimumGrades, setMinimumGrades] = useState(3)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  /*
   * gradeModal:
   * {
   *   student,
   *   date
   * }
   */
  const [gradeModal, setGradeModal] = useState(null)
  const [selectedGrade, setSelectedGrade] = useState(null)
  const [lessonModalOpen, setLessonModalOpen] = useState(false)

  useEffect(() => {
    if (!user?.id || user.role !== 'Учитель') {
      return
    }

    void loadClasses()
  }, [user?.id, user?.school, user?.role])

  useEffect(() => {
    if (!selectedClass || !user?.id) {
      setStudents([])
      return
    }

    void loadStudents()
  }, [selectedClass, user?.id])

  useEffect(() => {
    if (
      activeTab !== 'grades' ||
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

      const data = await getSupabaseSchoolClassesForTeacher(user)

      setClasses(data)

      if (data.length > 0) {
        setSelectedClass((currentClass) => {
          if (currentClass && data.includes(currentClass)) {
            return currentClass
          }

          return data[0]
        })
      } else {
        setSelectedClass('')
      }
    } catch (loadError) {
      setError(
        loadError.message ||
          'Не удалось загрузить классы.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadStudents() {
    try {
      setError('')

      const data = await getSupabaseStudentsByClass(
        user,
        selectedClass,
      )

      setStudents(data)
    } catch (loadError) {
      setStudents([])

      setError(
        loadError.message ||
          'Не удалось загрузить учеников.',
      )
    }
  }

  async function loadJournal() {
    try {
      setLoading(true)
      setError('')

      /*
       * Оценки и даты уроков —
       * основные данные журнала.
       */
      const [gradeRows, lessonRows] = await Promise.all([
        getSupabaseClassGrades({
          teacher: user,
          className: selectedClass,
          subject: selectedSubject,
          quarter: selectedQuarter,
        }),

        getSupabaseJournalLessons({
          teacher: user,
          className: selectedClass,
          subject: selectedSubject,
          quarter: selectedQuarter,
        }),
      ])

      setGrades(gradeRows)
      setLessons(lessonRows)

      /*
       * Четвертные оценки загружаем отдельно,
       * чтобы ошибка тут не ломала обычный журнал.
       */
      try {
        const finalRows = await getSupabaseClassQuarterGrades({
          teacher: user,
          className: selectedClass,
          subject: selectedSubject,
          quarter: selectedQuarter,
        })

        setFinalQuarterGrades(finalRows)
      } catch (quarterError) {
        console.error(quarterError)
        setFinalQuarterGrades([])
      }

      /*
       * Настройка минимального количества оценок.
       */
      try {
        const minimum = await getGradingMinimum({
          teacher: user,
          className: selectedClass,
          subject: selectedSubject,
        })

        setMinimumGrades(minimum)
      } catch (settingsError) {
        console.error(settingsError)
        setMinimumGrades(3)
      }
    } catch (loadError) {
      setError(
        loadError.message ||
          'Не удалось загрузить журнал.',
      )
    } finally {
      setLoading(false)
    }
  }

  /*
   * Важный момент:
   *
   * Колонки строятся не только из journal_lessons,
   * но и из уже существующих оценок.
   *
   * Поэтому старые оценки НЕ исчезнут,
   * даже если для них раньше не создавали урок.
   */
  const columns = useMemo(() => {
    const map = new Map()

    lessons.forEach((lesson) => {
      map.set(lesson.date, {
        date: lesson.date,
        topic: lesson.topic || '',
        lessonId: lesson.id,
        isLesson: true,
      })
    })

    grades.forEach((grade) => {
      if (!grade.date || map.has(grade.date)) {
        return
      }

      map.set(grade.date, {
        date: grade.date,
        topic: grade.topic || '',
        lessonId: null,
        isLesson: false,
      })
    })

    return [...map.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    )
  }, [lessons, grades])

  const rows = useMemo(() => {
    return students.map((student) => {
      const studentGrades = grades.filter(
        (grade) => grade.studentId === student.id,
      )

      const average = calculateWeightedAverage(studentGrades)

      const isAttested =
        studentGrades.length >= Number(minimumGrades)

      const predicted = isAttested
        ? getSuggestedQuarterGrade(average)
        : null

      const finalRow = finalQuarterGrades.find(
        (item) => item.studentId === student.id,
      )

      return {
        student,
        grades: studentGrades,
        average,
        predicted,
        finalGrade: finalRow?.finalGrade ?? null,
        isAttested,
        missing: Math.max(
          Number(minimumGrades) - studentGrades.length,
          0,
        ),
      }
    })
  }, [
    students,
    grades,
    finalQuarterGrades,
    minimumGrades,
  ])

  async function handleSaveMinimum() {
    try {
      setError('')
      setSuccess('')

      const value = Number(minimumGrades)

      if (
        !Number.isInteger(value) ||
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

      setSuccess('Минимум оценок сохранён.')

      await loadJournal()
    } catch (saveError) {
      setError(
        saveError.message ||
          'Не удалось сохранить минимум.',
      )
    }
  }

  async function handleConfirmQuarter(row) {
    if (!row.predicted) {
      return
    }

    try {
      setError('')
      setSuccess('')

      await confirmQuarterGrade({
        teacher: user,
        student: row.student,
        subject: selectedSubject,
        quarter: selectedQuarter,
        finalGrade: row.predicted,
      })

      setSuccess(
        `${row.student.name}: четвертная ${row.predicted} выставлена.`,
      )

      await loadJournal()
    } catch (saveError) {
      setError(
        saveError.message ||
          'Не удалось выставить четвертную.',
      )
    }
  }

  function openGradeModal(student, date = '') {
    setGradeModal({
      student,
      date,
    })
  }

  function changeTab(tab) {
    setActiveTab(tab)
    setError('')
    setSuccess('')
  }

  if (!user) {
    return null
  }

  if (user.role !== 'Учитель') {
    return (
      <div className="page-container">
        <section className="content-card">
          <h2>Доступ запрещён</h2>

          <p>
            Электронный журнал доступен только учителям.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Электронный журнал</h1>

          <p>
            Оценки, даты уроков и посещаемость класса.
          </p>
        </div>
      </header>

      <section className="content-card">
        <div style={filtersGridStyle}>
          <label className="form-group">
            <span>Класс</span>

            <select
              value={selectedClass}
              onChange={(event) =>
                setSelectedClass(event.target.value)
              }
            >
              {classes.length === 0 && (
                <option value="">
                  Нет классов
                </option>
              )}

              {classes.map((className) => (
                <option
                  key={className}
                  value={className}
                >
                  {className}
                </option>
              ))}
            </select>
          </label>

          <label className="form-group">
            <span>Предмет</span>

            <select
              value={selectedSubject}
              onChange={(event) =>
                setSelectedSubject(event.target.value)
              }
            >
              {SUBJECTS.map((subject) => (
                <option
                  key={subject}
                  value={subject}
                >
                  {subject}
                </option>
              ))}
            </select>
          </label>

          {activeTab === 'grades' && (
            <>
              <label className="form-group">
                <span>Четверть</span>

                <select
                  value={selectedQuarter}
                  onChange={(event) =>
                    setSelectedQuarter(
                      Number(event.target.value),
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
                <span>Минимум оценок</span>

                <div style={inlineInputStyle}>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={minimumGrades}
                    onChange={(event) =>
                      setMinimumGrades(
                        Number(event.target.value),
                      )
                    }
                  />

                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleSaveMinimum}
                    title="Сохранить минимум"
                  >
                    <Check size={18} />
                  </button>
                </div>
              </label>
            </>
          )}
        </div>
      </section>

      <div style={tabsStyle}>
        <button
          type="button"
          onClick={() => changeTab('grades')}
          style={tabButtonStyle(
            activeTab === 'grades',
          )}
        >
          📘 Оценки
        </button>

        <button
          type="button"
          onClick={() => changeTab('attendance')}
          style={tabButtonStyle(
            activeTab === 'attendance',
          )}
        >
          📅 Посещаемость
        </button>
      </div>

      {error && (
        <section className="content-card">
          <div className="auth-error">
            {error}
          </div>
        </section>
      )}

      {success && (
        <section className="content-card">
          <p style={{ margin: 0 }}>
            ✅ {success}
          </p>
        </section>
      )}

      {activeTab === 'grades' && (
        <section className="content-card">
          <div style={journalHeaderStyle}>
            <div>
              <p style={journalEyebrowStyle}>
                {selectedClass || 'Класс'}
                {' · '}
                {selectedSubject}
              </p>

              <h2 style={{ margin: '4px 0 0' }}>
                {selectedQuarter} четверть
              </h2>
            </div>

            <div style={journalActionsStyle}>
              <span style={studentCountStyle}>
                Учеников: {students.length}
              </span>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  setLessonModalOpen(true)
                }
                disabled={!selectedClass}
              >
                <CalendarPlus size={18} />
                Добавить дату
              </button>
            </div>
          </div>

          <div style={hintStyle}>
            💡 Нажмите на пустую клетку в журнале,
            чтобы сразу выставить оценку ученику
            на выбранную дату.
          </div>

          {loading ? (
            <p className="empty-text">
              Загрузка журнала...
            </p>
          ) : students.length === 0 ? (
            <p className="empty-text">
              В этом классе пока нет учеников.
            </p>
          ) : (
            <JournalTable
              rows={rows}
              columns={columns}
              selectedSubject={selectedSubject}
              selectedQuarter={selectedQuarter}
              onAddGrade={openGradeModal}
              onEditGrade={setSelectedGrade}
              onConfirmQuarter={
                handleConfirmQuarter
              }
            />
          )}
        </section>
      )}

      {activeTab === 'attendance' && (
        <section className="content-card">
          <TeacherAttendancePanel
            teacher={user}
            students={students}
            className={selectedClass}
            subject={selectedSubject}
          />
        </section>
      )}

      {lessonModalOpen && (
        <CreateLessonModal
          teacher={user}
          className={selectedClass}
          subject={selectedSubject}
          quarter={selectedQuarter}
          onClose={() =>
            setLessonModalOpen(false)
          }
          onSaved={async () => {
            setLessonModalOpen(false)

            setSuccess(
              'Дата урока добавлена в журнал.',
            )

            await loadJournal()
          }}
        />
      )}

      {gradeModal && (
        <CreateGradeModal
          teacher={user}
          student={gradeModal.student}
          subject={selectedSubject}
          quarter={selectedQuarter}
          defaultDate={gradeModal.date}
          onClose={() =>
            setGradeModal(null)
          }
          onSaved={async () => {
            setGradeModal(null)

            setSuccess(
              'Оценка сохранена.',
            )

            await loadJournal()
          }}
        />
      )}

      {selectedGrade && (
        <EditGradeModal
          grade={selectedGrade}
          canDelete={
            selectedGrade.teacherId === user.id
          }
          onClose={() =>
            setSelectedGrade(null)
          }
          onSaved={async () => {
            setSelectedGrade(null)

            setSuccess(
              'Оценка изменена.',
            )

            await loadJournal()
          }}
          onDeleted={async () => {
            setSelectedGrade(null)

            setSuccess(
              'Оценка удалена.',
            )

            await loadJournal()
          }}
        />
      )}
    </div>
  )
}

function JournalTable({
  rows,
  columns,
  selectedSubject,
  selectedQuarter,
  onAddGrade,
  onEditGrade,
  onConfirmQuarter,
}) {
  return (
    <div style={tableWrapperStyle}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: Math.max(
            900,
            440 + columns.length * 86,
          ),
        }}
      >
        <thead>
          <tr>
            <th style={stickyNameHeaderStyle}>
              Ученик
            </th>

            {columns.map((column) => (
              <th
                key={column.date}
                style={dateHeaderStyle}
                title={
                  column.topic ||
                  formatFullDate(column.date)
                }
              >
                <div>
                  {formatShortDate(column.date)}
                </div>

                <small style={dateTopicStyle}>
                  {column.topic || 'Урок'}
                </small>
              </th>
            ))}

            <th style={headerCellStyle}>
              Ср.
            </th>

            <th style={headerCellStyle}>
              Прогноз
            </th>

            <th style={headerCellStyle}>
              Четверть
            </th>

            <th style={headerCellStyle}>
              +
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.student.id}>
              <td style={stickyNameCellStyle}>
                <div style={studentCellStyle}>
                  <div style={avatarStyle}>
                    {String(row.student.name || 'У')
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <strong>
                      {row.student.name}
                    </strong>

                    <div style={studentMetaStyle}>
                      {selectedSubject}
                      {' · '}
                      {selectedQuarter}
                      {' четв.'}
                    </div>
                  </div>
                </div>
              </td>

              {columns.map((column) => {
                const cellGrades =
                  row.grades.filter(
                    (grade) =>
                      grade.date === column.date,
                  )

                return (
                  <td
                    key={column.date}
                    style={bodyCellStyle}
                  >
                    {cellGrades.length === 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          onAddGrade(
                            row.student,
                            column.date,
                          )
                        }
                        style={emptyCellButtonStyle}
                        title={`Поставить оценку за ${formatFullDate(
                          column.date,
                        )}`}
                      >
                        <Plus size={17} />
                      </button>
                    ) : (
                      <div style={cellGradesStyle}>
                        {cellGrades.map((grade) => (
                          <button
                            type="button"
                            key={grade.id}
                            onClick={() =>
                              onEditGrade(grade)
                            }
                            title="Изменить оценку"
                            style={gradeButtonStyle(
                              grade.value,
                            )}
                          >
                            {grade.value}
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() =>
                            onAddGrade(
                              row.student,
                              column.date,
                            )
                          }
                          style={smallAddButtonStyle}
                          title="Добавить ещё одну оценку"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                )
              })}

              <td style={bodyCellStyle}>
                <strong>
                  {row.average ?? '—'}
                </strong>
              </td>

              <td style={bodyCellStyle}>
                {row.isAttested ? (
                  <span
                    style={resultBadgeStyle(
                      row.predicted,
                    )}
                  >
                    {row.predicted}
                  </span>
                ) : (
                  <span
                    style={naBadgeStyle}
                    title={`Не хватает оценок: ${row.missing}`}
                  >
                    Н/А
                  </span>
                )}
              </td>

              <td style={bodyCellStyle}>
                {row.finalGrade !== null ? (
                  <span
                    style={resultBadgeStyle(
                      row.finalGrade,
                    )}
                  >
                    {row.finalGrade}
                  </span>
                ) : row.isAttested ? (
                  <button
                    type="button"
                    onClick={() =>
                      onConfirmQuarter(row)
                    }
                    style={confirmButtonStyle}
                    title="Подтвердить четвертную"
                  >
                    {row.predicted}

                    <ChevronRight size={15} />
                  </button>
                ) : (
                  <span style={{ opacity: 0.35 }}>
                    —
                  </span>
                )}
              </td>

              <td style={bodyCellStyle}>
                <button
                  type="button"
                  onClick={() =>
                    onAddGrade(row.student)
                  }
                  style={addButtonStyle}
                  title="Добавить оценку"
                >
                  <Plus size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {columns.length === 0 && (
        <div style={noDatesStyle}>
          <CalendarPlus size={30} />

          <strong>
            Пока нет дат уроков
          </strong>

          <p>
            Нажмите «Добавить дату», чтобы
            создать первую колонку журнала.
          </p>
        </div>
      )}
    </div>
  )
}

function CreateLessonModal({
  teacher,
  className,
  subject,
  quarter,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    date: new Date()
      .toISOString()
      .slice(0, 10),

    topic: '',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')

      await createSupabaseJournalLesson({
        teacher,
        className,
        subject,
        quarter,
        date: form.date,
        topic: form.topic,
      })

      await onSaved()
    } catch (saveError) {
      setError(
        saveError.message ||
          'Не удалось добавить дату урока.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ModalHeader
          subtitle={`${className} · ${subject}`}
          title="Добавить урок"
          onClose={onClose}
        />

        <div style={lessonInfoStyle}>
          📅 После сохранения эта дата
          станет новой колонкой журнала.
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <label className="form-group">
          <span>Дата урока</span>

          <input
            type="date"
            required
            value={form.date}
            onChange={(event) =>
              setForm((currentForm) => ({
                ...currentForm,
                date: event.target.value,
              }))
            }
          />
        </label>

        <label className="form-group">
          <span>Тема урока</span>

          <input
            value={form.topic}
            onChange={(event) =>
              setForm((currentForm) => ({
                ...currentForm,
                topic: event.target.value,
              }))
            }
            placeholder="Например: Квадратные уравнения"
          />
        </label>

        <button
          type="submit"
          className="primary-button"
          disabled={saving}
          style={{ width: '100%' }}
        >
          <CalendarPlus size={18} />

          {saving
            ? 'Добавляем...'
            : 'Добавить дату'}
        </button>
      </form>
    </ModalShell>
  )
}

function CreateGradeModal({
  teacher,
  student,
  subject,
  quarter,
  defaultDate,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    value: '5',
    workType: 'homework',
    topic: '',
    comment: '',
    date:
      defaultDate ||
      new Date()
        .toISOString()
        .slice(0, 10),
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')

      await createSupabaseGrade(
        teacher,
        student,
        {
          ...form,
          subject,
          quarter,
        },
      )

      await onSaved()
    } catch (saveError) {
      setError(
        saveError.message ||
          'Не удалось сохранить оценку.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ModalHeader
          subtitle={student.name}
          title="Новая оценка"
          onClose={onClose}
        />

        <p style={modalSubtitleStyle}>
          {subject}
          {' · '}
          {quarter}
          {' четверть · '}
          {formatFullDate(form.date)}
        </p>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <GradeFormFields
          form={form}
          setForm={setForm}
        />

        <button
          type="submit"
          className="primary-button"
          disabled={saving}
          style={{ width: '100%' }}
        >
          {saving
            ? 'Сохраняем...'
            : 'Сохранить оценку'}
        </button>
      </form>
    </ModalShell>
  )
}

function EditGradeModal({
  grade,
  canDelete,
  onClose,
  onSaved,
  onDeleted,
}) {
  const [form, setForm] = useState({
    value: String(grade.value),
    workType: grade.workType || 'homework',
    topic: grade.topic || '',
    comment: grade.comment || '',
    date:
      grade.date ||
      new Date()
        .toISOString()
        .slice(0, 10),
  })

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')

      await updateSupabaseGrade(
        grade.id,
        form,
      )

      await onSaved()
    } catch (saveError) {
      setError(
        saveError.message ||
          'Не удалось изменить оценку.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      'Удалить эту оценку?',
    )

    if (!confirmed) {
      return
    }

    try {
      setDeleting(true)
      setError('')

      await deleteSupabaseGrade(
        grade.id,
      )

      await onDeleted()
    } catch (deleteError) {
      setError(
        deleteError.message ||
          'Не удалось удалить оценку.',
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ModalHeader
          subtitle={grade.subject}
          title={`Редактировать оценку ${grade.value}`}
          onClose={onClose}
        />

        <div style={editInfoStyle}>
          <Pencil size={17} />

          <span>
            Изменения сразу увидит ученик.
          </span>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <GradeFormFields
          form={form}
          setForm={setForm}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              canDelete ? '1fr 1fr' : '1fr',
            gap: 10,
          }}
        >
          <button
            type="submit"
            className="primary-button"
            disabled={saving || deleting}
          >
            {saving
              ? 'Сохраняем...'
              : 'Сохранить изменения'}
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving || deleting}
              style={deleteButtonStyle}
            >
              <Trash2 size={18} />

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

function GradeFormFields({
  form,
  setForm,
}) {
  return (
    <>
      <div style={twoColumnStyle}>
        <label className="form-group">
          <span>Оценка</span>

          <select
            value={form.value}
            onChange={(event) =>
              setForm((currentForm) => ({
                ...currentForm,
                value: event.target.value,
              }))
            }
          >
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
        </label>

        <label className="form-group">
          <span>Дата</span>

          <input
            type="date"
            required
            value={form.date}
            onChange={(event) =>
              setForm((currentForm) => ({
                ...currentForm,
                date: event.target.value,
              }))
            }
          />
        </label>
      </div>

      <label className="form-group">
        <span>Тип работы</span>

        <select
          value={form.workType}
          onChange={(event) =>
            setForm((currentForm) => ({
              ...currentForm,
              workType: event.target.value,
            }))
          }
        >
          {GRADE_TYPES.map((type) => (
            <option
              key={type.value}
              value={type.value}
            >
              {type.label}
            </option>
          ))}
        </select>
      </label>

      <label className="form-group">
        <span>Тема</span>

        <input
          value={form.topic}
          onChange={(event) =>
            setForm((currentForm) => ({
              ...currentForm,
              topic: event.target.value,
            }))
          }
          placeholder="Например: Квадратные уравнения"
        />
      </label>

      <label className="form-group">
        <span>Комментарий</span>

        <textarea
          value={form.comment}
          onChange={(event) =>
            setForm((currentForm) => ({
              ...currentForm,
              comment: event.target.value,
            }))
          }
          placeholder="Комментарий для ученика"
        />
      </label>
    </>
  )
}

function ModalHeader({
  subtitle,
  title,
  onClose,
}) {
  return (
    <div style={modalHeaderStyle}>
      <div>
        <p
          style={{
            margin: 0,
            opacity: 0.6,
          }}
        >
          {subtitle}
        </p>

        <h2
          style={{
            margin: '4px 0 0',
          }}
        >
          {title}
        </h2>
      </div>

      <button
        type="button"
        onClick={onClose}
        style={iconButtonStyle}
      >
        <X size={20} />
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
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose()
        }
      }}
      style={modalBackdropStyle}
    >
      <div style={modalCardStyle}>
        {children}
      </div>
    </div>
  )
}

function formatShortDate(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(
    `${value}T12:00:00`,
  )

  return date.toLocaleDateString(
    'ru-RU',
    {
      day: '2-digit',
      month: '2-digit',
    },
  )
}

function formatFullDate(value) {
  if (!value) {
    return 'Дата не указана'
  }

  const date = new Date(
    `${value}T12:00:00`,
  )

  if (
    Number.isNaN(date.getTime())
  ) {
    return 'Дата не указана'
  }

  return date.toLocaleDateString(
    'ru-RU',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    },
  )
}

function tabButtonStyle(active) {
  return {
    border: 'none',
    borderRadius: 12,
    padding: '11px 18px',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: 14,
    background: active
      ? '#2563eb'
      : '#f1f5f9',
    color: active
      ? '#ffffff'
      : '#334155',
    boxShadow: active
      ? '0 6px 18px rgba(37, 99, 235, 0.18)'
      : 'none',
  }
}

function gradeButtonStyle(value) {
  const backgrounds = {
    5: '#dcfce7',
    4: '#dbeafe',
    3: '#fef3c7',
    2: '#fee2e2',
    1: '#fecaca',
  }

  return {
    border: 'none',
    width: 34,
    height: 34,
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: 15,
    background:
      backgrounds[value] ||
      '#f1f5f9',
    color: '#0f172a',
  }
}

function resultBadgeStyle(value) {
  return {
    display: 'inline-grid',
    placeItems: 'center',
    minWidth: 36,
    height: 36,
    padding: '0 10px',
    borderRadius: 10,
    fontWeight: 800,
    background:
      Number(value) >= 5
        ? '#dcfce7'
        : Number(value) >= 4
          ? '#dbeafe'
          : Number(value) >= 3
            ? '#fef3c7'
            : '#fee2e2',
  }
}

const filtersGridStyle = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 16,
}

const inlineInputStyle = {
  display: 'flex',
  gap: 8,
}

const tabsStyle = {
  display: 'flex',
  gap: 10,
  marginBottom: 18,
  flexWrap: 'wrap',
}

const journalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 16,
}

const journalEyebrowStyle = {
  margin: 0,
  opacity: 0.65,
}

const journalActionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
}

const studentCountStyle = {
  padding: '8px 11px',
  borderRadius: 10,
  background: '#f8fafc',
  fontSize: 13,
  fontWeight: 700,
}

const hintStyle = {
  padding: '11px 13px',
  marginBottom: 16,
  borderRadius: 12,
  background: '#eff6ff',
  color: '#1e40af',
  fontSize: 13,
}

const tableWrapperStyle = {
  position: 'relative',
  overflowX: 'auto',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
}

const headerCellStyle = {
  padding: 12,
  textAlign: 'center',
  borderBottom: '1px solid #e5e7eb',
  background: '#f8fafc',
  whiteSpace: 'nowrap',
  fontSize: 13,
}

const dateHeaderStyle = {
  ...headerCellStyle,
  minWidth: 82,
  maxWidth: 100,
}

const dateTopicStyle = {
  display: 'block',
  marginTop: 4,
  maxWidth: 90,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  opacity: 0.55,
  fontWeight: 500,
}

const bodyCellStyle = {
  padding: 8,
  textAlign: 'center',
  borderBottom: '1px solid #eef2f7',
  minWidth: 68,
}

const stickyNameHeaderStyle = {
  ...headerCellStyle,
  position: 'sticky',
  left: 0,
  zIndex: 3,
  textAlign: 'left',
  minWidth: 230,
}

const stickyNameCellStyle = {
  ...bodyCellStyle,
  position: 'sticky',
  left: 0,
  zIndex: 2,
  textAlign: 'left',
  minWidth: 230,
  background: '#ffffff',
}

const studentCellStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
}

const avatarStyle = {
  width: 34,
  height: 34,
  flexShrink: 0,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  background: '#eef5ff',
  fontWeight: 800,
}

const studentMetaStyle = {
  fontSize: 12,
  opacity: 0.6,
  marginTop: 2,
}

const emptyCellButtonStyle = {
  width: 42,
  height: 38,
  borderRadius: 10,
  border: '1px dashed #cbd5e1',
  background: '#ffffff',
  color: '#94a3b8',
  cursor: 'pointer',
  display: 'inline-grid',
  placeItems: 'center',
}

const cellGradesStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 4,
  flexWrap: 'wrap',
}

const smallAddButtonStyle = {
  width: 25,
  height: 25,
  borderRadius: 8,
  border: '1px dashed #cbd5e1',
  background: '#ffffff',
  color: '#64748b',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
}

const addButtonStyle = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: '1px solid #dbeafe',
  background: '#eff6ff',
  color: '#2563eb',
  display: 'inline-grid',
  placeItems: 'center',
  cursor: 'pointer',
}

const confirmButtonStyle = {
  border: 'none',
  borderRadius: 10,
  minHeight: 36,
  padding: '0 10px',
  cursor: 'pointer',
  background: '#eff6ff',
  color: '#1d4ed8',
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
}

const naBadgeStyle = {
  display: 'inline-grid',
  placeItems: 'center',
  height: 36,
  padding: '0 10px',
  borderRadius: 10,
  fontWeight: 800,
  background: '#fee2e2',
  color: '#991b1b',
}

const noDatesStyle = {
  minHeight: 180,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  color: '#64748b',
  padding: 30,
}

const twoColumnStyle = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(2, minmax(0, 1fr))',
  gap: 12,
}

const modalBackdropStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(15, 23, 42, 0.45)',
  display: 'grid',
  placeItems: 'center',
  padding: 20,
}

const modalCardStyle = {
  width: 'min(520px, 100%)',
  maxHeight: '90vh',
  overflowY: 'auto',
  background: '#ffffff',
  borderRadius: 20,
  padding: 22,
  boxShadow:
    '0 24px 80px rgba(15, 23, 42, 0.22)',
}

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 18,
}

const modalSubtitleStyle = {
  marginTop: 0,
  opacity: 0.7,
}

const iconButtonStyle = {
  width: 38,
  height: 38,
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
}

const lessonInfoStyle = {
  padding: '10px 12px',
  marginBottom: 16,
  borderRadius: 12,
  background: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 13,
}

const editInfoStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 16,
  padding: '10px 12px',
  borderRadius: 12,
  background: '#eff6ff',
  color: '#1d4ed8',
}

const deleteButtonStyle = {
  border: '1px solid #fecaca',
  borderRadius: 12,
  minHeight: 44,
  background: '#fff1f2',
  color: '#be123c',
  cursor: 'pointer',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}

export default TeacherJournalPage