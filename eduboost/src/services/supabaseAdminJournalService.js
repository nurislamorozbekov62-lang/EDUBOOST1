import {
  supabase,
} from '../lib/supabase'


/* =========================================================
   CONSTANTS
========================================================= */

const STUDENT_ROLE =
  'Ученик'

const TEACHER_ROLE =
  'Учитель'

const ACTIVE_STATUS =
  'active'


/* =========================================================
   SCHOOL STUDENTS

   IMPORTANT:
   Official roster is:

   school_students
   -> student_enrollments
   -> school_classes

   profiles.class_name is NOT used as
   the source of truth anymore.
========================================================= */

export async function getAdminSchoolStudents(
  user,
) {
  validateSchoolUser(
    user,
  )

  const roster =
    await getOfficialSchoolRoster(
      user,
    )

  return roster
}


/* =========================================================
   SCHOOL CLASSES

   Classes must come directly from school_classes.
   A class can exist even when it has 0 activated students.
========================================================= */

export async function getAdminSchoolClasses(
  user,
) {
  validateSchoolUser(
    user,
  )

  const {
    data,
    error,
  } = await supabase
    .from(
      'school_classes',
    )
    .select(`
      id,
      school_id,
      academic_year,
      class_name,
      grade_level,
      section,
      is_active
    `)
    .eq(
      'school_id',
      user.schoolId,
    )
    .eq(
      'is_active',
      true,
    )

  if (error) {
    throw createServiceError(
      error,
      'Не удалось загрузить классы школы.',
    )
  }

  const classNames =
    (data || [])
      .map(
        (schoolClass) =>
          cleanText(
            schoolClass
              ?.class_name,
          ),
      )
      .filter(Boolean)

  return [
    ...new Set(
      classNames,
    ),
  ].sort(
    compareClassNames,
  )
}


/* =========================================================
   STUDENTS BY CLASS

   Only current official enrollment is accepted.
========================================================= */

export async function getAdminStudentsByClass(
  user,
  className,
) {
  validateSchoolUser(
    user,
  )

  const normalizedClassName =
    cleanText(
      className,
    )

  if (
    !normalizedClassName
  ) {
    return []
  }

  return getOfficialSchoolRoster(
    user,
    normalizedClassName,
  )
}


/* =========================================================
   SCHOOL TEACHERS
========================================================= */

export async function getAdminSchoolTeachers(
  user,
) {
  validateSchoolUser(
    user,
  )

  const {
    data,
    error,
  } = await supabase
    .from(
      'profiles',
    )
    .select(`
      id,
      name,
      role,
      school,
      school_id,
      position
    `)
    .eq(
      'school_id',
      user.schoolId,
    )
    .eq(
      'role',
      TEACHER_ROLE,
    )
    .order(
      'name',
      {
        ascending: true,
      },
    )

  if (error) {
    throw createServiceError(
      error,
      'Не удалось загрузить учителей школы.',
    )
  }

  return (
    data || []
  )
    .map(
      normalizeTeacher,
    )
    .filter(
      (teacher) =>
        Boolean(
          teacher.id,
        ),
    )
}


/* =========================================================
   OFFICIAL SCHOOL ROSTER

   1. school_students
   2. student_enrollments
   3. school_classes

   We intentionally do the join in JS instead of relying on
   nested PostgREST relation names. This makes the service
   less fragile if Supabase relation aliases change.
========================================================= */

