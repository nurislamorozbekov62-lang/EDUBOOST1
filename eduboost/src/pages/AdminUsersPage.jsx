import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Archive,
  ArchiveRestore,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  GraduationCap,
  KeyRound,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

import * as XLSX from 'xlsx'

import {
  useAuth,
} from '../context/AuthContext'

import {
  supabase,
} from '../lib/supabase'

import {
  deleteUnactivatedSchoolStudent,
  getSchoolClasses,
  getSchoolStudents,
  reissueStudentActivationCode,
  setSchoolStudentArchived,
} from '../services/supabaseSchoolAdminService'


const IMPORT_CONCURRENCY = 4

const CARD_CONCURRENCY = 4


function AdminUsersPage() {
  const {
    user,
  } = useAuth()


  /* =========================================================
     SCHOOL DATA
  ========================================================= */

  const [
    students,
    setStudents,
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
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')


  /* =========================================================
     FILTERS
  ========================================================= */

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    showArchived,
    setShowArchived,
  ] = useState(false)


  /* =========================================================
     MANUAL CREATE
  ========================================================= */

  const [
    showCreate,
    setShowCreate,
  ] = useState(false)

  const [
    fullName,
    setFullName,
  ] = useState('')

  const [
    classId,
    setClassId,
  ] = useState('')

  const [
    creating,
    setCreating,
  ] = useState(false)


  /* =========================================================
     STUDENT ACTIONS
  ========================================================= */

  const [
    actionsStudentId,
    setActionsStudentId,
  ] = useState(null)

  const [
    reissuingId,
    setReissuingId,
  ] = useState(null)

  const [
    archiveLoadingId,
    setArchiveLoadingId,
  ] = useState(null)

  const [
    deletingId,
    setDeletingId,
  ] = useState(null)


  /* =========================================================
     ACTIVATION
  ========================================================= */

  const [
    activationResult,
    setActivationResult,
  ] = useState(null)

  const [
    copiedCode,
    setCopiedCode,
  ] = useState(false)

  const [
    copiedLoginId,
    setCopiedLoginId,
  ] = useState(null)


  /* =========================================================
     EXCEL IMPORT
  ========================================================= */

  const [
    showImport,
    setShowImport,
  ] = useState(false)

  const [
    importFileName,
    setImportFileName,
  ] = useState('')

  const [
    importRows,
    setImportRows,
  ] = useState([])

  const [
    importResults,
    setImportResults,
  ] = useState([])

  const [
    importError,
    setImportError,
  ] = useState('')

  const [
    importing,
    setImporting,
  ] = useState(false)

  const [
    importProgress,
    setImportProgress,
  ] = useState({
    current: 0,
    total: 0,
  })


  /* =========================================================
     CLASS CARDS
  ========================================================= */

  const [
    showClassCards,
    setShowClassCards,
  ] = useState(false)

  const [
    cardsClassId,
    setCardsClassId,
  ] = useState('')

  const [
    selectedCardStudentIds,
    setSelectedCardStudentIds,
  ] = useState([])

  const [
    classCardResults,
    setClassCardResults,
  ] = useState([])

  const [
    preparingCards,
    setPreparingCards,
  ] = useState(false)

  const [
    classCardError,
    setClassCardError,
  ] = useState('')

  const [
    cardProgress,
    setCardProgress,
  ] = useState({
    current: 0,
    total: 0,
  })


  /* =========================================================
     LOAD
  ========================================================= */

  useEffect(() => {
    void loadData()
  }, [
    user?.schoolId,
  ])


  async function loadData({
    silent = false,
  } = {}) {
    if (
      !user?.schoolId
    ) {
      setLoading(false)

      setError(
        'Не удалось определить школу администратора.',
      )

      return {
        classRows: [],
        studentRows: [],
      }
    }


    try {
      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }


      setError('')


      const [
        classRows,
        studentRows,
      ] =
        await Promise.all([
          getSchoolClasses(
            user.schoolId,
          ),

          getSchoolStudents(
            user.schoolId,
          ),
        ])


      const safeClasses =
        Array.isArray(
          classRows,
        )
          ? classRows
          : []


      const safeStudents =
        Array.isArray(
          studentRows,
        )
          ? studentRows
          : []


      setClasses(
        safeClasses,
      )

      setStudents(
        safeStudents,
      )


      setClassId(
        (
          current,
        ) => {
          const exists =
            safeClasses.some(
              (
                item,
              ) =>
                String(
                  item.id,
                ) ===
                String(
                  current,
                ),
            )


          if (exists) {
            return current
          }


          return (
            safeClasses[0]?.id ||
            ''
          )
        },
      )


      return {
        classRows:
          safeClasses,

        studentRows:
          safeStudents,
      }
    } catch (
      loadError
    ) {
      console.error(
        'Admin students:',
        loadError,
      )


      setError(
        loadError?.message ||
          'Не удалось загрузить учеников.',
      )


      return {
        classRows: [],
        studentRows: [],
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }


  /* =========================================================
     FILTERED STUDENTS
  ========================================================= */

  const filteredStudents =
    useMemo(() => {
      const query =
        normalizeSearch(
          search,
        )


      return students.filter(
        (
          student,
        ) => {
          if (
            !showArchived &&
            student.isArchived
          ) {
            return false
          }


          if (!query) {
            return true
          }


          const haystack =
            normalizeSearch(
              [
                student.fullName,
                student.className,
                student.studentLogin,
              ].join(' '),
            )


          return haystack.includes(
            query,
          )
        },
      )
    }, [
      students,
      search,
      showArchived,
    ])


  const activeStudents =
    useMemo(
      () =>
        students.filter(
          (
            student,
          ) =>
            !student.isArchived,
        ),
      [
        students,
      ],
    )


  const activatedCount =
    useMemo(
      () =>
        activeStudents.filter(
          (
            student,
          ) =>
            student.activated,
        ).length,
      [
        activeStudents,
      ],
    )


  const waitingCount =
    activeStudents.length -
    activatedCount


  const archivedCount =
    useMemo(
      () =>
        students.filter(
          (
            student,
          ) =>
            student.isArchived,
        ).length,
      [
        students,
      ],
    )


  /* =========================================================
     SAFE CREATE
  ========================================================= */

  async function createStudentSafe({
    fullName:
      targetFullName,

    classId:
      targetClassId,
  }) {
    const safeName =
      cleanFullName(
        targetFullName,
      )


    if (
      safeName.length <
      2
    ) {
      throw new Error(
        'Введите ФИО ученика.',
      )
    }


    if (
      !targetClassId
    ) {
      throw new Error(
        'Выберите класс.',
      )
    }


    const {
      data,
      error:
        rpcError,
    } =
      await supabase.rpc(
        'create_school_student_safe',
        {
          p_full_name:
            safeName,

          p_class_id:
            targetClassId,

          p_expires_hours:
            168,
        },
      )


    if (rpcError) {
      throw new Error(
        rpcError.message ||
          'Не удалось создать ученика.',
      )
    }


    const row =
      Array.isArray(data)
        ? data[0]
        : data


    if (!row) {
      throw new Error(
        'Supabase не вернул результат.',
      )
    }


    return {
      studentId:
        row.student_id,

      fullName:
        row.full_name,

      schoolId:
        row.school_id,

      classId:
        row.class_id,

      className:
        row.class_name,

      academicYear:
        row.academic_year,

      activationCode:
        row.activation_code,

      expiresAt:
        row.expires_at,

      alreadyExists:
        Boolean(
          row.already_exists,
        ),
    }
  }


  /* =========================================================
     MANUAL CREATE
  ========================================================= */

  function openCreateModal() {
    setError('')
    setSuccess('')
    setFullName('')

    setClassId(
      classes[0]?.id ||
      '',
    )

    setShowCreate(true)
  }


  function closeCreateModal() {
    if (creating) {
      return
    }

    setShowCreate(false)
    setFullName('')
  }


  async function handleCreateStudent(
    event,
  ) {
    event.preventDefault()


    try {
      setCreating(true)
      setError('')
      setSuccess('')


      const result =
        await createStudentSafe({
          fullName,
          classId,
        })


      if (
        result.alreadyExists
      ) {
        throw new Error(
          `Ученик «${result.fullName}» уже есть в классе ${result.className}.`,
        )
      }


      const refreshed =
        await loadData({
          silent: true,
        })


      const createdStudent =
        refreshed.studentRows.find(
          (
            student,
          ) =>
            String(
              student.id,
            ) ===
            String(
              result.studentId,
            ),
        )


      setActivationResult({
        ...result,

        studentLogin:
          createdStudent
            ?.studentLogin ||
          '',
      })


      setShowCreate(false)
      setFullName('')


      setSuccess(
        'Ученик успешно создан.',
      )
    } catch (
      createError
    ) {
      console.error(
        'Create student:',
        createError,
      )


      setError(
        createError?.message ||
          'Не удалось создать ученика.',
      )
    } finally {
      setCreating(false)
    }
  }


  /* =========================================================
     COPY LOGIN
  ========================================================= */

  async function handleCopyLogin(
    student,
  ) {
    if (
      !student.studentLogin
    ) {
      return
    }


    try {
      await navigator
        .clipboard
        .writeText(
          student.studentLogin,
        )


      setCopiedLoginId(
        student.id,
      )


      window.setTimeout(
        () => {
          setCopiedLoginId(
            null,
          )
        },
        1500,
      )
    } catch {
      setError(
        'Не удалось скопировать логин.',
      )
    }
  }


  /* =========================================================
     REISSUE
  ========================================================= */

  async function handleReissue(
    student,
  ) {
    if (
      student.activated
    ) {
      return
    }


    const confirmed =
      window.confirm(
        `Выдать новый EB-код ученику «${student.fullName}»?\n\nСтарый код перестанет работать.`,
      )


    if (!confirmed) {
      return
    }


    try {
      setReissuingId(
        student.id,
      )

      setError('')
      setSuccess('')


      const result =
        await reissueStudentActivationCode(
          student.id,
        )


      setActivationResult({
        ...result,

        fullName:
          result.fullName ||
          student.fullName,

        className:
          result.className ||
          student.className,

        studentLogin:
          student.studentLogin,
      })


      setActionsStudentId(
        null,
      )
    } catch (
      reissueError
    ) {
      console.error(
        'Reissue:',
        reissueError,
      )


      setError(
        reissueError?.message ||
          'Не удалось создать новый EB-код.',
      )
    } finally {
      setReissuingId(
        null,
      )
    }
  }


  /* =========================================================
     ARCHIVE
  ========================================================= */

  async function handleArchive(
    student,
  ) {
    const willArchive =
      !student.isArchived


    const confirmed =
      window.confirm(
        willArchive
          ? `Архивировать ученика «${student.fullName}»?\n\nИстория ученика сохранится.`
          : `Вернуть ученика «${student.fullName}» из архива?`,
      )


    if (!confirmed) {
      return
    }


    try {
      setArchiveLoadingId(
        student.id,
      )

      setError('')
      setSuccess('')


      await setSchoolStudentArchived(
        student.id,
        willArchive,
      )


      setActionsStudentId(
        null,
      )


      await loadData({
        silent: true,
      })


      setSuccess(
        willArchive
          ? 'Ученик архивирован.'
          : 'Ученик восстановлен.',
      )
    } catch (
      archiveError
    ) {
      console.error(
        'Archive:',
        archiveError,
      )


      setError(
        archiveError?.message ||
          'Не удалось изменить статус ученика.',
      )
    } finally {
      setArchiveLoadingId(
        null,
      )
    }
  }


  /* =========================================================
     DELETE
  ========================================================= */

  async function handleDelete(
    student,
  ) {
    if (
      student.activated
    ) {
      setError(
        'Активированный аккаунт нельзя удалить. Используйте архив.',
      )

      return
    }


    const confirmed =
      window.confirm(
        `Удалить ученика «${student.fullName}» навсегда?\n\nЭто действие нельзя отменить.`,
      )


    if (!confirmed) {
      return
    }


    try {
      setDeletingId(
        student.id,
      )

      setError('')
      setSuccess('')


      await deleteUnactivatedSchoolStudent(
        student.id,
      )


      setActionsStudentId(
        null,
      )


      await loadData({
        silent: true,
      })


      setSuccess(
        'Ученик удалён.',
      )
    } catch (
      deleteError
    ) {
      console.error(
        'Delete:',
        deleteError,
      )


      setError(
        deleteError?.message ||
          'Не удалось удалить ученика.',
      )
    } finally {
      setDeletingId(
        null,
      )
    }
  }


  /* =========================================================
     ACTIVATION RESULT
  ========================================================= */

  function closeActivationModal() {
    setActivationResult(
      null,
    )

    setCopiedCode(
      false,
    )
  }


  async function copyActivationCode() {
    const code =
      activationResult
        ?.activationCode


    if (!code) {
      return
    }


    try {
      await navigator
        .clipboard
        .writeText(
          code,
        )


      setCopiedCode(true)


      window.setTimeout(
        () => {
          setCopiedCode(false)
        },
        1500,
      )
    } catch {
      setCopiedCode(false)
    }
  }


  /* =========================================================
     EXCEL OPEN / CLOSE
  ========================================================= */

  function resetImportState() {
    setImportFileName('')
    setImportRows([])
    setImportResults([])
    setImportError('')

    setImportProgress({
      current: 0,
      total: 0,
    })
  }


  function openImportModal() {
    setError('')
    setSuccess('')

    resetImportState()

    setShowImport(true)
  }


  function closeImportModal() {
    if (importing) {
      return
    }

    setShowImport(false)
    resetImportState()
  }


  function importAnotherFile() {
    if (importing) {
      return
    }

    resetImportState()
  }


  /* =========================================================
     TEMPLATE
  ========================================================= */

  function downloadTemplate() {
    const firstClass =
      classes[0]
        ?.className ||
      '9 класс'


    const secondClass =
      classes[1]
        ?.className ||
      firstClass


    const worksheet =
      XLSX.utils.json_to_sheet([
        {
          ФИО:
            'Иванов Иван Иванович',

          Класс:
            firstClass,
        },

        {
          ФИО:
            'Петрова Анна Сергеевна',

          Класс:
            secondClass,
        },
      ])


    worksheet[
      '!cols'
    ] = [
      {
        wch: 34,
      },

      {
        wch: 18,
      },
    ]


    const workbook =
      XLSX.utils.book_new()


    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Ученики',
    )


    XLSX.writeFile(
      workbook,
      'eduboost_students_template.xlsx',
    )
  }


  /* =========================================================
     READ EXCEL
  ========================================================= */

  async function handleImportFile(
    event,
  ) {
    const file =
      event.target
        .files?.[0]


    event.target.value = ''


    if (!file) {
      return
    }


    try {
      setImportError('')
      setImportResults([])
      setImportRows([])

      setImportFileName(
        file.name,
      )


      const extension =
        file.name
          .split('.')
          .pop()
          ?.toLowerCase()


      if (
        ![
          'xlsx',
          'xls',
        ].includes(
          extension,
        )
      ) {
        throw new Error(
          'Нужен Excel-файл .xlsx или .xls.',
        )
      }


      const buffer =
        await file
          .arrayBuffer()


      const workbook =
        XLSX.read(
          buffer,
          {
            type: 'array',
          },
        )


      const sheetName =
        workbook
          .SheetNames?.[0]


      if (!sheetName) {
        throw new Error(
          'Excel-файл не содержит листов.',
        )
      }


      const worksheet =
        workbook.Sheets[
          sheetName
        ]


      const rawRows =
        XLSX.utils.sheet_to_json(
          worksheet,
          {
            defval: '',
            raw: false,
          },
        )


      if (
        rawRows.length ===
        0
      ) {
        throw new Error(
          'Excel-файл пуст.',
        )
      }


      const preview =
        buildImportPreview({
          rawRows,
          classes,
          students,
        })


      if (
        preview.length ===
        0
      ) {
        throw new Error(
          'В файле не найдено учеников.',
        )
      }


      setImportRows(
        preview,
      )
    } catch (
      fileError
    ) {
      console.error(
        'Excel:',
        fileError,
      )


      setImportRows([])


      setImportError(
        fileError?.message ||
          'Не удалось прочитать Excel-файл.',
      )
    }
  }


  const readyImportRows =
    useMemo(
      () =>
        importRows.filter(
          (
            row,
          ) =>
            row.status ===
            'ready',
        ),
      [
        importRows,
      ],
    )


  const skippedImportRows =
    useMemo(
      () =>
        importRows.filter(
          (
            row,
          ) =>
            row.status !==
            'ready',
        ),
      [
        importRows,
      ],
    )


  /* =========================================================
     BULK IMPORT
  ========================================================= */

  async function handleBulkImport() {
    if (
      importing ||
      readyImportRows.length ===
        0
    ) {
      return
    }


    try {
      setImporting(true)

      setImportError('')
      setImportResults([])

      setImportProgress({
        current: 0,
        total:
          readyImportRows.length,
      })


      const results = []

      let completed = 0


      for (
        let index = 0;
        index <
        readyImportRows.length;
        index +=
        IMPORT_CONCURRENCY
      ) {
        const batch =
          readyImportRows.slice(
            index,
            index +
              IMPORT_CONCURRENCY,
          )


        const batchResults =
          await Promise.all(
            batch.map(
              async (
                row,
              ) => {
                try {
                  const result =
                    await createStudentSafe({
                      fullName:
                        row.fullName,

                      classId:
                        row.classId,
                    })


                  if (
                    result.alreadyExists
                  ) {
                    return {
                      ...row,
                      ...result,

                      resultStatus:
                        'exists',

                      resultMessage:
                        'Уже существует',
                    }
                  }


                  return {
                    ...row,
                    ...result,

                    resultStatus:
                      'created',

                    resultMessage:
                      'Создан',
                  }
                } catch (
                  rowError
                ) {
                  return {
                    ...row,

                    resultStatus:
                      'error',

                    resultMessage:
                      rowError?.message ||
                      'Ошибка создания',
                  }
                }
              },
            ),
          )


        results.push(
          ...batchResults,
        )


        completed +=
          batch.length


        setImportProgress({
          current:
            completed,

          total:
            readyImportRows.length,
        })
      }


      const refreshed =
        await loadData({
          silent: true,
        })


      const studentMap =
        new Map(
          refreshed
            .studentRows
            .map(
              (
                student,
              ) => [
                String(
                  student.id,
                ),

                student,
              ],
            ),
        )


      const enrichedResults =
        results.map(
          (
            result,
          ) => {
            const student =
              result.studentId
                ? studentMap.get(
                    String(
                      result.studentId,
                    ),
                  )
                : null


            return {
              ...result,

              studentLogin:
                student
                  ?.studentLogin ||
                '',
            }
          },
        )


      setImportResults(
        enrichedResults,
      )


      const createdCount =
        enrichedResults.filter(
          (
            item,
          ) =>
            item.resultStatus ===
            'created',
        ).length


      const existsCount =
        enrichedResults.filter(
          (
            item,
          ) =>
            item.resultStatus ===
            'exists',
        ).length


      const errorCount =
        enrichedResults.filter(
          (
            item,
          ) =>
            item.resultStatus ===
            'error',
        ).length


      setSuccess(
        `Импорт завершён: создано ${createdCount}, уже существовали ${existsCount}, ошибок ${errorCount}.`,
      )
    } catch (
      bulkError
    ) {
      console.error(
        'Bulk import:',
        bulkError,
      )


      setImportError(
        bulkError?.message ||
          'Не удалось выполнить импорт.',
      )
    } finally {
      setImporting(false)
    }
  }


  /* =========================================================
     DOWNLOAD IMPORT RESULT
  ========================================================= */

  function downloadImportResults() {
    if (
      importResults.length ===
      0
    ) {
      return
    }


    const rows =
      importResults.map(
        (
          item,
        ) => ({
          ФИО:
            item.fullName ||
            '',

          Класс:
            item.className ||
            '',

          Статус:
            getImportResultLabel(
              item.resultStatus,
            ),

          'EDU-логин':
            item.studentLogin ||
            '',

          'EB-код':
            item.activationCode ||
            '',

          'Код действует до':
            item.expiresAt
              ? formatDateTime(
                  item.expiresAt,
                )
              : '',

          Комментарий:
            item.resultMessage ||
            '',
        }),
      )


    const worksheet =
      XLSX.utils.json_to_sheet(
        rows,
      )


    worksheet[
      '!cols'
    ] = [
      { wch: 34 },
      { wch: 16 },
      { wch: 18 },
      { wch: 24 },
      { wch: 25 },
      { wch: 23 },
      { wch: 35 },
    ]


    const workbook =
      XLSX.utils.book_new()


    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Результаты',
    )


    XLSX.writeFile(
      workbook,
      `eduboost_students_${getToday()}.xlsx`,
    )
  }


  /* =========================================================
     PRINT IMPORTED STUDENTS
  ========================================================= */

  function printImportedStudentCards() {
    const printable =
      importResults
        .filter(
          (
            item,
          ) =>
            item.resultStatus ===
              'created' &&
            item.activationCode,
        )
        .map(
          (
            item,
          ) => ({
            ...item,

            activated:
              false,

            resultStatus:
              'ready',
          }),
        )


    printAccessCards(
      printable,
      setImportError,
    )
  }


  /* =========================================================
     CLASS CARDS
  ========================================================= */

  function getStudentsForClass(
    targetClassId,
  ) {
    const schoolClass =
      classes.find(
        (
          item,
        ) =>
          String(
            item.id,
          ) ===
          String(
            targetClassId,
          ),
      )


    if (!schoolClass) {
      return []
    }


    return students
      .filter(
        (
          student,
        ) =>
          !student.isArchived &&
          normalizeClassName(
            student.className,
          ) ===
            normalizeClassName(
              schoolClass.className,
            ),
      )
      .sort(
        (
          first,
          second,
        ) =>
          String(
            first.fullName ||
              '',
          ).localeCompare(
            String(
              second.fullName ||
                '',
            ),
            'ru',
          ),
      )
  }


  const classCardStudents =
    useMemo(
      () =>
        getStudentsForClass(
          cardsClassId,
        ),
      [
        cardsClassId,
        classes,
        students,
      ],
    )


  const selectedCardStudents =
    useMemo(
      () =>
        classCardStudents.filter(
          (
            student,
          ) =>
            selectedCardStudentIds.includes(
              String(
                student.id,
              ),
            ),
        ),
      [
        classCardStudents,
        selectedCardStudentIds,
      ],
    )


  const selectedWaitingCards =
    selectedCardStudents.filter(
      (
        student,
      ) =>
        !student.activated,
    ).length


  const selectedActivatedCards =
    selectedCardStudents.filter(
      (
        student,
      ) =>
        student.activated,
    ).length


  function openClassCardsModal() {
    const firstClassId =
      classes[0]?.id ||
      ''


    const firstStudents =
      getStudentsForClass(
        firstClassId,
      )


    setCardsClassId(
      firstClassId,
    )

    setSelectedCardStudentIds(
      firstStudents.map(
        (
          student,
        ) =>
          String(
            student.id,
          ),
      ),
    )

    setClassCardResults([])
    setClassCardError('')

    setCardProgress({
      current: 0,
      total: 0,
    })

    setShowClassCards(true)
  }


  function closeClassCardsModal() {
    if (
      preparingCards
    ) {
      return
    }


    setShowClassCards(false)

    setCardsClassId('')

    setSelectedCardStudentIds([])

    setClassCardResults([])

    setClassCardError('')

    setCardProgress({
      current: 0,
      total: 0,
    })
  }


  function handleCardsClassChange(
    event,
  ) {
    const nextClassId =
      event.target.value


    const nextStudents =
      getStudentsForClass(
        nextClassId,
      )


    setCardsClassId(
      nextClassId,
    )


    setSelectedCardStudentIds(
      nextStudents.map(
        (
          student,
        ) =>
          String(
            student.id,
          ),
      ),
    )


    setClassCardResults([])
    setClassCardError('')


    setCardProgress({
      current: 0,
      total: 0,
    })
  }


  function toggleCardStudent(
    studentId,
  ) {
    const id =
      String(
        studentId,
      )


    setSelectedCardStudentIds(
      (
        current,
      ) => {
        if (
          current.includes(
            id,
          )
        ) {
          return current.filter(
            (
              item,
            ) =>
              item !== id,
          )
        }


        return [
          ...current,
          id,
        ]
      },
    )
  }


  function selectAllCardStudents() {
    setSelectedCardStudentIds(
      classCardStudents.map(
        (
          student,
        ) =>
          String(
            student.id,
          ),
      ),
    )
  }


  function clearCardStudents() {
    setSelectedCardStudentIds([])
  }


  async function prepareClassCards() {
    if (
      preparingCards
    ) {
      return
    }


    if (
      selectedCardStudents.length ===
      0
    ) {
      setClassCardError(
        'Выберите хотя бы одного ученика.',
      )

      return
    }


    if (
      selectedWaitingCards >
      0
    ) {
      const confirmed =
        window.confirm(
          `Для ${selectedWaitingCards} неактивированных учеников будут выданы новые EB-коды.\n\nИх старые EB-коды перестанут работать.\n\nПродолжить?`,
        )


      if (!confirmed) {
        return
      }
    }


    try {
      setPreparingCards(true)

      setClassCardError('')

      setClassCardResults([])


      setCardProgress({
        current: 0,

        total:
          selectedCardStudents.length,
      })


      const results = []

      let completed = 0


      for (
        let index = 0;
        index <
        selectedCardStudents.length;
        index +=
        CARD_CONCURRENCY
      ) {
        const batch =
          selectedCardStudents.slice(
            index,
            index +
              CARD_CONCURRENCY,
          )


        const batchResults =
          await Promise.all(
            batch.map(
              async (
                student,
              ) => {
                /*
                  Без постоянного логина
                  карточка бесполезна.
                */
                if (
                  !student.studentLogin
                ) {
                  return {
                    studentId:
                      student.id,

                    fullName:
                      student.fullName,

                    className:
                      student.className,

                    studentLogin:
                      '',

                    activated:
                      Boolean(
                        student.activated,
                      ),

                    activationCode:
                      null,

                    expiresAt:
                      null,

                    resultStatus:
                      'error',

                    resultMessage:
                      'У ученика нет EDU-логина.',
                  }
                }


                /*
                  Активированному ученику
                  новый EB-код не нужен.
                */
                if (
                  student.activated
                ) {
                  return {
                    studentId:
                      student.id,

                    fullName:
                      student.fullName,

                    className:
                      student.className,

                    studentLogin:
                      student.studentLogin,

                    activated:
                      true,

                    activationCode:
                      null,

                    expiresAt:
                      null,

                    resultStatus:
                      'ready',

                    resultMessage:
                      'Аккаунт уже активирован.',
                  }
                }


                /*
                  Неактивированному
                  выпускаем новый код.
                */
                try {
                  const result =
                    await reissueStudentActivationCode(
                      student.id,
                    )


                  if (
                    !result
                      ?.activationCode
                  ) {
                    throw new Error(
                      'EB-код не был получен.',
                    )
                  }


                  return {
                    studentId:
                      student.id,

                    fullName:
                      student.fullName,

                    className:
                      student.className,

                    studentLogin:
                      student.studentLogin,

                    activated:
                      false,

                    activationCode:
                      result.activationCode,

                    expiresAt:
                      result.expiresAt ||
                      null,

                    resultStatus:
                      'ready',

                    resultMessage:
                      'Новый EB-код создан.',
                  }
                } catch (
                  codeError
                ) {
                  console.error(
                    'Card EB code:',
                    student.id,
                    codeError,
                  )


                  return {
                    studentId:
                      student.id,

                    fullName:
                      student.fullName,

                    className:
                      student.className,

                    studentLogin:
                      student.studentLogin,

                    activated:
                      false,

                    activationCode:
                      null,

                    expiresAt:
                      null,

                    resultStatus:
                      'error',

                    resultMessage:
                      codeError?.message ||
                      'Не удалось создать EB-код.',
                  }
                }
              },
            ),
          )


        results.push(
          ...batchResults,
        )


        completed +=
          batch.length


        setCardProgress({
          current:
            completed,

          total:
            selectedCardStudents.length,
        })


        setClassCardResults([
          ...results,
        ])
      }


      const failed =
        results.filter(
          (
            item,
          ) =>
            item.resultStatus ===
            'error',
        ).length


      if (
        failed >
        0
      ) {
        setClassCardError(
          `Карточки подготовлены, но для ${failed} учеников возникла ошибка.`,
        )
      }
    } catch (
      prepareError
    ) {
      console.error(
        'Prepare cards:',
        prepareError,
      )


      setClassCardError(
        prepareError?.message ||
          'Не удалось подготовить карточки.',
      )
    } finally {
      setPreparingCards(false)
    }
  }


  function printClassCards() {
    printAccessCards(
      classCardResults.filter(
        (
          item,
        ) =>
          item.resultStatus ===
          'ready',
      ),
      setClassCardError,
    )
  }


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      <AdminUsersStyles />


      <div className="admin-users-page">

        {/* HEADER */}

        <header className="admin-users-header">

          <div>

            <span className="admin-users-eyebrow">
              Администрирование
            </span>


            <h1>
              Ученики школы
            </h1>


            <p>
              Официальный список учеников,
              EDU-логины и управление
              первым входом.
            </p>

          </div>


          <div className="admin-users-header-actions">

            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={
                openImportModal
              }
              disabled={
                classes.length ===
                0
              }
            >
              <FileSpreadsheet
                size={18}
              />

              Импорт Excel
            </button>


            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={
                openClassCardsModal
              }
              disabled={
                classes.length ===
                0 ||
                students.length ===
                0
              }
            >
              <Printer
                size={18}
              />

              Карточки класса
            </button>


            <button
              type="button"
              className="admin-button admin-button-primary"
              onClick={
                openCreateModal
              }
              disabled={
                classes.length ===
                0
              }
            >
              <Plus
                size={18}
              />

              Добавить ученика
            </button>

          </div>

        </header>


        {/* STATS */}

        <section className="admin-user-stats">

          <StatCard
            icon={Users}
            value={
              activeStudents.length
            }
            label="Ученики"
          />

          <StatCard
            icon={Check}
            value={
              activatedCount
            }
            label="Активировали"
          />

          <StatCard
            icon={KeyRound}
            value={
              waitingCount
            }
            label="Ожидают входа"
          />

          <StatCard
            icon={Archive}
            value={
              archivedCount
            }
            label="В архиве"
          />

        </section>


        {/* SEARCH */}

        <div className="admin-users-toolbar">

          <div className="admin-search">

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
                  event.target
                    .value,
                )
              }
              placeholder="ФИО, класс или EDU-логин"
            />

          </div>


          <button
            type="button"
            className="admin-refresh-button"
            disabled={
              refreshing ||
              loading
            }
            onClick={() =>
              loadData({
                silent: true,
              })
            }
          >
            <RefreshCcw
              size={18}
            />
          </button>

        </div>


        <label className="admin-archive-toggle">

          <input
            type="checkbox"
            checked={
              showArchived
            }
            onChange={(
              event,
            ) =>
              setShowArchived(
                event.target
                  .checked,
              )
            }
          />

          Показывать архив

        </label>


        {error && (
          <MessageBox
            type="error"
            text={
              error
            }
          />
        )}


        {success && (
          <MessageBox
            type="success"
            text={
              success
            }
          />
        )}


        {/* STUDENTS */}

        <section className="admin-students-card">

          <div className="admin-students-card-header">

            <strong>
              Ученики
            </strong>

            <span>
              {
                filteredStudents.length
              }
            </span>

          </div>


          {loading ? (
            <EmptyState
              text="Загружаем учеников..."
            />
          ) : filteredStudents.length ===
            0 ? (
            <EmptyState
              text="Ученики не найдены."
            />
          ) : (
            filteredStudents.map(
              (
                student,
              ) => (
                <article
                  key={
                    student.id
                  }
                  className={
                    `admin-student-row ${
                      student.isArchived
                        ? 'is-archived'
                        : ''
                    }`
                  }
                >

                  <div className="admin-student-top">

                    <div className="admin-student-avatar">
                      {getInitials(
                        student.fullName,
                      )}
                    </div>


                    <div className="admin-student-info">

                      <div className="admin-student-name-row">

                        <strong>
                          {
                            student.fullName
                          }
                        </strong>


                        <StudentStatus
                          student={
                            student
                          }
                        />

                      </div>


                      <div className="admin-student-class">

                        <GraduationCap
                          size={15}
                        />

                        {student.className ||
                          'Класс не назначен'}

                      </div>


                      <div className="admin-student-login">

                        <div>

                          <span>
                            Постоянный EDU-логин
                          </span>

                          <strong>
                            {student.studentLogin ||
                              'Не создан'}
                          </strong>

                        </div>


                        {student.studentLogin && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyLogin(
                                student,
                              )
                            }
                          >

                            {copiedLoginId ===
                            student.id ? (
                              <Check
                                size={16}
                              />
                            ) : (
                              <Copy
                                size={16}
                              />
                            )}


                            {copiedLoginId ===
                            student.id
                              ? 'Скопировано'
                              : 'Копировать'}

                          </button>
                        )}

                      </div>

                    </div>


                    <button
                      type="button"
                      className="admin-student-actions-button"
                      onClick={() =>
                        setActionsStudentId(
                          (
                            current,
                          ) =>
                            current ===
                            student.id
                              ? null
                              : student.id,
                        )
                      }
                    >
                      <MoreHorizontal
                        size={19}
                      />

                      Действия
                    </button>

                  </div>


                  {actionsStudentId ===
                    student.id && (
                    <div className="admin-student-actions">

                      <button
                        type="button"
                        onClick={() =>
                          handleCopyLogin(
                            student,
                          )
                        }
                        disabled={
                          !student.studentLogin
                        }
                      >
                        <Copy
                          size={17}
                        />

                        Скопировать EDU-логин
                      </button>


                      {!student.activated &&
                        !student.isArchived && (
                        <button
                          type="button"
                          onClick={() =>
                            handleReissue(
                              student,
                            )
                          }
                          disabled={
                            reissuingId ===
                            student.id
                          }
                        >
                          <KeyRound
                            size={17}
                          />

                          {reissuingId ===
                          student.id
                            ? 'Создаём код...'
                            : 'Выдать новый EB-код'}
                        </button>
                      )}


                      <button
                        type="button"
                        onClick={() =>
                          handleArchive(
                            student,
                          )
                        }
                        disabled={
                          archiveLoadingId ===
                          student.id
                        }
                      >

                        {student.isArchived ? (
                          <ArchiveRestore
                            size={17}
                          />
                        ) : (
                          <Archive
                            size={17}
                          />
                        )}


                        {archiveLoadingId ===
                        student.id
                          ? 'Сохраняем...'
                          : student.isArchived
                            ? 'Вернуть из архива'
                            : 'Архивировать'}

                      </button>


                      {!student.activated && (
                        <button
                          type="button"
                          className="danger"
                          onClick={() =>
                            handleDelete(
                              student,
                            )
                          }
                          disabled={
                            deletingId ===
                            student.id
                          }
                        >
                          <Trash2
                            size={17}
                          />

                          {deletingId ===
                          student.id
                            ? 'Удаляем...'
                            : 'Удалить навсегда'}
                        </button>
                      )}

                    </div>
                  )}

                </article>
              ),
            )
          )}

        </section>


        {/* MANUAL CREATE */}

        {showCreate && (
          <Modal
            onClose={
              closeCreateModal
            }
          >

            <div className="admin-modal-header">

              <div>
                <h2>
                  Добавить ученика
                </h2>

                <p>
                  Создастся карточка,
                  зачисление и EB-код.
                </p>
              </div>


              <ModalClose
                onClick={
                  closeCreateModal
                }
              />

            </div>


            <form
              className="admin-create-form"
              onSubmit={
                handleCreateStudent
              }
            >

              <label>
                ФИО ученика

                <input
                  value={
                    fullName
                  }
                  onChange={(
                    event,
                  ) =>
                    setFullName(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Орозбеков Нурислам"
                  autoFocus
                />
              </label>


              <label>
                Класс

                <select
                  value={
                    classId
                  }
                  onChange={(
                    event,
                  ) =>
                    setClassId(
                      event.target
                        .value,
                    )
                  }
                >

                  {classes.map(
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
                        {' — '}
                        {
                          schoolClass.academicYear
                        }
                      </option>
                    ),
                  )}

                </select>
              </label>


              <button
                type="submit"
                className="admin-button admin-button-primary admin-full-button"
                disabled={
                  creating ||
                  !fullName.trim() ||
                  !classId
                }
              >
                <UserPlus
                  size={17}
                />

                {creating
                  ? 'Создаём...'
                  : 'Создать ученика'}
              </button>

            </form>

          </Modal>
        )}


        {/* EXCEL IMPORT */}

        {showImport && (
          <Modal
            large
            preventClose={
              importing
            }
            onClose={
              closeImportModal
            }
          >

            <div className="admin-modal-header">

              <div>
                <h2>
                  Импорт Excel
                </h2>

                <p>
                  Колонки файла:
                  «ФИО» и «Класс».
                </p>
              </div>


              <ModalClose
                disabled={
                  importing
                }
                onClick={
                  closeImportModal
                }
              />

            </div>


            {importResults.length ===
              0 ? (
              <>

                <div className="admin-import-toolbar">

                  <label className="admin-button admin-button-primary">

                    <Upload
                      size={17}
                    />

                    Выбрать Excel

                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      hidden
                      disabled={
                        importing
                      }
                      onChange={
                        handleImportFile
                      }
                    />

                  </label>


                  <span>
                    {importFileName ||
                      'Файл не выбран'}
                  </span>


                  <button
                    type="button"
                    className="admin-button admin-button-secondary"
                    onClick={
                      downloadTemplate
                    }
                  >
                    <Download
                      size={17}
                    />

                    Скачать шаблон
                  </button>

                </div>


                {importError && (
                  <MessageBox
                    type="error"
                    text={
                      importError
                    }
                  />
                )}


                {importRows.length >
                  0 && (
                  <>

                    <div className="admin-import-summary">

                      <ImportSummaryBadge
                        type="ready"
                        text={`Готовы: ${readyImportRows.length}`}
                      />

                      <ImportSummaryBadge
                        type="warning"
                        text={`Пропущены: ${skippedImportRows.length}`}
                      />

                      <ImportSummaryBadge
                        type="normal"
                        text={`Всего: ${importRows.length}`}
                      />

                    </div>


                    <ImportPreviewTable
                      rows={
                        importRows
                      }
                    />

                  </>
                )}


                {importing && (
                  <ProgressBar
                    progress={
                      importProgress
                    }
                    text="Импортируем..."
                  />
                )}


                <div className="admin-import-footer">

                  <button
                    type="button"
                    className="admin-button admin-button-secondary"
                    disabled={
                      importing
                    }
                    onClick={
                      closeImportModal
                    }
                  >
                    Закрыть
                  </button>


                  <button
                    type="button"
                    className="admin-button admin-button-primary"
                    disabled={
                      importing ||
                      readyImportRows.length ===
                        0
                    }
                    onClick={
                      handleBulkImport
                    }
                  >
                    <Upload
                      size={17}
                    />

                    {importing
                      ? `Импорт ${importProgress.current}/${importProgress.total}`
                      : `Импортировать ${readyImportRows.length}`}
                  </button>

                </div>

              </>
            ) : (
              <ImportFinished
                results={
                  importResults
                }
                onPrint={
                  printImportedStudentCards
                }
                onDownload={
                  downloadImportResults
                }
                onAnother={
                  importAnotherFile
                }
                onClose={
                  closeImportModal
                }
              />
            )}

          </Modal>
        )}


        {/* CLASS CARDS */}

        {showClassCards && (
          <Modal
            large
            preventClose={
              preparingCards
            }
            onClose={
              closeClassCardsModal
            }
          >

            <div className="admin-modal-header">

              <div>

                <h2>
                  Карточки класса
                </h2>

                <p>
                  Выберите класс и уберите
                  галочки с учеников,
                  которым карточка не нужна.
                </p>

              </div>


              <ModalClose
                disabled={
                  preparingCards
                }
                onClick={
                  closeClassCardsModal
                }
              />

            </div>


            {classCardResults.length ===
              0 ? (
              <>

                <div className="class-cards-controls">

                  <label>

                    Класс

                    <select
                      value={
                        cardsClassId
                      }
                      disabled={
                        preparingCards
                      }
                      onChange={
                        handleCardsClassChange
                      }
                    >

                      {classes.map(
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
                            {' — '}
                            {
                              schoolClass.academicYear
                            }
                          </option>
                        ),
                      )}

                    </select>

                  </label>


                  <div className="class-cards-buttons">

                    <button
                      type="button"
                      className="admin-button admin-button-secondary"
                      disabled={
                        preparingCards ||
                        classCardStudents.length ===
                          0
                      }
                      onClick={
                        selectAllCardStudents
                      }
                    >
                      Выбрать всех
                    </button>


                    <button
                      type="button"
                      className="admin-button admin-button-secondary"
                      disabled={
                        preparingCards
                      }
                      onClick={
                        clearCardStudents
                      }
                    >
                      Снять всех
                    </button>

                  </div>

                </div>


                <div className="class-card-summary">

                  <span>
                    В классе:
                    {' '}
                    <strong>
                      {
                        classCardStudents.length
                      }
                    </strong>
                  </span>


                  <span>
                    Выбрано:
                    {' '}
                    <strong>
                      {
                        selectedCardStudents.length
                      }
                    </strong>
                  </span>


                  <span>
                    Активированы:
                    {' '}
                    <strong>
                      {
                        selectedActivatedCards
                      }
                    </strong>
                  </span>


                  <span>
                    Нужен EB-код:
                    {' '}
                    <strong>
                      {
                        selectedWaitingCards
                      }
                    </strong>
                  </span>

                </div>


                {classCardError && (
                  <MessageBox
                    type="error"
                    text={
                      classCardError
                    }
                  />
                )}


                <div className="class-student-list">

                  {classCardStudents.length ===
                    0 ? (
                    <EmptyState
                      text="В этом классе нет учеников."
                    />
                  ) : (
                    classCardStudents.map(
                      (
                        student,
                      ) => {
                        const checked =
                          selectedCardStudentIds.includes(
                            String(
                              student.id,
                            ),
                          )


                        return (
                          <label
                            key={
                              student.id
                            }
                            className={
                              `class-student-check ${
                                checked
                                  ? 'selected'
                                  : ''
                              }`
                            }
                          >

                            <input
                              type="checkbox"
                              checked={
                                checked
                              }
                              disabled={
                                preparingCards
                              }
                              onChange={() =>
                                toggleCardStudent(
                                  student.id,
                                )
                              }
                            />


                            <div className="class-student-check-main">

                              <strong>
                                {
                                  student.fullName
                                }
                              </strong>


                              <span>
                                {
                                  student.studentLogin ||
                                  'Нет EDU-логина'
                                }
                              </span>

                            </div>


                            <StudentStatus
                              student={
                                student
                              }
                            />

                          </label>
                        )
                      },
                    )
                  )}

                </div>


                {preparingCards && (
                  <ProgressBar
                    progress={
                      cardProgress
                    }
                    text="Готовим карточки..."
                  />
                )}


                <div className="admin-import-footer">

                  <button
                    type="button"
                    className="admin-button admin-button-secondary"
                    disabled={
                      preparingCards
                    }
                    onClick={
                      closeClassCardsModal
                    }
                  >
                    Закрыть
                  </button>


                  <button
                    type="button"
                    className="admin-button admin-button-primary"
                    disabled={
                      preparingCards ||
                      selectedCardStudents.length ===
                        0
                    }
                    onClick={
                      prepareClassCards
                    }
                  >
                    <Printer
                      size={17}
                    />

                    {preparingCards
                      ? `Подготовка ${cardProgress.current}/${cardProgress.total}`
                      : `Подготовить карточки (${selectedCardStudents.length})`}
                  </button>

                </div>

              </>
            ) : (
              <ClassCardsReady
                results={
                  classCardResults
                }
                error={
                  classCardError
                }
                onPrint={
                  printClassCards
                }
                onClose={
                  closeClassCardsModal
                }
              />
            )}

          </Modal>
        )}


        {/* ACTIVATION MODAL */}

        {activationResult && (
          <Modal
            onClose={
              closeActivationModal
            }
          >

            <div className="activation-result">

              <div className="activation-result-icon">
                <KeyRound
                  size={28}
                />
              </div>


              <h2>
                Код готов
              </h2>


              <p>
                Передайте этот код
                ученику для первого входа.
              </p>


              <strong>
                {
                  activationResult.fullName
                }
              </strong>


              <span className="activation-result-class">
                {
                  activationResult.className
                }
              </span>


              <div className="activation-code">

                <small>
                  EB-код
                </small>


                <strong>
                  {
                    activationResult.activationCode
                  }
                </strong>


                <button
                  type="button"
                  onClick={
                    copyActivationCode
                  }
                >
                  {copiedCode ? (
                    <Check
                      size={16}
                    />
                  ) : (
                    <Copy
                      size={16}
                    />
                  )}

                  {copiedCode
                    ? 'Скопировано'
                    : 'Скопировать'}
                </button>

              </div>


              {activationResult.studentLogin && (
                <div className="activation-login">

                  <small>
                    Постоянный EDU-логин
                  </small>

                  <strong>
                    {
                      activationResult.studentLogin
                    }
                  </strong>

                </div>
              )}


              <button
                type="button"
                className="admin-button admin-button-primary admin-full-button"
                onClick={
                  closeActivationModal
                }
              >
                Готово
              </button>

            </div>

          </Modal>
        )}

      </div>
    </>
  )
}


