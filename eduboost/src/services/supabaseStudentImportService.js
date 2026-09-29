import * as XLSX from 'xlsx'

import { supabase } from '../lib/supabase'


/* =========================================================
   КОНСТАНТЫ
========================================================= */

const DEFAULT_EXPIRES_HOURS = 168 // 7 дней

/* Максимальный размер файла — 5 МБ. */

const MAX_FILE_SIZE = 5 * 1024 * 1024

/* Ожидаемые заголовки колонок (нормализованные). */

const HEADER_ALIASES = {
  'фио': 'fullName',
  'ф.и.о.': 'fullName',
  'ф и о': 'fullName',
  'имя': 'fullName',
  'ученик': 'fullName',
  'full name': 'fullName',
  'fullname': 'fullName',
  'name': 'fullName',

  'класс': 'className',
  'class': 'className',
  'class name': 'className',
  'classname': 'className',
}


/* =========================================================
   ПАРСИНГ
========================================================= */

function cleanText(value) {
  return String(value ?? '').trim()
}


function normalizeHeader(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\./g, '.')
}


/* Возвращает "fullName" | "className" | null */

function resolveHeader(value) {
  const normalized = normalizeHeader(value)

  if (!normalized) {
    return null
  }

  return HEADER_ALIASES[normalized] || null
}


/*
  Читает .xlsx, .xls или .csv → массив строк
  вида { fullName, className }.

  Бросает ошибку, если:
  - файл не выбран;
  - размер > 5 МБ;
  - не найдены обязательные колонки;
  - в файле 0 строк.
*/

export async function parseStudentsFile(file) {
  if (!file) {
    throw new Error('Файл не выбран')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      'Файл слишком большой. Максимум 5 МБ.',
    )
  }

  const buffer = await file.arrayBuffer()

  /* Читаем всё: xlsx умеет и xlsx, и csv. */

  const workbook = XLSX.read(buffer, {
    type: 'array',
    codepage: 65001,
  })

  const firstSheetName =
    workbook.SheetNames?.[0]

  if (!firstSheetName) {
    throw new Error('В файле нет листов')
  }

  const sheet = workbook.Sheets[firstSheetName]

  /*
    header: 1 — читаем как массив строк,
    чтобы самим найти шапку (она может быть
    не в первой строке, если сверху титульник).
  */

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
  })

  if (rows.length === 0) {
    throw new Error('Файл пустой')
  }

  /* Ищем строку-заголовок: первая, где есть ФИО и Класс. */

  let headerRowIndex = -1
  let fullNameColumnIndex = -1
  let classNameColumnIndex = -1

  for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
    const row = rows[i] || []

    let tempFullName = -1
    let tempClassName = -1

    for (let j = 0; j < row.length; j += 1) {
      const resolved = resolveHeader(row[j])

      if (resolved === 'fullName' && tempFullName === -1) {
        tempFullName = j
      }

      if (resolved === 'className' && tempClassName === -1) {
        tempClassName = j
      }
    }

    if (tempFullName !== -1 && tempClassName !== -1) {
      headerRowIndex = i
      fullNameColumnIndex = tempFullName
      classNameColumnIndex = tempClassName
      break
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      'Не найдены колонки "ФИО" и "Класс". Проверьте первую строку файла.',
    )
  }

  const result = []

  for (
    let i = headerRowIndex + 1;
    i < rows.length;
    i += 1
  ) {
    const row = rows[i] || []

    const fullName = cleanText(row[fullNameColumnIndex])
    const className = cleanText(row[classNameColumnIndex])

    /* Пустая строка — пропускаем молча. */

    if (!fullName && !className) {
      continue
    }

    result.push({
      rowNumber: i + 1, // для отображения пользователю
      fullName,
      className,
    })
  }

  if (result.length === 0) {
    throw new Error(
      'В файле нет строк с данными',
    )
  }

  return result
}


/* =========================================================
   ВАЛИДАЦИЯ
========================================================= */

function normalizeClassName(value) {
  return cleanText(value).toLowerCase()
}


/*
  rows: результат parseStudentsFile.
  classes: массив { id, className } из school_classes.

  Возвращает:
  {
    valid:   [{ rowNumber, fullName, className, classId }],
    invalid: [{ rowNumber, fullName, className, reason }]
  }
*/

