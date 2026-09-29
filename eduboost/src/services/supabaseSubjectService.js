import {
  supabase,
} from '../lib/supabase'


export const DEFAULT_ACADEMIC_YEAR =
  '2026/2027'


/* ========================================
   GET SUBJECTS FOR CLASS

   Главная функция.

   Пример:
   getSupabaseSubjectsForClass(
     '6 класс'
   )

   Вернёт только предметы,
   разрешённые для 6 класса
   текущей школы.
======================================== */

export async function getSupabaseSubjectsForClass(
  className,
  academicYear =
    DEFAULT_ACADEMIC_YEAR,
) {
  const normalizedClassName =
    normalizeText(
      className,
    )


  const normalizedAcademicYear =
    normalizeText(
      academicYear,
    ) ||
    DEFAULT_ACADEMIC_YEAR


  if (
    !normalizedClassName
  ) {
    return []
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_school_class_subjects',
      {
        target_class_name:
          normalizedClassName,

        target_academic_year:
          normalizedAcademicYear,
      },
    )


  if (
    error
  ) {
    console.error(
      'Ошибка загрузки предметов класса:',
      error,
    )


    throw new Error(
      error.message ||
        'Не удалось загрузить предметы класса.',
    )
  }


  return (
    Array.isArray(data)
      ? data
      : []
  ).map(
    normalizeClassSubject,
  )
}


/* ========================================
   GET SUBJECT NAMES

   Удобно для select:

   [
     'Математика',
     'Русский язык',
     ...
   ]
======================================== */

export async function getSupabaseSubjectNamesForClass(
  className,
  academicYear =
    DEFAULT_ACADEMIC_YEAR,
) {
  const subjects =
    await getSupabaseSubjectsForClass(
      className,
      academicYear,
    )


  return subjects.map(
    (subject) =>
      subject.name,
  )
}


/* ========================================
   GET FULL SUBJECT CATALOG

   Нужен позже завучу /
   администратору школы,
   когда будем добавлять
   дополнительные предметы.
======================================== */

export async function getSupabaseSubjectCatalog() {
  const {
    data,
    error,
  } =
    await supabase
      .from('subjects')
      .select(`
        id,
        name,
        category,
        is_active,
        created_at
      `)
      .eq(
        'is_active',
        true,
      )
      .order(
        'name',
        {
          ascending:
            true,
        },
      )


  if (
    error
  ) {
    console.error(
      'Ошибка загрузки каталога предметов:',
      error,
    )


    throw new Error(
      error.message ||
        'Не удалось загрузить каталог предметов.',
    )
  }


  return (
    Array.isArray(data)
      ? data
      : []
  ).map(
    normalizeCatalogSubject,
  )
}


/* ========================================
   GET SCHOOL CLASS SUBJECT ROWS

   Для будущего кабинета завуча.
======================================== */

export async function getSupabaseSchoolClassSubjectRows({
  schoolId,
  className,
  academicYear =
    DEFAULT_ACADEMIC_YEAR,
}) {
  const safeSchoolId =
    normalizeText(
      schoolId,
    )


  const safeClassName =
    normalizeText(
      className,
    )


  const safeAcademicYear =
    normalizeText(
      academicYear,
    ) ||
    DEFAULT_ACADEMIC_YEAR


  if (
    !safeSchoolId ||
    !safeClassName
  ) {
    return []
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'school_class_subjects',
      )
      .select(`
        id,
        school_id,
        academic_year,
        class_name,
        subject_id,
        source,
        is_active,
        sort_order,
        created_at,
        updated_at,
        subjects (
          id,
          name,
          category,
          is_active
        )
      `)
      .eq(
        'school_id',
        safeSchoolId,
      )
      .eq(
        'class_name',
        safeClassName,
      )
      .eq(
        'academic_year',
        safeAcademicYear,
      )
      .eq(
        'is_active',
        true,
      )
      .order(
        'sort_order',
        {
          ascending:
            true,
        },
      )


  if (
    error
  ) {
    console.error(
      'Ошибка загрузки предметов школы:',
      error,
    )


    throw new Error(
      error.message ||
        'Не удалось загрузить предметы школы.',
    )
  }


  return (
    Array.isArray(data)
      ? data
      : []
  ).map(
    normalizeSchoolClassSubjectRow,
  )
}