/* =========================================================
   CLASS CARDS READY
========================================================= */

function ClassCardsReady({
  results,
  error,
  onPrint,
  onClose,
}) {
  const ready =
    results.filter(
      (
        item,
      ) =>
        item.resultStatus ===
        'ready',
    )


  const failed =
    results.filter(
      (
        item,
      ) =>
        item.resultStatus ===
        'error',
    )


  const activated =
    ready.filter(
      (
        item,
      ) =>
        item.activated,
    ).length


  const withCodes =
    ready.filter(
      (
        item,
      ) =>
        !item.activated &&
        item.activationCode,
    ).length


  return (
    <div className="import-finished">

      <div className="import-finished-icon">
        <Check
          size={30}
        />
      </div>


      <div className="import-finished-heading">

        <h2>
          Карточки готовы
        </h2>

        <p>
          Активированным ученикам
          новый EB-код не создавался.
          Остальным выданы новые
          коды первого входа.
        </p>

      </div>


      {error && (
        <MessageBox
          type="error"
          text={
            error
          }
        />
      )}


      <div className="import-finished-stats">

        <div>
          <strong>
            {ready.length}
          </strong>

          <span>
            Готово
          </span>
        </div>


        <div>
          <strong>
            {activated}
          </strong>

          <span>
            Активированы
          </span>
        </div>


        <div>
          <strong>
            {withCodes}
          </strong>

          <span>
            Новые EB-коды
          </span>
        </div>


        {failed.length >
          0 && (
          <div>
            <strong>
              {failed.length}
            </strong>

            <span>
              Ошибки
            </span>
          </div>
        )}

      </div>


      <div className="admin-table-scroll">

        <table className="admin-import-table">

          <thead>
            <tr>
              <th>
                ФИО
              </th>

              <th>
                EDU-логин
              </th>

              <th>
                EB-код
              </th>

              <th>
                Статус
              </th>
            </tr>
          </thead>


          <tbody>

            {results.map(
              (
                row,
              ) => (
                <tr
                  key={
                    row.studentId
                  }
                >

                  <td>
                    {
                      row.fullName
                    }
                  </td>


                  <td>
                    {
                      row.studentLogin ||
                      '—'
                    }
                  </td>


                  <td className="admin-eb-code-cell">

                    {row.activated
                      ? 'Не нужен'
                      : row.activationCode ||
                        '—'}

                  </td>


                  <td>

                    {row.resultStatus ===
                    'error' ? (
                      <span className="import-status error">
                        Ошибка
                      </span>
                    ) : row.activated ? (
                      <span className="import-status active-card">
                        Активирован
                      </span>
                    ) : (
                      <span className="import-status created">
                        Код создан
                      </span>
                    )}

                  </td>

                </tr>
              ),
            )}

          </tbody>

        </table>

      </div>


      <div className="import-finished-actions">

        <button
          type="button"
          className="admin-button admin-button-primary"
          disabled={
            ready.length ===
            0
          }
          onClick={
            onPrint
          }
        >
          <Printer
            size={17}
          />

          Печатать карточки
        </button>


        <button
          type="button"
          className="admin-button admin-button-secondary"
          onClick={
            onClose
          }
        >
          Готово
        </button>

      </div>

    </div>
  )
}


