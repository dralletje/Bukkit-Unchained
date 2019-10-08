// TODO Create local only timers
// .... Now I only make sure they are disposed
// .... but in theory someone can cancel some else-s timer
export let create_isolated_timers = ({ plugin, active_session }) => {
  return {
    setTimeout: (...args) => {
      let timer_id = setTimeout(...args);
      active_session.add_active_process({
        dispose: () => clearTimeout(timer_id)
      });
      return timer_id;
    },
    setInterval: (...args) => {
      let timer_id = setInterval(...args);
      active_session.add_active_process({
        dispose: () => clearInterval(timer_id)
      });
      return timer_id;
    },
    clearTimeout: timer_id => {
      clearTimeout(timer_id);
    },
    clearInterval: timer_id => {
      clearInterval(timer_id);
    }
  };
};
