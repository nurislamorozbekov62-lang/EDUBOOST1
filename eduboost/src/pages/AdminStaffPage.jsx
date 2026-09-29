import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  Ban,
  BookOpen,
  Check,
  Clock3,
  Copy,
  Filter,
  GraduationCap,
  KeyRound,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  getSchoolClasses,
} from '../services/supabaseSchoolAdminService'

import {
  createTeacher,
  getSchoolTeachers,
  reissueTeacherEt,
  setTeacherAccountStatus,
  updateTeacher,
} from '../services/staffAdminService'


const DEFAULT_ET_EXPIRES_HOURS = 168

const EMPTY_ASSIGNMENT = {
  classId: '',
  subject: '',
  weeklyHours: 1,
  groupName: '',
}


/* ========================================
   HELPERS
======================================== */

function cleanText(value) {
  return String(
    value || '',
  ).trim()
}


function normalizeSearchText(
  value,
) {
  return cleanText(
    value,
  ).toLowerCase()
}


function createEmptyAssignment(
  classes,
) {
  return {
    ...EMPTY_ASSIGNMENT,

    classId:
      classes[0]?.id ||
      '',
  }
}


function getInitials(value) {
  return cleanText(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (word) =>
        word[0]
          ?.toUpperCase() ||
        '',
    )
    .join('')
}


function formatDateTime(
  value,
) {
  if (!value) {
    return 'Не указан'
  }


  const date =
    new Date(value)


  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(value)
  }


  try {
    return new Intl
      .DateTimeFormat(
        'ru-RU',
        {
          dateStyle:
            'medium',

          timeStyle:
            'short',
        },
      )
      .format(date)
  } catch {
    return date
      .toLocaleString()
  }
}


async function copyText(
  value,
) {
  const text =
    String(
      value ||
      '',
    )


  if (!text) {
    return
  }


  if (
    navigator.clipboard
      ?.writeText
  ) {
    await navigator
      .clipboard
      .writeText(
        text,
      )

    return
  }


  const textarea =
    document.createElement(
      'textarea',
    )


  textarea.value =
    text

  textarea.style.position =
    'fixed'

  textarea.style.opacity =
    '0'


  document.body
    .appendChild(
      textarea,
    )


  textarea.focus()
  textarea.select()


  const copied =
    document.execCommand(
      'copy',
    )


  document.body
    .removeChild(
      textarea,
    )


  if (!copied) {
    throw new Error(
      'Не удалось скопировать данные.',
    )
  }
}


function getTeacherWeeklyHours(
  teacher,
) {
  return (
    teacher.assignments ||
    []
  ).reduce(
    (
      total,
      assignment,
    ) =>
      total +
      (
        Number(
          assignment.weeklyHours,
        ) ||
        0
      ),
    0,
  )
}


/* ========================================
   REISSUE RULES
======================================== */

function getReissueTooltip(
  teacher,
  reissuing,
) {
  if (
    teacher.isDeactivated
  ) {
    return 'Доступ учителя отключён. Сначала восстановите аккаунт.'
  }


  if (
    !teacher.eduLogin
  ) {
    return 'У учителя нет EDU-логина. Перевыпуск ET недоступен.'
  }


  if (
    teacher
      .hasVerifiedRecoveryEmail
  ) {
    return 'Аккаунт уже защищён. Новый ET недоступен. Для восстановления доступа используйте восстановление пароля.'
  }


  if (reissuing) {
    return 'Новый ET-код создаётся...'
  }


  return 'Выдать новый одноразовый ET-код'
}


/* ========================================
   CLASS RESOLVE
======================================== */

function resolveClassId(
  classes,
  assignment,
) {
  const exact =
    classes.find(
      (
        item,
      ) =>
        item.className ===
          assignment.className &&
        (
          !assignment.academicYear ||
          item.academicYear ===
            assignment.academicYear
        ),
    )


  if (exact) {
    return exact.id
  }


  return (
    classes.find(
      (
        item,
      ) =>
        item.className ===
        assignment.className,
    )?.id ||
    ''
  )
}


function normalizeExistingAssignments(
  classes,
  assignments,
) {
  return (
    Array.isArray(
      assignments,
    )
      ? assignments
      : []
  ).map(
    (
      assignment,
    ) => ({
      classId:
        resolveClassId(
          classes,
          assignment,
        ),

      subject:
        cleanText(
          assignment.subject,
        ),

      weeklyHours:
        Number(
          assignment.weeklyHours,
        ) ||
        1,

      groupName:
        cleanText(
          assignment.groupName,
        ),
    }),
  )
}


/* ========================================
   VALIDATE ASSIGNMENTS
======================================== */

function validateAssignmentList(
  assignments,
  {
    allowEmpty = false,
  } = {},
) {
  if (
    !Array.isArray(
      assignments,
    )
  ) {
    throw new Error(
      'Некорректный список назначений.',
    )
  }


  if (
    !allowEmpty &&
    assignments.length ===
      0
  ) {
    throw new Error(
      'Добавьте минимум одно назначение.',
    )
  }


  const seen =
    new Set()


  for (
    const assignment
    of assignments
  ) {
    const classId =
      cleanText(
        assignment.classId,
      )


    const subject =
      cleanText(
        assignment.subject,
      )


    const groupName =
      cleanText(
        assignment.groupName,
      )


    const weeklyHours =
      Number(
        assignment.weeklyHours,
      )


    if (!classId) {
      throw new Error(
        'Выберите класс для каждого назначения.',
      )
    }


    if (!subject) {
      throw new Error(
        'Укажите предмет для каждого назначения.',
      )
    }


    if (
      !Number.isInteger(
        weeklyHours,
      ) ||
      weeklyHours < 1 ||
      weeklyHours > 40
    ) {
      throw new Error(
        'Количество часов должно быть от 1 до 40.',
      )
    }


    const key =
      [
        classId,

        subject
          .toLowerCase(),

        groupName
          .toLowerCase(),
      ].join('|')


    if (
      seen.has(key)
    ) {
      throw new Error(
        `Назначение «${subject}» для этого класса уже добавлено.`,
      )
    }


    seen.add(key)
  }
}


/* ========================================
   PAGE
======================================== */