/* ========================================
   ADD SUBJECT TO CLASS

   Для завуча /
   администратора школы.

   Например:
   Робототехника
   для 8 класса.
======================================== */

export async function addSupabaseSubjectToClass({
  schoolId,
  className,
  subjectId,
  academicYear =
    DEFAULT_ACADEMIC_YEAR,
  source = 'school',
  sortOrder = 100,
}) {
  const safeSchoolId =
    normalizeText(
      schoolId,
    )


  const safeClassName =
    normalizeText(
      className,
    )


  const safeSubjectId =
    normalizeText(
      subjectId,
    )


  const safeAcademicYear =
    normalizeText(
      academicYear,
    ) ||
    DEFAULT_ACADEMIC_YEAR


  if (
    !safeSchoolId
  ) {
    throw new Error(
      'Не удалось определить школу.',
    )
  }


  if (
    !safeClassName
  ) {
    throw new Error(
      'Выберите класс.',
    )
  }


  if (
    !safeSubjectId
  ) {
    throw new Error(
      'Выберите предмет.',
    )
  }


  const allowedSources = [
    'official',
    'school',
    'legacy',
  ]


  const safeSource =
    allowedSources.includes(
      source,
    )
      ? source
      : 'school'


  const safeSortOrder =
    Number.isFinite(
      Number(
        sortOrder,
      ),
    )
      ? Number(
          sortOrder,
        )
      : 100


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'school_class_subjects',
      )
      .upsert(
        {
          school_id:
            safeSchoolId,

          academic_year:
            safeAcademicYear,

          class_name:
            safeClassName,

          subject_id:
            safeSubjectId,

          source:
            safeSource,

          is_active:
            true,

          sort_order:
            safeSortOrder,

          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            'school_id,academic_year,class_name,subject_id',
        },
      )
      .select(`
        id,
        school_id,
        academic_year,
        class_name,
        subject_id,
        source,
        is_active,
        sort_order,
        created_at,
        updated_at,
        subjects (
          id,
          name,
          category,
          is_active
        )
      `)
      .single()


  if (
    error
  ) {
    console.error(
      'Ошибка добавления предмета:',
      error,
    )


    throw new Error(
      error.message ||
        'Не удалось добавить предмет классу.',
    )
  }


  return normalizeSchoolClassSubjectRow(
    data,
  )
}


/* ========================================
   REMOVE SUBJECT FROM CLASS

   Не удаляем предмет
   из общего справочника.

   Убираем только связь
   предмет ↔ класс.
======================================== */

export async function removeSupabaseSubjectFromClass(
  classSubjectId,
) {
  const safeId =
    normalizeText(
      classSubjectId,
    )


  if (!safeId) {
    throw new Error(
      'Предмет класса не найден.',
    )
  }


  const {
    error,
  } =
    await supabase
      .from(
        'school_class_subjects',
      )
      .delete()
      .eq(
        'id',
        safeId,
      )


  if (
    error
  ) {
    console.error(
      'Ошибка удаления предмета из класса:',
      error,
    )


    throw new Error(
      error.message ||
        'Не удалось убрать предмет из класса.',
    )
  }


  return true
}


/* ========================================
   DISABLE SUBJECT

   Альтернатива удалению.

   Полезно, если хотим сохранить
   историю учебного года.
======================================== */