export function validateRows(rows, classes) {
  const valid = []
  const invalid = []

  /* Классы → Map по нормализованному имени. */

  const classByNormalizedName = new Map()

  for (const item of classes || []) {
    const key = normalizeClassName(item.className)

    if (!key) {
      continue
    }

    /*
      Если есть несколько классов с одинаковым
      нормализованным именем (в разных годах),
      берём первый. Позже можно улучшить.
    */
    if (!classByNormalizedName.has(key)) {
      classByNormalizedName.set(key, item)
    }
  }

  /* Дубли внутри файла. */

  const seenInFile = new Set()

  for (const row of rows) {
    const fullName = cleanText(row.fullName)
    const className = cleanText(row.className)

    if (fullName.length < 2) {
      invalid.push({
        ...row,
        reason: 'Не указано ФИО (минимум 2 символа)',
      })

      continue
    }

    if (!className) {
      invalid.push({
        ...row,
        reason: 'Не указан класс',
      })

      continue
    }

    const classKey = normalizeClassName(className)

    const matchedClass =
      classByNormalizedName.get(classKey)

    if (!matchedClass) {
      invalid.push({
        ...row,
        reason: `Класс «${className}» не найден в школе`,
      })

      continue
    }

    const duplicateKey =
      `${fullName.toLowerCase()}|${classKey}`

    if (seenInFile.has(duplicateKey)) {
      invalid.push({
        ...row,
        reason: 'Дубликат: такое же ФИО и класс уже есть выше в файле',
      })

      continue
    }

    seenInFile.add(duplicateKey)

    valid.push({
      rowNumber: row.rowNumber,
      fullName,
      className: matchedClass.className,
      classId: matchedClass.id,
    })
  }

  return { valid, invalid }
}


/* =========================================================
   ИМПОРТ
========================================================= */

/*
  validRows: массив { fullName, className, classId }.
  onProgress: (processed, total, currentRow, result) => void.

  Возвращает:
  {
    created:  [{ fullName, className, activationCode, expiresAt }],
    existed:  [{ fullName, className }],
    failed:   [{ fullName, className, reason }]
  }
*/

export async function importStudents(
  validRows,
  onProgress,
) {
  if (!Array.isArray(validRows) || validRows.length === 0) {
    throw new Error('Нет строк для импорта')
  }

  const created = []
  const existed = []
  const failed = []

  const total = validRows.length

  for (let i = 0; i < total; i += 1) {
    const row = validRows[i]

    let result = null
    let error = null

    try {
      const { data, error: rpcError } =
        await supabase.rpc(
          'create_school_student_safe',
          {
            p_full_name: row.fullName,
            p_class_id: row.classId,
            p_expires_hours: DEFAULT_EXPIRES_HOURS,
          },
        )

      if (rpcError) {
        throw new Error(
          rpcError.message || 'Ошибка RPC',
        )
      }

      /* RPC возвращает массив (RETURNS TABLE). */

      const first = Array.isArray(data) ? data[0] : data

      if (!first) {
        throw new Error('RPC не вернула результат')
      }

      result = first
    } catch (importError) {
      error = importError
    }

    if (error) {
      failed.push({
        fullName: row.fullName,
        className: row.className,
        reason: error.message || 'Неизвестная ошибка',
      })
    } else if (result.already_exists) {
      existed.push({
        fullName: result.full_name,
        className: result.class_name,
      })
    } else {
      created.push({
        fullName: result.full_name,
        className: result.class_name,
        activationCode: result.activation_code,
        expiresAt: result.expires_at,
      })
    }

    if (onProgress) {
      onProgress(i + 1, total, row)
    }
  }

  return { created, existed, failed }
}


/* =========================================================
   ЭКСПОРТ РЕЗУЛЬТАТА В CSV
========================================================= */

/*
  Формат: одна строка на ученика.
  Колонки: ФИО, Класс, Код активации, Действителен до.
*/

export function exportResultsToCsv(results) {
  const lines = []

  lines.push(
    ['ФИО', 'Класс', 'Код активации', 'Действителен до']
      .map(escapeCsv)
      .join(','),
  )

  for (const item of results.created || []) {
    lines.push(
      [
        item.fullName,
        item.className,
        item.activationCode,
        formatDateTime(item.expiresAt),
      ]
        .map(escapeCsv)
        .join(','),
    )
  }

  /* BOM в начале — чтобы Excel открыл UTF-8 правильно. */

  return '\uFEFF' + lines.join('\r\n')
}


function escapeCsv(value) {
  const text = String(value ?? '')

  if (
    text.includes(',') ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r')
  ) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}


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
   СКАЧИВАНИЕ ФАЙЛА
========================================================= */

export function downloadCsv(content, filename) {
  const blob = new Blob([content], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')

  link.href = url
  link.download = filename

  document.body.appendChild(link)

  link.click()

  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}