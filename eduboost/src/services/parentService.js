import {
  supabase,
} from '../lib/supabase'


const LINKS_KEY =
  'eduboost_parent_links'

const GRADES_KEY =
  'eduboost_grades'

const ATTENDANCE_KEY =
  'eduboost_attendance'

const PARENT_REWARDS_KEY =
  'eduboost_parent_rewards'


const parentSyncPromises =
  new Map()


function readStorage(key) {
  try {
    return (
      JSON.parse(
        localStorage.getItem(
          key,
        ),
      ) || []
    )
  } catch {
    return []
  }
}


function saveStorage(
  key,
  value,
) {
  localStorage.setItem(
    key,
    JSON.stringify(
      value,
    ),
  )
}


export function getStudentCode(
  student,
) {
  if (!student?.id) {
    return ''
  }

  const cleanId =
    String(student.id)
      .replaceAll(
        '-',
        '',
      )
      .toUpperCase()

  return `EB-${cleanId.slice(-6)}`
}


export function findStudentByCode(
  code,
) {
  const normalizedCode =
    String(
      code || '',
    )
      .trim()
      .toUpperCase()

  const users =
    readStorage(
      'eduboost_users',
    )

  return (
    users.find(
      (user) =>
        user.role ===
          'Ученик' &&
        getStudentCode(
          user,
        ) ===
          normalizedCode,
    ) || null
  )
}


/*
 * Сохраняет связь в Supabase
 * через защищённую RPC-функцию.
 */
async function syncStudentLinkToSupabase(
  student,
) {
  if (!student?.id) {
    return null
  }

  const code =
    getStudentCode(
      student,
    )

  if (!code) {
    return null
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'link_parent_student_by_code',
      {
        p_student_code:
          code,
      },
    )

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось синхронизировать связь с ребёнком',
    )
  }

  return (
    data?.[0] ||
    null
  )
}


/*
 * Переносит все старые
 * localStorage-привязки
 * текущего родителя в Supabase.
 *
 * Эту функцию можно await-ить
 * перед загрузкой оценок.
 */
export async function ensureParentLinksSynced(
  parentId,
) {
  if (!parentId) {
    return []
  }

  /*
   * Если синхронизация уже идёт,
   * не запускаем второй запрос.
   */
  if (
    parentSyncPromises.has(
      parentId,
    )
  ) {
    return parentSyncPromises.get(
      parentId,
    )
  }


  const promise =
    (async () => {
      const students =
        getLocalLinkedStudents(
          parentId,
        )

      if (
        students.length === 0
      ) {
        return []
      }


      const synced = []


      for (
        const student
        of students
      ) {
        try {
          const result =
            await syncStudentLinkToSupabase(
              student,
            )

          synced.push({
            student,
            result,
          })
        } catch (
          error
        ) {
          console.error(
            'Ошибка синхронизации родительской связи:',
            student?.name ||
              student?.id,
            error,
          )

          throw error
        }
      }


      return synced
    })()


  parentSyncPromises.set(
    parentId,
    promise,
  )


  try {
    return await promise
  } finally {
    parentSyncPromises.delete(
      parentId,
    )
  }
}


function getLocalLinkedStudents(
  parentId,
) {
  const links =
    readStorage(
      LINKS_KEY,
    )

  const users =
    readStorage(
      'eduboost_users',
    )


  const studentIds =
    links
      .filter(
        (link) =>
          String(
            link.parentId,
          ) ===
          String(
            parentId,
          ),
      )
      .map(
        (link) =>
          String(
            link.studentId,
          ),
      )


  return users.filter(
    (user) =>
      user.role ===
        'Ученик' &&
      studentIds.includes(
        String(
          user.id,
        ),
      ),
  )
}


/*
 * Оставляем функцию синхронной,
 * потому что текущие страницы
 * EduBoost используют её именно
 * синхронно.
 *
 * Одновременно запускаем
 * фоновую синхронизацию Supabase.
 */
export function getLinkedStudents(
  parentId,
) {
  const students =
    getLocalLinkedStudents(
      parentId,
    )


  if (
    parentId &&
    students.length > 0
  ) {
    void ensureParentLinksSynced(
      parentId,
    ).catch(
      (error) => {
        console.error(
          'Не удалось перенести родительские связи в Supabase:',
          error,
        )
      },
    )
  }


  return students
}


export function linkParentToStudent(
  parent,
  studentCode,
) {
  const student =
    findStudentByCode(
      studentCode,
    )


  if (!student) {
    throw new Error(
      'Ученик с таким кодом не найден',
    )
  }


  const links =
    readStorage(
      LINKS_KEY,
    )


  const alreadyLinked =
    links.some(
      (link) =>
        String(
          link.parentId,
        ) ===
          String(
            parent.id,
          ) &&
        String(
          link.studentId,
        ) ===
          String(
            student.id,
          ),
    )


  if (!alreadyLinked) {
    links.push({
      id:
        crypto.randomUUID(),

      parentId:
        parent.id,

      parentName:
        parent.name,

      studentId:
        student.id,

      studentName:
        student.name,

      linkedAt:
        new Date()
          .toISOString(),
    })


    saveStorage(
      LINKS_KEY,
      links,
    )
  }


  /*
   * Одновременно создаём
   * настоящую связь в Supabase.
   */
  void syncStudentLinkToSupabase(
    student,
  ).catch(
    (error) => {
      console.error(
        'Не удалось сохранить связь родитель → ребёнок в Supabase:',
        error,
      )
    },
  )


  return student
}