/* =========================================================
   IMPORT FINISHED
========================================================= */

function ImportFinished({
  results,
  onPrint,
  onDownload,
  onAnother,
  onClose,
}) {
  const created =
    results.filter(
      (
        row,
      ) =>
        row.resultStatus ===
        'created',
    ).length


  const exists =
    results.filter(
      (
        row,
      ) =>
        row.resultStatus ===
        'exists',
    ).length


  const failed =
    results.filter(
      (
        row,
      ) =>
        row.resultStatus ===
        'error',
    ).length


  const canPrint =
    results.some(
      (
        row,
      ) =>
        row.resultStatus ===
          'created' &&
        row.activationCode,
    )


  return (
    <div className="import-finished">

      <div className="import-finished-icon">
        <Check
          size={30}
        />
      </div>


      <div className="import-finished-heading">

        <h2>
          Импорт завершён
        </h2>

        <p>
          Сохраните результаты или
          распечатайте карточки
          первого входа.
        </p>

      </div>


      <div className="import-finished-stats">

        <div>
          <strong>
            {created}
          </strong>

          <span>
            Создано
          </span>
        </div>


        <div>
          <strong>
            {exists}
          </strong>

          <span>
            Уже было
          </span>
        </div>


        <div>
          <strong>
            {failed}
          </strong>

          <span>
            Ошибки
          </span>
        </div>

      </div>


      <ImportResultTable
        rows={
          results
        }
      />


      <div className="import-finished-actions">

        <button
          type="button"
          className="admin-button admin-button-primary"
          disabled={
            !canPrint
          }
          onClick={
            onPrint
          }
        >
          <Printer
            size={17}
          />

          Карточки для печати
        </button>


        <button
          type="button"
          className="admin-button admin-button-secondary"
          onClick={
            onDownload
          }
        >
          <Download
            size={17}
          />

          Скачать результаты
        </button>


        <button
          type="button"
          className="admin-button admin-button-secondary"
          onClick={
            onAnother
          }
        >
          <FileSpreadsheet
            size={17}
          />

          Ещё файл
        </button>


        <button
          type="button"
          className="admin-button admin-button-primary"
          onClick={
            onClose
          }
        >
          Готово
        </button>

      </div>

    </div>
  )
}


