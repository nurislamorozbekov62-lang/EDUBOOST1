import {
  supabase,
} from '../lib/supabase'


/* =========================================================
   HELPERS
========================================================= */

function cleanText(value) {
  return String(value ?? '').trim()
}


function normalizeYear(row) {
  return {
    id: row.id,
    schoolId: row.school_id,
    yearLabel: row.year_label,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    isCurrent: Boolean(row.is_current),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}


function normalizeTerm(row) {
  return {
    id: row.id,
    academicYearId: row.academic_year_id,
    schoolId: row.school_id,
    name: row.name,
    termNumber: Number(row.term_number || 1),
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}


function normalizeHoliday(row) {
  return {
    id: row.id,
    academicYearId: row.academic_year_id,
    schoolId: row.school_id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}


function validateDates(startsOn, endsOn, allowSameDay = false) {
  const start = new Date(startsOn)
  const end = new Date(endsOn)

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    throw new Error('Некорректные даты')
  }

  if (allowSameDay) {
    if (end < start) {
      throw new Error(
        'Дата окончания не может быть раньше начала',
      )
    }
  } else {
    if (end <= start) {
      throw new Error(
        'Дата окончания должна быть позже начала',
      )
    }
  }
}


function validateUser(user) {
  if (!user?.id || !user?.schoolId) {
    throw new Error('Пользователь не найден')
  }
}


/* =========================================================
   ACADEMIC YEARS — READ
========================================================= */

export async function getAcademicYears(user) {
  validateUser(user)

  const { data, error } = await supabase
    .from('academic_years')
    .select(`
      id,
      school_id,
      year_label,
      starts_on,
      ends_on,
      is_current,
      created_at,
      updated_at
    `)
    .eq('school_id', user.schoolId)
    .order('is_current', { ascending: false })
    .order('starts_on', { ascending: false })

  if (error) {
    throw new Error(
      error.message || 'Не удалось загрузить учебные годы',
    )
  }

  return (data || []).map(normalizeYear)
}


/* =========================================================
   ACADEMIC YEARS — WRITE
========================================================= */

export async function createAcademicYear(data, user) {
  validateUser(user)

  const label = cleanText(data.yearLabel)

  if (!label) {
    throw new Error('Укажите название учебного года')
  }

  if (label.length > 20) {
    throw new Error('Название слишком длинное')
  }

  validateDates(data.startsOn, data.endsOn)

  const { data: inserted, error } = await supabase
    .from('academic_years')
    .insert({
      school_id: user.schoolId,
      year_label: label,
      starts_on: data.startsOn,
      ends_on: data.endsOn,
      is_current: Boolean(data.isCurrent),
      created_by: user.id,
    })
    .select(`
      id,
      school_id,
      year_label,
      starts_on,
      ends_on,
      is_current,
      created_at,
      updated_at
    `)
    .single()

  if (error) {
    if (error.message?.toLowerCase().includes('duplicate')) {
      throw new Error(
        'Учебный год с таким названием уже существует',
      )
    }

    throw new Error(
      error.message || 'Не удалось создать учебный год',
    )
  }

  /* Если создан как текущий — снимаем флаг у остальных. */

  if (inserted.is_current) {
    await unsetOtherCurrentYears(inserted.id, user)
  }

  return normalizeYear(inserted)
}


export async function updateAcademicYear(id, data) {
  if (!id) {
    throw new Error('Учебный год не найден')
  }

  const label = cleanText(data.yearLabel)

  if (!label) {
    throw new Error('Укажите название учебного года')
  }

  validateDates(data.startsOn, data.endsOn)

  const { data: updated, error } = await supabase
    .from('academic_years')
    .update({
      year_label: label,
      starts_on: data.startsOn,
      ends_on: data.endsOn,
    })
    .eq('id', id)
    .select(`
      id,
      school_id,
      year_label,
      starts_on,
      ends_on,
      is_current,
      created_at,
      updated_at
    `)
    .single()

  if (error) {
    if (error.message?.toLowerCase().includes('duplicate')) {
      throw new Error(
        'Учебный год с таким названием уже существует',
      )
    }

    throw new Error(
      error.message || 'Не удалось изменить учебный год',
    )
  }

  return normalizeYear(updated)
}


async function unsetOtherCurrentYears(keepId, user) {
  const { error } = await supabase
    .from('academic_years')
    .update({ is_current: false })
    .eq('school_id', user.schoolId)
    .neq('id', keepId)
    .eq('is_current', true)

  if (error) {
    console.error(
      'Не удалось снять флаг "текущий" с прошлых годов:',
      error,
    )
  }
}


export async function setCurrentAcademicYear(id, user) {
  validateUser(user)

  if (!id) {
    throw new Error('Учебный год не найден')
  }

  /* 1. Сначала снимаем со всех текущих. */

  const { error: unsetError } = await supabase
    .from('academic_years')
    .update({ is_current: false })
    .eq('school_id', user.schoolId)
    .eq('is_current', true)

  if (unsetError) {
    throw new Error(
      unsetError.message ||
        'Не удалось сбросить текущий год',
    )
  }

  /* 2. Ставим новый. */

  const { data, error } = await supabase
    .from('academic_years')
    .update({ is_current: true })
    .eq('id', id)
    .eq('school_id', user.schoolId)
    .select(`
      id,
      school_id,
      year_label,
      starts_on,
      ends_on,
      is_current,
      created_at,
      updated_at
    `)
    .single()

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось сделать год текущим',
    )
  }

  return normalizeYear(data)
}


