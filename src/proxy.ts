import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas que NUNCA exigem sessao.
// - /health: health-check publico (story 1.1 AC5) — Vercel e smoke tests chamam sem sessao
// - /login: pagina de autenticacao
// - /api/webhooks: o webhook UAZAPI e chamado por um sistema externo (sem cookies)
// - /api/diagnostics: diagnostico basico de ambiente para cutover e suporte
// - /unsubscribe: pagina publica de opt-out do lead (futura — modulo marketing)
const PUBLIC_PATHS = ['/health', '/login', '/unsubscribe', '/api/webhooks', '/api/diagnostics']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

export async function proxy(request: NextRequest) {
  // Resposta base que vamos mutar com os cookies de sessao refrescados.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 1. escrever no request para que getUser() veja os cookies actualizados
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // 2. recriar a resposta para propagar os cookies refrescados ao browser
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: getUser() tem de ser chamado logo a seguir a criar o client.
  // Faz a verificacao da sessao no servidor de auth e refresca o token se preciso.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Ja autenticado a tentar ir para /login -> manda para o inbox
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/inbox'
    return NextResponse.redirect(url)
  }

  // Sem sessao numa rota protegida -> manda para /login
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANTE: devolver SEMPRE supabaseResponse para nao perder os cookies
  // refrescados pelo setAll (caso contrario a sessao desincroniza).
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Aplica a todas as rotas EXCEPTO:
     * - _next/static, _next/image (assets internos do Next)
     * - favicon.ico
     * - manifest e service worker do PWA (manifest.json/webmanifest, sw.js)
     * - ficheiros de imagem estaticos
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
