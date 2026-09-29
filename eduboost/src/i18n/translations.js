export const DEFAULT_LANGUAGE = 'ru'

export const SUPPORTED_LANGUAGES = [
  'ru',
  'ky',
]

export const translations = {
  ru: {
    common: {
      save: 'Сохранить',
      saved: 'Сохранено',
      cancel: 'Отмена',
      delete: 'Удалить',
      edit: 'Изменить',
      create: 'Создать',
      add: 'Добавить',
      continue: 'Продолжить',
      back: 'Назад',
      next: 'Далее',
      search: 'Поиск',
      close: 'Закрыть',
      open: 'Открыть',
      loading: 'Загрузка...',
      saving: 'Сохраняем...',
      error: 'Произошла ошибка',
      noData: 'Нет данных',
      yes: 'Да',
      no: 'Нет',
      all: 'Все',
      today: 'Сегодня',
      tomorrow: 'Завтра',
      yesterday: 'Вчера',
      required: 'Обязательно',
    },

    navigation: {
      home: 'Главная',
      schedule: 'Расписание',
      lessons: 'Уроки',
      tasks: 'Задания',
      achievements: 'Достижения',
      profile: 'Профиль',
      journal: 'Журнал',
      progress: 'Успеваемость',
      attendance: 'Посещаемость',
      tests: 'Мои тесты',
      courses: 'Учебные курсы',
      messages: 'Сообщения',
      notifications: 'Уведомления',
      settings: 'Настройки',
      myClass: 'Мой класс',
      myClasses: 'Мои классы',
      rating: 'Рейтинг',
      partnerRewards: 'Награды партнёров',
      myCoupons: 'Мои купоны',
      rewardsStore: 'Магазин наград',
      quarterGrades: 'Четвертные оценки',
      childTasks: 'Задания ребёнка',
      grades: 'Оценки',
      teacherSchedule: 'Моё расписание',
      testBuilder: 'Конструктор тестов',
      users: 'Пользователи',
      classes: 'Классы',
      staff: 'Сотрудники',
      schoolYear: 'Учебный год',
      importData: 'Импорт данных',
      exportData: 'Экспорт данных',
      schoolSettings: 'Настройки школы',
      workload: 'Нагрузка',
      journals: 'Журналы',
      substitutions: 'Замены',
      schoolAttendance: 'Посещаемость школы',
      reports: 'Отчёты',
      analytics: 'Аналитика',
      schoolSchedule: 'Расписание школы',
      offers: 'Предложения',
      coupons: 'Купоны',
      statistics: 'Статистика',
      schools: 'Школы',
      partners: 'Партнёры',
      systemSettings: 'Настройки системы',
    },

    workspace: {
      student: 'Личный кабинет',
      parent: 'Дневник ребёнка',
      teacher: 'Кабинет учителя',
      schoolAdmin: 'Администрирование школы',
      director: 'Кабинет директора',
      vicePrincipal: 'Кабинет завуча',
      partner: 'Кабинет партнёра',
      superAdmin: 'Управление EduBoost',
    },

    account: {
      account: 'Аккаунт',
      name: 'Имя',
      email: 'Электронная почта',
      role: 'Роль',
      class: 'Класс',
      school: 'Школа',
      openProfile: 'Открыть профиль',
      logout: 'Выйти',
      logoutFromAccount: 'Выйти из аккаунта',
      logoutConfirm: 'Выйти из аккаунта?',
      login: 'Войти',
      register: 'Регистрация',
    },

    settings: {
      title: 'Настройки',
      subtitle: 'Настройте аккаунт и приложение под себя.',

      language: 'Язык',
      languageDescription:
        'Язык интерфейса и учебных материалов.',

      interfaceLanguage: 'Язык интерфейса',
      interfaceLanguageDescription:
        'Кнопки, меню и страницы EduBoost.',

      contentLanguage:
        'Язык учебных материалов',
      contentLanguageDescription:
        'Предпочтительный язык курсов и учебного контента.',

      russian: 'Русский',
      kyrgyz: 'Кыргызча',

      appearance: 'Интерфейс',
      appearanceDescription:
        'Выберите внешний вид EduBoost.',

      light: 'Светлая',
      dark: 'Тёмная',
      system: 'Как в системе',

      notifications: 'Уведомления',
      notificationsDescription:
        'Выберите, о каких событиях вас уведомлять.',

      newGrade: 'Новая оценка',
      newGradeDescription:
        'Когда в журнале появляется новая оценка.',

      homework: 'Домашние задания',
      homeworkDescription:
        'Новое задание или изменение срока.',

      attendance: 'Посещаемость',
      attendanceDescription:
        'При пропуске или опоздании.',

      quarterGrade: 'Четвертная оценка',
      quarterGradeDescription:
        'Когда выставлена итоговая оценка за четверть.',

      messages: 'Сообщения',
      messagesDescription:
        'Новые личные сообщения.',

      saveSettings: 'Сохранить настройки',
      settingsSaved: 'Настройки сохранены.',

      logoutDescription:
        'При следующем входе потребуется авторизация.',
    },

    education: {
      lesson: 'Урок',
      lessons: 'Уроки',
      subject: 'Предмет',
      subjects: 'Предметы',
      teacher: 'Учитель',
      teachers: 'Учителя',
      student: 'Ученик',
      students: 'Ученики',
      parent: 'Родитель',
      parents: 'Родители',
      class: 'Класс',
      school: 'Школа',

      homework: 'Домашнее задание',
      homeworkPlural: 'Домашние задания',

      grade: 'Оценка',
      grades: 'Оценки',
      averageGrade: 'Средняя оценка',
      weightedAverage: 'Средневзвешенный балл',

      quarter: 'Четверть',
      quarterGrade: 'Четвертная оценка',
      finalGrade: 'Итоговая оценка',
      forecast: 'Прогноз',

      attendance: 'Посещаемость',
      present: 'Присутствовал',
      absent: 'Отсутствовал',
      late: 'Опоздал',

      test: 'Тест',
      tests: 'Тесты',
      result: 'Результат',

      task: 'Задание',
      tasks: 'Задания',
      deadline: 'Срок выполнения',

      topic: 'Тема урока',
      classroom: 'Кабинет',
    },
  },


  ky: {
    common: {
      save: 'Сактоо',
      saved: 'Сакталды',
      cancel: 'Жокко чыгаруу',
      delete: 'Өчүрүү',
      edit: 'Өзгөртүү',
      create: 'Түзүү',
      add: 'Кошуу',
      continue: 'Улантуу',
      back: 'Артка',
      next: 'Кийинки',
      search: 'Издөө',
      close: 'Жабуу',
      open: 'Ачуу',
      loading: 'Жүктөлүүдө...',
      saving: 'Сакталууда...',
      error: 'Ката кетти',
      noData: 'Маалымат жок',
      yes: 'Ооба',
      no: 'Жок',
      all: 'Баары',
      today: 'Бүгүн',
      tomorrow: 'Эртең',
      yesterday: 'Кечээ',
      required: 'Милдеттүү',
    },

    navigation: {
      home: 'Башкы бет',

      schedule:
        'Сабактардын ырааттамасы',

      lessons: 'Сабактар',

      tasks: 'Тапшырмалар',

      achievements:
        'Жетишкендиктер',

      profile: 'Профиль',

      journal: 'Журнал',

      progress:
        'Окуу жетишкендиктери',

      attendance:
        'Сабакка катышуу',

      tests: 'Менин тесттерим',

      courses: 'Окуу курстары',

      messages: 'Билдирүүлөр',

      notifications:
        'Билдирмелер',

      settings: 'Жөндөөлөр',

      myClass: 'Менин классым',

      myClasses:
        'Менин класстарым',

      rating: 'Рейтинг',

      partnerRewards:
        'Өнөктөштөрдүн сыйлыктары',

      myCoupons:
        'Менин купондорум',

      rewardsStore:
        'Сыйлыктар дүкөнү',

      quarterGrades:
        'Чейректик баалар',

      childTasks:
        'Баланын тапшырмалары',

      grades: 'Баалар',

      teacherSchedule:
        'Менин ырааттамам',

      testBuilder:
        'Тест түзүү',

      users: 'Колдонуучулар',

      classes: 'Класстар',

      staff: 'Кызматкерлер',

      schoolYear: 'Окуу жылы',

      importData:
        'Маалыматтарды импорттоо',

      exportData:
        'Маалыматтарды экспорттоо',

      schoolSettings:
        'Мектеп жөндөөлөрү',

      workload: 'Окуу жүгү',

      journals: 'Журналдар',

      substitutions:
        'Алмаштыруулар',

      schoolAttendance:
        'Мектептеги сабакка катышуу',

      reports: 'Отчёттор',

      analytics: 'Аналитика',

      schoolSchedule:
        'Мектептин сабактар ырааттамасы',

      offers: 'Сунуштар',

      coupons: 'Купондор',

      statistics: 'Статистика',

      schools: 'Мектептер',

      partners: 'Өнөктөштөр',

      systemSettings:
        'Системанын жөндөөлөрү',
    },

    workspace: {
      student: 'Жеке кабинет',

      parent:
        'Баланын күндөлүгү',

      teacher:
        'Мугалимдин кабинети',

      schoolAdmin:
        'Мектепти башкаруу',

      director:
        'Директордун кабинети',

      vicePrincipal:
        'Директордун орун басарынын кабинети',

      partner:
        'Өнөктөштүн кабинети',

      superAdmin:
        'EduBoost башкаруу',
    },

    account: {
      account: 'Аккаунт',
      name: 'Аты-жөнү',
      email: 'Электрондук почта',
      role: 'Роль',
      class: 'Класс',
      school: 'Мектеп',

      openProfile:
        'Профилди ачуу',

      logout: 'Чыгуу',

      logoutFromAccount:
        'Аккаунттан чыгуу',

      logoutConfirm:
        'Аккаунттан чыгууну каалайсызбы?',

      login: 'Кирүү',

      register: 'Катталуу',
    },

    settings: {
      title: 'Жөндөөлөр',

      subtitle:
        'Аккаунтту жана колдонмону өзүңүзгө ылайыктаңыз.',

      language: 'Тил',

      languageDescription:
        'Интерфейстин жана окуу материалдарынын тили.',

      interfaceLanguage:
        'Интерфейс тили',

      interfaceLanguageDescription:
        'EduBoost баскычтары, менюсу жана барактары.',

      contentLanguage:
        'Окуу материалдарынын тили',

      contentLanguageDescription:
        'Курстар жана окуу материалдары үчүн негизги тил.',

      russian: 'Русский',
      kyrgyz: 'Кыргызча',

      appearance: 'Көрүнүш',

      appearanceDescription:
        'EduBoost көрүнүшүн тандаңыз.',

      light: 'Жарык',
      dark: 'Караңгы',
      system: 'Системадагыдай',

      notifications:
        'Билдирмелер',

      notificationsDescription:
        'Кайсы окуялар тууралуу билдирме алууну тандаңыз.',

      newGrade: 'Жаңы баа',

      newGradeDescription:
        'Журналга жаңы баа коюлганда.',

      homework:
        'Үй тапшырмалары',

      homeworkDescription:
        'Жаңы тапшырма берилгенде же мөөнөтү өзгөргөндө.',

      attendance:
        'Сабакка катышуу',

      attendanceDescription:
        'Сабак калтыруу же кечигүү белгиленгенде.',

      quarterGrade:
        'Чейректик баа',

      quarterGradeDescription:
        'Чейректик жыйынтык баа коюлганда.',

      messages:
        'Билдирүүлөр',

      messagesDescription:
        'Жаңы жеке билдирүүлөр келгенде.',

      saveSettings:
        'Жөндөөлөрдү сактоо',

      settingsSaved:
        'Жөндөөлөр сакталды.',

      logoutDescription:
        'Кийинки жолу кайра кирүү талап кылынат.',
    },

    education: {
      lesson: 'Сабак',
      lessons: 'Сабактар',

      subject: 'Предмет',
      subjects: 'Предметтер',

      teacher: 'Мугалим',
      teachers: 'Мугалимдер',

      student: 'Окуучу',
      students: 'Окуучулар',

      parent: 'Ата-эне',
      parents: 'Ата-энелер',

      class: 'Класс',
      school: 'Мектеп',

      homework:
        'Үй тапшырмасы',

      homeworkPlural:
        'Үй тапшырмалары',

      grade: 'Баа',
      grades: 'Баалар',

      averageGrade:
        'Орточо баа',

      weightedAverage:
        'Салмакталган орточо балл',

      quarter: 'Чейрек',

      quarterGrade:
        'Чейректик баа',

      finalGrade:
        'Жыйынтык баа',

      forecast: 'Болжол',

      attendance:
        'Сабакка катышуу',

      present: 'Катышты',

      absent:
        'Катышкан жок',

      late: 'Кечикти',

      test: 'Тест',
      tests: 'Тесттер',

      result: 'Жыйынтык',

      task: 'Тапшырма',
      tasks: 'Тапшырмалар',

      deadline:
        'Аткаруу мөөнөтү',

      topic:
        'Сабактын темасы',

      classroom: 'Кабинет',
    },
  },
}