import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronRight,
  Plus,
} from 'lucide-react'

function TeacherJournalMobile({
  rows,
  columns,
  selectedSubject,
  selectedQuarter,
  onAddGrade,
  onEditGrade,
  onConfirmQuarter,
}) {
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
    if (columns.length === 0) {
      setSelectedDate('')
      return
    }

    const dateExists = columns.some(
      (column) => column.date === selectedDate,
    )

    if (!dateExists) {
      setSelectedDate(
        columns[columns.length - 1].date,
      )
    }
  }, [columns, selectedDate])

  const selectedColumn = columns.find(
    (column) => column.date === selectedDate,
  )

  if (columns.length === 0) {
    return (
      <div style={emptyStyle}>
        <CalendarDays size={32} />

        <strong>Нет дат уроков</strong>

        <span>
          Нажмите «Добавить дату», чтобы начать журнал.
        </span>
      </div>
    )
  }

  return (
    <div style={wrapperStyle}>
      <div style={dateSectionStyle}>
        <div style={dateHeadingStyle}>
          <div>
            <span style={labelStyle}>
              Дата урока
            </span>

            <strong style={dateTitleStyle}>
              {formatFullDate(selectedDate)}
            </strong>
          </div>

          <span style={countStyle}>
            {rows.length} учен.
          </span>
        </div>

        <div style={datesScrollStyle}>
          {columns.map((column) => {
            const active =
              column.date === selectedDate

            return (
              <button
                key={column.date}
                type="button"
                onClick={() =>
                  setSelectedDate(column.date)
                }
                style={dateButtonStyle(active)}
              >
                <strong>
                  {formatShortDate(column.date)}
                </strong>

                <span>
                  {column.topic || 'Урок'}
                </span>
              </button>
            )
          })}
        </div>

        {selectedColumn?.topic && (
          <div style={topicStyle}>
            <span>Тема:</span>
            <strong>
              {selectedColumn.topic}
            </strong>
          </div>
        )}
      </div>

      <div style={studentsStyle}>
        {rows.map((row) => {
          const cellGrades = row.grades.filter(
            (grade) =>
              grade.date === selectedDate,
          )

          return (
            <article
              key={row.student.id}
              style={studentCardStyle}
            >
              <div style={studentTopStyle}>
                <div style={studentIdentityStyle}>
                  <div style={avatarStyle}>
                    {String(
                      row.student.name || 'У',
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <strong style={studentNameStyle}>
                      {row.student.name}
                    </strong>

                    <span style={metaStyle}>
                      {selectedSubject}
                      {' · '}
                      {selectedQuarter} четв.
                    </span>
                  </div>
                </div>

                <div style={miniStatsStyle}>
                  <div>
                    <span>Средний</span>
                    <strong>
                      {row.average ?? '—'}
                    </strong>
                  </div>

                  <div>
                    <span>Прогноз</span>
                    <strong>
                      {row.predicted ?? 'Н/А'}
                    </strong>
                  </div>
                </div>
              </div>

              <div style={gradeAreaStyle}>
                <div>
                  <span style={labelStyle}>
                    Оценка за{' '}
                    {formatShortDate(selectedDate)}
                  </span>

                  <div style={gradesStyle}>
                    {cellGrades.map((grade) => (
                      <button
                        key={grade.id}
                        type="button"
                        onClick={() =>
                          onEditGrade(grade)
                        }
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
                          selectedDate,
                        )
                      }
                      style={addGradeStyle}
                    >
                      <Plus size={22} />

                      {cellGrades.length === 0
                        ? 'Поставить'
                        : 'Ещё'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={quarterRowStyle}>
                <div>
                  <span style={labelStyle}>
                    Четвертная
                  </span>

                  <strong style={quarterValueStyle}>
                    {row.finalGrade ??
                      row.predicted ??
                      '—'}
                  </strong>
                </div>

                {row.finalGrade !== null ? (
                  <span style={confirmedStyle}>
                    <Check size={16} />
                    Выставлена
                  </span>
                ) : row.isAttested &&
                  row.predicted ? (
                  <button
                    type="button"
                    onClick={() =>
                      onConfirmQuarter(row)
                    }
                    style={confirmStyle}
                  >
                    Подтвердить {row.predicted}
                    <ChevronRight size={17} />
                  </button>
                ) : (
                  <span style={missingStyle}>
                    Ещё оценок: {row.missing}
                  </span>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function formatShortDate(value) {
  if (!value) return '—'

  return new Date(
    `${value}T12:00:00`,
  ).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  })
}

function formatFullDate(value) {
  if (!value) return 'Дата не выбрана'

  return new Date(
    `${value}T12:00:00`,
  ).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function dateButtonStyle(active) {
  return {
    border: active
      ? '2px solid #1677ff'
      : '1px solid #e2e8f0',
    background: active
      ? '#eff6ff'
      : '#ffffff',
    color: active
      ? '#1263d6'
      : '#334155',
    borderRadius: 14,
    padding: '10px 13px',
    minWidth: 82,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    cursor: 'pointer',
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
    width: 52,
    height: 52,
    border: 'none',
    borderRadius: 15,
    background:
      backgrounds[value] || '#f1f5f9',
    color: '#0f172a',
    fontSize: 21,
    fontWeight: 900,
    cursor: 'pointer',
  }
}

const wrapperStyle = {
  display: 'grid',
  gap: 14,
}

const dateSectionStyle = {
  background: '#f8fbff',
  border: '1px solid #e4edf8',
  borderRadius: 18,
  padding: 14,
}

const dateHeadingStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  marginBottom: 12,
}

const labelStyle = {
  display: 'block',
  color: '#7890aa',
  fontSize: 12,
  fontWeight: 700,
}

const dateTitleStyle = {
  display: 'block',
  color: '#102343',
  marginTop: 3,
  fontSize: 17,
}

const countStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: '7px 10px',
  fontSize: 12,
  fontWeight: 800,
}

const datesScrollStyle = {
  display: 'flex',
  gap: 8,
  overflowX: 'auto',
  paddingBottom: 4,
}

const topicStyle = {
  display: 'flex',
  gap: 5,
  marginTop: 10,
  fontSize: 13,
  color: '#475569',
}

const studentsStyle = {
  display: 'grid',
  gap: 12,
}

const studentCardStyle = {
  background: '#ffffff',
  border: '1px solid #e3ebf4',
  borderRadius: 18,
  padding: 14,
  boxShadow:
    '0 5px 18px rgba(31, 61, 103, 0.06)',
}

const studentTopStyle = {
  display: 'grid',
  gap: 12,
}

const studentIdentityStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
}

const avatarStyle = {
  width: 42,
  height: 42,
  flexShrink: 0,
  borderRadius: '50%',
  background: '#eaf3ff',
  color: '#0867ed',
  display: 'grid',
  placeItems: 'center',
  fontWeight: 900,
}

const studentNameStyle = {
  display: 'block',
  fontSize: 16,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const metaStyle = {
  display: 'block',
  color: '#8292a6',
  fontSize: 12,
  marginTop: 2,
}

const miniStatsStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
}

const gradeAreaStyle = {
  marginTop: 13,
  paddingTop: 13,
  borderTop: '1px solid #edf2f7',
}

const gradesStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 7,
}

const addGradeStyle = {
  minHeight: 52,
  border: '1px dashed #8ab8f5',
  borderRadius: 15,
  padding: '0 15px',
  background: '#eff6ff',
  color: '#0867ed',
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
}

const quarterRowStyle = {
  marginTop: 13,
  paddingTop: 13,
  borderTop: '1px solid #edf2f7',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
}

const quarterValueStyle = {
  display: 'block',
  fontSize: 19,
  marginTop: 2,
}

const confirmedStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '8px 10px',
  borderRadius: 10,
  background: '#ecfdf5',
  color: '#15803d',
  fontSize: 12,
  fontWeight: 800,
}

const confirmStyle = {
  border: 'none',
  borderRadius: 11,
  padding: '9px 11px',
  background: '#eff6ff',
  color: '#0867ed',
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  cursor: 'pointer',
}

const missingStyle = {
  color: '#94a3b8',
  fontSize: 12,
  fontWeight: 700,
}

const emptyStyle = {
  minHeight: 170,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  gap: 7,
  color: '#718096',
}

export default TeacherJournalMobile