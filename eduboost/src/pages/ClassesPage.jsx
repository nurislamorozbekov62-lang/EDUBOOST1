import { useState } from 'react'
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
  },
  {
    id: 2,
    name: 'Айбек',
    className: '6 класс',
    xp: 480,
    streak: 5,
  },
  {
    id: 3,
    name: 'Алина',
    className: '7 класс',
    xp: 620,
    streak: 8,
  },
]

function ClassesPage() {
  const { user } = useAuth()

  const [classes, setClasses] =
    useState(defaultClasses)

  const [newClassName, setNewClassName] =
    useState('')

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
      alert('Такой класс уже существует')
      return
    }

    setClasses((previousClasses) => [
      ...previousClasses,
      className,
    ])

    setNewClassName('')
  }

  if (user.role === 'Ученик') {
    const classmates = testStudents.filter(
      (student) =>
        student.className === user.className,
    )

    return (
      <div className="page-container">
        <header className="page-header">
          <div>
            <h1>Мой класс</h1>

            <p>{user.className}</p>
          </div>
        </header>

        <section className="content-card">
          <h2>Ученики класса</h2>

          <div className="students-list">
            {classmates.map((student) => (
              <div
                className="student-item"
                key={student.id}
              >
                <div className="student-avatar">
                  {student.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <strong>{student.name}</strong>

                  <p>
                    ⚡ {student.xp} опыта · 🔥{' '}
                    {student.streak} дней
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Классы</h1>

          <p>
            Управление классами и учениками школы
          </p>
        </div>
      </header>

      {user.role === 'Учитель' && (
        <form
          className="content-card class-create-form"
          onSubmit={addClass}
        >
          <h2>Добавить параллель</h2>

          <div className="class-form-row">
            <input
              value={newClassName}
              onChange={(event) =>
                setNewClassName(
                  event.target.value,
                )
              }
              placeholder="Например: 7-А"
            />

            <button
              type="submit"
              className="primary-small-button"
            >
              Добавить класс
            </button>
          </div>
        </form>
      )}

      <section className="classes-grid">
        {classes.map((className) => {
          const students = testStudents.filter(
            (student) =>
              student.className === className,
          )

          return (
            <article
              className="class-card"
              key={className}
            >
              <div className="class-card-header">
                <div>
                  <h2>{className}</h2>

                  <p>
                    {students.length} учеников
                  </p>
                </div>

                <span>🏫</span>
              </div>

              <div className="class-students">
                {students.length === 0 && (
                  <p className="empty-text">
                    Учеников пока нет
                  </p>
                )}

                {students.map((student) => (
                  <div
                    className="small-student"
                    key={student.id}
                  >
                    <strong>
                      {student.name}
                    </strong>

                    <span>
                      ⚡ {student.xp}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}

export default ClassesPage