/* =========================================================
   PREVIEW TABLE
========================================================= */

function ImportPreviewTable({
  rows,
}) {
  return (
    <div className="admin-table-scroll">

      <table className="admin-import-table">

        <thead>
          <tr>
            <th>
              #
            </th>

            <th>
              ФИО
            </th>

            <th>
              Класс
            </th>

            <th>
              Статус
            </th>

            <th>
              Комментарий
            </th>
          </tr>
        </thead>


        <tbody>

          {rows.map(
            (
              row,
              index,
            ) => (
              <tr
                key={
                  row.key
                }
              >
                <td>
                  {index + 1}
                </td>

                <td>
                  {row.fullName ||
                    '—'}
                </td>

                <td>
                  {row.className ||
                    '—'}
                </td>

                <td>
                  <PreviewStatus
                    status={
                      row.status
                    }
                  />
                </td>

                <td>
                  {row.message}
                </td>
              </tr>
            ),
          )}

        </tbody>

      </table>

    </div>
  )
}


/* =========================================================
   IMPORT RESULT TABLE
========================================================= */

function ImportResultTable({
  rows,
}) {
  return (
    <div className="admin-table-scroll">

      <table className="admin-import-table">

        <thead>
          <tr>
            <th>
              ФИО
            </th>

            <th>
              Класс
            </th>

            <th>
              Результат
            </th>

            <th>
              EDU-логин
            </th>

            <th>
              EB-код
            </th>
          </tr>
        </thead>


        <tbody>

          {rows.map(
            (
              row,
              index,
            ) => (
              <tr
                key={
                  `${row.key}-${index}`
                }
              >
                <td>
                  {row.fullName}
                </td>

                <td>
                  {row.className ||
                    '—'}
                </td>

                <td>
                  <ResultStatus
                    status={
                      row.resultStatus
                    }
                  />
                </td>

                <td>
                  {row.studentLogin ||
                    '—'}
                </td>

                <td className="admin-eb-code-cell">
                  {row.activationCode ||
                    '—'}
                </td>
              </tr>
            ),
          )}

        </tbody>

      </table>

    </div>
  )
}


