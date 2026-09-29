import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  Trash2,
  Upload,
  Users,
  X,
  XCircle,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  ROLES,
} from '../config/access'

import {
  getSchoolClasses,
} from '../services/supabaseSchoolAdminService'

import {
  downloadCsv,
  exportResultsToCsv,
  importStudents,
  parseStudentsFile,
  validateRows,
} from '../services/supabaseStudentImportService'


/* =========================================================
   КОНСТАНТЫ
========================================================= */

const STEP_UPLOAD = 'upload'
const STEP_PREVIEW = 'preview'
const STEP_IMPORTING = 'importing'
const STEP_RESULT = 'result'


/* =========================================================
   СТРАНИЦА
========================================================= */

function AdminImportPage() {
  const { user } = useAuth()

  const fileInputRef = useRef(null)

  const [step, setStep] = useState(STEP_UPLOAD)

  const [classes, setClasses] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [classesError, setClassesError] = useState('')

  const [file, setFile] = useState(null)

  const [validRows, setValidRows] = useState([])
  const [invalidRows, setInvalidRows] = useState([])

  const [parseError, setParseError] = useState('')

  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
  })

  const [result, setResult] = useState(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')


  const canImport = useMemo(() => {
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
     LOAD CLASSES
  ======================================================= */

  useEffect(() => {
    if (!user?.schoolId) {
      return
    }

    void loadClasses()
  }, [user?.schoolId])


  async function loadClasses() {
    try {
      setLoadingClasses(true)
      setClassesError('')

      const rows = await getSchoolClasses(user.schoolId)

      setClasses(
        Array.isArray(rows)
          ? rows
          : [],
      )
    } catch (loadError) {
      console.error('Import classes load:', loadError)

      setClassesError(
        loadError?.message ||
          'Не удалось загрузить классы школы',
      )
    } finally {
      setLoadingClasses(false)
    }
  }


  /* =======================================================
     AUTO HIDE MESSAGES
  ======================================================= */

  useEffect(() => {
    if (!error) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setError('')
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [error])


  useEffect(() => {
    if (!success) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setSuccess('')
    }, 4000)

    return () => window.clearTimeout(timer)
  }, [success])


  /* =======================================================
     FILE PICK
  ======================================================= */

  function openFilePicker() {
    fileInputRef.current?.click()
  }


  async function handleFileChange(event) {
    const selected = event.target.files?.[0]

    event.target.value = ''

    if (!selected) {
      return
    }

    await processFile(selected)
  }


  async function processFile(selected) {
    try {
      setParseError('')
      setError('')
      setResult(null)

      setFile(selected)

      const parsedRows = await parseStudentsFile(selected)

      const {
        valid,
        invalid,
      } = validateRows(parsedRows, classes)

      setValidRows(valid)
      setInvalidRows(invalid)

      setStep(STEP_PREVIEW)
    } catch (parseErr) {
      console.error('Parse import file:', parseErr)

      setParseError(
        parseErr?.message ||
          'Не удалось прочитать файл',
      )

      setFile(null)
      setValidRows([])
      setInvalidRows([])
      setStep(STEP_UPLOAD)
    }
  }


  /* =======================================================
     DRAG & DROP
  ======================================================= */

  const [dragActive, setDragActive] = useState(false)


  function handleDragOver(event) {
    event.preventDefault()
    event.stopPropagation()

    setDragActive(true)
  }


  function handleDragLeave(event) {
    event.preventDefault()
    event.stopPropagation()

    setDragActive(false)
  }


  async function handleDrop(event) {
    event.preventDefault()
    event.stopPropagation()

    setDragActive(false)

    const dropped = event.dataTransfer?.files?.[0]

    if (!dropped) {
      return
    }

    await processFile(dropped)
  }


  /* =======================================================
     RESET
  ======================================================= */

  function resetAll() {
    if (step === STEP_IMPORTING) {
      return
    }

    setStep(STEP_UPLOAD)
    setFile(null)
    setValidRows([])
    setInvalidRows([])
    setParseError('')
    setError('')
    setSuccess('')
    setResult(null)
    setProgress({ current: 0, total: 0 })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }


  /* =======================================================
     IMPORT
  ======================================================= */

  async function handleStartImport() {
    if (validRows.length === 0) {
      setError('Нет строк для импорта')
      return
    }

    const confirmed = window.confirm(
      `Импортировать ${validRows.length} учеников? Это создаст записи в школе.`,
    )

    if (!confirmed) {
      return
    }

    try {
      setError('')
      setStep(STEP_IMPORTING)

      setProgress({
        current: 0,
        total: validRows.length,
      })

      const importResult = await importStudents(
        validRows,
        (current, total) => {
          setProgress({ current, total })
        },
      )

      setResult(importResult)
      setStep(STEP_RESULT)

      setSuccess(
        `Импорт завершён: создано ${importResult.created.length}, уже было ${importResult.existed.length}, ошибок ${importResult.failed.length}`,
      )
    } catch (importError) {
      console.error('Import students:', importError)

      setError(
        importError?.message ||
          'Импорт прервался',
      )

      setStep(STEP_PREVIEW)
    }
  }


  /* =======================================================
     DOWNLOAD RESULT
  ======================================================= */

  function handleDownloadCsv() {
    if (!result) {
      return
    }

    const csv = exportResultsToCsv(result)

    const stamp = new Date()
      .toISOString()
      .slice(0, 10)

    downloadCsv(
      csv,
      `students-import-${stamp}.csv`,
    )
  }


  /* =======================================================
     ACCESS
  ======================================================= */

  if (!user) {
    return null
  }


  if (!canImport) {
    return (
      <div className="page-container">
        <section className="content-card">
          <div
            style={{
              padding: 30,
              textAlign: 'center',
            }}
          >
            <XCircle
              size={34}
              style={{ color: '#dc2626' }}
            />

            <h2 style={{ marginTop: 12 }}>
              Доступ запрещён
            </h2>

            <p style={{ color: '#64748b' }}>
              Импорт учеников доступен
              администрации школы.
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
            justifyContent: 'space-between',
            alignItems: 'flex-start',
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
              ДАННЫЕ ШКОЛЫ
            </p>

            <h1
              style={{
                margin: '6px 0 0',
                color: '#102343',
                fontSize: 26,
              }}
            >
              Импорт учеников
            </h1>

            <p
              style={{
                margin: '8px 0 0',
                color: '#64748b',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              Загрузите Excel или CSV файл
              со списком учеников. Система
              создаст их и выдаст коды активации.
            </p>
          </div>

          {step !== STEP_UPLOAD &&
            step !== STEP_IMPORTING && (
            <button
              type="button"
              onClick={resetAll}
              style={secondaryButtonStyle}
            >
              <RefreshCcw size={17} />
              Начать заново
            </button>
          )}
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

      {classesError && (
        <section
          className="content-card"
          style={{
            marginBottom: 14,
            color: '#9a3412',
            background: '#fff7ed',
            border: '1px solid #fed7aa',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <AlertTriangle size={18} />
            {classesError}
          </div>
        </section>
      )}


      {/* =============================================
          STEP: UPLOAD
      ============================================= */}

      {step === STEP_UPLOAD && (
        <UploadStep
          fileInputRef={fileInputRef}
          onOpen={openFilePicker}
          onChange={handleFileChange}
          dragActive={dragActive}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          parseError={parseError}
          loadingClasses={loadingClasses}
          classesCount={classes.length}
        />
      )}


      {/* =============================================
          STEP: PREVIEW
      ============================================= */}

      {step === STEP_PREVIEW && (
        <PreviewStep
          file={file}
          validRows={validRows}
          invalidRows={invalidRows}
          onStart={handleStartImport}
          onReset={resetAll}
        />
      )}


      {/* =============================================
          STEP: IMPORTING
      ============================================= */}

      {step === STEP_IMPORTING && (
        <ImportingStep progress={progress} />
      )}


      {/* =============================================
          STEP: RESULT
      ============================================= */}

      {step === STEP_RESULT && result && (
        <ResultStep
          result={result}
          onDownload={handleDownloadCsv}
          onReset={resetAll}
        />
      )}

    </div>
  )
}


/* =========================================================
   STEP: UPLOAD
========================================================= */

function UploadStep({
  fileInputRef,
  onOpen,
  onChange,
  dragActive,
  onDragOver,
  onDragLeave,
  onDrop,
  parseError,
  loadingClasses,
  classesCount,
}) {
  return (
    <section className="content-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <FileSpreadsheet size={22} />

        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            Загрузите файл
          </h2>

          <p
            style={{
              margin: '4px 0 0',
              color: '#64748b',
              fontSize: 13,
            }}
          >
            Поддерживаются .xlsx, .xls и .csv
            до 5 МБ.
          </p>
        </div>
      </div>


      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onOpen}
        style={{
          ...dropzoneStyle,

          borderColor: dragActive
            ? '#2563eb'
            : '#cbd5e1',

          background: dragActive
            ? '#eff6ff'
            : '#f8fafc',
        }}
      >
        <Upload
          size={40}
          style={{
            color: dragActive
              ? '#2563eb'
              : '#94a3b8',
          }}
        />

        <h3
          style={{
            margin: '12px 0 4px',
            fontSize: 16,
          }}
        >
          {dragActive
            ? 'Отпустите файл'
            : 'Перетащите файл сюда'}
        </h3>

        <p
          style={{
            margin: 0,
            color: '#64748b',
            fontSize: 13,
          }}
        >
          или нажмите, чтобы выбрать
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onChange}
          style={{ display: 'none' }}
        />
      </div>


      {parseError && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            background: '#fff1f1',
            border: '1px solid #ffd2d2',
            color: '#b42318',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <XCircle size={18} />
          {parseError}
        </div>
      )}


      <FormatInstructions
        loadingClasses={loadingClasses}
        classesCount={classesCount}
      />
    </section>
  )
}


function FormatInstructions({
  loadingClasses,
  classesCount,
}) {
  return (
    <div
      style={{
        marginTop: 20,
        paddingTop: 18,
        borderTop: '1px solid #e5e7eb',
      }}
    >
      <h3
        style={{
          margin: '0 0 10px',
          fontSize: 14,
        }}
      >
        Формат файла
      </h3>

      <p
        style={{
          margin: '0 0 10px',
          color: '#64748b',
          fontSize: 12,
          lineHeight: 1.55,
        }}
      >
        В файле должна быть строка-заголовок
        с колонками <strong>ФИО</strong> и{' '}
        <strong>Класс</strong>. Названия колонок
        распознаются автоматически, порядок
        не важен.
      </p>

      <div
        style={{
          overflowX: 'auto',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 320,
            borderCollapse: 'collapse',
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={thStyle}>ФИО</th>
              <th style={thStyle}>Класс</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td style={tdStyle}>
                Асанова Айгуль
              </td>
              <td style={tdStyle}>6А</td>
            </tr>
            <tr>
              <td style={tdStyle}>
                Беков Данияр
              </td>
              <td style={tdStyle}>6А</td>
            </tr>
            <tr>
              <td style={tdStyle}>
                Орозбекова Алина
              </td>
              <td style={tdStyle}>9Б</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p
        style={{
          margin: '10px 0 0',
          color: '#64748b',
          fontSize: 12,
        }}
      >
        {loadingClasses
          ? 'Загружаем классы школы...'
          : classesCount === 0
            ? 'Внимание: в школе пока нет активных классов. Сначала добавьте классы.'
            : `Активных классов в школе: ${classesCount}. Название класса в файле должно совпадать с названием в системе (регистр и пробелы не важны).`}
      </p>
    </div>
  )
}


/* =========================================================
   STEP: PREVIEW
========================================================= */

function PreviewStep({
  file,
  validRows,
  invalidRows,
  onStart,
  onReset,
}) {
  const totalRows = validRows.length + invalidRows.length

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* SUMMARY */}

      <section className="content-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minWidth: 0,
            }}
          >
            <FileSpreadsheet size={22} />

            <div style={{ minWidth: 0 }}>
              <strong
                style={{
                  display: 'block',
                  color: '#102343',
                  fontSize: 14,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 320,
                }}
              >
                {file?.name || 'Файл'}
              </strong>

              <span
                style={{
                  color: '#64748b',
                  fontSize: 12,
                }}
              >
                Всего строк: {totalRows}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={onReset}
              style={secondaryButtonStyle}
            >
              <Trash2 size={16} />
              Отменить
            </button>

            <button
              type="button"
              onClick={onStart}
              disabled={validRows.length === 0}
              style={{
                ...primaryButtonStyle,
                opacity:
                  validRows.length === 0 ? 0.5 : 1,
                cursor:
                  validRows.length === 0
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              <Check size={16} />
              Импортировать {validRows.length}
            </button>
          </div>
        </div>


        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10,
            marginTop: 14,
          }}
        >
          <StatBox
            icon={CheckCircle2}
            value={validRows.length}
            label="Готовы к импорту"
            tone="success"
          />

          <StatBox
            icon={XCircle}
            value={invalidRows.length}
            label="С ошибками"
            tone={
              invalidRows.length > 0
                ? 'danger'
                : 'neutral'
            }
          />

          <StatBox
            icon={Users}
            value={totalRows}
            label="Всего строк"
            tone="neutral"
          />
        </div>
      </section>


      {/* VALID ROWS */}

      {validRows.length > 0 && (
        <section className="content-card">
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2
              size={18}
              style={{ color: '#16a34a' }}
            />
            Будут импортированы
            ({validRows.length})
          </h2>

          <div
            style={{
              maxHeight: 320,
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  background: '#f8fafc',
                  zIndex: 1,
                }}
              >
                <tr>
                  <th style={{ ...thStyle, width: 60 }}>
                    Стр.
                  </th>
                  <th style={thStyle}>ФИО</th>
                  <th style={thStyle}>Класс</th>
                </tr>
              </thead>

              <tbody>
                {validRows.map((row) => (
                  <tr
                    key={`valid-${row.rowNumber}`}
                    style={{
                      borderTop:
                        '1px solid #f1f5f9',
                    }}
                  >
                    <td style={tdStyle}>
                      {row.rowNumber}
                    </td>
                    <td style={tdStyle}>
                      {row.fullName}
                    </td>
                    <td style={tdStyle}>
                      {row.className}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}


      {/* INVALID ROWS */}

      {invalidRows.length > 0 && (
        <section className="content-card">
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <XCircle
              size={18}
              style={{ color: '#dc2626' }}
            />
            Пропущены из-за ошибок
            ({invalidRows.length})
          </h2>

          <div
            style={{
              maxHeight: 320,
              overflowY: 'auto',
              border: '1px solid #fecaca',
              borderRadius: 10,
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  background: '#fff1f1',
                  zIndex: 1,
                }}
              >
                <tr>
                  <th style={{ ...thStyle, width: 60 }}>
                    Стр.
                  </th>
                  <th style={thStyle}>ФИО</th>
                  <th style={thStyle}>Класс</th>
                  <th style={thStyle}>Причина</th>
                </tr>
              </thead>

              <tbody>
                {invalidRows.map((row) => (
                  <tr
                    key={`invalid-${row.rowNumber}`}
                    style={{
                      borderTop:
                        '1px solid #fee2e2',
                    }}
                  >
                    <td style={tdStyle}>
                      {row.rowNumber}
                    </td>
                    <td style={tdStyle}>
                      {row.fullName || '—'}
                    </td>
                    <td style={tdStyle}>
                      {row.className || '—'}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: '#b42318',
                      }}
                    >
                      {row.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}


/* =========================================================
   STEP: IMPORTING
========================================================= */

function ImportingStep({ progress }) {
  const percent =
    progress.total > 0
      ? Math.round(
          (progress.current / progress.total) *
            100,
        )
      : 0

  return (
    <section className="content-card">
      <div
        style={{
          padding: '30px 20px',
          textAlign: 'center',
        }}
      >
        <Loader2
          size={42}
          style={{
            color: '#2563eb',
            animation: 'spin 1s linear infinite',
          }}
        />

        <h2
          style={{
            margin: '14px 0 6px',
            fontSize: 18,
          }}
        >
          Импортируем учеников
        </h2>

        <p
          style={{
            margin: 0,
            color: '#64748b',
            fontSize: 14,
          }}
        >
          Обработано {progress.current} из{' '}
          {progress.total}
        </p>

        <div
          style={{
            marginTop: 18,
            height: 8,
            background: '#e5e7eb',
            borderRadius: 999,
            overflow: 'hidden',
            maxWidth: 460,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              background: '#2563eb',
              borderRadius: 999,
              transition: 'width 0.2s linear',
            }}
          />
        </div>

        <p
          style={{
            margin: '12px 0 0',
            color: '#64748b',
            fontSize: 12,
          }}
        >
          Не закрывайте страницу.
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  )
}


/* =========================================================
   STEP: RESULT
========================================================= */

function ResultStep({
  result,
  onDownload,
  onReset,
}) {
  const total =
    result.created.length +
    result.existed.length +
    result.failed.length

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <section className="content-card">
        <h2
          style={{
            margin: '0 0 14px',
            fontSize: 18,
          }}
        >
          Импорт завершён
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 10,
          }}
        >
          <StatBox
            icon={CheckCircle2}
            value={result.created.length}
            label="Создано"
            tone="success"
          />

          <StatBox
            icon={AlertTriangle}
            value={result.existed.length}
            label="Уже были в системе"
            tone="warning"
          />

          <StatBox
            icon={XCircle}
            value={result.failed.length}
            label="Ошибок"
            tone={
              result.failed.length > 0
                ? 'danger'
                : 'neutral'
            }
          />

          <StatBox
            icon={Users}
            value={total}
            label="Всего обработано"
            tone="neutral"
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 18,
            flexWrap: 'wrap',
          }}
        >
          {result.created.length > 0 && (
            <button
              type="button"
              onClick={onDownload}
              style={primaryButtonStyle}
            >
              <Download size={17} />
              Скачать коды (CSV)
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            style={secondaryButtonStyle}
          >
            <RefreshCcw size={17} />
            Импортировать ещё
          </button>
        </div>
      </section>


      {/* CREATED */}

      {result.created.length > 0 && (
        <ResultTable
          title="Созданные ученики"
          tone="success"
          rows={result.created.map((row) => ({
            ...row,
            code: row.activationCode,
            expires: row.expiresAt,
          }))}
          columns={[
            'ФИО',
            'Класс',
            'Код активации',
            'Действителен до',
          ]}
        />
      )}


      {/* EXISTED */}

      {result.existed.length > 0 && (
        <ResultTable
          title="Уже существовали"
          tone="warning"
          rows={result.existed}
          columns={['ФИО', 'Класс']}
        />
      )}


      {/* FAILED */}

      {result.failed.length > 0 && (
        <ResultTable
          title="Не удалось создать"
          tone="danger"
          rows={result.failed.map((row) => ({
            ...row,
            reason: row.reason,
          }))}
          columns={['ФИО', 'Класс', 'Причина']}
        />
      )}
    </div>
  )
}


function ResultTable({
  title,
  tone,
  rows,
  columns,
}) {
  const borderColor =
    tone === 'success'
      ? '#bbf7d0'
      : tone === 'warning'
        ? '#fed7aa'
        : '#fecaca'

  const headBg =
    tone === 'success'
      ? '#ecfdf5'
      : tone === 'warning'
        ? '#fff7ed'
        : '#fff1f1'

  return (
    <section className="content-card">
      <h3
        style={{
          margin: '0 0 12px',
          fontSize: 15,
        }}
      >
        {title} ({rows.length})
      </h3>

      <div
        style={{
          maxHeight: 340,
          overflowY: 'auto',
          border: `1px solid ${borderColor}`,
          borderRadius: 10,
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              background: headBg,
              zIndex: 1,
            }}
          >
            <tr>
              {columns.map((col) => (
                <th key={col} style={thStyle}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${title}-${index}`}
                style={{
                  borderTop: `1px solid ${borderColor}`,
                }}
              >
                <td style={tdStyle}>
                  {row.fullName}
                </td>
                <td style={tdStyle}>
                  {row.className}
                </td>

                {row.code !== undefined && (
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily:
                        'ui-monospace, Menlo, Consolas, monospace',
                      fontWeight: 700,
                      color: '#1d4ed8',
                    }}
                  >
                    {row.code}
                  </td>
                )}

                {row.expires !== undefined && (
                  <td style={tdStyle}>
                    {formatDateTime(row.expires)}
                  </td>
                )}

                {row.reason !== undefined && (
                  <td
                    style={{
                      ...tdStyle,
                      color: '#b42318',
                    }}
                  >
                    {row.reason}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}


/* =========================================================
   SUB-COMPONENTS
========================================================= */

function StatBox({ icon: Icon, value, label, tone }) {
  const palette = {
    success: {
      bg: '#ecfdf5',
      fg: '#047857',
      border: '#bbf7d0',
    },
    warning: {
      bg: '#fff7ed',
      fg: '#c2410c',
      border: '#fed7aa',
    },
    danger: {
      bg: '#fff1f1',
      fg: '#b42318',
      border: '#fecaca',
    },
    neutral: {
      bg: '#f8fafc',
      fg: '#475569',
      border: '#e2e8f0',
    },
  }

  const colors = palette[tone] || palette.neutral

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
      }}
    >
      <Icon
        size={20}
        style={{ color: colors.fg }}
      />

      <div>
        <strong
          style={{
            display: 'block',
            fontSize: 18,
            color: '#102343',
          }}
        >
          {value}
        </strong>

        <span
          style={{
            display: 'block',
            color: '#64748b',
            fontSize: 11,
          }}
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

function formatDateTime(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}


/* =========================================================
   STYLES
========================================================= */

const primaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  minHeight: 42,
  padding: '0 16px',
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
  padding: '0 16px',
  border: '1px solid #bfdbfe',
  borderRadius: 11,
  background: '#eff6ff',
  color: '#1d4ed8',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
}


const dropzoneStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 200,
  padding: 24,
  border: '2px dashed #cbd5e1',
  borderRadius: 16,
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'border-color 0.15s ease, background 0.15s ease',
}


const thStyle = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 700,
  color: '#475569',
  background: 'inherit',
}


const tdStyle = {
  padding: '10px 12px',
  color: '#102343',
  fontSize: 13,
}


export default AdminImportPage