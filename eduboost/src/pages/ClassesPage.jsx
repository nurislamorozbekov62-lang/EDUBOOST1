import { useMemo, useState } from 'react'
import {
  Award,
  BookOpen,
  CheckCircle2,
  Flame,
  GraduationCap,
  Plus,
  School,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  UsersRound,
  Zap,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

const defaultClasses = [
  '6 класс',
  '7 класс',
  '8 класс',
  '9 класс',
  '10 класс',
  '11 класс',
]

const testStudents = [
  {
    id: 1,
    name: 'Нурислам',
    className: '6 класс',
    xp: 0,
    streak: 0,
    completedTasks: 0,
  },
  {
    id: 2,
    name: 'Айбек',
    className: '6 класс',
    xp: 480,
    streak: 5,
    completedTasks: 12,
  },
  {
    id: 3,
    name: 'Мээрим',
    className: '6 класс',
    xp: 340,
    streak: 3,
    completedTasks: 9,
  },
  {
    id: 4,
    name: 'Алина',
    className: '7 класс',
    xp: 620,
    streak: 8,
    completedTasks: 18,
  },
  {
    id: 5,
    name: 'Данияр',
    className: '8 класс',
    xp: 770,
    streak: 11,
    completedTasks: 24,
  },
]

function ClassesPage() {
  const { user } = useAuth()

  const [classes, setClasses] =
    useState(defaultClasses)

  const [newClassName, setNewClassName] =
    useState('')

  const [search, setSearch] = useState('')

  function addClass(event) {
    event.preventDefault()

    const className = newClassName.trim()

    if (!className) {
      return
    }

    const classExists = classes.some(
      (item) =>
        item.toLowerCase() ===
        className.toLowerCase(),
    )

    if (classExists) {
      window.alert(
        'Такой класс уже существует',
      )
      return
    }

    setClasses((previousClasses) => [
      ...previousClasses,
      className,
    ])

    setNewClassName('')
  }

  if (!user) {
    return null
  }

  if (user.role === 'Ученик') {
    return (
      <StudentClassView
        user={user}
        search={search}
        setSearch={setSearch}
      />
    )
  }

  return (
    <TeacherClassesView
      user={user}
      classes={classes}
      newClassName={newClassName}
      setNewClassName={setNewClassName}
      addClass={addClass}
    />
  )
}

function StudentClassView({
  user,
  search,
  setSearch,
}) {
  const allClassmates = useMemo(
    () =>
      testStudents.filter(
        (student) =>
          student.className ===
          user.className,
      ),
    [user.className],
  )

  const classmates = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()

    return allClassmates.filter(
      (student) =>
        !query ||
        student.name
          .toLowerCase()
          .includes(query),
    )
  }, [allClassmates, search])

  const totalXp = allClassmates.reduce(
    (sum, student) =>
      sum + Number(student.xp || 0),
    0,
  )

  const averageXp =
    allClassmates.length > 0
      ? Math.round(
          totalXp /
            allClassmates.length,
        )
      : 0

  const bestStudent =
    [...allClassmates].sort(
      (firstStudent, secondStudent) =>
        Number(secondStudent.xp || 0) -
        Number(firstStudent.xp || 0),
    )[0] || null

  const bestStreak =
    allClassmates.length > 0
      ? Math.max(
          ...allClassmates.map(
            (student) =>
              Number(
                student.streak || 0,
              ),
          ),
        )
      : 0

  return (
    <div className="modern-classes-page">
      <ClassesHeader
        title="Мой класс"
        description="Одноклассники, результаты и общая статистика класса."
      />

      <section className="student-class-hero">
        <div className="student-class-hero-content">
          <div className="student-class-hero-label">
            <Sparkles size={16} />
            Ваш класс
          </div>

          <h2>
            {user.className ||
              'Класс не указан'}
          </h2>

          <p>
            Учитесь вместе, поддерживайте
            друг друга и поднимайтесь в
            рейтинге класса.
          </p>

          <div className="student-class-hero-meta">
            <span>
              <School size={17} />
              {user.school ||
                'Школа не указана'}
            </span>

            <span>
              <UsersRound size={17} />
              {allClassmates.length}{' '}
              учеников
            </span>

            <span>
              <Zap size={17} />
              Средний опыт {averageXp}
            </span>
          </div>
        </div>

        <div className="student-class-leader">
          <Trophy size={33} />

          <strong>
            {bestStudent?.name || '—'}
          </strong>

          <span>лидер класса</span>
        </div>
      </section>

      <section className="modern-class-stats">
        <ClassStatCard
          icon={UsersRound}
          value={allClassmates.length}
          label="Учеников"
          className="class-stat--blue"
        />

        <ClassStatCard
          icon={Zap}
          value={totalXp}
          label="Общий опыт"
          className="class-stat--purple"
        />

        <ClassStatCard
          icon={Star}
          value={averageXp}
          label="Средний опыт"
          className="class-stat--gold"
        />

        <ClassStatCard
          icon={Flame}
          value={bestStreak}
          label="Лучшая серия"
          className="class-stat--orange"
        />
      </section>

      <section className="modern-class-section">
        <div className="modern-class-section-heading">
          <div>
            <p>Состав класса</p>
            <h2>Ученики класса</h2>
          </div>

          <span>
            {allClassmates.length}
          </span>
        </div>

        <label className="modern-class-search">
          <Search size={18} />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Найти ученика..."
          />
        </label>

        {classmates.length === 0 ? (
          <div className="modern-class-empty">
            <div>
              <Search size={30} />
            </div>

            <h2>Ученики не найдены</h2>

            <p>
              Попробуйте изменить поисковый
              запрос.
            </p>
          </div>
        ) : (
          <div className="modern-classmates-grid">
            {classmates.map(
              (student, index) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  position={index + 1}
                />
              ),
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function TeacherClassesView({
  user,
  classes,
  newClassName,
  setNewClassName,
  addClass,
}) {
  const totalStudents =
    testStudents.length

  const activeClasses =
    classes.filter((className) =>
      testStudents.some(
        (student) =>
          student.className === className,
      ),
    ).length

  return (
    <div className="modern-classes-page">
      <ClassesHeader
        title="Классы школы"
        description="Управляйте классами и просматривайте результаты учеников."
      />

      <section className="teacher-classes-hero">
        <div className="teacher-classes-hero-content">
          <div className="teacher-classes-label">
            <Sparkles size={16} />
            Управление школой
          </div>

          <h2>
            Все классы в одном месте
          </h2>

          <p>
            Добавляйте новые классы,
            отслеживайте учеников и
            контролируйте учебный процесс.
          </p>

          <div className="teacher-classes-meta">
            <span>
              <School size={17} />
              {user.school ||
                'Школа не указана'}
            </span>

            <span>
              <UsersRound size={17} />
              {totalStudents} учеников
            </span>

            <span>
              <GraduationCap size={17} />
              {activeClasses} активных
              классов
            </span>
          </div>
        </div>

        <div className="teacher-classes-badge">
          <School size={40} />

          <strong>
            {classes.length}
          </strong>

          <span>классов</span>
        </div>
      </section>

      {user.role === 'Учитель' && (
        <form
          className="modern-class-create"
          onSubmit={addClass}
        >
          <div>
            <p>Новая параллель</p>
            <h2>Добавить класс</h2>
          </div>

          <div className="modern-class-create-row">
            <input
              value={newClassName}
              onChange={(event) =>
                setNewClassName(
                  event.target.value,
                )
              }
              placeholder="Например: 7-А"
            />

            <button type="submit">
              <Plus size={19} />
              Добавить класс
            </button>
          </div>
        </form>
      )}

      <section className="modern-class-section">
        <div className="modern-class-section-heading">
          <div>
            <p>Учебные группы</p>
            <h2>Все классы</h2>
          </div>

          <span>{classes.length}</span>
        </div>

        <div className="modern-classes-grid">
          {classes.map(
            (className, index) => {
              const students =
                testStudents.filter(
                  (student) =>
                    student.className ===
                    className,
                )

              return (
                <ClassCard
                  key={className}
                  classNameValue={
                    className
                  }
                  students={students}
                  index={index}
                />
              )
            },
          )}
        </div>
      </section>
    </div>
  )
}

function ClassesHeader({
  title,
  description,
}) {
  return (
    <header className="modern-classes-header">
      <div className="modern-classes-header-icon">
        <UsersRound size={28} />
      </div>

      <div>
        <p>Школьное сообщество</p>

        <h1>{title}</h1>

        <span>{description}</span>
      </div>
    </header>
  )
}

function ClassStatCard({
  icon: Icon,
  value,
  label,
  className,
}) {
  return (
    <article
      className={`modern-class-stat-card ${className}`}
    >
      <div className="modern-class-stat-icon">
        <Icon size={21} />
      </div>

      <div>
        <strong>
          {Number(value).toLocaleString(
            'ru-RU',
          )}
        </strong>

        <span>{label}</span>
      </div>
    </article>
  )
}

function StudentCard({
  student,
  position,
}) {
  const progress = Math.min(
    Number(
      student.completedTasks || 0,
    ) * 4,
    100,
  )

  return (
    <article className="modern-classmate-card">
      <div className="modern-classmate-top">
        <div className="modern-classmate-avatar">
          {String(student.name || 'У')
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="modern-classmate-position">
          #{position}
        </div>
      </div>

      <h3>{student.name}</h3>

      <span className="modern-classmate-role">
        <UserRound size={14} />
        Ученик
      </span>

      <div className="modern-classmate-stats">
        <div>
          <Zap size={17} />

          <span>
            <strong>{student.xp}</strong>
            <small>опыта</small>
          </span>
        </div>

        <div>
          <Flame size={17} />

          <span>
            <strong>
              {student.streak}
            </strong>

            <small>дней</small>
          </span>
        </div>
      </div>

      <div className="modern-classmate-progress">
        <div>
          <span>Заданий выполнено</span>

          <strong>
            {student.completedTasks || 0}
          </strong>
        </div>

        <div>
          <span
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>
    </article>
  )
}

function ClassCard({
  classNameValue,
  students,
  index,
}) {
  const totalXp = students.reduce(
    (sum, student) =>
      sum + Number(student.xp || 0),
    0,
  )

  const Icon = getClassIcon(index)

  return (
    <article className="modern-class-card">
      <div className="modern-class-card-cover">
        <div className="modern-class-card-icon">
          <Icon size={29} />
        </div>

        <span>
          {students.length}{' '}
          {getStudentWord(
            students.length,
          )}
        </span>
      </div>

      <div className="modern-class-card-body">
        <p>Учебная группа</p>

        <h3>{classNameValue}</h3>

        <div className="modern-class-card-stats">
          <div>
            <UsersRound size={17} />

            <span>
              <strong>
                {students.length}
              </strong>

              <small>учеников</small>
            </span>
          </div>

          <div>
            <Zap size={17} />

            <span>
              <strong>{totalXp}</strong>
              <small>опыта</small>
            </span>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="modern-class-card-empty">
            Учеников пока нет
          </div>
        ) : (
          <div className="modern-class-student-preview">
            {students
              .slice(0, 3)
              .map((student) => (
                <div key={student.id}>
                  <span>
                    {String(
                      student.name || 'У',
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </span>

                  <strong>
                    {student.name}
                  </strong>

                  <small>
                    {student.xp} XP
                  </small>
                </div>
              ))}
          </div>
        )}
      </div>
    </article>
  )
}

function getClassIcon(index) {
  const icons = [
    School,
    GraduationCap,
    BookOpen,
    ShieldCheck,
    Award,
    CheckCircle2,
  ]

  return icons[index % icons.length]
}

function getStudentWord(count) {
  const value = Math.abs(count) % 100
  const lastDigit = value % 10

  if (
    value > 10 &&
    value < 20
  ) {
    return 'учеников'
  }

  if (lastDigit === 1) {
    return 'ученик'
  }

  if (
    lastDigit >= 2 &&
    lastDigit <= 4
  ) {
    return 'ученика'
  }

  return 'учеников'
}

export default ClassesPage