function AdminStaffPage() {
  const {
    user,
  } = useAuth()


  const [
    teachers,
    setTeachers,
  ] = useState([])


  const [
    classes,
    setClasses,
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
    pageError,
    setPageError,
  ] = useState('')


  const [
    pageSuccess,
    setPageSuccess,
  ] = useState('')


  /* =====================================
     FILTERS
  ===================================== */

  const [
    search,
    setSearch,
  ] = useState('')


  const [
    classFilter,
    setClassFilter,
  ] = useState('all')


  const [
    subjectFilter,
    setSubjectFilter,
  ] = useState('all')


  const [
    accountFilter,
    setAccountFilter,
  ] = useState('all')


  const [
    sortBy,
    setSortBy,
  ] = useState('name')


  /* =====================================
     CREATE
  ===================================== */

  const [
    showCreate,
    setShowCreate,
  ] = useState(false)


  const [
    fullName,
    setFullName,
  ] = useState('')


  const [
    assignments,
    setAssignments,
  ] = useState([
    {
      ...EMPTY_ASSIGNMENT,
    },
  ])


  const [
    creating,
    setCreating,
  ] = useState(false)


  const [
    createError,
    setCreateError,
  ] = useState('')


  /* =====================================
     EDIT
  ===================================== */

  const [
    editTarget,
    setEditTarget,
  ] = useState(null)


  const [
    editFullName,
    setEditFullName,
  ] = useState('')


  const [
    editPosition,
    setEditPosition,
  ] = useState(
    'Учитель',
  )


  const [
    editAssignments,
    setEditAssignments,
  ] = useState([])


  const [
    editing,
    setEditing,
  ] = useState(false)


  const [
    editError,
    setEditError,
  ] = useState('')


  /* =====================================
     REISSUE
  ===================================== */

  const [
    reissueTarget,
    setReissueTarget,
  ] = useState(null)


  const [
    reissuing,
    setReissuing,
  ] = useState(false)


  const [
    reissueError,
    setReissueError,
  ] = useState('')


  /* =====================================
     ACCOUNT STATUS
  ===================================== */

  const [
    statusTarget,
    setStatusTarget,
  ] = useState(null)


  const [
    statusAction,
    setStatusAction,
  ] = useState('')


  const [
    statusReason,
    setStatusReason,
  ] = useState('')


  const [
    statusError,
    setStatusError,
  ] = useState('')


  const [
    statusChanging,
    setStatusChanging,
  ] = useState(false)


  /* =====================================
     CREDENTIAL RESULT
  ===================================== */

  const [
    credentialsResult,
    setCredentialsResult,
  ] = useState(null)


  const [
    copiedField,
    setCopiedField,
  ] = useState('')


  /* ========================================
     INITIAL LOAD
  ======================================== */

  useEffect(() => {
    void loadData({
      initial: true,
    })
  }, [
    user?.schoolId,
  ])


  /* ========================================
     BODY SCROLL
  ======================================== */

  useEffect(() => {
    const modalOpen =
      showCreate ||
      Boolean(
        editTarget,
      ) ||
      Boolean(
        reissueTarget,
      ) ||
      Boolean(
        statusTarget,
      ) ||
      Boolean(
        credentialsResult,
      )


    if (!modalOpen) {
      return undefined
    }


    const previousOverflow =
      document.body
        .style
        .overflow


    document.body
      .style
      .overflow =
      'hidden'


    return () => {
      document.body
        .style
        .overflow =
        previousOverflow
    }
  }, [
    showCreate,
    editTarget,
    reissueTarget,
    statusTarget,
    credentialsResult,
  ])


  /* ========================================
     ESC
  ======================================== */

  useEffect(() => {
    function onKeyDown(
      event,
    ) {
      if (
        event.key !==
        'Escape'
      ) {
        return
      }


      if (
        credentialsResult
      ) {
        setCredentialsResult(
          null,
        )

        return
      }


      if (
        statusTarget &&
        !statusChanging
      ) {
        closeStatusModal()
        return
      }


      if (
        reissueTarget &&
        !reissuing
      ) {
        closeReissueModal()
        return
      }


      if (
        editTarget &&
        !editing
      ) {
        closeEditModal()
        return
      }


      if (
        showCreate &&
        !creating
      ) {
        closeCreateModal()
      }
    }


    window.addEventListener(
      'keydown',
      onKeyDown,
    )


    return () =>
      window
        .removeEventListener(
          'keydown',
          onKeyDown,
        )
  }, [
    credentialsResult,
    statusTarget,
    statusChanging,
    reissueTarget,
    reissuing,
    editTarget,
    editing,
    showCreate,
    creating,
  ])


  /* ========================================
     LOAD
  ======================================== */

  async function loadData({
    initial = false,
  } = {}) {
    if (
      !user?.schoolId
    ) {
      setTeachers([])
      setClasses([])
      setLoading(false)
      setRefreshing(false)

      setPageError(
        'Не удалось определить школу администратора.',
      )

      return
    }


    try {
      if (initial) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }


      setPageError('')


      const [
        classRows,
        teacherRows,
      ] =
        await Promise.all([
          getSchoolClasses(
            user.schoolId,
          ),

          getSchoolTeachers(
            user.schoolId,
          ),
        ])


      const normalizedClasses =
        (
          Array.isArray(
            classRows,
          )
            ? classRows
            : []
        )
          .map(
            (
              schoolClass,
            ) => ({
              id:
                schoolClass.id,

              className:
                schoolClass
                  .className ||
                schoolClass
                  .class_name ||
                '',

              academicYear:
                schoolClass
                  .academicYear ||
                schoolClass
                  .academic_year ||
                '',
            }),
          )
          .filter(
            (
              schoolClass,
            ) =>
              schoolClass.id &&
              schoolClass.className,
          )


      setClasses(
        normalizedClasses,
      )


      setTeachers(
        Array.isArray(
          teacherRows,
        )
          ? teacherRows
          : [],
      )
    } catch (
      error
    ) {
      console.error(
        'Staff load:',
        error,
      )


      setPageError(
        error?.message ||
          'Не удалось загрузить сотрудников.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }


  /* ========================================
     SUBJECT OPTIONS
  ======================================== */

  const subjectOptions =
    useMemo(
      () => {
        const subjects =
          new Set()


        for (
          const teacher
          of teachers
        ) {
          for (
            const assignment
            of (
              teacher.assignments ||
              []
            )
          ) {
            const subject =
              cleanText(
                assignment.subject,
              )


            if (subject) {
              subjects.add(
                subject,
              )
            }
          }
        }


        return Array
          .from(
            subjects,
          )
          .sort(
            (
              a,
              b,
            ) =>
              a.localeCompare(
                b,
                'ru',
              ),
          )
      },
      [
        teachers,
      ],
    )


  /* ========================================
     FILTER
  ======================================== */

  const filteredTeachers =
    useMemo(
      () => {
        const query =
          normalizeSearchText(
            search,
          )


        const filtered =
          teachers.filter(
            (
              teacher,
            ) => {
              const teacherAssignments =
                teacher.assignments ||
                []


              const text =
                [
                  teacher.name,
                  teacher.position,
                  teacher.eduLogin,
                  teacher.deactivationReason,

                  ...teacherAssignments
                    .flatMap(
                      (
                        assignment,
                      ) => [
                        assignment.subject,
                        assignment.className,
                        assignment.groupName,
                        assignment.academicYear,
                      ],
                    ),
                ]
                  .filter(
                    Boolean,
                  )
                  .join(' ')
                  .toLowerCase()


              const matchesSearch =
                !query ||
                text.includes(
                  query,
                )


              const matchesClass =
                classFilter ===
                  'all' ||
                teacherAssignments
                  .some(
                    (
                      assignment,
                    ) =>
                      assignment
                        .className ===
                      classFilter,
                  )


              const matchesSubject =
                subjectFilter ===
                  'all' ||
                teacherAssignments
                  .some(
                    (
                      assignment,
                    ) =>
                      assignment
                        .subject ===
                      subjectFilter,
                  )


              const matchesAccount =
                accountFilter ===
                  'all' ||
                (
                  accountFilter ===
                    'active' &&
                  !teacher
                    .isDeactivated
                ) ||
                (
                  accountFilter ===
                    'deactivated' &&
                  teacher
                    .isDeactivated
                )


              return (
                matchesSearch &&
                matchesClass &&
                matchesSubject &&
                matchesAccount
              )
            },
          )


        return [
          ...filtered,
        ].sort(
          (
            a,
            b,
          ) => {
            if (
              sortBy ===
              'hours-desc'
            ) {
              return (
                getTeacherWeeklyHours(
                  b,
                ) -
                getTeacherWeeklyHours(
                  a,
                )
              )
            }


            if (
              sortBy ===
              'newest'
            ) {
              return (
                new Date(
                  b.createdAt ||
                    0,
                ).getTime() -
                new Date(
                  a.createdAt ||
                    0,
                ).getTime()
              )
            }


            if (
              sortBy ===
              'status'
            ) {
              return Number(
                b.isDeactivated,
              ) -
              Number(
                a.isDeactivated,
              )
            }


            return cleanText(
              a.name,
            ).localeCompare(
              cleanText(
                b.name,
              ),
              'ru',
            )
          },
        )
      },
      [
        teachers,
        search,
        classFilter,
        subjectFilter,
        accountFilter,
        sortBy,
      ],
    )


  /* ========================================
     STATS
  ======================================== */

  const stats =
    useMemo(
      () => {
        let assignmentsCount =
          0

        let weeklyHours =
          0

        let protectedCount =
          0

        let deactivatedCount =
          0


        for (
          const teacher
          of teachers
        ) {
          assignmentsCount +=
            teacher.assignments
              ?.length ||
            0


          weeklyHours +=
            getTeacherWeeklyHours(
              teacher,
            )


          if (
            teacher
              .hasVerifiedRecoveryEmail
          ) {
            protectedCount +=
              1
          }


          if (
            teacher.isDeactivated
          ) {
            deactivatedCount +=
              1
          }
        }


        return {
          assignmentsCount,
          weeklyHours,
          protectedCount,
          deactivatedCount,

          activeCount:
            teachers.length -
            deactivatedCount,
        }
      },
      [
        teachers,
      ],
    )


  const hasFilters =
    Boolean(search) ||
    classFilter !==
      'all' ||
    subjectFilter !==
      'all' ||
    accountFilter !==
      'all' ||
    sortBy !==
      'name'


  function resetFilters() {
    setSearch('')
    setClassFilter('all')
    setSubjectFilter('all')
    setAccountFilter('all')
    setSortBy('name')
  }


  /* ========================================
     CREATE
  ======================================== */

  function openCreateModal() {
    setPageError('')
    setPageSuccess('')
    setCreateError('')
    setCopiedField('')
    setFullName('')


    setAssignments([
      createEmptyAssignment(
        classes,
      ),
    ])


    setShowCreate(
      true,
    )
  }


  function closeCreateModal() {
    if (creating) {
      return
    }


    setShowCreate(false)
    setCreateError('')
  }


  function updateCreateAssignment(
    index,
    field,
    value,
  ) {
    setCreateError('')


    setAssignments(
      (
        current,
      ) =>
        current.map(
          (
            assignment,
            assignmentIndex,
          ) =>
            assignmentIndex ===
            index
              ? {
                  ...assignment,

                  [field]:
                    field ===
                    'weeklyHours'
                      ? Number(
                          value,
                        )
                      : value,
                }
              : assignment,
        ),
    )
  }


  function addCreateAssignment() {
    setAssignments(
      (
        current,
      ) => [
        ...current,

        createEmptyAssignment(
          classes,
        ),
      ],
    )
  }


  function removeCreateAssignment(
    index,
  ) {
    setAssignments(
      (
        current,
      ) =>
        current.length <=
        1
          ? current
          : current.filter(
              (
                _,
                assignmentIndex,
              ) =>
                assignmentIndex !==
                index,
            ),
    )
  }


  async function handleCreateTeacher(
    event,
  ) {
    event.preventDefault()


    if (creating) {
      return
    }


    try {
      setCreating(true)
      setCreateError('')


      const normalizedName =
        cleanText(
          fullName,
        )


      if (
        normalizedName.length <
        3
      ) {
        throw new Error(
          'Введите ФИО учителя.',
        )
      }


      if (
        classes.length ===
        0
      ) {
        throw new Error(
          'В школе нет активных классов. Сначала добавьте класс.',
        )
      }


      validateAssignmentList(
        assignments,
      )


      const result =
        await createTeacher({
          fullName:
            normalizedName,

          assignments,

          expiresHours:
            DEFAULT_ET_EXPIRES_HOURS,
        })


      setCredentialsResult({
        ...result,

        mode:
          'create',
      })


      setShowCreate(
        false,
      )


      await loadData()
    } catch (
      error
    ) {
      console.error(
        'Create teacher:',
        error,
      )


      setCreateError(
        error?.message ||
          'Не удалось создать учителя.',
      )
    } finally {
      setCreating(false)
    }
  }


  /* ========================================
     EDIT
  ======================================== */

  function openEditModal(
    teacher,
  ) {
    setPageError('')
    setPageSuccess('')
    setEditError('')


    setEditTarget(
      teacher,
    )


    setEditFullName(
      teacher.name ||
      '',
    )


    setEditPosition(
      teacher.position ||
      'Учитель',
    )


    setEditAssignments(
      normalizeExistingAssignments(
        classes,
        teacher.assignments,
      ),
    )
  }


  function closeEditModal() {
    if (editing) {
      return
    }


    setEditTarget(null)
    setEditFullName('')
    setEditPosition(
      'Учитель',
    )
    setEditAssignments([])
    setEditError('')
  }


  function updateEditAssignment(
    index,
    field,
    value,
  ) {
    setEditError('')


    setEditAssignments(
      (
        current,
      ) =>
        current.map(
          (
            assignment,
            assignmentIndex,
          ) =>
            assignmentIndex ===
            index
              ? {
                  ...assignment,

                  [field]:
                    field ===
                    'weeklyHours'
                      ? Number(
                          value,
                        )
                      : value,
                }
              : assignment,
        ),
    )
  }


  function addEditAssignment() {
    setEditAssignments(
      (
        current,
      ) => [
        ...current,

        createEmptyAssignment(
          classes,
        ),
      ],
    )
  }


  function removeEditAssignment(
    index,
  ) {
    setEditAssignments(
      (
        current,
      ) =>
        current.filter(
          (
            _,
            assignmentIndex,
          ) =>
            assignmentIndex !==
            index,
        ),
    )
  }


  async function handleUpdateTeacher(
    event,
  ) {
    event.preventDefault()


    if (
      !editTarget?.id ||
      editing
    ) {
      return
    }


    try {
      setEditing(true)
      setEditError('')


      const normalizedName =
        cleanText(
          editFullName,
        )


      const normalizedPosition =
        cleanText(
          editPosition,
        ) ||
        'Учитель'


      if (
        normalizedName.length <
        3
      ) {
        throw new Error(
          'Введите ФИО учителя.',
        )
      }


      validateAssignmentList(
        editAssignments,
        {
          allowEmpty:
            true,
        },
      )


      const result =
        await updateTeacher({
          teacherId:
            editTarget.id,

          fullName:
            normalizedName,

          position:
            normalizedPosition,

          assignments:
            editAssignments,
        })


      setEditTarget(null)
      setEditFullName('')
      setEditPosition(
        'Учитель',
      )
      setEditAssignments([])
      setEditError('')


      await loadData()


      showPageSuccess(
        result.message ||
        'Данные учителя успешно обновлены.',
      )
    } catch (
      error
    ) {
      console.error(
        'Update teacher:',
        error,
      )


      setEditError(
        error?.message ||
          'Не удалось изменить данные учителя.',
      )
    } finally {
      setEditing(false)
    }
  }


  /* ========================================
     REISSUE ET
  ======================================== */

  function openReissueModal(
    teacher,
  ) {
    setPageError('')
    setPageSuccess('')
    setReissueError('')


    if (
      teacher.isDeactivated
    ) {
      setPageError(
        'Сначала восстановите доступ учителя.',
      )

      return
    }


    if (!teacher?.id) {
      setPageError(
        'Не найден ID учителя.',
      )

      return
    }


    if (
      !teacher.eduLogin
    ) {
      setPageError(
        'У учителя отсутствует EDU-логин. Перевыпуск ET недоступен.',
      )

      return
    }


    if (
      teacher
        .hasVerifiedRecoveryEmail
    ) {
      return
    }


    setReissueTarget(
      teacher,
    )
  }


  function closeReissueModal() {
    if (reissuing) {
      return
    }


    setReissueTarget(null)
    setReissueError('')
  }


  async function handleReissueTeacherEt() {
    if (
      !reissueTarget?.id ||
      reissuing
    ) {
      return
    }


    try {
      setReissuing(true)
      setReissueError('')


      const result =
        await reissueTeacherEt({
          teacherId:
            reissueTarget.id,

          expiresHours:
            DEFAULT_ET_EXPIRES_HOURS,
        })


      setCredentialsResult({
        ...result,

        mode:
          'reissue',
      })


      setReissueTarget(
        null,
      )


      await loadData()
    } catch (
      error
    ) {
      console.error(
        'Reissue teacher ET:',
        error,
      )


      setReissueError(
        error?.message ||
          'Не удалось выдать новый ET-код.',
      )
    } finally {
      setReissuing(false)
    }
  }


  /* ========================================
     ACCOUNT STATUS
  ======================================== */

  function openDeactivateModal(
    teacher,
  ) {
    setPageError('')
    setPageSuccess('')
    setStatusError('')
    setStatusReason('')
    setStatusTarget(
      teacher,
    )
    setStatusAction(
      'deactivate',
    )
  }


  function openReactivateModal(
    teacher,
  ) {
    setPageError('')
    setPageSuccess('')
    setStatusError('')
    setStatusReason('')
    setStatusTarget(
      teacher,
    )
    setStatusAction(
      'reactivate',
    )
  }


  function closeStatusModal() {
    if (
      statusChanging
    ) {
      return
    }


    setStatusTarget(null)
    setStatusAction('')
    setStatusReason('')
    setStatusError('')
  }


  async function handleStatusChange() {
    if (
      !statusTarget?.id ||
      !statusAction ||
      statusChanging
    ) {
      return
    }


    try {
      setStatusChanging(true)
      setStatusError('')


      if (
        statusAction ===
          'deactivate' &&
        cleanText(
          statusReason,
        ).length <
          3
      ) {
        throw new Error(
          'Укажите причину деактивации.',
        )
      }


      const result =
        await setTeacherAccountStatus({
          teacherId:
            statusTarget.id,

          action:
            statusAction,

          reason:
            statusReason,
        })


      setStatusTarget(null)
      setStatusAction('')
      setStatusReason('')
      setStatusError('')


      await loadData()


      let message =
        result.message


      if (
        statusAction ===
          'deactivate' &&
        result.revokedEtCount >
          0
      ) {
        message +=
          ` Отозвано ET-кодов: ${result.revokedEtCount}.`
      }


      showPageSuccess(
        message,
      )
    } catch (
      error
    ) {
      console.error(
        'Teacher account status:',
        error,
      )


      setStatusError(
        error?.message ||
          'Не удалось изменить доступ учителя.',
      )
    } finally {
      setStatusChanging(false)
    }
  }


  /* ========================================
     SUCCESS MESSAGE
  ======================================== */

  function showPageSuccess(
    message,
  ) {
    const normalizedMessage =
      cleanText(
        message,
      )


    if (!normalizedMessage) {
      return
    }


    setPageSuccess(
      normalizedMessage,
    )


    window.setTimeout(
      () => {
        setPageSuccess(
          (
            current,
          ) =>
            current ===
            normalizedMessage
              ? ''
              : current,
        )
      },
      3500,
    )
  }


  /* ========================================
     COPY
  ======================================== */

  async function handleCopy(
    field,
    value,
  ) {
    if (!value) {
      return
    }


    try {
      await copyText(
        value,
      )


      setCopiedField(
        field,
      )


      window.setTimeout(
        () => {
          setCopiedField(
            (
              current,
            ) =>
              current ===
              field
                ? ''
                : current,
          )
        },
        1600,
      )
    } catch (
      error
    ) {
      console.error(
        'Copy:',
        error,
      )


      setPageError(
        error?.message ||
          'Не удалось скопировать данные.',
      )
    }
  }


  async function copyCredentialsResult() {
    if (
      !credentialsResult
    ) {
      return
    }


    const label =
      credentialsResult.mode ===
      'reissue'
        ? 'Новый ET-код'
        : 'Код первого входа'


    const text =
      [
        'EduBoost',

        `ФИО: ${
          credentialsResult.fullName ||
          ''
        }`,

        `Логин: ${
          credentialsResult.eduLogin ||
          ''
        }`,

        `${label}: ${
          credentialsResult.activationCode ||
          ''
        }`,

        `Действует до: ${
          formatDateTime(
            credentialsResult.expiresAt,
          )
        }`,
      ].join('\n')


    await handleCopy(
      'all',
      text,
    )
  }


  /* ========================================
     RENDER
  ======================================== */

  return (
    <div
      className="staff-page"
    >
      <style>
        {STAFF_PAGE_CSS}
      </style>


      {/* HEADER */}

      <header
        className="staff-header"
      >
        <div>
          <div
            className="staff-eyebrow"
          >
            Администрирование
          </div>

          <h1>
            Сотрудники
          </h1>

          <p>
            Учителя, доступ,
            предметы, классы
            и учебная нагрузка.
          </p>
        </div>


        <button
          type="button"
          className="staff-btn staff-btn-primary"
          onClick={
            openCreateModal
          }
          disabled={
            classes.length ===
              0 ||
            loading
          }
        >
          <UserPlus
            size={19}
          />

          Добавить учителя
        </button>
      </header>


      {/* STATS */}

      <div
        className="staff-stats"
      >
        <StatCard
          icon={
            Users
          }
          value={
            teachers.length
          }
          label="Учителей"
        />

        <StatCard
          icon={
            ShieldCheck
          }
          value={
            stats.activeCount
          }
          label="Доступ активен"
        />

        <StatCard
          icon={
            Ban
          }
          value={
            stats.deactivatedCount
          }
          label="Отключено"
          danger={
            stats.deactivatedCount >
            0
          }
        />

        <StatCard
          icon={
            BookOpen
          }
          value={
            stats.assignmentsCount
          }
          label="Назначений"
        />

        <StatCard
          icon={
            Clock3
          }
          value={
            stats.weeklyHours
          }
          label="Часов в неделю"
        />
      </div>


      {/* TOOLBAR */}

      <div
        className="staff-toolbar-card"
      >
        <div
          className="staff-search-row"
        >
          <div
            className="staff-search-box"
          >
            <Search
              size={18}
            />

            <input
              value={
                search
              }
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="ФИО, EDU, предмет, класс..."
            />

            {search && (
              <button
                type="button"
                className="staff-icon-btn staff-clear-btn"
                onClick={() =>
                  setSearch('')
                }
              >
                <X
                  size={16}
                />
              </button>
            )}
          </div>


          <button
            type="button"
            className="staff-icon-btn staff-refresh-btn"
            onClick={() =>
              void loadData()
            }
            disabled={
              refreshing
            }
          >
            <RefreshCcw
              size={18}
              className={
                refreshing
                  ? 'staff-spin'
                  : ''
              }
            />
          </button>
        </div>


        <div
          className="staff-filter-row"
        >
          <div
            className="staff-filter-label"
          >
            <Filter
              size={15}
            />

            Фильтры
          </div>


          <SelectFilter
            value={
              accountFilter
            }
            onChange={
              setAccountFilter
            }
            label="Все аккаунты"
            options={[
              {
                value:
                  'active',

                label:
                  'Доступ активен',
              },

              {
                value:
                  'deactivated',

                label:
                  'Доступ отключён',
              },
            ]}
          />


          <SelectFilter
            value={
              classFilter
            }
            onChange={
              setClassFilter
            }
            label="Все классы"
            options={
              classes.map(
                (
                  schoolClass,
                ) => ({
                  value:
                    schoolClass.className,

                  label:
                    schoolClass.className,
                }),
              )
            }
          />


          <SelectFilter
            value={
              subjectFilter
            }
            onChange={
              setSubjectFilter
            }
            label="Все предметы"
            options={
              subjectOptions.map(
                (
                  subject,
                ) => ({
                  value:
                    subject,

                  label:
                    subject,
                }),
              )
            }
          />


          <SelectFilter
            value={
              sortBy
            }
            onChange={
              setSortBy
            }
            label="По имени"
            allValue="name"
            options={[
              {
                value:
                  'hours-desc',

                label:
                  'По нагрузке',
              },

              {
                value:
                  'newest',

                label:
                  'Сначала новые',
              },

              {
                value:
                  'status',

                label:
                  'Сначала отключённые',
              },
            ]}
          />


          {hasFilters && (
            <button
              type="button"
              className="staff-reset-btn"
              onClick={
                resetFilters
              }
            >
              Сбросить
            </button>
          )}
        </div>
      </div>


      {/* ERROR */}

      {pageError && (
        <div
          className="staff-alert staff-alert-error"
        >
          <strong>
            Ошибка
          </strong>

          <span>
            {pageError}
          </span>
        </div>
      )}


      {/* SUCCESS */}

      {pageSuccess && (
        <div
          className="staff-alert staff-alert-success"
        >
          <Check
            size={17}
          />

          <span>
            {pageSuccess}
          </span>
        </div>
      )}


      {/* LIST */}

      <section
        className="staff-list-card"
      >
        <div
          className="staff-list-header"
        >
          <div>
            <strong>
              Учителя школы
            </strong>

            <small>
              Найдено:{' '}
              {
                filteredTeachers.length
              }
            </small>
          </div>

          <span
            className="staff-count-badge"
          >
            {
              filteredTeachers.length
            }
          </span>
        </div>


        {loading ? (
          <EmptyState
            text="Загружаем сотрудников..."
          />
        ) : filteredTeachers.length ===
          0 ? (
          <EmptyState
            text="Учителя не найдены."
          />
        ) : (
          <div>
            {
              filteredTeachers.map(
                (
                  teacher,
                ) => (
                  <TeacherCard
                    key={
                      teacher.id
                    }
                    teacher={
                      teacher
                    }
                    copiedField={
                      copiedField
                    }
                    reissuing={
                      reissuing &&
                      reissueTarget
                        ?.id ===
                        teacher.id
                    }
                    onCopy={
                      handleCopy
                    }
                    onEdit={
                      openEditModal
                    }
                    onReissue={
                      openReissueModal
                    }
                    onDeactivate={
                      openDeactivateModal
                    }
                    onReactivate={
                      openReactivateModal
                    }
                  />
                ),
              )
            }
          </div>
        )}
      </section>


      {/* CREATE MODAL */}

      {showCreate && (
        <TeacherFormModal
          mode="create"
          fullName={
            fullName
          }
          setFullName={
            setFullName
          }
          position="Учитель"
          setPosition={() => {}}
          assignments={
            assignments
          }
          classes={
            classes
          }
          error={
            createError
          }
          saving={
            creating
          }
          onClose={
            closeCreateModal
          }
          onSubmit={
            handleCreateTeacher
          }
          onUpdateAssignment={
            updateCreateAssignment
          }
          onAddAssignment={
            addCreateAssignment
          }
          onRemoveAssignment={
            removeCreateAssignment
          }
        />
      )}


      {/* EDIT MODAL */}

      {editTarget && (
        <TeacherFormModal
          mode="edit"
          teacher={
            editTarget
          }
          fullName={
            editFullName
          }
          setFullName={
            setEditFullName
          }
          position={
            editPosition
          }
          setPosition={
            setEditPosition
          }
          assignments={
            editAssignments
          }
          classes={
            classes
          }
          error={
            editError
          }
          saving={
            editing
          }
          onClose={
            closeEditModal
          }
          onSubmit={
            handleUpdateTeacher
          }
          onUpdateAssignment={
            updateEditAssignment
          }
          onAddAssignment={
            addEditAssignment
          }
          onRemoveAssignment={
            removeEditAssignment
          }
        />
      )}


      {/* REISSUE MODAL */}

      {reissueTarget && (
        <ModalShell
          onClose={
            closeReissueModal
          }
        >
          <div
            className="staff-modal staff-modal-confirm"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <ModalCloseButton
              onClick={
                closeReissueModal
              }
              disabled={
                reissuing
              }
            />

            <div
              className="staff-modal-icon"
            >
              <KeyRound
                size={28}
              />
            </div>

            <h2>
              Выдать новый ET?
            </h2>

            <p
              className="staff-modal-subtitle"
            >
              Предыдущий
              неиспользованный ET
              перестанет работать.
            </p>

            <TeacherSummary
              teacher={
                reissueTarget
              }
            />

            {reissueError && (
              <div
                className="staff-modal-error"
              >
                {reissueError}
              </div>
            )}

            <div
              className="staff-modal-footer"
            >
              <button
                type="button"
                className="staff-btn staff-btn-secondary"
                onClick={
                  closeReissueModal
                }
                disabled={
                  reissuing
                }
              >
                Отмена
              </button>

              <button
                type="button"
                className="staff-btn staff-btn-primary staff-btn-grow"
                onClick={() =>
                  void handleReissueTeacherEt()
                }
                disabled={
                  reissuing
                }
              >
                <KeyRound
                  size={18}
                />

                {reissuing
                  ? 'Выдаём...'
                  : 'Выдать новый ET'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}


      {/* STATUS MODAL */}

      {statusTarget && (
        <ModalShell
          onClose={
            closeStatusModal
          }
        >
          <div
            className="staff-modal staff-modal-confirm"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <ModalCloseButton
              onClick={
                closeStatusModal
              }
              disabled={
                statusChanging
              }
            />


            <div
              className={
                `staff-modal-icon ${
                  statusAction ===
                  'deactivate'
                    ? 'staff-modal-icon-danger'
                    : 'staff-modal-icon-success'
                }`
              }
            >
              {statusAction ===
              'deactivate' ? (
                <Ban
                  size={29}
                />
              ) : (
                <RotateCcw
                  size={29}
                />
              )}
            </div>


            <h2>
              {statusAction ===
              'deactivate'
                ? 'Деактивировать учителя?'
                : 'Восстановить доступ?'}
            </h2>


            <p
              className="staff-modal-subtitle"
            >
              {statusAction ===
              'deactivate'
                ? 'Учитель больше не сможет войти в аккаунт. Профиль и учебная история не удаляются.'
                : 'Учитель снова сможет использовать свой существующий аккаунт.'}
            </p>


            <TeacherSummary
              teacher={
                statusTarget
              }
            />


            {statusAction ===
            'deactivate' ? (
              <>
                <div
                  className="staff-danger-box"
                >
                  <AlertTriangle
                    size={18}
                  />

                  <div>
                    <strong>
                      Что произойдёт
                    </strong>

                    <span>
                      Вход будет
                      заблокирован,
                      неиспользованные ET
                      будут отозваны.
                      EDU, журнал,
                      оценки и история
                      сохранятся.
                    </span>
                  </div>
                </div>


                <label
                  className="staff-field"
                >
                  <span>
                    Причина
                  </span>

                  <textarea
                    value={
                      statusReason
                    }
                    onChange={(
                      event,
                    ) => {
                      setStatusReason(
                        event.target.value,
                      )

                      setStatusError('')
                    }}
                    placeholder="Например: сотрудник больше не работает в школе"
                    maxLength={
                      500
                    }
                    autoFocus
                  />

                  <small
                    className="staff-char-count"
                  >
                    {
                      statusReason.length
                    }
                    /500
                  </small>
                </label>
              </>
            ) : (
              <div
                className="staff-info-box staff-info-blue"
              >
                <ShieldCheck
                  size={18}
                />

                <div>
                  <strong>
                    Важно
                  </strong>

                  <span>
                    Ранее отозванные
                    ET-коды не
                    восстанавливаются.
                    Если учитель ещё
                    не активировал
                    аккаунт, после
                    восстановления
                    выдайте новый ET.
                  </span>
                </div>
              </div>
            )}


            {statusError && (
              <div
                className="staff-modal-error"
              >
                {statusError}
              </div>
            )}


            <div
              className="staff-modal-footer"
            >
              <button
                type="button"
                className="staff-btn staff-btn-secondary"
                onClick={
                  closeStatusModal
                }
                disabled={
                  statusChanging
                }
              >
                Отмена
              </button>


              <button
                type="button"
                className={
                  `staff-btn staff-btn-grow ${
                    statusAction ===
                    'deactivate'
                      ? 'staff-btn-danger'
                      : 'staff-btn-success'
                  }`
                }
                onClick={() =>
                  void handleStatusChange()
                }
                disabled={
                  statusChanging ||
                  (
                    statusAction ===
                      'deactivate' &&
                    cleanText(
                      statusReason,
                    ).length <
                      3
                  )
                }
              >
                {statusAction ===
                'deactivate' ? (
                  <Ban
                    size={18}
                  />
                ) : (
                  <RotateCcw
                    size={18}
                  />
                )}

                {statusChanging
                  ? 'Сохраняем...'
                  : statusAction ===
                    'deactivate'
                    ? 'Деактивировать'
                    : 'Восстановить доступ'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}


      {/* CREDENTIALS */}

      {credentialsResult && (
        <ModalShell
          onClose={() =>
            setCredentialsResult(
              null,
            )
          }
        >
          <div
            className="staff-modal staff-modal-result"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <ModalCloseButton
              onClick={() =>
                setCredentialsResult(
                  null,
                )
              }
            />

            <div
              className="staff-success-icon"
            >
              <Check
                size={29}
              />
            </div>

            <h2>
              {
                credentialsResult.mode ===
                  'reissue'
                  ? 'Новый ET готов'
                  : 'Учитель создан'
              }
            </h2>

            <CredentialBox
              label="Постоянный EDU"
              value={
                credentialsResult.eduLogin
              }
              copied={
                copiedField ===
                'eduLogin'
              }
              onCopy={() =>
                void handleCopy(
                  'eduLogin',
                  credentialsResult.eduLogin,
                )
              }
            />

            <CredentialBox
              label={
                credentialsResult.mode ===
                  'reissue'
                  ? 'Новый ET'
                  : 'Код первого входа'
              }
              value={
                credentialsResult.activationCode
              }
              copied={
                copiedField ===
                'activationCode'
              }
              onCopy={() =>
                void handleCopy(
                  'activationCode',
                  credentialsResult.activationCode,
                )
              }
            />

            <button
              type="button"
              className="staff-btn staff-btn-copy-all"
              onClick={() =>
                void copyCredentialsResult()
              }
            >
              <Copy
                size={17}
              />

              Скопировать всё
            </button>

            <button
              type="button"
              className="staff-btn staff-btn-primary"
              onClick={() =>
                setCredentialsResult(
                  null,
                )
              }
            >
              Готово
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  )
}


/* ========================================
   TEACHER CARD
======================================== */

function TeacherCard({
  teacher,
  copiedField,
  reissuing,
  onCopy,
  onEdit,
  onReissue,
  onDeactivate,
  onReactivate,
}) {
  const assignments =
    Array.isArray(
      teacher.assignments,
    )
      ? teacher.assignments
      : []


  const weeklyHours =
    getTeacherWeeklyHours(
      teacher,
    )


  const canReissue =
    !teacher
      .isDeactivated &&
    Boolean(
      teacher.eduLogin,
    ) &&
    !teacher
      .hasVerifiedRecoveryEmail


  const reissueBlocked =
    reissuing ||
    !canReissue


  const tooltip =
    getReissueTooltip(
      teacher,
      reissuing,
    )


  return (
    <article
      className={
        `staff-teacher-card ${
          teacher.isDeactivated
            ? 'is-deactivated'
            : ''
        }`
      }
    >
      <div
        className="staff-teacher-head"
      >
        <div
          className="staff-avatar"
        >
          {
            getInitials(
              teacher.name,
            )
          }
        </div>


        <div
          className="staff-teacher-main"
        >
          <div
            className="staff-teacher-top-row"
          >
            <div
              className="staff-teacher-info"
            >
              <strong>
                {
                  teacher.name
                }
              </strong>

              <span>
                {
                  teacher.position ||
                  'Учитель'
                }
              </span>
            </div>


            <AccountStatusBadge
              teacher={
                teacher
              }
            />
          </div>


          <div
            className="staff-teacher-meta-row"
          >
            {teacher.eduLogin ? (
              <button
                type="button"
                className="staff-edu-chip"
                onClick={() =>
                  void onCopy(
                    `teacher-${teacher.id}`,
                    teacher.eduLogin,
                  )
                }
              >
                <Copy
                  size={14}
                />

                {
                  teacher.eduLogin
                }
              </button>
            ) : (
              <span
                className="staff-missing-edu"
              >
                EDU отсутствует
              </span>
            )}


            <span
              className="staff-workload-summary"
            >
              {
                assignments.length
              }{' '}
              назнач. ·{' '}
              {
                weeklyHours
              }{' '}
              ч/нед.
            </span>
          </div>
        </div>
      </div>


      {/* DEACTIVATED INFO */}

      {teacher.isDeactivated && (
        <div
          className="staff-deactivated-box"
        >
          <Ban
            size={18}
          />

          <div>
            <strong>
              Доступ отключён
            </strong>

            {teacher.deactivationReason && (
              <span>
                Причина:{' '}
                {
                  teacher.deactivationReason
                }
              </span>
            )}

            {teacher.deactivatedAt && (
              <small>
                {
                  formatDateTime(
                    teacher.deactivatedAt,
                  )
                }
              </small>
            )}
          </div>
        </div>
      )}


      {/* WORKLOAD */}

      <div
        className="staff-assignments-box"
      >
        <div
          className="staff-assignments-header"
        >
          <small>
            Учебная нагрузка
          </small>

          <span>
            {
              assignments.length
            }
          </span>
        </div>


        {assignments.length >
        0 ? (
          assignments.map(
            (
              assignment,
              index,
            ) => (
              <div
                className="staff-assignment-row"
                key={
                  assignment.id ||
                  `${teacher.id}-${index}`
                }
              >
                <div
                  className="staff-assignment-icon"
                >
                  <BookOpen
                    size={17}
                  />
                </div>

                <div
                  className="staff-assignment-info"
                >
                  <strong>
                    {
                      assignment.subject
                    }
                  </strong>

                  <span>
                    {
                      assignment.className
                    }

                    {
                      assignment.groupName
                        ? ` · ${assignment.groupName}`
                        : ''
                    }

                    {
                      assignment.academicYear
                        ? ` · ${assignment.academicYear}`
                        : ''
                    }
                  </span>
                </div>

                <div
                  className="staff-hours"
                >
                  <Clock3
                    size={14}
                  />

                  {
                    assignment.weeklyHours
                  }

                  <span>
                    ч/нед.
                  </span>
                </div>
              </div>
            ),
          )
        ) : (
          <div
            className="staff-no-assignments"
          >
            Нагрузка пока
            не назначена.
          </div>
        )}
      </div>


      {/* ACTIONS */}

      <div
        className="staff-teacher-actions"
      >
        <button
          type="button"
          className="staff-btn staff-edit-btn"
          onClick={() =>
            onEdit(
              teacher,
            )
          }
        >
          <Pencil
            size={16}
          />

          Редактировать
        </button>


        <button
          type="button"
          className="staff-btn staff-card-secondary"
          onClick={() =>
            void onCopy(
              `teacher-actions-${teacher.id}`,
              teacher.eduLogin,
            )
          }
          disabled={
            !teacher.eduLogin
          }
        >
          {copiedField ===
          `teacher-actions-${teacher.id}` ? (
            <Check
              size={16}
            />
          ) : (
            <Copy
              size={16}
            />
          )}

          Копировать EDU
        </button>


        <span
          className={
            `staff-et-tooltip ${
              reissueBlocked
                ? 'is-blocked'
                : ''
            }`
          }
          data-tooltip={
            tooltip
          }
          tabIndex={
            reissueBlocked
              ? 0
              : -1
          }
        >
          <button
            type="button"
            className="staff-btn staff-reissue-btn"
            onClick={() =>
              onReissue(
                teacher,
              )
            }
            disabled={
              reissueBlocked
            }
          >
            <KeyRound
              size={16}
            />

            Новый ET
          </button>
        </span>


        {teacher.isDeactivated ? (
          <button
            type="button"
            className="staff-btn staff-reactivate-btn"
            onClick={() =>
              onReactivate(
                teacher,
              )
            }
          >
            <RotateCcw
              size={16}
            />

            Восстановить
          </button>
        ) : (
          <button
            type="button"
            className="staff-btn staff-deactivate-btn"
            onClick={() =>
              onDeactivate(
                teacher,
              )
            }
          >
            <Ban
              size={16}
            />

            Деактивировать
          </button>
        )}
      </div>
    </article>
  )
}


/* ========================================
   STATUS BADGE
======================================== */

function AccountStatusBadge({
  teacher,
}) {
  if (
    teacher.isDeactivated
  ) {
    return (
      <span
        className="staff-status is-deactivated"
      >
        <Ban
          size={13}
        />

        Доступ отключён
      </span>
    )
  }


  if (
    teacher
      .hasVerifiedRecoveryEmail
  ) {
    return (
      <span
        className="staff-status is-protected"
      >
        <ShieldCheck
          size={13}
        />

        Защищён
      </span>
    )
  }


  return (
    <span
      className="staff-status is-pending"
    >
      <KeyRound
        size={13}
      />

      Без recovery email
    </span>
  )
}


/* ========================================
   TEACHER FORM MODAL
======================================== */

function TeacherFormModal({
  mode,
  teacher,
  fullName,
  setFullName,
  position,
  setPosition,
  assignments,
  classes,
  error,
  saving,
  onClose,
  onSubmit,
  onUpdateAssignment,
  onAddAssignment,
  onRemoveAssignment,
}) {
  const isEdit =
    mode ===
    'edit'


  return (
    <ModalShell
      onClose={
        onClose
      }
    >
      <form
        className="staff-modal staff-modal-wide"
        onSubmit={
          onSubmit
        }
        onMouseDown={(
          event,
        ) =>
          event.stopPropagation()
        }
      >
        <ModalCloseButton
          onClick={
            onClose
          }
          disabled={
            saving
          }
        />

        <div
          className="staff-modal-icon"
        >
          {isEdit ? (
            <Pencil
              size={28}
            />
          ) : (
            <UserPlus
              size={28}
            />
          )}
        </div>

        <h2>
          {isEdit
            ? 'Редактировать учителя'
            : 'Добавить учителя'}
        </h2>

        <p
          className="staff-modal-subtitle"
        >
          {isEdit
            ? 'Можно изменить ФИО, должность и учебную нагрузку.'
            : 'Создайте учителя и назначьте классы и предметы.'}
        </p>


        {isEdit && (
          <div
            className="staff-teacher-summary"
          >
            <small>
              Постоянный EDU
            </small>

            <strong>
              {
                teacher?.eduLogin ||
                'Отсутствует'
              }
            </strong>
          </div>
        )}


        {error && (
          <div
            className="staff-modal-error"
          >
            {error}
          </div>
        )}


        <div
          className={
            isEdit
              ? 'staff-edit-grid'
              : ''
          }
        >
          <label
            className="staff-field"
          >
            <span>
              ФИО
            </span>

            <input
              value={
                fullName
              }
              onChange={(
                event,
              ) =>
                setFullName(
                  event.target.value,
                )
              }
              maxLength={
                160
              }
              required
            />
          </label>


          {isEdit && (
            <label
              className="staff-field"
            >
              <span>
                Должность
              </span>

              <input
                value={
                  position
                }
                onChange={(
                  event,
                ) =>
                  setPosition(
                    event.target.value,
                  )
                }
                maxLength={
                  120
                }
              />
            </label>
          )}
        </div>


        <AssignmentSectionHeader
          title="Учебная нагрузка"
          subtitle={
            assignments.length ===
            0
              ? 'Нет назначений'
              : `${assignments.length} назнач.`
          }
          onAdd={
            onAddAssignment
          }
          disabled={
            saving
          }
        />


        {assignments.length ===
        0 ? (
          <div
            className="staff-zero-workload"
          >
            Нагрузка не назначена.
          </div>
        ) : (
          <div
            className="staff-assignment-form-list"
          >
            {
              assignments.map(
                (
                  assignment,
                  index,
                ) => (
                  <AssignmentForm
                    key={
                      index
                    }
                    assignment={
                      assignment
                    }
                    index={
                      index
                    }
                    classes={
                      classes
                    }
                    canRemove={
                      isEdit ||
                      assignments.length >
                      1
                    }
                    disabled={
                      saving
                    }
                    onUpdate={
                      onUpdateAssignment
                    }
                    onRemove={
                      onRemoveAssignment
                    }
                  />
                ),
              )
            }
          </div>
        )}


        <div
          className="staff-modal-footer"
        >
          <button
            type="button"
            className="staff-btn staff-btn-secondary"
            onClick={
              onClose
            }
            disabled={
              saving
            }
          >
            Отмена
          </button>

          <button
            type="submit"
            className="staff-btn staff-btn-primary staff-btn-grow"
            disabled={
              saving
            }
          >
            <Check
              size={18}
            />

            {saving
              ? 'Сохраняем...'
              : isEdit
                ? 'Сохранить изменения'
                : 'Создать учителя'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}


/* ========================================
   SMALL COMPONENTS
======================================== */

function TeacherSummary({
  teacher,
}) {
  return (
    <div
      className="staff-teacher-summary"
    >
      <small>
        Учитель
      </small>

      <strong>
        {
          teacher.name
        }
      </strong>

      {teacher.eduLogin && (
        <span>
          {
            teacher.eduLogin
          }
        </span>
      )}
    </div>
  )
}


function SelectFilter({
  value,
  onChange,
  label,
  allValue = 'all',
  options,
}) {
  return (
    <select
      className="staff-select"
      value={
        value
      }
      onChange={(
        event,
      ) =>
        onChange(
          event.target.value,
        )
      }
    >
      <option
        value={
          allValue
        }
      >
        {label}
      </option>

      {
        options.map(
          (
            option,
          ) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {
                option.label
              }
            </option>
          ),
        )
      }
    </select>
  )
}


function AssignmentSectionHeader({
  title,
  subtitle,
  onAdd,
  disabled,
}) {
  return (
    <div
      className="staff-section-title"
    >
      <div>
        <strong>
          {title}
        </strong>

        <small>
          {subtitle}
        </small>
      </div>

      <button
        type="button"
        className="staff-btn staff-btn-soft"
        onClick={
          onAdd
        }
        disabled={
          disabled
        }
      >
        <Plus
          size={16}
        />

        Добавить
      </button>
    </div>
  )
}


function AssignmentForm({
  assignment,
  index,
  classes,
  canRemove,
  disabled,
  onUpdate,
  onRemove,
}) {
  return (
    <div
      className="staff-assignment-form-card"
    >
      <div
        className="staff-assignment-form-head"
      >
        <span>
          Назначение{' '}
          {
            index + 1
          }
        </span>

        {canRemove && (
          <button
            type="button"
            className="staff-icon-btn staff-remove-btn"
            onClick={() =>
              onRemove(
                index,
              )
            }
            disabled={
              disabled
            }
          >
            <Trash2
              size={16}
            />
          </button>
        )}
      </div>

      <div
        className="staff-assignment-grid"
      >
        <label
          className="staff-field staff-field-small"
        >
          <span>
            Класс
          </span>

          <select
            value={
              assignment.classId
            }
            onChange={(
              event,
            ) =>
              onUpdate(
                index,
                'classId',
                event.target.value,
              )
            }
            disabled={
              disabled
            }
            required
          >
            <option
              value=""
            >
              Выберите класс
            </option>

            {
              classes.map(
                (
                  schoolClass,
                ) => (
                  <option
                    key={
                      schoolClass.id
                    }
                    value={
                      schoolClass.id
                    }
                  >
                    {
                      schoolClass.className
                    }

                    {
                      schoolClass.academicYear
                        ? ` — ${schoolClass.academicYear}`
                        : ''
                    }
                  </option>
                ),
              )
            }
          </select>
        </label>

        <label
          className="staff-field staff-field-small"
        >
          <span>
            Предмет
          </span>

          <input
            value={
              assignment.subject
            }
            onChange={(
              event,
            ) =>
              onUpdate(
                index,
                'subject',
                event.target.value,
              )
            }
            maxLength={
              120
            }
            required
          />
        </label>

        <label
          className="staff-field staff-field-small"
        >
          <span>
            Часов
          </span>

          <input
            type="number"
            min="1"
            max="40"
            value={
              assignment.weeklyHours
            }
            onChange={(
              event,
            ) =>
              onUpdate(
                index,
                'weeklyHours',
                event.target.value,
              )
            }
            required
          />
        </label>

        <label
          className="staff-field staff-field-small"
        >
          <span>
            Подгруппа
          </span>

          <input
            value={
              assignment.groupName
            }
            onChange={(
              event,
            ) =>
              onUpdate(
                index,
                'groupName',
                event.target.value,
              )
            }
            maxLength={
              80
            }
          />
        </label>
      </div>
    </div>
  )
}


function CredentialBox({
  label,
  value,
  copied,
  onCopy,
}) {
  return (
    <div
      className="staff-credential-box"
    >
      <div>
        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>
      </div>

      <button
        type="button"
        className="staff-btn staff-credential-copy"
        onClick={
          onCopy
        }
      >
        {copied ? (
          <Check
            size={16}
          />
        ) : (
          <Copy
            size={16}
          />
        )}

        Копировать
      </button>
    </div>
  )
}


function StatCard({
  icon: Icon,
  value,
  label,
  danger = false,
}) {
  return (
    <div
      className={
        `staff-stat-card ${
          danger
            ? 'is-danger'
            : ''
        }`
      }
    >
      <div
        className="staff-stat-icon"
      >
        <Icon
          size={20}
        />
      </div>

      <div>
        <strong>
          {value}
        </strong>

        <small>
          {label}
        </small>
      </div>
    </div>
  )
}


function EmptyState({
  text,
}) {
  return (
    <div
      className="staff-empty"
    >
      <Users
        size={31}
      />

      <span>
        {text}
      </span>
    </div>
  )
}


function ModalShell({
  children,
  onClose,
}) {
  return (
    <div
      className="staff-overlay"
      onMouseDown={
        onClose
      }
    >
      {children}
    </div>
  )
}


function ModalCloseButton({
  onClick,
  disabled = false,
}) {
  return (
    <button
      type="button"
      className="staff-icon-btn staff-modal-close"
      onClick={
        onClick
      }
      disabled={
        disabled
      }
    >
      <X
        size={20}
      />
    </button>
  )
}


/* ========================================
   CSS
======================================== */

const STAFF_PAGE_CSS = `
.staff-page {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 18px;
  box-sizing: border-box;
  color: #102343;
}

.staff-page *,
.staff-page *::before,
.staff-page *::after {
  box-sizing: border-box;
}

.staff-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 15px;
  flex-wrap: wrap;
  margin-bottom: 17px;
}

.staff-header h1 {
  margin: 4px 0 0;
  font-size: 30px;
}

.staff-header p {
  margin: 6px 0 0;
  color: #718096;
  font-size: 13px;
}

.staff-eyebrow {
  color: #1267e8;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.staff-btn,
.staff-icon-btn {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.staff-btn:disabled,
.staff-icon-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.staff-btn {
  min-height: 40px;
  padding: 0 13px;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
}

.staff-btn-primary {
  background: #1267e8;
  color: #fff;
}

.staff-btn-secondary {
  border: 1px solid #d8e3ef;
  background: #fff;
  color: #526b8a;
}

.staff-btn-soft {
  min-height: 34px;
  background: #edf5ff;
  color: #1267e8;
}

.staff-btn-grow {
  flex: 1;
}

.staff-btn-danger {
  background: #dc2626;
  color: #fff;
}

.staff-btn-success {
  background: #059669;
  color: #fff;
}


/* STATS */

.staff-stats {
  display: grid;
  grid-template-columns:
    repeat(5, minmax(0,1fr));
  gap: 9px;
  margin-bottom: 14px;
}

.staff-stat-card {
  min-width: 0;
  padding: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid #dfe8f3;
  border-radius: 15px;
}

.staff-stat-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #edf5ff;
  color: #1267e8;
}

.staff-stat-card.is-danger
.staff-stat-icon {
  background: #fff1f2;
  color: #dc2626;
}

.staff-stat-card strong,
.staff-stat-card small {
  display: block;
}

.staff-stat-card strong {
  font-size: 18px;
}

.staff-stat-card small {
  color: #718096;
  font-size: 10px;
}


/* TOOLBAR */

.staff-toolbar-card {
  margin-bottom: 13px;
  padding: 10px;
  display: grid;
  gap: 9px;
  background: #fff;
  border: 1px solid #dfe8f3;
  border-radius: 15px;
}

.staff-search-row {
  display: flex;
  gap: 8px;
}

.staff-search-box {
  flex: 1;
  min-height: 45px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #dfe8f3;
  border-radius: 13px;
}

.staff-search-box input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
}

.staff-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.staff-clear-btn {
  width: 30px;
  height: 30px;
  border-radius: 9px;
}

.staff-refresh-btn {
  width: 45px;
  height: 45px;
  border: 1px solid #dfe8f3;
  border-radius: 13px;
  background: #fff;
}

.staff-filter-row {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.staff-filter-label {
  display: flex;
  gap: 5px;
  align-items: center;
  color: #718096;
  font-size: 11px;
  font-weight: 800;
}

.staff-select {
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid #d8e3ef;
  border-radius: 10px;
  background: #fff;
  color: #526b8a;
}

.staff-reset-btn {
  min-height: 34px;
  border: 0;
  border-radius: 9px;
  padding: 0 10px;
  cursor: pointer;
}


/* ALERT */

.staff-alert {
  margin-bottom: 11px;
  padding: 11px 13px;
  border-radius: 12px;
  font-size: 12px;
}

.staff-alert-error {
  background: #fff1f2;
  color: #be123c;
}

.staff-alert-success {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ecfdf5;
  color: #047857;
}


/* LIST */

.staff-list-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid #dfe8f3;
  border-radius: 18px;
}

.staff-list-header {
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #edf1f6;
}

.staff-list-header small {
  display: block;
  color: #94a3b8;
}

.staff-count-badge {
  padding: 4px 9px;
  border-radius: 999px;
  background: #edf5ff;
  color: #1267e8;
  font-weight: 800;
}


/* TEACHER */

.staff-teacher-card {
  padding: 15px;
  border-bottom: 1px solid #edf1f6;
  transition: .15s ease;
}

.staff-teacher-card.is-deactivated {
  background: #fffafa;
  border-left: 4px solid #ef4444;
}

.staff-teacher-head {
  display: flex;
  gap: 11px;
  align-items: center;
}

.staff-avatar {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: 13px;
  background: #1267e8;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.is-deactivated
.staff-avatar {
  background: #94a3b8;
}

.staff-teacher-main {
  flex: 1;
  min-width: 0;
}

.staff-teacher-top-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.staff-teacher-info {
  display: grid;
  gap: 3px;
}

.staff-teacher-info span {
  color: #718096;
  font-size: 12px;
}

.staff-teacher-meta-row {
  margin-top: 6px;
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.staff-edu-chip {
  padding: 6px 9px;
  border: 1px solid #bfdbfe;
  border-radius: 9px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 800;
}

.staff-workload-summary {
  font-size: 10px;
  color: #718096;
}

.staff-missing-edu {
  color: #e11d48;
  font-size: 10px;
}


/* STATUS */

.staff-status {
  padding: 5px 8px;
  display: inline-flex;
  gap: 4px;
  align-items: center;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
}

.staff-status.is-protected {
  background: #ecfdf5;
  color: #047857;
}

.staff-status.is-pending {
  background: #fff7ed;
  color: #c2410c;
}

.staff-status.is-deactivated {
  background: #fee2e2;
  color: #b91c1c;
}


/* DEACTIVATED BOX */

.staff-deactivated-box {
  margin-top: 12px;
  padding: 10px 12px;
  display: flex;
  gap: 9px;
  align-items: flex-start;
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #fff1f2;
  color: #b91c1c;
}

.staff-deactivated-box strong,
.staff-deactivated-box span,
.staff-deactivated-box small {
  display: block;
}

.staff-deactivated-box span {
  margin-top: 2px;
  font-size: 11px;
}

.staff-deactivated-box small {
  margin-top: 3px;
  opacity: .75;
}


/* WORKLOAD */

.staff-assignments-box {
  margin-top: 12px;
  padding: 11px;
  background: #f8fafc;
  border-radius: 13px;
}

.staff-assignments-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.staff-assignment-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 0;
  border-bottom: 1px solid #e7edf5;
}

.staff-assignment-row:last-child {
  border-bottom: 0;
}

.staff-assignment-icon {
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eaf3ff;
  color: #1267e8;
  border-radius: 10px;
}

.staff-assignment-info {
  flex: 1;
  display: grid;
  font-size: 12px;
}

.staff-assignment-info span {
  color: #718096;
}

.staff-hours {
  display: flex;
  gap: 4px;
  align-items: center;
  color: #718096;
  font-size: 11px;
}

.staff-no-assignments {
  color: #94a3b8;
}


/* ACTIONS */

.staff-teacher-actions {
  margin-top: 11px;
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  flex-wrap: wrap;
}

.staff-card-secondary,
.staff-edit-btn,
.staff-reissue-btn,
.staff-deactivate-btn,
.staff-reactivate-btn {
  min-height: 36px;
  font-size: 11px;
}

.staff-card-secondary {
  border: 1px solid #d8e3ef;
  background: #fff;
}

.staff-edit-btn {
  border: 1px solid #bfdbfe;
  background: #fff;
  color: #1267e8;
}

.staff-reissue-btn {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}

.staff-deactivate-btn {
  border: 1px solid #fecaca;
  background: #fff;
  color: #dc2626;
}

.staff-reactivate-btn {
  border: 1px solid #a7f3d0;
  background: #ecfdf5;
  color: #047857;
}


/* TOOLTIP */

.staff-et-tooltip {
  position: relative;
  display: inline-flex;
}

.staff-et-tooltip.is-blocked
.staff-reissue-btn {
  pointer-events: none;
}

.staff-et-tooltip.is-blocked::after {
  content: attr(data-tooltip);
  position: absolute;
  right: 0;
  bottom: calc(100% + 9px);
  z-index: 30;
  width: 285px;
  max-width: 80vw;
  padding: 9px 10px;
  border-radius: 10px;
  background: #102343;
  color: #fff;
  font-size: 11px;
  line-height: 1.45;
  opacity: 0;
  pointer-events: none;
}

.staff-et-tooltip.is-blocked:hover::after,
.staff-et-tooltip.is-blocked:focus::after {
  opacity: 1;
}


/* MODAL */

.staff-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  background: rgba(15,35,65,.42);
  backdrop-filter: blur(5px);
}

.staff-modal {
  position: relative;
  width: 100%;
  max-width: 580px;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  padding: 23px;
  display: grid;
  gap: 14px;
  background: #fff;
  border-radius: 22px;
  box-shadow: 0 22px 60px rgba(15,35,65,.18);
}

.staff-modal-wide {
  max-width: 620px;
}

.staff-modal-confirm,
.staff-modal-result {
  max-width: 460px;
}

.staff-modal h2 {
  margin: 0;
  text-align: center;
}

.staff-modal-subtitle {
  margin: -5px 0 3px;
  text-align: center;
  color: #718096;
  font-size: 12px;
  line-height: 1.5;
}

.staff-modal-close {
  position: absolute;
  top: 11px;
  right: 11px;
  width: 38px;
  height: 38px;
  border-radius: 11px;
}

.staff-modal-icon,
.staff-success-icon {
  width: 58px;
  height: 58px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 17px;
  background: #eaf3ff;
  color: #1267e8;
}

.staff-modal-icon-danger {
  background: #fee2e2;
  color: #dc2626;
}

.staff-modal-icon-success,
.staff-success-icon {
  background: #dcfce7;
  color: #047857;
}

.staff-modal-error {
  padding: 10px;
  border-radius: 11px;
  background: #fff1f2;
  color: #be123c;
}


/* FIELD */

.staff-field {
  position: relative;
  display: grid;
  gap: 7px;
  font-size: 13px;
  font-weight: 700;
}

.staff-field-small {
  font-size: 11px;
}

.staff-field input,
.staff-field select,
.staff-field textarea {
  width: 100%;
  min-height: 46px;
  padding: 0 12px;
  border: 1px solid #d8e3ef;
  border-radius: 11px;
  outline: 0;
  resize: vertical;
}

.staff-field textarea {
  min-height: 105px;
  padding-top: 11px;
}

.staff-char-count {
  justify-self: end;
  color: #94a3b8;
  font-size: 10px;
}

.staff-edit-grid,
.staff-assignment-grid {
  display: grid;
  grid-template-columns:
    repeat(2,minmax(0,1fr));
  gap: 10px;
}

.staff-section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.staff-section-title small {
  display: block;
  color: #94a3b8;
}

.staff-assignment-form-list {
  display: grid;
  gap: 10px;
}

.staff-assignment-form-card {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 13px;
  background: #f8fafc;
}

.staff-assignment-form-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 11px;
  font-weight: 800;
}

.staff-remove-btn {
  width: 31px;
  height: 31px;
  border-radius: 9px;
  background: #fff1f2;
  color: #dc2626;
}

.staff-zero-workload {
  padding: 15px;
  border: 1px dashed #cbd5e1;
  border-radius: 13px;
  color: #64748b;
}

.staff-modal-footer {
  display: flex;
  gap: 9px;
}


/* SUMMARY */

.staff-teacher-summary {
  padding: 11px;
  display: grid;
  gap: 3px;
  text-align: center;
  background: #f8fafc;
  border-radius: 12px;
}

.staff-teacher-summary small {
  color: #94a3b8;
}

.staff-teacher-summary span {
  color: #1267e8;
  font-weight: 800;
}


/* INFO */

.staff-danger-box,
.staff-info-box {
  padding: 11px 12px;
  display: flex;
  gap: 9px;
  border-radius: 12px;
  font-size: 11px;
  line-height: 1.5;
}

.staff-danger-box {
  background: #fff1f2;
  color: #b91c1c;
}

.staff-info-box {
  background: #eff6ff;
  color: #1d4ed8;
}

.staff-danger-box strong,
.staff-danger-box span,
.staff-info-box strong,
.staff-info-box span {
  display: block;
}


/* CREDENTIAL */

.staff-credential-box {
  padding: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #edf5ff;
  border-radius: 14px;
}

.staff-credential-box small,
.staff-credential-box strong {
  display: block;
}

.staff-credential-copy {
  background: #1267e8;
  color: #fff;
}

.staff-btn-copy-all {
  border: 1px solid #bfdbfe;
  background: #fff;
  color: #1267e8;
}

.staff-empty {
  min-height: 170px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: #8193ad;
}

.staff-spin {
  animation: staffSpin .8s linear infinite;
}

@keyframes staffSpin {
  to {
    transform: rotate(360deg);
  }
}


/* TABLET */

@media (max-width: 850px) {
  .staff-stats {
    grid-template-columns:
      repeat(2,minmax(0,1fr));
  }
}

@media (max-width: 760px) {
  .staff-page {
    padding: 12px;
  }

  .staff-header
  .staff-btn-primary {
    width: 100%;
  }

  .staff-filter-row {
    display: grid;
    grid-template-columns:
      1fr 1fr;
  }

  .staff-filter-label,
  .staff-reset-btn {
    grid-column: 1 / -1;
  }

  .staff-select {
    width: 100%;
  }

  .staff-edit-grid,
  .staff-assignment-grid {
    grid-template-columns: 1fr;
  }

  .staff-teacher-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .staff-teacher-actions > *,
  .staff-teacher-actions
  .staff-btn {
    width: 100%;
  }
}

@media (max-width: 520px) {
  .staff-stats {
    grid-template-columns:
      1fr 1fr;
  }

  .staff-filter-row {
    grid-template-columns: 1fr;
  }

  .staff-filter-label,
  .staff-reset-btn {
    grid-column: auto;
  }

  .staff-teacher-actions {
    grid-template-columns: 1fr;
  }

  .staff-assignment-row {
    flex-wrap: wrap;
  }

  .staff-modal {
    padding: 20px 16px;
  }

  .staff-modal-footer {
    flex-direction: column-reverse;
  }

  .staff-modal-footer
  .staff-btn {
    width: 100%;
  }

  .staff-credential-box {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
}
`


export default AdminStaffPage