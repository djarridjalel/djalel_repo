import { Landing } from "@/components/Landing";
import { DEFAULT_PARAMS, generate } from "@/lib/dieline";
import { renderSvg } from "@/lib/dieline/export/svg";
import { authEnabled } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";



export default async function Home() {
  let signedIn = false;
  if (authEnabled) {
    const db = await supabaseServer();
    const {
      data: { user },
    } = await db.auth.getUser();
    signedIn = !!user;
  }
  const hero = renderSvg(generate({ ...DEFAULT_PARAMS, L: 70, W: 28, H: 120, showDimensions: false, safeMargin: 0, bleed: 0 }), {
    layers: new Set(["cut", "crease"]),
    margin: 2,
    blankFill: "#ffffff",
  })
    .replace(/width="[\d.]+mm" height="[\d.]+mm"/, 'width="100%" height="100%"')
    .replace(/stroke="#E30613" color="#E30613"/, 'stroke="#0A0A0B" color="#0A0A0B"')
    .replace(/stroke="#00A651" color="#00A651"/, 'stroke="#6E5400" color="#6E5400"');

  return <Landing hero={hero} signedIn={signedIn} authEnabled={authEnabled} />;
}
