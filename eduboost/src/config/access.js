export const ROLES = {
  STUDENT: 'Ученик',
  PARENT: 'Родитель',
  TEACHER: 'Учитель',

  SCHOOL_ADMIN: 'Администратор школы',
  DIRECTOR: 'Директор',
  VICE_PRINCIPAL: 'Завуч',

  PARTNER: 'Партнёр',

  SUPER_ADMIN: 'Super Admin',
}

/*
  Отдельные разрешения.

  В будущем человек сможет иметь
  роль Учитель + дополнительные права,
  например классного руководителя.
*/

export const PERMISSIONS = {
  /* Пользователи */
  VIEW_STUDENTS: 'view_students',
  MANAGE_STUDENTS: 'manage_students',

  VIEW_STAFF: 'view_staff',
  MANAGE_STAFF: 'manage_staff',

  /* Классы */
  VIEW_CLASSES: 'view_classes',
  MANAGE_CLASSES: 'manage_classes',

  /* Расписание */
  VIEW_OWN_SCHEDULE: 'view_own_schedule',
  VIEW_SCHOOL_SCHEDULE: 'view_school_schedule',
  MANAGE_SCHEDULE: 'manage_schedule',

  /* Звонки / смены */
  MANAGE_BELLS: 'manage_bells',

  /* Нагрузка */
  VIEW_WORKLOAD: 'view_workload',
  MANAGE_WORKLOAD: 'manage_workload',

  /* Замены */
  VIEW_SUBSTITUTIONS: 'view_substitutions',
  MANAGE_SUBSTITUTIONS: 'manage_substitutions',

  /* Журнал */
  VIEW_OWN_JOURNAL: 'view_own_journal',
  EDIT_OWN_JOURNAL: 'edit_own_journal',

  VIEW_ALL_JOURNALS: 'view_all_journals',

  /* Оценки */
  GIVE_GRADES: 'give_grades',
  VIEW_GRADES: 'view_grades',

  /* Посещаемость */
  MARK_ATTENDANCE: 'mark_attendance',
  VIEW_ATTENDANCE: 'view_attendance',
  VIEW_SCHOOL_ATTENDANCE:
    'view_school_attendance',

  /* Задания */
  CREATE_TASKS: 'create_tasks',
  REVIEW_TASKS: 'review_tasks',
  COMPLETE_TASKS: 'complete_tasks',

  /* Тесты */
  CREATE_TESTS: 'create_tests',
  TAKE_TESTS: 'take_tests',

  /* Курсы */
  CREATE_COURSES: 'create_courses',
  VIEW_COURSES: 'view_courses',

  /* Отчёты */
  VIEW_CLASS_REPORTS: 'view_class_reports',
  VIEW_SCHOOL_REPORTS: 'view_school_reports',

  /* Аналитика */
  VIEW_SCHOOL_ANALYTICS:
    'view_school_analytics',

  /* Учебный год */
  MANAGE_SCHOOL_YEAR: 'manage_school_year',
  MANAGE_TERMS: 'manage_terms',

  /* Объявления */
  CREATE_ANNOUNCEMENTS:
    'create_announcements',

  /* Импорт / экспорт */
  IMPORT_DATA: 'import_data',
  EXPORT_DATA: 'export_data',

  /* Школа */
  MANAGE_SCHOOL: 'manage_school',

  /* Партнёры */
  MANAGE_PARTNER_OFFERS:
    'manage_partner_offers',

  /* Вся платформа EduBoost */
  MANAGE_PLATFORM: 'manage_platform',
}

/*
  Базовые права каждой роли.
*/