async function getOfficialSchoolRoster(
  user,
  requestedClassName = '',
) {
  const schoolId =
    user.schoolId

  const [
    studentsResult,
    enrollmentsResult,
    classesResult,
  ] =
    await Promise.all([
      supabase
        .from(
          'school_students',
        )
        .select(`
          id,
          school_id,
          user_id,
          full_name,
          status,
          student_login,
          is_archived,
          created_at,
          updated_at
        `)
        .eq(
          'school_id',
          schoolId,
        )
        .eq(
          'status',
          ACTIVE_STATUS,
        )
        .eq(
          'is_archived',
          false,
        )
        .not(
          'user_id',
          'is',
          null,
        ),

      supabase
        .from(
          'student_enrollments',
        )
        .select(`
          id,
          student_id,
          school_id,
          class_id,
          academic_year,
          status,
          enrolled_at,
          ended_at,
          created_at
        `)
        .eq(
          'school_id',
          schoolId,
        )
        .eq(
          'status',
          ACTIVE_STATUS,
        )
        .is(
          'ended_at',
          null,
        )
        .order(
          'enrolled_at',
          {
            ascending: false,
          },
        ),

      supabase
        .from(
          'school_classes',
        )
        .select(`
          id,
          school_id,
          academic_year,
          class_name,
          grade_level,
          section,
          is_active
        `)
        .eq(
          'school_id',
          schoolId,
        )
        .eq(
          'is_active',
          true,
        ),
    ])


  if (
    studentsResult.error
  ) {
    throw createServiceError(
      studentsResult.error,
      'Не удалось загрузить школьный реестр учеников.',
    )
  }


  if (
    enrollmentsResult.error
  ) {
    throw createServiceError(
      enrollmentsResult.error,
      'Не удалось загрузить зачисления учеников.',
    )
  }


  if (
    classesResult.error
  ) {
    throw createServiceError(
      classesResult.error,
      'Не удалось загрузить классы школы.',
    )
  }


  const schoolStudents =
    Array.isArray(
      studentsResult.data,
    )
      ? studentsResult.data
      : []

  const enrollments =
    Array.isArray(
      enrollmentsResult.data,
    )
      ? enrollmentsResult.data
      : []

  const schoolClasses =
    Array.isArray(
      classesResult.data,
    )
      ? classesResult.data
      : []


  /* -------------------------------------------------------
     CLASS MAP
  ------------------------------------------------------- */

  const classById =
    new Map(
      schoolClasses.map(
        (schoolClass) => [
          String(
            schoolClass.id,
          ),
          schoolClass,
        ],
      ),
    )


  /* -------------------------------------------------------
     STUDENT MAP
  ------------------------------------------------------- */

  const studentById =
    new Map(
      schoolStudents.map(
        (student) => [
          String(
            student.id,
          ),
          student,
        ],
      ),
    )


  /* -------------------------------------------------------
     BUILD CURRENT ROSTER

     enrollments are ordered newest first.

     If bad legacy data accidentally contains two active
     enrollments for one student, we keep only one record
     instead of rendering the student twice.
  ------------------------------------------------------- */

  const rosterByUserId =
    new Map()

  const wantedClass =
    normalizeText(
      requestedClassName,
    )


  enrollments.forEach(
    (enrollment) => {
      const schoolStudent =
        studentById.get(
          String(
            enrollment.student_id,
          ),
        )

      if (
        !schoolStudent
      ) {
        return
      }


      const schoolClass =
        classById.get(
          String(
            enrollment.class_id,
          ),
        )

      if (
        !schoolClass
      ) {
        return
      }


      const className =
        cleanText(
          schoolClass.class_name,
        )


      if (
        wantedClass &&
        normalizeText(
          className,
        ) !==
          wantedClass
      ) {
        return
      }


      /* ---------------------------------------------
         Extra integrity checks
      --------------------------------------------- */

      if (
        String(
          schoolStudent
            .school_id,
        ) !==
        String(
          schoolId,
        )
      ) {
        return
      }


      if (
        String(
          enrollment
            .school_id,
        ) !==
        String(
          schoolId,
        )
      ) {
        return
      }


      if (
        String(
          schoolClass
            .school_id,
        ) !==
        String(
          schoolId,
        )
      ) {
        return
      }


      if (
        enrollment
          .academic_year &&
        schoolClass
          .academic_year &&
        String(
          enrollment
            .academic_year,
        ) !==
          String(
            schoolClass
              .academic_year,
          )
      ) {
        return
      }


      const profileId =
        schoolStudent
          .user_id


      /*
        No auth/profile account yet.

        Current grades / attendance / quarter_grades
        still use profiles.id as student_id,
        so such a student cannot safely participate
        in this journal yet.
      */
      if (
        !profileId
      ) {
        return
      }


      const key =
        String(
          profileId,
        )


      if (
        rosterByUserId.has(
          key,
        )
      ) {
        return
      }


      rosterByUserId.set(
        key,
        normalizeRosterStudent({
          schoolStudent,
          enrollment,
          schoolClass,
          school:
            user.school ||
            '',
        }),
      )
    },
  )


  return [
    ...rosterByUserId
      .values(),
  ].sort(
    (
      firstStudent,
      secondStudent,
    ) =>
      String(
        firstStudent.name ||
          '',
      ).localeCompare(
        String(
          secondStudent.name ||
            '',
        ),
        'ru',
        {
          sensitivity:
            'base',
        },
      ),
  )
}


