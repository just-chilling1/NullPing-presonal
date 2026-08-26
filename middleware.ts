import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { resolveOnboardingGate } from '@/lib/onboarding-gate'
import { isDevAuthBypassEnabled } from '@/lib/dev-bypass'
import { ONBOARDING_COMPLETE_COOKIE, setOnboardingCompleteCookie } from '@/lib/onboarding-cookie'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase-env'
import { ensureAdminUser } from '@/lib/admin-server'
import { isAdminClaims } from '@/lib/admin'

/** Public route prefixes that bypass auth (extend per product — e.g. hosted sites, sales pages). */
const PUBLIC_ROUTE_PREFIXES = [
  '/sites/',
  '/s/',
  '/m/',
  '/article/',
  '/review/',
]

/** Clean member URLs: /{handle}/sites/{slug} — public hosted money pages. */
function isMemberPublicSitePath(pathname: string): boolean {
  return /^\/[^/]+\/sites(\/|$)/.test(pathname)
}

function withRobotsHeader(response: NextResponse, indexable: boolean): NextResponse {
  if (indexable) {
    response.headers.delete('X-Robots-Tag')
  } else {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return response
}

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const { pathname } = request.nextUrl
    const isPublicHostedRoute =
      PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
      isMemberPublicSitePath(pathname)
    withRobotsHeader(response, isPublicHostedRoute)

    // Supabase may redirect to Site URL root (?code=...) instead of /auth/callback.
    if (pathname === "/") {
        const code = request.nextUrl.searchParams.get("code")
        const tokenHash = request.nextUrl.searchParams.get("token_hash")
        const type = request.nextUrl.searchParams.get("type")
        if (code || (tokenHash && type)) {
            const callbackUrl = new URL("/auth/callback", request.url)
            request.nextUrl.searchParams.forEach((value, key) => {
                callbackUrl.searchParams.set(key, value)
            })
            if (!callbackUrl.searchParams.has("next")) {
                callbackUrl.searchParams.set(
                    "next",
                    type === "recovery" ? "/reset-password" : "/dashboard",
                )
            }
            return NextResponse.redirect(callbackUrl)
        }
    }

    if (
      process.env.NODE_ENV !== "development" &&
      (pathname === "/dev" || pathname.startsWith("/dev/"))
    ) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    const isResetPasswordRoute = pathname.startsWith('/reset-password')
    const isAuthCallbackRoute = pathname.startsWith('/auth/callback')
    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password') || isResetPasswordRoute || isAuthCallbackRoute
    const isStaticAsset = /\.(?:png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|mp4|txt|xml)$/i.test(pathname)
    const isPublicEmbedRoute = pathname === '/embed' || pathname.startsWith('/embed/')
    const isPublicRoute =
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname === '/favicon.ico' ||
        pathname === '/robots.txt' ||
        pathname === '/sitemap.xml' ||
        pathname === '/manifest.webmanifest' ||
        pathname === '/free-training-popup.html' ||
        isPublicEmbedRoute ||
        isStaticAsset ||
        isPublicHostedRoute
    const isOnboardingRoute = pathname === '/onboarding' || pathname.startsWith('/onboarding/')
    const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')

    if (pathname === '/login') {
        await ensureAdminUser()
    }

    if (isDevAuthBypassEnabled()) {
        if (isAuthRoute && !isAuthCallbackRoute && !isResetPasswordRoute) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
        return response
    }

    const supabase = createServerClient(
        getSupabaseUrl(),
        getSupabaseAnonKey(),
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options })
                    response = NextResponse.next({ request: { headers: request.headers } })
                    withRobotsHeader(response, isPublicHostedRoute)
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options })
                    response = NextResponse.next({ request: { headers: request.headers } })
                    withRobotsHeader(response, isPublicHostedRoute)
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    const { data: claimsData } = await supabase.auth.getClaims()
    const claims = (claimsData?.claims ?? null) as Record<string, unknown> | null
    const userId = typeof claims?.sub === 'string' ? claims.sub : null
    const userMeta = (claims?.user_metadata ?? null) as Record<string, unknown> | null
    const isAdmin = isAdminClaims(claims)
    const postLoginPath = isAdmin ? '/admin' : '/dashboard'

    if (pathname.startsWith('/api')) {
        return response
    }

    if (!userId && !isAuthRoute && !isPublicRoute) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (userId && isAuthRoute && !isResetPasswordRoute && !isAuthCallbackRoute) {
        return NextResponse.redirect(new URL(postLoginPath, request.url))
    }

    if (userId && isAdminRoute && !isAdmin) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (userId && !isPublicRoute) {
        if (isResetPasswordRoute) {
            return response
        }

        if (isAdmin) {
            setOnboardingCompleteCookie(response)
            return response
        }

        if (
            !isOnboardingRoute &&
            request.cookies.get(ONBOARDING_COMPLETE_COOKIE)?.value === "1"
        ) {
            return response;
        }

        const gate = await resolveOnboardingGate(supabase, userId, userMeta)

        if (gate.isComplete && isOnboardingRoute) {
            return NextResponse.redirect(new URL(postLoginPath, request.url))
        }

        if (!gate.isComplete && !isOnboardingRoute) {
            response.cookies.delete(ONBOARDING_COMPLETE_COOKIE)
            return NextResponse.redirect(new URL('/onboarding', request.url))
        }

        if (gate.isComplete) {
            setOnboardingCompleteCookie(response)
        }
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
