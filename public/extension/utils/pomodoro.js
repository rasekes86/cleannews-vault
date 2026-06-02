// CleanNews Vault v5.0 - Pomodoro Timer State Manager
// Manages timer state for work/break cycles

const CleanNewsPomodoro = (() => {
  'use strict';

  // ── State ───────────────────────────────────────────────────────

  let _state = {
    status: 'idle',        // 'idle' | 'running' | 'paused'
    mode: 'work',          // 'work' | 'break'
    timeRemaining: 0,       // seconds remaining
    totalTime: 0,          // total seconds for current session
    completedCount: 0,     // number of completed work sessions
    startTime: null,       // ISO timestamp when current session started
    _intervalId: null      // internal interval reference
  };

  // ── Constants ────────────────────────────────────────────────────

  const DEFAULT_WORK_MINUTES = 25;
  const DEFAULT_BREAK_MINUTES = 5;
  const TICK_INTERVAL_MS = 1000;

  // ── Private helpers ──────────────────────────────────────────────

  function _clearInterval() {
    if (_state._intervalId) {
      clearInterval(_state._intervalId);
      _state._intervalId = null;
    }
  }

  function _resetTimeRemaining() {
    _state.timeRemaining = _state.totalTime;
  }

  function _onComplete() {
    _clearInterval();

    if (_state.mode === 'work') {
      _state.completedCount++;
      _state.mode = 'break';
      _state.totalTime = DEFAULT_BREAK_MINUTES * 60;
      _resetTimeRemaining();
      _state.startTime = new Date().toISOString();
      // Auto-start break
      _startInterval();
    } else {
      // Break finished, go back to idle
      _state.status = 'idle';
      _state.mode = 'work';
      _state.timeRemaining = 0;
      _state.totalTime = 0;
      _state.startTime = null;
    }
  }

  function _startInterval() {
    _clearInterval();
    _state.status = 'running';
    _state._intervalId = setInterval(() => {
      if (_state.timeRemaining > 0) {
        _state.timeRemaining--;
      } else {
        _onComplete();
      }
    }, TICK_INTERVAL_MS);
  }

  // ── Public API ──────────────────────────────────────────────────

  return {

    /**
     * Get current timer state (without internal fields).
     * @returns {object} Timer state
     */
    getState() {
      return {
        status: _state.status,
        mode: _state.mode,
        timeRemaining: _state.timeRemaining,
        totalTime: _state.totalTime,
        completedCount: _state.completedCount,
        startTime: _state.startTime
      };
    },

    /**
     * Start a new pomodoro session.
     * @param {number} [workMinutes=25] - Work session duration
     * @param {number} [breakMinutes=5] - Break session duration
     */
    start(workMinutes, breakMinutes) {
      _clearInterval();

      _state.mode = 'work';
      _state.totalTime = (typeof workMinutes === 'number' ? workMinutes : DEFAULT_WORK_MINUTES) * 60;
      _state._breakMinutes = typeof breakMinutes === 'number' ? breakMinutes : DEFAULT_BREAK_MINUTES;
      _resetTimeRemaining();
      _state.startTime = new Date().toISOString();

      _startInterval();
    },

    /**
     * Pause the current timer.
     */
    pause() {
      if (_state.status === 'running') {
        _clearInterval();
        _state.status = 'paused';
      }
    },

    /**
     * Reset the timer to idle state.
     */
    reset() {
      _clearInterval();
      _state.status = 'idle';
      _state.mode = 'work';
      _state.timeRemaining = 0;
      _state.totalTime = 0;
      _state.completedCount = 0;
      _state.startTime = null;
    },

    /**
     * Tick the timer by one second (for manual tick if not using auto-interval).
     * Also called automatically by the interval.
     */
    tick() {
      if (_state.status !== 'running') return this.getState();
      if (_state.timeRemaining > 0) {
        _state.timeRemaining--;
      }
      if (_state.timeRemaining <= 0) {
        _onComplete();
      }
      return this.getState();
    },

    /**
     * Resume a paused timer.
     */
    resume() {
      if (_state.status === 'paused') {
        _startInterval();
      }
    },

    /**
     * Skip the current session (work or break).
     */
    skip() {
      _clearInterval();

      if (_state.mode === 'work') {
        _state.completedCount++;
      }

      // Switch mode
      if (_state.mode === 'work') {
        _state.mode = 'break';
        _state.totalTime = (_state._breakMinutes || DEFAULT_BREAK_MINUTES) * 60;
        _state.startTime = new Date().toISOString();
        _resetTimeRemaining();
        _startInterval();
      } else {
        _state.status = 'idle';
        _state.mode = 'work';
        _state.timeRemaining = 0;
        _state.totalTime = 0;
        _state.startTime = null;
      }
    }
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.CleanNewsPomodoro = CleanNewsPomodoro;
}