/* =========================================================
   NORMALIZE OFFICIAL STUDENT

   IMPORTANT:
   id = school_students.user_id
   because grades / attendance currently use profile UUID.

   schoolStudentId = permanent roster UUID.
========================================================= */

function normalizeRosterStudent({
  schoolStudent,
  enrollment,
  schoolClass,
  school,
}) {
  return {
    id:
      schoolStudent
        .user_id,

    profileId:
      schoolStudent
        .user_id,

    schoolStudentId:
      schoolStudent.id,

    enrollmentId:
      enrollment.id,

    classId:
      schoolClass.id,

    name:
      cleanText(
        schoolStudent
          .full_name,
      ) ||
      'Без имени',

    role:
      STUDENT_ROLE,

    school:
      cleanText(
        school,
      ),

    schoolId:
      schoolStudent
        .school_id ||
      null,

    className:
      cleanText(
        schoolClass
          .class_name,
      ),

    academicYear:
      cleanText(
        enrollment
          .academic_year ||
          schoolClass
            .academic_year,
      ),

    studentLogin:
      cleanText(
        schoolStudent
          .student_login,
      ),

    status:
      schoolStudent
        .status ||
      ACTIVE_STATUS,

    enrollmentStatus:
      enrollment
        .status ||
      ACTIVE_STATUS,

    isArchived:
      Boolean(
        schoolStudent
          .is_archived,
      ),
  }
}


/* =========================================================
   NORMALIZE TEACHER
========================================================= */

function normalizeTeacher(
  teacher,
) {
  return {
    id:
      teacher.id,

    name:
      cleanText(
        teacher.name,
      ) ||
      'Учитель',

    role:
      teacher.role ||
      TEACHER_ROLE,

    school:
      cleanText(
        teacher.school,
      ),

    schoolId:
      teacher.school_id ||
      null,

    position:
      cleanText(
        teacher.position,
      ),
  }
}


/* =========================================================
   VALIDATION
========================================================= */

function validateSchoolUser(
  user,
) {
  if (
    !user?.schoolId
  ) {
    throw new Error(
      'У пользователя не указан school_id.',
    )
  }
}


/* =========================================================
   ERROR
========================================================= */

function createServiceError(
  error,
  fallbackMessage,
) {
  console.error(
    fallbackMessage,
    error,
  )

  return new Error(
    error?.message ||
      fallbackMessage,
  )
}


/* =========================================================
   TEXT HELPERS
========================================================= */

function cleanText(
  value,
) {
  return String(
    value ??
      '',
  ).trim()
}


function normalizeText(
  value,
) {
  return cleanText(
    value,
  ).toLocaleLowerCase(
    'ru-RU',
  )
}


/* =========================================================
   CLASS SORT

   Examples:
   2 класс
   6 класс
   9 класс
   10 класс
========================================================= */

function compareClassNames(
  firstClass,
  secondClass,
) {
  return String(
    firstClass,
  ).localeCompare(
    String(
      secondClass,
    ),
    'ru',
    {
      numeric: true,
      sensitivity:
        'base',
    },
  )
}