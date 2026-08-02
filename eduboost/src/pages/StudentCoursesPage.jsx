import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  enrollInCourse,
  getPublishedCourses,
  getStudentAllCourseProgress,
} from '../services/courseService'

function StudentCoursesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [courses, setCourses] = useState([])
  const [progressList, setProgressList] = useState([])
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('Все')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadData = () => {
    setCourses(getPublishedCourses())

    if (user?.id) {
      setProgressList(
        getStudentAllCourseProgress(user.id)
      )
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  const subjects = useMemo(() => {
    const uniqueSubjects = Array.from(
      new Set(courses.map((course) => course.subject))
    )

    return ['Все', ...uniqueSubjects]
  }, [courses])

  const filteredCourses = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase()

    return courses.filter((course) => {
      const matchesSearch =
        !normalizedSearch ||
        course.title
          .toLowerCase()
          .includes(normalizedSearch) ||
        course.description
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        course.teacherName
          ?.toLowerCase()
          .includes(normalizedSearch)

      const matchesSubject =
        subjectFilter === 'Все' ||
        course.subject === subjectFilter

      return matchesSearch && matchesSubject
    })
  }, [courses, search, subjectFilter])

  const getProgress = (courseId) =>
    progressList.find(
      (progress) => progress.courseId === courseId
    )

  const handleEnroll = (course) => {
    setMessage('')
    setError('')

    if (course.accessType === 'paid') {
      setError(
        'Оплата платных курсов пока не подключена. Функцию добавим позже.'
      )
      return
    }

    try {
      enrollInCourse(course.id)
      loadData()
      navigate(`/courses/${course.id}`)
    } catch (enrollError) {
      setError(
        enrollError.message ||
          'Не удалось записаться на курс'
      )
    }
  }

  if (!user) {
    return <p>Пользователь не найден.</p>
  }

  if (user.role !== 'Ученик') {
    return (
      <div className="page-container">
        <h1>Учебные курсы</h1>
        <p>
          Каталог курсов доступен ученикам.
        </p>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Учебные курсы</h1>
          <p>
            Изучайте новые темы, проходите уроки и
            получайте баллы.
          </p>
        </div>
      </div>

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div
        className="content-card"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(200px, 1fr) minmax(170px, 240px)',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Найти курс..."
        />

        <select
          value={subjectFilter}
          onChange={(event) =>
            setSubjectFilter(event.target.value)
          }
        >
          {subjects.map((subject) => (
            <option key={subject}>
              {subject}
            </option>
          ))}
        </select>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="content-card empty-state">
          <h2>Курсы не найдены</h2>
          <p>
            Учителя пока не опубликовали подходящие
            курсы.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '18px',
          }}
        >
          {filteredCourses.map((course) => {
            const progress = getProgress(course.id)
            const isEnrolled = Boolean(progress)

            return (
              <article
                key={course.id}
                className="content-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      fontSize: '48px',
                    }}
                  >
                    {course.coverEmoji || '📘'}
                  </span>

                  <span
                    style={{
                      padding: '5px 10px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      background:
                        course.accessType === 'paid'
                          ? '#fef3c7'
                          : '#dcfce7',
                      color:
                        course.accessType === 'paid'
                          ? '#92400e'
                          : '#166534',
                    }}
                  >
                    {course.accessType === 'paid'
                      ? `${course.price} сом`
                      : 'Бесплатно'}
                  </span>
                </div>

                <div>
                  <h2
                    style={{
                      marginBottom: '6px',
                    }}
                  >
                    {course.title}
                  </h2>

                  <p
                    style={{
                      color: '#6b7280',
                      margin: 0,
                    }}
                  >
                    {course.description ||
                      'Описание курса не указано.'}
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: '6px',
                    fontSize: '14px',
                    color: '#4b5563',
                  }}
                >
                  <span>
                    📚 Предмет: {course.subject}
                  </span>

                  <span>
                    🎓 Уровень: {course.level}
                  </span>

                  <span>
                    👥 Для кого: {course.className}
                  </span>

                  <span>
                    👨‍🏫 Учитель: {course.teacherName}
                  </span>

                  <span>
                    📖 Уроков:{' '}
                    {course.lessons?.length || 0}
                  </span>

                  <span>
                    👤 Учеников:{' '}
                    {course.studentsCount || 0}
                  </span>
                </div>

                {isEnrolled && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '6px',
                        fontSize: '14px',
                      }}
                    >
                      <span>Ваш прогресс</span>
                      <strong>
                        {progress.progressPercent || 0}%
                      </strong>
                    </div>

                    <div
                      style={{
                        height: '10px',
                        borderRadius: '999px',
                        background: '#e5e7eb',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${
                            progress.progressPercent || 0
                          }%`,
                          height: '100%',
                          background: '#4f46e5',
                        }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="primary-button"
                  style={{
                    marginTop: 'auto',
                  }}
                  onClick={() => {
                    if (isEnrolled) {
                      navigate(`/courses/${course.id}`)
                    } else {
                      handleEnroll(course)
                    }
                  }}
                >
                  {isEnrolled
                    ? progress.status === 'completed'
                      ? 'Посмотреть завершённый курс'
                      : 'Продолжить обучение'
                    : course.accessType === 'paid'
                      ? `Купить за ${course.price} сом`
                      : 'Записаться бесплатно'}
                </button>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default StudentCoursesPage