/* =========================================================
   EXCEL PREVIEW
========================================================= */

function buildImportPreview({
  rawRows,
  classes,
  students,
}) {
  const classMap =
    new Map()


  classes.forEach(
    (
      schoolClass,
    ) => {
      classMap.set(
        normalizeClassName(
          schoolClass.className,
        ),
        schoolClass,
      )
    },
  )


  const excelDuplicates =
    new Set()

  const rows = []


  rawRows.forEach(
    (
      rawRow,
      index,
    ) => {
      const fullName =
        cleanFullName(
          findColumnValue(
            rawRow,
            [
              'фио',
              'фиоученика',
              'ученик',
              'имяученика',
              'fullname',
              'studentname',
              'student',
            ],
          ),
        )


      const className =
        cleanText(
          findColumnValue(
            rawRow,
            [
              'класс',
              'классученика',
              'classname',
              'class',
            ],
          ),
        )


      if (
        !fullName &&
        !className
      ) {
        return
      }


      const schoolClass =
        classMap.get(
          normalizeClassName(
            className,
          ),
        )


      const base = {
        key:
          `row-${index}-${fullName}-${className}`,

        fullName,

        className,

        classId:
          schoolClass?.id ||
          '',
      }


      if (!fullName) {
        rows.push({
          ...base,

          status:
            'invalid',

          message:
            'Не указано ФИО.',
        })

        return
      }


      if (!className) {
        rows.push({
          ...base,

          status:
            'invalid',

          message:
            'Не указан класс.',
        })

        return
      }


      if (!schoolClass) {
        rows.push({
          ...base,

          status:
            'invalid',

          message:
            `Класс «${className}» не найден.`,
        })

        return
      }


      const duplicateKey =
        `${normalizePersonName(
          fullName,
        )}|${String(
          schoolClass.id,
        )}`


      if (
        excelDuplicates.has(
          duplicateKey,
        )
      ) {
        rows.push({
          ...base,

          status:
            'duplicate',

          message:
            'Повторная строка в Excel.',
        })

        return
      }


      excelDuplicates.add(
        duplicateKey,
      )


      const existingStudent =
        students.find(
          (
            student,
          ) =>
            normalizePersonName(
              student.fullName,
            ) ===
              normalizePersonName(
                fullName,
              ) &&
            normalizeClassName(
              student.className,
            ) ===
              normalizeClassName(
                schoolClass.className,
              ),
        )


      if (
        existingStudent
      ) {
        rows.push({
          ...base,

          status:
            'exists',

          message:
            existingStudent.isArchived
              ? 'Ученик находится в архиве.'
              : 'Ученик уже есть в этом классе.',
        })

        return
      }


      rows.push({
        ...base,

        status:
          'ready',

        message:
          'Готов к импорту.',
      })
    },
  )


  return rows
}


