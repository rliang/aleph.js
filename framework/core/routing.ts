import util from '../../shared/util.ts'
import type { RouterURL } from '../../types.ts'
import { redirect } from './redirect.ts'

const ghostRoute: Route = { path: '', module: { url: '' } }

export type Route = {
  path: string
  module: RouteModule
  children?: Route[]
}

export type RouteModule = {
  readonly url: string
  readonly useDeno?: boolean
}

export type RoutingOptions = {
  baseURL?: string
  defaultLocale?: string
  locales?: string[]
  routes?: Route[]
  rewrites?: Record<string, string>
}

export class Routing {
  private _baseURL: string
  private _defaultLocale: string
  private _locales: string[]
  private _routes: Route[]
  private _rewrites: Record<string, string>

  constructor({
    baseURL = '/',
    defaultLocale = 'en',
    locales = [],
    routes = [],
    rewrites = {}
  }: RoutingOptions) {
    this._baseURL = baseURL
    this._defaultLocale = defaultLocale
    this._locales = locales
    this._routes = routes
    this._rewrites = rewrites
  }

  get baseURL() {
    return this._baseURL
  }

  get paths() {
    const paths: string[] = []
    this._lookup(path => { paths.push(path.map(r => r.path).join('')) }, true)
    return paths
  }

  // routes returns the routes as copy
  get routes(): Route[] {
    return JSON.parse(JSON.stringify(this._routes))
  }

  config(options: RoutingOptions) {
    Object.keys(options).forEach((key) => {
      Object.assign(this, { ['_' + key]: options[key as keyof typeof options] })
    })
  }

  update(path: string, moduleUrl: string, options: { isIndex?: boolean, useDeno?: boolean } = {}) {
    const { isIndex, ...rest } = options
    const newRoute: Route = {
      path: path === '/' ? path : util.trimSuffix(path, '/') + (options.isIndex ? '/' : ''),
      module: { url: moduleUrl, ...rest }
    }
    const dirtyRoutes: Set<Route[]> = new Set()
    let exists = false
    let targetRoutes = this._routes
    this._lookup(routePath => {
      const path = routePath.map(r => r.path).join('')
      const route = routePath[routePath.length - 1]
      const parentRoute = routePath[routePath.length - 2]
      if (route.module.url === newRoute.module.url) {
        Object.assign(route.module, newRoute.module)
        exists = true
        return false
      }
      if (!newRoute.path.endsWith('/') && path.startsWith(newRoute.path + '/')) {
        const routes = parentRoute ? parentRoute.children! : this._routes
        const index = routes.indexOf(route)
        if (index >= 0) {
          routes.splice(index, 1, ghostRoute)
          dirtyRoutes.add(routes)
        }
        (newRoute.children || (newRoute.children = [])).push({ ...route, path: util.trimPrefix(path, newRoute.path) })
      } else if (!path.endsWith('/') && newRoute.path.startsWith(path + '/')) {
        newRoute.path = util.trimPrefix(newRoute.path, path)
        targetRoutes = route.children || (route.children = [])
      }
    })
    if (exists) {
      return
    }
    dirtyRoutes.forEach(routes => {
      let index: number
      while (~(index = routes.indexOf(ghostRoute))) {
        routes.splice(index, 1)
      }
    })
    dirtyRoutes.clear()
    targetRoutes.push(newRoute)
  }

  removeRoute(url: string) {
    this._lookup(path => {
      const route = path[path.length - 1]
      if (route.module.url === url) {
        const parentRoute = path[path.length - 2]
        const routes = parentRoute ? parentRoute.children! : this._routes
        const index = routes.indexOf(route)
        if (index >= 0) {
          routes.splice(index, 1, ...(route.children || []).map(r => ({ ...r, path: route.path + r.path })))
        }
        return false
      }
    })
  }