export const ROLE_PERMISSIONS = {
  [ROLES.STUDENT]: [
    PERMISSIONS.VIEW_OWN_SCHEDULE,
    PERMISSIONS.VIEW_GRADES,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.COMPLETE_TASKS,
    PERMISSIONS.TAKE_TESTS,
    PERMISSIONS.VIEW_COURSES,
  ],

  [ROLES.PARENT]: [
    PERMISSIONS.VIEW_GRADES,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.VIEW_COURSES,
  ],

  [ROLES.TEACHER]: [
    PERMISSIONS.VIEW_STUDENTS,
    PERMISSIONS.VIEW_CLASSES,

    PERMISSIONS.VIEW_OWN_SCHEDULE,

    PERMISSIONS.VIEW_OWN_JOURNAL,
    PERMISSIONS.EDIT_OWN_JOURNAL,

    PERMISSIONS.GIVE_GRADES,

    PERMISSIONS.MARK_ATTENDANCE,
    PERMISSIONS.VIEW_ATTENDANCE,

    PERMISSIONS.CREATE_TASKS,
    PERMISSIONS.REVIEW_TASKS,

    PERMISSIONS.CREATE_TESTS,

    PERMISSIONS.CREATE_COURSES,
    PERMISSIONS.VIEW_COURSES,
  ],

  [ROLES.SCHOOL_ADMIN]: [
    PERMISSIONS.VIEW_STUDENTS,
    PERMISSIONS.MANAGE_STUDENTS,

    PERMISSIONS.VIEW_STAFF,
    PERMISSIONS.MANAGE_STAFF,

    PERMISSIONS.VIEW_CLASSES,
    PERMISSIONS.MANAGE_CLASSES,

    PERMISSIONS.VIEW_SCHOOL_SCHEDULE,

    PERMISSIONS.MANAGE_SCHOOL_YEAR,
    PERMISSIONS.MANAGE_TERMS,

    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.EXPORT_DATA,

    PERMISSIONS.MANAGE_SCHOOL,
  ],

  [ROLES.VICE_PRINCIPAL]: [
    PERMISSIONS.VIEW_STUDENTS,
    PERMISSIONS.VIEW_STAFF,

    PERMISSIONS.VIEW_CLASSES,

    PERMISSIONS.VIEW_SCHOOL_SCHEDULE,
    PERMISSIONS.MANAGE_SCHEDULE,

    PERMISSIONS.MANAGE_BELLS,

    PERMISSIONS.VIEW_WORKLOAD,
    PERMISSIONS.MANAGE_WORKLOAD,

    PERMISSIONS.VIEW_SUBSTITUTIONS,
    PERMISSIONS.MANAGE_SUBSTITUTIONS,

    PERMISSIONS.VIEW_ALL_JOURNALS,

    PERMISSIONS.VIEW_SCHOOL_ATTENDANCE,

    PERMISSIONS.VIEW_CLASS_REPORTS,
    PERMISSIONS.VIEW_SCHOOL_REPORTS,

    PERMISSIONS.VIEW_SCHOOL_ANALYTICS,

    PERMISSIONS.CREATE_ANNOUNCEMENTS,
  ],

  [ROLES.DIRECTOR]: [
    PERMISSIONS.VIEW_STUDENTS,
    PERMISSIONS.VIEW_STAFF,
    PERMISSIONS.VIEW_CLASSES,

    PERMISSIONS.VIEW_SCHOOL_SCHEDULE,

    PERMISSIONS.VIEW_WORKLOAD,
    PERMISSIONS.VIEW_SUBSTITUTIONS,

    PERMISSIONS.VIEW_ALL_JOURNALS,

    PERMISSIONS.VIEW_SCHOOL_ATTENDANCE,

    PERMISSIONS.VIEW_CLASS_REPORTS,
    PERMISSIONS.VIEW_SCHOOL_REPORTS,

    PERMISSIONS.VIEW_SCHOOL_ANALYTICS,

    PERMISSIONS.CREATE_ANNOUNCEMENTS,
  ],

  [ROLES.PARTNER]: [
    PERMISSIONS.MANAGE_PARTNER_OFFERS,
  ],

  [ROLES.SUPER_ADMIN]: [
    PERMISSIONS.MANAGE_PLATFORM,
    PERMISSIONS.MANAGE_SCHOOL,
    PERMISSIONS.MANAGE_STUDENTS,
    PERMISSIONS.MANAGE_STAFF,
    PERMISSIONS.MANAGE_CLASSES,
    PERMISSIONS.VIEW_SCHOOL_REPORTS,
    PERMISSIONS.VIEW_SCHOOL_ANALYTICS,
  ],
}

/*
  Проверка права.

  Потом вместо:
  user.role === 'Учитель'

  сможем писать:
  hasPermission(user, PERMISSIONS.CREATE_TASKS)
*/

export function hasPermission(
  user,
  permission,
) {
  if (!user) {
    return false
  }

  const basePermissions =
    ROLE_PERMISSIONS[user.role] || []

  const extraPermissions =
    Array.isArray(user.permissions)
      ? user.permissions
      : []

  return [
    ...basePermissions,
    ...extraPermissions,
  ].includes(permission)
}

export function hasRole(
  user,
  ...roles
) {
  if (!user) {
    return false
  }

  return roles.includes(user.role)
}