export async function disableSupabaseClassSubject(
  classSubjectId,
) {
  const safeId =
    normalizeText(
      classSubjectId,
    )


  if (!safeId) {
    throw new Error(
      'Предмет класса не найден.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'school_class_subjects',
      )
      .update({
        is_active:
          false,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        safeId,
      )
      .select(`
        id,
        school_id,
        academic_year,
        class_name,
        subject_id,
        source,
        is_active,
        sort_order,
        created_at,
        updated_at,
        subjects (
          id,
          name,
          category,
          is_active
        )
      `)
      .single()


  if (
    error
  ) {
    console.error(
      'Ошибка отключения предмета:',
      error,
    )


    throw new Error(
      error.message ||
        'Не удалось отключить предмет.',
    )
  }


  return normalizeSchoolClassSubjectRow(
    data,
  )
}


/* ========================================
   CHANGE SORT ORDER

   Позже позволит показывать:

   1. Математика
   2. Кыргызский язык
   3. Русский язык
   4. История

   вместо алфавита.
======================================== */

export async function updateSupabaseClassSubjectOrder(
  classSubjectId,
  sortOrder,
) {
  const safeId =
    normalizeText(
      classSubjectId,
    )


  const safeSortOrder =
    Number(
      sortOrder,
    )


  if (!safeId) {
    throw new Error(
      'Предмет класса не найден.',
    )
  }


  if (
    !Number.isInteger(
      safeSortOrder,
    )
  ) {
    throw new Error(
      'Некорректный порядок предмета.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'school_class_subjects',
      )
      .update({
        sort_order:
          safeSortOrder,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        safeId,
      )
      .select(`
        id,
        school_id,
        academic_year,
        class_name,
        subject_id,
        source,
        is_active,
        sort_order,
        created_at,
        updated_at,
        subjects (
          id,
          name,
          category,
          is_active
        )
      `)
      .single()


  if (
    error
  ) {
    console.error(
      'Ошибка изменения порядка предмета:',
      error,
    )


    throw new Error(
      error.message ||
        'Не удалось изменить порядок предмета.',
    )
  }


  return normalizeSchoolClassSubjectRow(
    data,
  )
}


/* ========================================
   HELPERS
======================================== */

function normalizeClassSubject(
  row,
) {
  return {
    id:
      row.id,

    name:
      normalizeText(
        row.name,
      ),

    category:
      normalizeText(
        row.category,
      ) ||
      'other',

    source:
      normalizeText(
        row.source,
      ) ||
      'official',

    sortOrder:
      Number(
        row.sort_order ??
          100,
      ),
  }
}


function normalizeCatalogSubject(
  row,
) {
  return {
    id:
      row.id,

    name:
      normalizeText(
        row.name,
      ),

    category:
      normalizeText(
        row.category,
      ) ||
      'other',

    isActive:
      row.is_active !==
      false,

    createdAt:
      row.created_at ||
      null,
  }
}


function normalizeSchoolClassSubjectRow(
  row,
) {
  const subject =
    Array.isArray(
      row?.subjects,
    )
      ? row.subjects[0] ||
        null
      : row?.subjects ||
        null


  return {
    id:
      row.id,

    schoolId:
      row.school_id,

    academicYear:
      row.academic_year,

    className:
      row.class_name,

    subjectId:
      row.subject_id,

    source:
      row.source ||
      'official',

    isActive:
      row.is_active !==
      false,

    sortOrder:
      Number(
        row.sort_order ??
          100,
      ),

    subject: subject
      ? {
          id:
            subject.id,

          name:
            normalizeText(
              subject.name,
            ),

          category:
            normalizeText(
              subject.category,
            ) ||
            'other',

          isActive:
            subject.is_active !==
            false,
        }
      : null,

    name:
      normalizeText(
        subject?.name,
      ),

    category:
      normalizeText(
        subject?.category,
      ) ||
      'other',

    createdAt:
      row.created_at ||
      null,

    updatedAt:
      row.updated_at ||
      null,
  }
}


function normalizeText(
  value,
) {
  return String(
    value ??
      '',
  ).trim()
}