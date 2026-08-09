import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ATTENDANCE_STATUSES,
  getSupabaseClassAttendance,
  saveSupabaseAttendanceRecord,
  updateSupabaseAttendanceRecord,
  deleteSupabaseAttendanceRecord,
} from '../services/supabaseAttendanceService'

function TeacherAttendancePanel({
  teacher,
  students,
  className,
  subject,
}) {
  const today =
    new Date()
      .toISOString()
      .slice(0, 10)

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(today)

  const [
    records,
    setRecords,
  ] = useState([])

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    savingStudentId,
    setSavingStudentId,
  ] = useState('')

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')

  useEffect(() => {
    if (
      !teacher?.id ||
      !className ||
      !subject
    ) {
      return
    }

    void loadAttendance()
  }, [
    teacher?.id,
    className,
    subject,
    selectedDate,
  ])

  async function loadAttendance() {
    try {
      setLoading(true)
      setError('')

      const data =
        await getSupabaseClassAttendance({
          teacher,
          className,
          subject,

          dateFrom:
            selectedDate,

          dateTo:
            selectedDate,
        })

      setRecords(data)
    } catch (
      loadError
    ) {
      setError(
        loadError.message ||
          'Не удалось загрузить посещаемость.',
      )
    } finally {
      setLoading(false)
    }
  }

  const recordsByStudent =
    useMemo(() => {
      const map =
        new Map()

      records.forEach(
        (record) => {
          map.set(
            record.studentId,
            record,
          )
        },
      )

      return map
    }, [records])

  async function handleStatusChange(
    student,
    status,
  ) {
    try {
      setSavingStudentId(
        student.id,
      )

      setError('')
      setSuccess('')

      const existingRecord =
        recordsByStudent.get(
          student.id,
        )

      if (existingRecord) {
        await updateSupabaseAttendanceRecord(
          existingRecord.id,
          {
            subject,
            status,

            comment:
              existingRecord.comment ||
              '',

            date:
              selectedDate,
          },
        )
      } else {
        await saveSupabaseAttendanceRecord(
          teacher,
          student,
          {
            subject,
            status,

            comment:
              '',

            date:
              selectedDate,
          },
        )
      }

      await loadAttendance()
    } catch (
      saveError
    ) {
      setError(
        saveError.message ||
          'Не удалось сохранить посещаемость.',
      )
    } finally {
      setSavingStudentId('')
    }
  }

  async function handleCommentChange(
    student,
    comment,
  ) {
    const existingRecord =
      recordsByStudent.get(
        student.id,
      )

    if (!existingRecord) {
      return
    }

    setRecords(
      (
        currentRecords,
      ) =>
        currentRecords.map(
          (record) =>
            record.id ===
            existingRecord.id
              ? {
                  ...record,
                  comment,
                }
              : record,
        ),
    )
  }

  async function handleCommentSave(
    student,
  ) {
    const existingRecord =
      recordsByStudent.get(
        student.id,
      )

    if (!existingRecord) {
      return
    }

    const currentRecord =
      records.find(
        (record) =>
          record.id ===
          existingRecord.id,
      )

    if (!currentRecord) {
      return
    }

    try {
      setSavingStudentId(
        student.id,
      )

      setError('')

      await updateSupabaseAttendanceRecord(
        currentRecord.id,
        {
          subject,

          status:
            currentRecord.status,

          comment:
            currentRecord.comment,

          date:
            selectedDate,
        },
      )

      setSuccess(
        `Комментарий для ${student.name} сохранён.`,
      )

      await loadAttendance()
    } catch (
      saveError
    ) {
      setError(
        saveError.message ||
          'Не удалось сохранить комментарий.',
      )
    } finally {
      setSavingStudentId('')
    }
  }

  async function handleDelete(
    student,
  ) {
    const record =
      recordsByStudent.get(
        student.id,
      )

    if (!record) {
      return
    }

    const confirmed =
      window.confirm(
        `Удалить отметку посещаемости для ${student.name}?`,
      )

    if (!confirmed) {
      return
    }

    try {
      setSavingStudentId(
        student.id,
      )

      setError('')
      setSuccess('')

      await deleteSupabaseAttendanceRecord(
        record.id,
      )

      await loadAttendance()
    } catch (
      deleteError
    ) {
      setError(
        deleteError.message ||
          'Не удалось удалить запись.',
      )
    } finally {
      setSavingStudentId('')
    }
  }

  const stats =
    useMemo(() => {
      const result = {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        empty: 0,
      }

      students.forEach(
        (student) => {
          const record =
            recordsByStudent.get(
              student.id,
            )

          if (!record) {
            result.empty += 1
            return
          }

          if (
            result[
              record.status
            ] !== undefined
          ) {
            result[
              record.status
            ] += 1
          }
        },
      )

      return result
    }, [
      students,
      recordsByStudent,
    ])

  return (
    <div>
      <div
        style={{
          display:
            'flex',

          justifyContent:
            'space-between',

          alignItems:
            'center',

          gap:
            16,

          flexWrap:
            'wrap',

          marginBottom:
            18,
        }}
      >
        <div>
          <p
            style={{
              margin:
                0,

              opacity:
                0.65,
            }}
          >
            {className}
            {' · '}
            {subject}
          </p>

          <h2
            style={{
              margin:
                '4px 0 0',
            }}
          >
            Посещаемость
          </h2>
        </div>

        <label
          style={{
            display:
              'flex',

            alignItems:
              'center',

            gap:
              10,
          }}
        >
          <strong>
            Дата
          </strong>

          <input
            type="date"
            value={
              selectedDate
            }
            onChange={(
              event,
            ) =>
              setSelectedDate(
                event.target
                  .value,
              )
            }
          />
        </label>
      </div>

      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(auto-fit, minmax(145px, 1fr))',

          gap:
            10,

          marginBottom:
            18,
        }}
      >
        <StatCard
          label="Присутствуют"
          value={
            stats.present
          }
          icon="✅"
        />

        <StatCard
          label="Отсутствуют"
          value={
            stats.absent
          }
          icon="❌"
        />

        <StatCard
          label="Опоздали"
          value={
            stats.late
          }
          icon="⏰"
        />

        <StatCard
          label="Уважительная"
          value={
            stats.excused
          }
          icon="📄"
        />

        <StatCard
          label="Не отмечены"
          value={
            stats.empty
          }
          icon="➖"
        />
      </div>

      {error && (
        <div
          className="auth-error"
          style={{
            marginBottom:
              14,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <p>
          ✅ {success}
        </p>
      )}

      {loading ? (
        <p className="empty-text">
          Загрузка посещаемости...
        </p>
      ) : students.length ===
        0 ? (
        <p className="empty-text">
          В классе нет учеников.
        </p>
      ) : (
        <div
          style={{
            overflowX:
              'auto',

            border:
              '1px solid #e5e7eb',

            borderRadius:
              16,
          }}
        >
          <table
            style={{
              width:
                '100%',

              borderCollapse:
                'collapse',

              minWidth:
                900,
            }}
          >
            <thead>
              <tr>
                <th
                  style={
                    headerStyle
                  }
                >
                  Ученик
                </th>

                <th
                  style={
                    headerStyle
                  }
                >
                  Статус
                </th>

                <th
                  style={
                    headerStyle
                  }
                >
                  Быстрая отметка
                </th>

                <th
                  style={
                    headerStyle
                  }
                >
                  Комментарий
                </th>

                <th
                  style={
                    headerStyle
                  }
                >
                  Действия
                </th>
              </tr>
            </thead>

            <tbody>
              {students.map(
                (
                  student,
                ) => {
                  const record =
                    recordsByStudent.get(
                      student.id,
                    )

                  const isSaving =
                    savingStudentId ===
                    student.id

                  return (
                    <tr
                      key={
                        student.id
                      }
                    >
                      <td
                        style={
                          bodyStyle
                        }
                      >
                        <strong>
                          {
                            student.name
                          }
                        </strong>
                      </td>

                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {record ? (
                          <StatusBadge
                            status={
                              record.status
                            }
                          />
                        ) : (
                          <span
                            style={{
                              opacity:
                                0.45,
                            }}
                          >
                            Не отмечен
                          </span>
                        )}
                      </td>

                      <td
                        style={
                          bodyStyle
                        }
                      >
                        <div
                          style={{
                            display:
                              'flex',

                            flexWrap:
                              'wrap',

                            gap:
                              6,
                          }}
                        >
                          {ATTENDANCE_STATUSES.map(
                            (
                              item,
                            ) => (
                              <button
                                type="button"
                                key={
                                  item.value
                                }
                                disabled={
                                  isSaving
                                }
                                onClick={() =>
                                  handleStatusChange(
                                    student,
                                    item.value,
                                  )
                                }
                                title={
                                  item.label
                                }
                                style={statusButtonStyle(
                                  item.value,
                                  record?.status ===
                                    item.value,
                                )}
                              >
                                {getStatusIcon(
                                  item.value,
                                )}
                              </button>
                            ),
                          )}
                        </div>
                      </td>

                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {record ? (
                          <input
                            value={
                              record.comment ||
                              ''
                            }
                            onChange={(
                              event,
                            ) =>
                              handleCommentChange(
                                student,
                                event.target
                                  .value,
                              )
                            }
                            placeholder="Например: опоздал на 10 минут"
                            style={{
                              width:
                                '100%',

                              minWidth:
                                220,
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              opacity:
                                0.45,
                            }}
                          >
                            Сначала поставьте статус
                          </span>
                        )}
                      </td>

                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {record && (
                          <div
                            style={{
                              display:
                                'flex',

                              gap:
                                6,
                            }}
                          >
                            <button
                              type="button"
                              disabled={
                                isSaving
                              }
                              onClick={() =>
                                handleCommentSave(
                                  student,
                                )
                              }
                              style={
                                saveButtonStyle
                              }
                            >
                              Сохранить
                            </button>

                            <button
                              type="button"
                              disabled={
                                isSaving
                              }
                              onClick={() =>
                                handleDelete(
                                  student,
                                )
                              }
                              style={
                                deleteButtonStyle
                              }
                            >
                              Удалить
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                },
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
}) {
  return (
    <div
      style={{
        padding:
          14,

        border:
          '1px solid #e5e7eb',

        borderRadius:
          14,

        background:
          '#ffffff',
      }}
    >
      <div
        style={{
          fontSize:
            22,

          marginBottom:
            4,
        }}
      >
        {icon}
      </div>

      <strong
        style={{
          fontSize:
            22,
        }}
      >
        {value}
      </strong>

      <div
        style={{
          fontSize:
            13,

          opacity:
            0.65,

          marginTop:
            2,
        }}
      >
        {label}
      </div>
    </div>
  )
}

function StatusBadge({
  status,
}) {
  const labels = {
    present:
      '✅ Присутствовал',

    absent:
      '❌ Отсутствовал',

    late:
      '⏰ Опоздал',

    excused:
      '📄 Уважительная',
  }

  return (
    <span
      style={{
        display:
          'inline-block',

        padding:
          '7px 10px',

        borderRadius:
          10,

        fontWeight:
          700,

        background:
          getStatusBackground(
            status,
          ),
      }}
    >
      {labels[
        status
      ] || 'Не отмечен'}
    </span>
  )
}

function getStatusIcon(
  status,
) {
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
    icons[
      status
    ] || '➖'
  )
}

function getStatusBackground(
  status,
) {
  const backgrounds = {
    present:
      '#dcfce7',

    absent:
      '#fee2e2',

    late:
      '#fef3c7',

    excused:
      '#dbeafe',
  }

  return (
    backgrounds[
      status
    ] ||
    '#f1f5f9'
  )
}

function statusButtonStyle(
  status,
  active,
) {
  return {
    width:
      38,

    height:
      38,

    borderRadius:
      10,

    border:
      active
        ? '2px solid #2563eb'
        : '1px solid #e2e8f0',

    background:
      getStatusBackground(
        status,
      ),

    cursor:
      'pointer',

    opacity:
      active
        ? 1
        : 0.72,

    fontSize:
      16,
  }
}

const headerStyle = {
  padding:
    12,

  textAlign:
    'left',

  background:
    '#f8fafc',

  borderBottom:
    '1px solid #e5e7eb',

  whiteSpace:
    'nowrap',
}

const bodyStyle = {
  padding:
    12,

  borderBottom:
    '1px solid #eef2f7',

  verticalAlign:
    'middle',
}

const saveButtonStyle = {
  border:
    'none',

  borderRadius:
    9,

  padding:
    '8px 10px',

  background:
    '#eff6ff',

  color:
    '#1d4ed8',

  cursor:
    'pointer',

  fontWeight:
    700,
}

const deleteButtonStyle = {
  border:
    'none',

  borderRadius:
    9,

  padding:
    '8px 10px',

  background:
    '#fff1f2',

  color:
    '#be123c',

  cursor:
    'pointer',

  fontWeight:
    700,
}

export default TeacherAttendancePanel