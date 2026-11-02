import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, authEnabled } from "@/lib/supabase/env";

/** Pages that need an account. */
const PRIVATE = ["/editor", "/projects", "/welcome", "/demo"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  if (!authEnabled) {
    if (path === "/login" || path === "/signup" || path === "/welcome" || path.startsWith("/projects")) {
      const url = request.nextUrl.clone();
      url.pathname = "/editor";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirect = (pathname: string, params: Record<string, string> = {}) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = NextResponse.redirect(url);
    // Keep any refreshed session cookies.
    for (const c of response.cookies.getAll()) res.cookies.set(c);
    return res;
  };

  if (!user && PRIVATE.some((p) => path === p || path.startsWith(`${p}/`))) {
    return redirect("/login", { next: path + request.nextUrl.search });
  }
  if (user && (path === "/login" || path === "/signup")) return redirect("/projects");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)"],
};