export async function deleteAcademicYear(id) {
  if (!id) {
    throw new Error('Учебный год не найден')
  }

  const { data: target, error: readError } =
    await supabase
      .from('academic_years')
      .select('id, is_current')
      .eq('id', id)
      .maybeSingle()

  if (readError) {
    throw new Error(
      readError.message || 'Не удалось найти год',
    )
  }

  if (!target) {
    throw new Error('Учебный год не найден')
  }

  if (target.is_current) {
    throw new Error(
      'Нельзя удалить текущий учебный год. Сначала назначьте другой.',
    )
  }

  const { error } = await supabase
    .from('academic_years')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(
      error.message || 'Не удалось удалить учебный год',
    )
  }

  return true
}


/* =========================================================
   ACADEMIC TERMS
========================================================= */

export async function getAcademicTerms(yearId) {
  if (!yearId) {
    return []
  }

  const { data, error } = await supabase
    .from('academic_terms')
    .select(`
      id,
      academic_year_id,
      school_id,
      name,
      term_number,
      starts_on,
      ends_on,
      created_at,
      updated_at
    `)
    .eq('academic_year_id', yearId)
    .order('term_number', { ascending: true })

  if (error) {
    throw new Error(
      error.message || 'Не удалось загрузить четверти',
    )
  }

  return (data || []).map(normalizeTerm)
}


export async function createAcademicTerm(data, user) {
  validateUser(user)

  const name = cleanText(data.name)

  if (!name) {
    throw new Error('Укажите название четверти')
  }

  validateDates(data.startsOn, data.endsOn)

  const { data: inserted, error } = await supabase
    .from('academic_terms')
    .insert({
      academic_year_id: data.academicYearId,
      school_id: user.schoolId,
      name,
      term_number: Number(data.termNumber || 1),
      starts_on: data.startsOn,
      ends_on: data.endsOn,
      created_by: user.id,
    })
    .select(`
      id,
      academic_year_id,
      school_id,
      name,
      term_number,
      starts_on,
      ends_on,
      created_at,
      updated_at
    `)
    .single()

  if (error) {
    if (error.message?.toLowerCase().includes('duplicate')) {
      throw new Error(
        'Четверть с таким номером уже существует',
      )
    }

    throw new Error(
      error.message || 'Не удалось создать четверть',
    )
  }

  return normalizeTerm(inserted)
}