/* =========================================================
   PRINT ACCESS CARDS
========================================================= */

function printAccessCards(
  sourceStudents,
  setError,
) {
  const students =
    sourceStudents.filter(
      (
        student,
      ) =>
        student.resultStatus ===
        'ready',
    )


  if (
    students.length ===
    0
  ) {
    setError(
      'Нет готовых карточек для печати.',
    )

    return
  }


  const cardsHtml =
    students
      .map(
        (
          student,
        ) => {
          const activated =
            Boolean(
              student.activated,
            )


          return `
            <article class="student-card">

              <div class="brand">
                EduBoost
              </div>

              <div class="student-name">
                ${escapeHtml(
                  student.fullName,
                )}
              </div>

              <div class="student-class">
                ${escapeHtml(
                  student.className ||
                    '',
                )}
              </div>

              <div class="divider"></div>

              <div class="field">
                <span>
                  Постоянный EDU-логин
                </span>

                <strong>
                  ${escapeHtml(
                    student.studentLogin ||
                      '—',
                  )}
                </strong>
              </div>


              ${
                activated
                  ? `
                    <div class="activated-box">
                      ✓ Аккаунт уже активирован
                    </div>

                    <div class="instructions">
                      Для входа используйте
                      EDU-логин и пароль,
                      который был создан
                      при активации.
                    </div>
                  `
                  : `
                    <div class="field code">
                      <span>
                        Код первого входа
                      </span>

                      <strong>
                        ${escapeHtml(
                          student.activationCode ||
                            '—',
                        )}
                      </strong>
                    </div>

                    ${
                      student.expiresAt
                        ? `
                          <div class="expires">
                            Код действует до:
                            ${escapeHtml(
                              formatDateTime(
                                student.expiresAt,
                              ),
                            )}
                          </div>
                        `
                        : ''
                    }

                    <div class="instructions">

                      <strong>
                        Первый вход
                      </strong>

                      <ol>
                        <li>
                          Откройте EduBoost.
                        </li>

                        <li>
                          Выберите активацию ученика.
                        </li>

                        <li>
                          Введите EB-код.
                        </li>

                        <li>
                          Создайте свой пароль.
                        </li>
                      </ol>

                    </div>

                    <div class="warning">
                      Не передавайте EB-код
                      другим людям.
                    </div>
                  `
              }

            </article>
          `
        },
      )
      .join('')


  const printWindow =
    window.open(
      '',
      '_blank',
      'width=1000,height=800',
    )


  if (!printWindow) {
    setError(
      'Браузер заблокировал окно печати. Разрешите всплывающие окна для EduBoost.',
    )

    return
  }


  printWindow.document.open()


  printWindow.document.write(`
    <!doctype html>

    <html lang="ru">

      <head>

        <meta charset="UTF-8" />

        <title>
          EduBoost — карточки доступа
        </title>

        <style>

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 8mm;

            font-family:
              Arial,
              sans-serif;

            color: #102343;

            background: white;
          }

          .cards {
            display: grid;

            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );

            gap: 7mm;
          }

          .student-card {
            min-height: 118mm;

            padding: 8mm;

            border:
              1.4px solid
              #cfe0f5;

            border-radius: 5mm;

            break-inside: avoid;

            page-break-inside: avoid;
          }

          .brand {
            display: inline-block;

            margin-bottom: 5mm;

            padding:
              2.5mm 4mm;

            border-radius: 3mm;

            background: #1267e8;

            color: white;

            font-size: 14px;

            font-weight: 800;
          }

          .student-name {
            font-size: 18px;

            font-weight: 800;
          }

          .student-class {
            margin-top: 2mm;

            color: #64748b;

            font-size: 12px;

            font-weight: 700;
          }

          .divider {
            margin: 5mm 0;

            border-top:
              1px solid
              #dbe5f1;
          }

          .field {
            margin-bottom: 4mm;
          }

          .field span {
            display: block;

            margin-bottom: 1.5mm;

            color: #64748b;

            font-size: 10px;
          }

          .field strong {
            display: block;

            padding: 3.5mm;

            border-radius: 3mm;

            background: #f4f8ff;

            font-family:
              Consolas,
              monospace;

            font-size: 14px;

            overflow-wrap: anywhere;
          }

          .field.code strong {
            color: #0f56c8;

            background: #eaf3ff;

            font-size: 16px;
          }

          .expires {
            margin:
              -1mm 0 4mm;

            color: #64748b;

            font-size: 9px;
          }

          .instructions {
            padding: 3.5mm;

            border-radius: 3mm;

            background: #f8fafc;

            font-size: 9.5px;

            line-height: 1.45;
          }

          .instructions ol {
            margin: 2mm 0 0;

            padding-left: 5mm;
          }

          .activated-box {
            margin-bottom: 4mm;

            padding: 4mm;

            border-radius: 3mm;

            background: #dcfce7;

            color: #047857;

            font-size: 11px;

            font-weight: 800;
          }

          .warning {
            margin-top: 4mm;

            color: #b45309;

            font-size: 9px;

            font-weight: 700;
          }

          @page {
            size: A4;

            margin: 7mm;
          }

          @media print {

            body {
              padding: 0;
            }

          }

        </style>

      </head>


      <body>

        <main class="cards">
          ${cardsHtml}
        </main>


        <script>

          window.addEventListener(
            'load',
            function () {
              setTimeout(
                function () {
                  window.print()
                },
                250
              )
            }
          )

        </script>

      </body>

    </html>
  `)


  printWindow.document.close()
}


