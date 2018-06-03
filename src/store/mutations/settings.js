export default {
  LOAD_SETTINGS (state, payload) {
    if (!payload.settings || !Object.keys(payload.settings).length) {
      return
    }

    state.updated = Date.now()
    state.settings = Object.assign(
      {},
      state.settings,
      payload.settings
    )
  }
}