export function removeParentLink(
  parentId,
  studentId,
) {
  const updatedLinks =
    readStorage(
      LINKS_KEY,
    ).filter(
      (link) =>
        !(
          String(
            link.parentId,
          ) ===
            String(
              parentId,
            ) &&
          String(
            link.studentId,
          ) ===
            String(
              studentId,
            )
        ),
    )


  saveStorage(
    LINKS_KEY,
    updatedLinks,
  )


  /*
   * Удаляем связь и из Supabase.
   */
  void supabase
    .from(
      'parent_student_links',
    )
    .delete()
    .eq(
      'parent_id',
      parentId,
    )
    .eq(
      'student_id',
      studentId,
    )
    .then(
      ({
        error,
      }) => {
        if (error) {
          console.error(
            'Не удалось удалить связь из Supabase:',
            error,
          )
        }
      },
    )
}


export function getStudentTasks(
  student,
) {
  const tasks =
    readStorage(
      'eduboost_tasks',
    )

  const submissions =
    readStorage(
      'eduboost_submissions',
    )


  return tasks
    .filter(
      (task) =>
        task.school ===
          student.school &&
        task.className ===
          student.className,
    )
    .map(
      (task) => {
        const submission =
          submissions.find(
            (item) =>
              item.taskId ===
                task.id &&
              item.studentId ===
                student.id,
          )


        return {
          ...task,

          submission:
            submission ||
            null,

          status:
            submission
              ?.status ||
            'new',
        }
      },
    )
}


export function getOverdueTasks(
  student,
) {
  const today =
    new Date()
      .toISOString()
      .slice(
        0,
        10,
      )


  return getStudentTasks(
    student,
  ).filter(
    (task) =>
      task.deadline <
        today &&
      task.status !==
        'approved',
  )
}


/*
 * Пока оставляем эти функции,
 * потому что родительский
 * Dashboard всё ещё использует
 * старые локальные данные.
 *
 * Сам электронный дневник
 * использует Supabase-сервисы.
 */
export function getStudentGrades(
  studentId,
) {
  return readStorage(
    GRADES_KEY,
  )
    .filter(
      (grade) =>
        grade.studentId ===
        studentId,
    )
    .sort(
      (
        first,
        second,
      ) =>
        new Date(
          second.date,
        ) -
        new Date(
          first.date,
        ),
    )
}


export function getStudentAttendance(
  studentId,
) {
  return readStorage(
    ATTENDANCE_KEY,
  )
    .filter(
      (record) =>
        record.studentId ===
        studentId,
    )
    .sort(
      (
        first,
        second,
      ) =>
        new Date(
          second.date,
        ) -
        new Date(
          first.date,
        ),
    )
}


export function calculateAverageGrade(
  grades,
) {
  if (
    !grades.length
  ) {
    return 0
  }


  const total =
    grades.reduce(
      (
        sum,
        grade,
      ) =>
        sum +
        Number(
          grade.value ||
            0,
        ),
      0,
    )


  return Number(
    (
      total /
      grades.length
    ).toFixed(2),
  )
}


export function calculateAttendance(
  records,
) {
  if (
    !records.length
  ) {
    return {
      percent:
        0,

      present:
        0,

      absent:
        0,

      late:
        0,
    }
  }


  const present =
    records.filter(
      (record) =>
        record.status ===
        'present',
    ).length


  const absent =
    records.filter(
      (record) =>
        record.status ===
        'absent',
    ).length


  const late =
    records.filter(
      (record) =>
        record.status ===
        'late',
    ).length


  return {
    percent:
      Math.round(
        (
          present /
          records.length
        ) *
          100,
      ),

    present,

    absent,

    late,
  }
}


export function getParentRewards(
  parentId,
  studentId,
) {
  return readStorage(
    PARENT_REWARDS_KEY,
  ).filter(
    (reward) =>
      reward.parentId ===
        parentId &&
      reward.studentId ===
        studentId,
  )
}


export function createParentReward(
  parent,
  student,
  rewardData,
) {
  const rewards =
    readStorage(
      PARENT_REWARDS_KEY,
    )


  const reward = {
    id:
      crypto.randomUUID(),

    parentId:
      parent.id,

    parentName:
      parent.name,

    studentId:
      student.id,

    studentName:
      student.name,

    title:
      rewardData.title
        .trim(),

    description:
      rewardData.description
        .trim(),

    requiredPoints:
      Number(
        rewardData.requiredPoints,
      ),

    claimed:
      false,

    createdAt:
      new Date()
        .toISOString(),
  }


  rewards.push(
    reward,
  )


  saveStorage(
    PARENT_REWARDS_KEY,
    rewards,
  )


  return reward
}


export function claimParentReward(
  rewardId,
) {
  const rewards =
    readStorage(
      PARENT_REWARDS_KEY,
    )


  const updatedRewards =
    rewards.map(
      (reward) =>
        reward.id ===
        rewardId
          ? {
              ...reward,

              claimed:
                true,

              claimedAt:
                new Date()
                  .toISOString(),
            }
          : reward,
    )


  saveStorage(
    PARENT_REWARDS_KEY,
    updatedRewards,
  )
}