/* =========================================================
   COLUMN HELPERS
========================================================= */

function findColumnValue(
  row,
  aliases,
) {
  if (
    !row ||
    typeof row !==
      'object'
  ) {
    return ''
  }


  const normalizedAliases =
    new Set(
      aliases.map(
        normalizeHeader,
      ),
    )


  for (
    const [
      key,
      value,
    ] of Object.entries(
      row,
    )
  ) {
    if (
      normalizedAliases.has(
        normalizeHeader(
          key,
        ),
      )
    ) {
      return value
    }
  }


  return ''
}


function normalizeHeader(
  value,
) {
  return String(
    value ||
      '',
  )
    .trim()
    .toLowerCase()
    .replace(
      /ё/g,
      'е',
    )
    .replace(
      /[^a-zа-я0-9]/gi,
      '',
    )
}


/* =========================================================
   SMALL COMPONENTS
========================================================= */

function StatCard({
  icon: Icon,
  value,
  label,
}) {
  return (
    <div className="admin-user-stat">

      <div>
        <Icon
          size={20}
        />
      </div>


      <section>

        <strong>
          {value}
        </strong>

        <span>
          {label}
        </span>

      </section>

    </div>
  )
}


function StudentStatus({
  student,
}) {
  if (
    student.isArchived
  ) {
    return (
      <span className="student-status archived">
        В архиве
      </span>
    )
  }


  if (
    student.activated
  ) {
    return (
      <span className="student-status active">
        Активирован
      </span>
    )
  }


  return (
    <span className="student-status waiting">
      Ожидает входа
    </span>
  )
}


function PreviewStatus({
  status,
}) {
  const labels = {
    ready:
      'Готов',

    exists:
      'Уже есть',

    duplicate:
      'Дубль',

    invalid:
      'Ошибка',
  }


  return (
    <span
      className={
        `import-status ${status}`
      }
    >
      {labels[status] ||
        status}
    </span>
  )
}


function ResultStatus({
  status,
}) {
  return (
    <span
      className={
        `import-status ${status}`
      }
    >
      {getImportResultLabel(
        status,
      )}
    </span>
  )
}


function ImportSummaryBadge({
  type,
  text,
}) {
  return (
    <span
      className={
        `import-summary-badge ${type}`
      }
    >
      {text}
    </span>
  )
}


function ProgressBar({
  progress,
  text,
}) {
  const total =
    Number(
      progress.total ||
        0,
    )


  const current =
    Number(
      progress.current ||
        0,
    )


  const percent =
    total > 0
      ? Math.min(
          100,
          Math.round(
            (
              current /
              total
            ) *
              100,
          ),
        )
      : 0


  return (
    <div className="import-progress">

      <div>
        <span>
          {text}
        </span>

        <strong>
          {current}/{total}
        </strong>
      </div>


      <section>
        <span
          style={{
            width:
              `${percent}%`,
          }}
        />
      </section>

    </div>
  )
}


function MessageBox({
  type,
  text,
}) {
  return (
    <div
      className={
        `admin-message ${type}`
      }
    >
      {text}
    </div>
  )
}


function EmptyState({
  text,
}) {
  return (
    <div className="admin-users-empty">

      <Users
        size={31}
      />

      <span>
        {text}
      </span>

    </div>
  )
}


function Modal({
  children,
  onClose,
  large = false,
  preventClose = false,
}) {
  return (
    <div
      className="admin-modal-overlay"
      onMouseDown={(
        event,
      ) => {
        if (preventClose) {
          return
        }


        if (
          event.target ===
          event.currentTarget
        ) {
          onClose()
        }
      }}
    >

      <div
        className={
          `admin-modal ${
            large
              ? 'large'
              : ''
          }`
        }
      >
        {children}
      </div>

    </div>
  )
}


