import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase auth session and applies the resulting cookies
 * to the provided response (or creates a new one if none is given).
 */
export async function updateSession(
  request: NextRequest,
  existingResponse?: NextResponse
): Promise<NextResponse> {
  let supabaseResponse = existingResponse ?? NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          supabaseResponse = existingResponse ?? NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );

          Object.entries(headers).forEach(([key, value]) => {
            if (value !== undefined) {
              supabaseResponse.headers.set(key, value);
            }
          });
        },
      },
    }
  );

  await supabase.auth.getClaims();

  return supabaseResponse;
}
