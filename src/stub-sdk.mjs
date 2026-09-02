const _host = globalThis.__HERMES_HOST__ || {}
export const PALETTE_AREA = 'palette'
export const ROUTES_AREA = 'routes'
export const SIDEBAR_NAV_AREA = 'sidebar'
export const STATUSBAR_AREAS = { right: 'statusbar.right' }
export const haptic = () => {}
export const host = _host
export default { PALETTE_AREA, ROUTES_AREA, SIDEBAR_NAV_AREA, STATUSBAR_AREAS, haptic, host }