function ModalClose({
  onClick,
  disabled = false,
}) {
  return (
    <button
      type="button"
      className="admin-modal-close"
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


/* =========================================================
   GENERIC HELPERS
========================================================= */

function cleanText(
  value,
) {
  return String(
    value ??
      '',
  )
    .replace(
      /\s+/g,
      ' ',
    )
    .trim()
}


function cleanFullName(
  value,
) {
  return cleanText(
    value,
  )
}


function normalizePersonName(
  value,
) {
  return cleanFullName(
    value,
  )
    .toLowerCase()
    .replace(
      /ё/g,
      'е',
    )
}


function normalizeClassName(
  value,
) {
  return cleanText(
    value,
  )
    .toLowerCase()
    .replace(
      /ё/g,
      'е',
    )
}


function normalizeSearch(
  value,
) {
  return cleanText(
    value,
  )
    .toLowerCase()
    .replace(
      /ё/g,
      'е',
    )
}


function getInitials(
  value,
) {
  return cleanText(
    value,
  )
    .split(/\s+/)
    .filter(Boolean)
    .slice(
      0,
      2,
    )
    .map(
      (
        item,
      ) =>
        item[0]
          ?.toUpperCase() ||
        '',
    )
    .join('')
}


function getImportResultLabel(
  status,
) {
  const values = {
    created:
      'Создан',

    exists:
      'Уже существует',

    error:
      'Ошибка',
  }


  return (
    values[status] ||
    status ||
    '—'
  )
}


function getToday() {
  const now =
    new Date()


  const local =
    new Date(
      now.getTime() -
        now.getTimezoneOffset() *
          60000,
    )


  return local
    .toISOString()
    .slice(
      0,
      10,
    )
}


function formatDateTime(
  value,
) {
  if (!value) {
    return ''
  }


  const date =
    new Date(
      value,
    )


  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(
      value,
    )
  }


  return date.toLocaleString(
    'ru-RU',
    {
      dateStyle:
        'short',

      timeStyle:
        'short',
    },
  )
}


function escapeHtml(
  value,
) {
  return String(
    value ??
      '',
  )
    .replace(
      /&/g,
      '&amp;',
    )
    .replace(
      /</g,
      '&lt;',
    )
    .replace(
      />/g,
      '&gt;',
    )
    .replace(
      /"/g,
      '&quot;',
    )
    .replace(
      /'/g,
      '&#039;',
    )
}


/* =========================================================
   CSS
========================================================= */

function AdminUsersStyles() {
  return (
    <style>{`
      .admin-users-page {
        width: 100%;
        max-width: 1120px;
        margin: 0 auto;
        padding: 18px;
        box-sizing: border-box;
      }

      .admin-users-page * {
        box-sizing: border-box;
      }

      .admin-users-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 18px;
      }

      .admin-users-eyebrow {
        display: block;
        margin-bottom: 5px;
        color: #1267e8;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .admin-users-header h1 {
        margin: 0;
        color: #102343;
        font-size: 28px;
      }

      .admin-users-header p {
        margin: 7px 0 0;
        color: #718096;
        font-size: 13px;
      }

      .admin-users-header-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .admin-button {
        min-height: 44px;
        padding: 0 15px;
        border-radius: 13px;
        border: 1px solid transparent;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        font-weight: 800;
        cursor: pointer;
      }

      .admin-button:disabled {
        opacity: .5;
        cursor: not-allowed;
      }

      .admin-button-primary {
        background: #1267e8;
        color: #fff;
      }

      .admin-button-secondary {
        border-color: #d5e1ef;
        background: #fff;
        color: #425b7d;
      }

      .admin-full-button {
        width: 100%;
      }

      .admin-user-stats {
        display: grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(145px, 1fr)
          );
        gap: 10px;
        margin-bottom: 15px;
      }

      .admin-user-stat {
        padding: 14px;
        display: flex;
        align-items: center;
        gap: 11px;
        border: 1px solid #dfe8f3;
        border-radius: 16px;
        background: #fff;
      }

      .admin-user-stat > div {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background: #edf5ff;
        color: #1267e8;
      }

      .admin-user-stat strong {
        display: block;
        color: #102343;
        font-size: 19px;
      }

      .admin-user-stat span {
        color: #718096;
        font-size: 11px;
      }

      .admin-users-toolbar {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
      }

      .admin-search {
        min-width: 0;
        flex: 1;
        height: 46px;
        padding: 0 13px;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid #dfe8f3;
        border-radius: 14px;
        background: #fff;
        color: #8ca0ba;
      }

      .admin-search input {
        width: 100%;
        border: none;
        outline: none;
        background: transparent;
      }

      .admin-refresh-button {
        width: 46px;
        height: 46px;
        border: 1px solid #dfe8f3;
        border-radius: 14px;
        background: #fff;
        color: #526b8a;
        display: grid;
        place-items: center;
        cursor: pointer;
      }

      .admin-archive-toggle {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 13px;
        color: #64748b;
        font-size: 12px;
      }

      .admin-message {
        margin-bottom: 12px;
        padding: 11px 13px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 700;
      }

      .admin-message.error {
        background: #fff1f2;
        border: 1px solid #fecdd3;
        color: #be123c;
      }

      .admin-message.success {
        background: #ecfdf5;
        border: 1px solid #bbf7d0;
        color: #047857;
      }

      .admin-students-card {
        overflow: hidden;
        border: 1px solid #dfe8f3;
        border-radius: 19px;
        background: #fff;
      }

      .admin-students-card-header {
        padding: 14px 16px;
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solid #edf2f7;
      }

      .admin-student-row {
        padding: 14px;
        border-bottom: 1px solid #edf2f7;
      }

      .admin-student-row:last-child {
        border-bottom: none;
      }

      .admin-student-row.is-archived {
        opacity: .8;
        background: #fafbfc;
      }

      .admin-student-top {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        flex-wrap: wrap;
      }

      .admin-student-avatar {
        width: 46px;
        height: 46px;
        flex: 0 0 46px;
        display: grid;
        place-items: center;
        border-radius: 14px;
        background: #1267e8;
        color: white;
        font-weight: 900;
      }

      .admin-student-info {
        flex: 1;
        min-width: 180px;
      }

      .admin-student-name-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 7px;
        color: #102343;
      }

      .admin-student-class {
        margin-top: 5px;
        display: flex;
        align-items: center;
        gap: 5px;
        color: #718096;
        font-size: 12px;
      }

      .student-status {
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 9px;
        font-weight: 900;
      }

      .student-status.active {
        background: #dcfce7;
        color: #047857;
      }

      .student-status.waiting {
        background: #fff7df;
        color: #a16207;
      }

      .student-status.archived {
        background: #eef2f7;
        color: #64748b;
      }

      .admin-student-login {
        margin-top: 9px;
        padding: 9px 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        border-radius: 11px;
        background: #f4f8ff;
      }

      .admin-student-login span {
        display: block;
        color: #8a9bb3;
        font-size: 9px;
      }

      .admin-student-login strong {
        color: #28466e;
        font-size: 13px;
      }

      .admin-student-login button {
        border: none;
        background: transparent;
        color: #1267e8;
        display: flex;
        align-items: center;
        gap: 5px;
        font-weight: 800;
        cursor: pointer;
      }

      .admin-student-actions-button {
        min-height: 39px;
        padding: 0 11px;
        border: 1px solid #dbe5f1;
        border-radius: 11px;
        background: #fff;
        color: #526b8a;
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;
      }

      .admin-student-actions {
        margin-top: 12px;
        padding-top: 12px;
        display: grid;
        gap: 7px;
        border-top: 1px solid #edf2f7;
      }

      .admin-student-actions button {
        min-height: 42px;
        padding: 0 11px;
        border: none;
        border-radius: 10px;
        background: #f6f9fd;
        color: #28466e;
        display: flex;
        align-items: center;
        gap: 7px;
        font-weight: 700;
        cursor: pointer;
      }

      .admin-student-actions button.danger {
        background: #fff1f2;
        color: #dc2626;
      }

      .admin-users-empty {
        min-height: 170px;
        display: grid;
        align-content: center;
        justify-items: center;
        gap: 8px;
        color: #8193ad;
        font-size: 12px;
      }

      .admin-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 5000;
        padding: 16px;
        display: grid;
        place-items: center;
        overflow-y: auto;
        background: rgba(15,35,65,.43);
        backdrop-filter: blur(5px);
      }

      .admin-modal {
        width: 100%;
        max-width: 450px;
        max-height: calc(100vh - 32px);
        overflow-y: auto;
        padding: 20px;
        border-radius: 21px;
        background: #fff;
      }

      .admin-modal.large {
        max-width: 930px;
      }

      .admin-modal-header {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 17px;
      }

      .admin-modal-header h2 {
        margin: 0;
        color: #102343;
      }

      .admin-modal-header p {
        margin: 6px 0 0;
        color: #718096;
        font-size: 12px;
      }

      .admin-modal-close {
        width: 37px;
        height: 37px;
        border: none;
        border-radius: 10px;
        background: #f1f5f9;
        color: #526b8a;
        display: grid;
        place-items: center;
        cursor: pointer;
      }

      .admin-create-form {
        display: grid;
        gap: 13px;
      }

      .admin-create-form label,
      .class-cards-controls label {
        display: grid;
        gap: 6px;
        color: #223b63;
        font-size: 12px;
        font-weight: 800;
      }

      .admin-create-form input,
      .admin-create-form select,
      .class-cards-controls select {
        width: 100%;
        height: 46px;
        padding: 0 12px;
        border: 1px solid #d8e3ef;
        border-radius: 12px;
        background: #fff;
      }

      .admin-import-toolbar {
        padding: 12px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 9px;
        border: 1px solid #dbeafe;
        border-radius: 14px;
        background: #f8fbff;
      }

      .admin-import-toolbar > span {
        flex: 1;
        min-width: 120px;
        color: #64748b;
        font-size: 11px;
      }

      .admin-import-summary,
      .class-card-summary {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-bottom: 11px;
      }

      .class-card-summary span {
        padding: 7px 10px;
        border-radius: 999px;
        background: #f1f5f9;
        color: #475569;
        font-size: 11px;
      }

      .import-summary-badge {
        padding: 6px 9px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 900;
      }

      .import-summary-badge.ready {
        background: #dcfce7;
        color: #047857;
      }

      .import-summary-badge.warning {
        background: #fef3c7;
        color: #a16207;
      }

      .import-summary-badge.normal {
        background: #f1f5f9;
        color: #475569;
      }

      .admin-table-scroll {
        width: 100%;
        max-height: 390px;
        overflow: auto;
        border: 1px solid #e2e8f0;
        border-radius: 13px;
      }

      .admin-import-table {
        width: 100%;
        min-width: 650px;
        border-collapse: collapse;
      }

      .admin-import-table th,
      .admin-import-table td {
        padding: 10px;
        border-bottom: 1px solid #edf2f7;
        text-align: left;
        font-size: 11px;
      }

      .admin-import-table th {
        position: sticky;
        top: 0;
        z-index: 2;
        background: #f8fafc;
        color: #475569;
      }

      .admin-eb-code-cell {
        font-family: monospace;
        white-space: nowrap;
      }

      .import-status {
        display: inline-flex;
        padding: 5px 7px;
        border-radius: 8px;
        font-size: 9px;
        font-weight: 900;
      }

      .import-status.ready,
      .import-status.created,
      .import-status.active-card {
        background: #dcfce7;
        color: #047857;
      }

      .import-status.exists,
      .import-status.duplicate {
        background: #fef3c7;
        color: #a16207;
      }

      .import-status.invalid,
      .import-status.error {
        background: #fee2e2;
        color: #b91c1c;
      }

      .admin-import-footer,
      .import-finished-actions {
        margin-top: 14px;
        display: flex;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 8px;
      }

      .import-progress {
        margin-top: 14px;
      }

      .import-progress > div {
        margin-bottom: 6px;
        display: flex;
        justify-content: space-between;
        color: #64748b;
        font-size: 11px;
      }

      .import-progress > section {
        height: 8px;
        overflow: hidden;
        border-radius: 999px;
        background: #e2e8f0;
      }

      .import-progress > section > span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: #1267e8;
      }

      .import-finished {
        display: grid;
        gap: 15px;
      }

      .import-finished-icon {
        width: 58px;
        height: 58px;
        margin: 0 auto;
        display: grid;
        place-items: center;
        border-radius: 18px;
        background: #dcfce7;
        color: #047857;
      }

      .import-finished-heading {
        text-align: center;
      }

      .import-finished-heading h2 {
        margin: 0;
        color: #102343;
      }

      .import-finished-heading p {
        max-width: 520px;
        margin: 6px auto 0;
        color: #718096;
        font-size: 12px;
      }

      .import-finished-stats {
        display: grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(120px, 1fr)
          );
        gap: 8px;
      }

      .import-finished-stats div {
        padding: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        text-align: center;
      }

      .import-finished-stats strong {
        display: block;
        color: #102343;
        font-size: 20px;
      }

      .import-finished-stats span {
        color: #718096;
        font-size: 10px;
      }

      .class-cards-controls {
        display: grid;
        grid-template-columns:
          minmax(180px, 1fr)
          auto;
        align-items: end;
        gap: 12px;
        margin-bottom: 12px;
      }

      .class-cards-buttons {
        display: flex;
        gap: 7px;
      }

      .class-student-list {
        max-height: 430px;
        overflow-y: auto;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
      }

      .class-student-check {
        min-height: 62px;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        gap: 11px;
        border-bottom: 1px solid #edf2f7;
        cursor: pointer;
      }

      .class-student-check:last-child {
        border-bottom: none;
      }

      .class-student-check.selected {
        background: #f8fbff;
      }

      .class-student-check input {
        width: 18px;
        height: 18px;
      }

      .class-student-check-main {
        flex: 1;
        min-width: 0;
      }

      .class-student-check-main strong {
        display: block;
        color: #102343;
        font-size: 12px;
      }

      .class-student-check-main span {
        display: block;
        margin-top: 3px;
        color: #718096;
        font-size: 10px;
      }

      .activation-result {
        text-align: center;
      }

      .activation-result-icon {
        width: 60px;
        height: 60px;
        margin: 0 auto 12px;
        border-radius: 18px;
        background: #eaf3ff;
        color: #1267e8;
        display: grid;
        place-items: center;
      }

      .activation-result h2 {
        margin: 0;
      }

      .activation-result p {
        color: #718096;
        font-size: 12px;
      }

      .activation-result-class {
        display: block;
        margin-top: 4px;
        color: #64748b;
      }

      .activation-code {
        margin: 14px 0 9px;
        padding: 14px;
        display: grid;
        gap: 8px;
        border-radius: 14px;
        background: #f2f7ff;
      }

      .activation-code > strong {
        color: #102343;
        font-size: 20px;
      }

      .activation-code button {
        justify-self: center;
        padding: 8px 11px;
        border: none;
        border-radius: 10px;
        background: #1267e8;
        color: white;
        display: flex;
        gap: 5px;
        font-weight: 800;
      }

      .activation-login {
        margin-bottom: 13px;
        padding: 12px;
        display: grid;
        gap: 4px;
        border: 1px solid #dfe8f3;
        border-radius: 12px;
      }

      @media (max-width: 700px) {

        .admin-users-page {
          padding: 11px;
        }

        .admin-users-header-actions {
          width: 100%;
        }

        .admin-users-header-actions .admin-button {
          flex: 1;
        }

        .admin-student-actions-button {
          width: 100%;
          justify-content: center;
        }

        .class-cards-controls {
          grid-template-columns: 1fr;
        }

        .class-cards-buttons {
          width: 100%;
        }

        .class-cards-buttons .admin-button {
          flex: 1;
        }

        .admin-import-footer .admin-button,
        .import-finished-actions .admin-button {
          width: 100%;
        }

      }
    `}</style>
  )
}


export default AdminUsersPage