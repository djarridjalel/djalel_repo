"use client";

import Link from "next/link";
import { Brand } from "./Brand";
import { LangSwitch, useLang } from "./LangProvider";

const CONTACT = "dielines@djarri.com";
const UPDATED = { en: "2 November 2026", ar: "2 نوفمبر 2026" };

type Section = [string, React.ReactNode];

const mail = (
  <a href={`mailto:${CONTACT}`} dir="ltr" className="font-mono text-ink underline">
    {CONTACT}
  </a>
);

const EN: Section[] = [
  ["Who we are", <>Dielines (dielines.djarri.com) is a service of Djarri Design Studio, based in Algeria. We are responsible for the personal data described here. Contact: {mail}.</>],
  [
    "What we collect",
    <>
      <ul className="list-disc space-y-1 ps-5">
        <li>Your email address, to create your account and sign you in.</li>
        <li>If you sign in with Google: your name and email address from your Google account. We do not receive your Google password or access anything else in your Google account.</li>
        <li>What you enter on the welcome step: your name and, if you choose, your company or studio and your phone number.</li>
        <li>Your cartons: the sizes, settings, names and versions you save in your projects.</li>
      </ul>
    </>,
  ],
  ["What we do not collect", <>Packaging PDFs you upload are read and folded in your browser; they are not sent to our servers. We do not use advertising or tracking cookies, and we do not sell or rent your data.</>],
  ["Why we use it", <>To provide the service: sign-in, saving your cartons and versions, and contacting you about your account or the service. Your company and phone number, when you give them, help us understand who uses Dielines and reach you if needed.</>],
  ["Where it is stored", <>Accounts, profiles and projects are stored with Supabase (database in the European Union, Paris region). The app is hosted by Vercel. Both act on our behalf and only process data to run the service. Sign-in emails are sent through our email provider.</>],
  ["Cookies and local storage", <>We use one cookie to keep you signed in. Your browser also stores your language choice. A carton made before signing in is kept in your browser and moved to your account when you sign in.</>],
  ["How long we keep it", <>As long as your account exists. When you ask us to delete your account, we delete your profile and projects within 30 days.</>],
  ["Your rights", <>Under Algerian Law No. 18-07 of 10 June 2018 on the protection of natural persons in the processing of personal data, you may access, correct or delete your data, and object to its processing. Write to {mail}. You may also contact the national authority for the protection of personal data (ANPDP).</>],
  ["Google user data", <>Our use of information received from Google APIs follows the Google API Services User Data Policy, including its Limited Use requirements. We use your Google name and email only to sign you in and identify your account.</>],
  ["Changes", <>If we change this policy, we update the date below and, for important changes, tell you by email.</>],
];

const AR: Section[] = [
  ["من نحن", <>«مخططات القطع» (dielines.djarri.com) خدمة من استوديو جرّي للتصميم، ومقرّه الجزائر. نحن المسؤولون عن البيانات الشخصية الموصوفة هنا. للتواصل: {mail}.</>],
  [
    "ما الذي نجمعه",
    <>
      <ul className="list-disc space-y-1 ps-5">
        <li>بريدك الإلكتروني، لإنشاء حسابك وتسجيل دخولك.</li>
        <li>عند الدخول باستخدام Google: اسمك وبريدك الإلكتروني من حساب Google. لا نتلقى كلمة مرورك ولا نصل إلى أي شيء آخر في حسابك.</li>
        <li>ما تُدخله في خطوة الترحيب: اسمك، وإن شئت، اسم شركتك أو الاستوديو ورقم هاتفك.</li>
        <li>علبك: المقاسات والإعدادات والأسماء والنسخ التي تحفظها في مشاريعك.</li>
      </ul>
    </>,
  ],
  ["ما لا نجمعه", <>ملفات PDF للتغليف التي ترفعها تُقرأ وتُطوى داخل متصفحك ولا تُرسل إلى خوادمنا. لا نستخدم ملفات تعريف ارتباط إعلانية أو للتتبّع، ولا نبيع بياناتك ولا نؤجّرها.</>],
  ["لماذا نستخدمها", <>لتقديم الخدمة: تسجيل الدخول، وحفظ علبك ونسخها، والتواصل معك بشأن حسابك أو الخدمة. يساعدنا اسم الشركة ورقم الهاتف، إن قدّمتهما، على معرفة من يستخدم الخدمة والتواصل معك عند الحاجة.</>],
  ["أين تُحفظ", <>تُحفظ الحسابات والملفات الشخصية والمشاريع لدى Supabase (قاعدة بيانات في الاتحاد الأوروبي، منطقة باريس)، ويستضيف التطبيقَ Vercel. يعمل كلاهما لحسابنا ولا يعالجان البيانات إلا لتشغيل الخدمة. تُرسل رسائل الدخول عبر مزوّد البريد لدينا.</>],
  ["ملفات تعريف الارتباط والتخزين المحلي", <>نستخدم ملف تعريف ارتباط واحدًا لإبقائك مسجّل الدخول. ويحفظ متصفحك اختيارك للغة. العلبة التي تُنشئها قبل تسجيل الدخول تبقى في متصفحك ثم تُنقل إلى حسابك عند الدخول.</>],
  ["مدة الاحتفاظ", <>طوال وجود حسابك. عند طلبك حذف الحساب، نحذف ملفك الشخصي ومشاريعك خلال 30 يومًا.</>],
  ["حقوقك", <>وفق القانون الجزائري رقم 18-07 المؤرخ في 10 يونيو 2018 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي، يحق لك الاطلاع على بياناتك وتصحيحها وحذفها والاعتراض على معالجتها. راسلنا على {mail}. ويمكنك أيضًا التوجّه إلى السلطة الوطنية لحماية المعطيات ذات الطابع الشخصي.</>],
  ["بيانات مستخدمي Google", <>يخضع استخدامنا للمعلومات الواردة من واجهات Google لسياسة بيانات مستخدمي خدمات Google API، بما فيها شروط الاستخدام المحدود. نستخدم اسمك وبريدك من Google فقط لتسجيل دخولك وتعريف حسابك.</>],
  ["التعديلات", <>إذا عدّلنا هذه السياسة نحدّث التاريخ أدناه، ونخبرك بالبريد عند التغييرات المهمة.</>],
];

export function PrivacyPolicy() {
  const { lang, t } = useLang();
  const sections = lang === "ar" ? AR : EN;
  return (
    <div className="min-h-dvh bg-bone">
      <header className="studio-bar sticky top-0 z-20">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <LangSwitch />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">{t("Dielines")}</p>
        <h1 className="mt-2 text-[32px] font-medium leading-tight">{lang === "ar" ? "سياسة الخصوصية" : "Privacy policy"}</h1>
        <div className="mt-8 space-y-8 text-[15px] leading-relaxed">
          {sections.map(([h, body]) => (
            <section key={h}>
              <h2 className="text-[18px] font-medium">{h}</h2>
              <div className="mt-2 text-mute">{body}</div>
            </section>
          ))}
        </div>
        <p className="mt-12 border-t border-rule pt-4 text-[13px] text-mute">
          {lang === "ar" ? "آخر تحديث:" : "Last updated:"} {UPDATED[lang === "ar" ? "ar" : "en"]} ·{" "}
          <Link href="/" className="underline">{t("Home")}</Link>
        </p>
      </main>
    </div>
  );
}
