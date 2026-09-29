import {
  useEffect,
  useRef,
} from 'react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  supabase,
} from '../lib/supabase'


const CHECK_INTERVAL_MS =
  2000


function StaffAccessGuard() {
  const {
    user,
  } = useAuth()


  const logoutStartedRef =
    useRef(false)


  useEffect(() => {
    /*
      Пока контроль нужен только
      для сотрудников-учителей.
    */
    if (
      !user?.id ||
      user.role !==
        'Учитель'
    ) {
      logoutStartedRef.current =
        false

      return undefined
    }


    let disposed =
      false


    let intervalId =
      null


    /* =====================================
       FORCE LOGOUT
    ===================================== */

    async function forceLogout() {
      if (
        disposed ||
        logoutStartedRef.current
      ) {
        return
      }


      logoutStartedRef.current =
        true


      try {
        /*
          Удаляем локальную Supabase
          сессию этого браузера.

          Другие устройства имеют
          собственный StaffAccessGuard
          и тоже увидят deactivated.
        */
        await supabase
          .auth
          .signOut({
            scope:
              'local',
          })
      } catch (
        error
      ) {
        console.error(
          'Staff forced logout:',
          error,
        )
      } finally {
        /*
          location.replace гарантирует,
          что даже если React context
          обновился не сразу,
          кабинет больше не останется
          на экране.
        */
        window.location
          .replace(
            '/login?reason=staff-deactivated',
          )
      }
    }


    /* =====================================
       CHECK STATUS
    ===================================== */

    async function checkStatus() {
      if (
        disposed ||
        logoutStartedRef.current
      ) {
        return
      }


      try {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              'staff_account_status',
            )
            .select(
              'status',
            )
            .eq(
              'user_id',
              user.id,
            )
            .maybeSingle()


        if (disposed) {
          return
        }


        if (error) {
          console.error(
            'Staff status check:',
            error,
          )

          return
        }


        /*
          Строки нет = active.
          Явный deactivated = блокируем.
        */
        if (
          data?.status ===
          'deactivated'
        ) {
          await forceLogout()
        }
      } catch (
        error
      ) {
        console.error(
          'Staff access guard:',
          error,
        )
      }
    }


    /* =====================================
       INITIAL CHECK
    ===================================== */

    void checkStatus()


    /* =====================================
       POLLING
    ===================================== */

    intervalId =
      window.setInterval(
        () => {
          void checkStatus()
        },
        CHECK_INTERVAL_MS,
      )


    /* =====================================
       CHECK WHEN TAB RETURNS
    ===================================== */

    function handleFocus() {
      void checkStatus()
    }


    function handleVisibility() {
      if (
        document
          .visibilityState ===
        'visible'
      ) {
        void checkStatus()
      }
    }


    window.addEventListener(
      'focus',
      handleFocus,
    )


    document
      .addEventListener(
        'visibilitychange',
        handleVisibility,
      )


    /* =====================================
       CLEANUP
    ===================================== */

    return () => {
      disposed =
        true


      if (intervalId) {
        window.clearInterval(
          intervalId,
        )
      }


      window
        .removeEventListener(
          'focus',
          handleFocus,
        )


      document
        .removeEventListener(
          'visibilitychange',
          handleVisibility,
        )
    }
  }, [
    user?.id,
    user?.role,
  ])


  return null
}


export default StaffAccessGuard