export async function updateAcademicTerm(id, data) {
  if (!id) {
    throw new Error('Четверть не найдена')
  }

  const name = cleanText(data.name)

  if (!name) {
    throw new Error('Укажите название четверти')
  }

  validateDates(data.startsOn, data.endsOn)

  const { data: updated, error } = await supabase
    .from('academic_terms')
    .update({
      name,
      term_number: Number(data.termNumber || 1),
      starts_on: data.startsOn,
      ends_on: data.endsOn,
    })
    .eq('id', id)
    .select(`
      id,
      academic_year_id,
      school_id,
      name,
      term_number,
      starts_on,
      ends_on,
      created_at,
      updated_at
    `)
    .single()

  if (error) {
    if (error.message?.toLowerCase().includes('duplicate')) {
      throw new Error(
        'Четверть с таким номером уже существует',
      )
    }

    throw new Error(
      error.message || 'Не удалось изменить четверть',
    )
  }

  return normalizeTerm(updated)
}


export async function deleteAcademicTerm(id) {
  if (!id) {
    throw new Error('Четверть не найдена')
  }

  const { error } = await supabase
    .from('academic_terms')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(
      error.message || 'Не удалось удалить четверть',
    )
  }

  return true
}


/* =========================================================
   ACADEMIC HOLIDAYS
========================================================= */

export async function getAcademicHolidays(yearId) {
  if (!yearId) {
    return []
  }

  const { data, error } = await supabase
    .from('academic_holidays')
    .select(`
      id,
      academic_year_id,
      school_id,
      name,
      starts_on,
      ends_on,
      created_at,
      updated_at
    `)
    .eq('academic_year_id', yearId)
    .order('starts_on', { ascending: true })

  if (error) {
    throw new Error(
      error.message || 'Не удалось загрузить каникулы',
    )
  }

  return (data || []).map(normalizeHoliday)
}


export async function createAcademicHoliday(data, user) {
  validateUser(user)

  const name = cleanText(data.name)

  if (!name) {
    throw new Error('Укажите название')
  }

  validateDates(data.startsOn, data.endsOn, true)

  const { data: inserted, error } = await supabase
    .from('academic_holidays')
    .insert({
      academic_year_id: data.academicYearId,
      school_id: user.schoolId,
      name,
      starts_on: data.startsOn,
      ends_on: data.endsOn,
      created_by: user.id,
    })
    .select(`
      id,
      academic_year_id,
      school_id,
      name,
      starts_on,
      ends_on,
      created_at,
      updated_at
    `)
    .single()

  if (error) {
    throw new Error(
      error.message || 'Не удалось создать каникулы',
    )
  }

  return normalizeHoliday(inserted)
}


export async function updateAcademicHoliday(id, data) {
  if (!id) {
    throw new Error('Запись не найдена')
  }

  const name = cleanText(data.name)

  if (!name) {
    throw new Error('Укажите название')
  }

  validateDates(data.startsOn, data.endsOn, true)

  const { data: updated, error } = await supabase
    .from('academic_holidays')
    .update({
      name,
      starts_on: data.startsOn,
      ends_on: data.endsOn,
    })
    .eq('id', id)
    .select(`
      id,
      academic_year_id,
      school_id,
      name,
      starts_on,
      ends_on,
      created_at,
      updated_at
    `)
    .single()

  if (error) {
    throw new Error(
      error.message || 'Не удалось изменить каникулы',
    )
  }

  return normalizeHoliday(updated)
}


export async function deleteAcademicHoliday(id) {
  if (!id) {
    throw new Error('Запись не найдена')
  }

  const { error } = await supabase
    .from('academic_holidays')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(
      error.message || 'Не удалось удалить каникулы',
    )
  }

  return true
}