  createRouter(location?: { pathname: string, search?: string }): [RouterURL, RouteModule[]] {
    const loc = location || (window as any).location || { pathname: '/' }
    const url = rewriteURL(loc.pathname + (loc.search || ''), this._baseURL, this._rewrites)

    let locale = this._defaultLocale
    let pathname = decodeURI(url.pathname)
    let pagePath = ''
    let params = new URLSearchParams()
    let nestedModules: RouteModule[] = []

    if (pathname !== '/' && this._locales.length > 0) {
      const a = pathname.split('/')
      const a1 = a[1]
      if (a1 !== locale && this._locales.includes(a1)) {
        locale = a1
        pathname = '/' + a.slice(2).join('/')
      }
    }

    this._lookup(routePath => {
      const path = routePath.map(r => r.path).join('')
      const [p, ok] = matchPath(path, pathname)
      if (ok) {
        nestedModules = routePath.map(r => r.module)
        const c = routePath[routePath.length - 1].children?.find(c => c.path === '/')
        if (c) {
          nestedModules.push(c.module)
        }
        pagePath = path
        Object.entries(p).forEach(([key, value]) => {
          params.append(key, value)
        })
        return false
      }
    }, true)

    for (const name of url.searchParams.keys()) {
      const values = url.searchParams.getAll(name)
      values.forEach(value => params.append(name, value))
    }

    return [
      {
        baseURL: this._baseURL,
        locale,
        pathname,
        pagePath,
        params,
        push: (url: string) => redirect(url),
        replace: (url: string) => redirect(url, true),
      },
      nestedModules
    ]
  }

  lookup(callback: (path: Route[]) => Boolean | void) {
    this._lookup(callback)
  }

  private _lookup(
    callback: (path: Route[]) => Boolean | void,
    skipNestedIndex = false,
    __tracing: Route[] = [],
    __routes = this._routes
  ) {
    for (const route of __routes) {
      if (skipNestedIndex && __tracing.length > 0 && route.path === '/') {
        continue
      }
      if (callback([...__tracing, route]) === false) {
        return false
      }
    }
    for (const route of __routes) {
      if (route.path !== '/' && route.children?.length) {
        if (this._lookup(callback, skipNestedIndex, [...__tracing, route], route.children) === false) {
          return false
        }
      }
    }
  }
}

function matchPath(routePath: string, locPath: string): [Record<string, string>, boolean] {
  const params: Record<string, string> = {}
  const routeSegments = util.splitPath(routePath)
  const locSegments = util.splitPath(locPath)
  const depth = Math.max(routeSegments.length, locSegments.length)

  for (let i = 0; i < depth; i++) {
    const routeSeg = routeSegments[i]
    const locSeg = locSegments[i]

    if (locSeg === undefined || routeSeg === undefined) {
      return [{}, false]
    }

    if (routeSeg.startsWith('[...') && routeSeg.endsWith(']') && routeSeg.length > 5 && i === routeSegments.length - 1) {
      params[routeSeg.slice(4, -1)] = locSegments.slice(i).map(decodeURIComponent).join('/')
      break
    }

    if (routeSeg.startsWith('[') && routeSeg.endsWith(']') && routeSeg.length > 2) {
      params[routeSeg.slice(1, -1)] = decodeURIComponent(locSeg)
    } else if (routeSeg.startsWith('$') && routeSeg.length > 1) {
      params[routeSeg.slice(1)] = decodeURIComponent(locSeg)
    } else if (routeSeg !== locSeg) {
      return [{}, false]
    }
  }

  return [params, true]
}

export function createBlankRouterURL(baseURL = '/', locale = 'en'): RouterURL {
  return {
    baseURL,
    locale,
    pagePath: '',
    pathname: '/',
    params: new URLSearchParams(),
    push: () => void 0,
    replace: () => void 0,
  }
}

/** `rewriteURL` returns a rewrited URL */
export function rewriteURL(reqUrl: string, baseURL: string, rewrites: Record<string, string>): URL {
  const url = new URL('http://localhost' + reqUrl)
  if (baseURL !== '/') {
    url.pathname = util.trimPrefix(decodeURI(url.pathname), baseURL)
  }
  for (const path in rewrites) {
    const to = rewrites[path]
    const [params, ok] = matchPath(path, decodeURI(url.pathname))
    if (ok) {
      url.pathname = util.cleanPath(to.replace(/:(.+)(\/|&|$)/g, (s, k, e) => {
        if (k in params) {
          return params[k] + e
        }
        return s
      }))
      break
    }
  }
  return url
}
