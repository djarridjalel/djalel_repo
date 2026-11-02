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
  ["The service", <>Dielines (dielines.djarri.com) is provided by Djarri Design Studio, based in Algeria. It generates carton dielines from sizes and settings you enter, checks them, reads packaging PDFs you upload, folds them in 3D and exports files and images. By creating an account or using the service you accept these terms.</>],
  ["Your account", <>You need an account to use the editor. Give accurate information, keep access to your email or Google account secure, and tell us at {mail} if you think someone else has used your account. One person per account; companies may open several accounts.</>],
  ["Price", <>The service is free for now. If we introduce paid plans, we will tell you by email at least 30 days before, and nothing will be charged without your agreement. You can keep using free features or close your account.</>],
  [
    "Your files and designs",
    <>
      You keep all rights to the artwork, PDFs, cartons and files you create or upload. Uploaded PDFs are processed in your browser and are not sent to our servers. We store the cartons you save only to provide the service, as described in our <Link href="/privacy" className="text-ink underline">privacy policy</Link>. Only upload artwork you have the right to use.
    </>,
  ],
  ["Check before you produce", <>Dielines follow standard construction rules and are checked automatically, but packaging depends on your board, machines and printer. Always check dimensions and a physical sample on the production board, and have your printer or die-maker approve the dieline, before making cutting dies or printing. The 3D views, product images and depth maps are visual previews, not proofs.</>],
  ["Acceptable use", <>Do not use the service to break the law, infringe others’ rights, attack or overload it, access other users’ data, or resell it as your own service. We may suspend an account that does.</>],
  ["Our rights", <>The app, its code, design and the Djarri name belong to Djarri Design Studio. These terms do not give you rights to them beyond using the service.</>],
  ["Availability and changes", <>We work to keep the service running but do not guarantee it is uninterrupted or error-free. We may change, add or remove features. For important changes to these terms we will tell you by email before they apply.</>],
  ["Liability", <>The service is provided “as is”. To the extent the law allows, Djarri Design Studio is not liable for indirect losses, such as lost profit, production runs, materials, dies or reprints, arising from the use of dielines or files made with the service. Nothing in these terms limits liability that cannot be limited by law.</>],
  ["Closing your account", <>You can ask us to close your account at any time by writing to {mail}; we then delete your profile and projects within 30 days. Download any files you want to keep first.</>],
  ["Law and disputes", <>These terms are governed by Algerian law. We will first try to settle any dispute amicably; failing that, it goes to the competent Algerian courts.</>],
  ["Contact", <>Questions about these terms: {mail}.</>],
];

const AR: Section[] = [
  ["الخدمة", <>«مخططات القطع» (dielines.djarri.com) خدمة يقدّمها استوديو جرّي للتصميم، ومقرّه الجزائر. تُنشئ مخططات قطع العلب من المقاسات والإعدادات التي تُدخلها، وتفحصها، وتقرأ ملفات PDF للتغليف التي ترفعها، وتطويها ثلاثي الأبعاد، وتصدّر الملفات والصور. بإنشائك حسابًا أو استخدامك الخدمة فإنك توافق على هذه الشروط.</>],
  ["حسابك", <>تحتاج إلى حساب لاستخدام المحرّر. قدّم معلومات صحيحة، وحافظ على أمان بريدك أو حساب Google الخاص بك، وأخبرنا على {mail} إن ظننت أن غيرك استخدم حسابك. حساب واحد لكل شخص، ويمكن للشركات فتح عدة حسابات.</>],
  ["السعر", <>الخدمة مجانية حاليًا. إن أطلقنا خططًا مدفوعة فسنخبرك بالبريد قبل 30 يومًا على الأقل، ولن يُقتطع أي مبلغ دون موافقتك. ويمكنك مواصلة استخدام الميزات المجانية أو إغلاق حسابك.</>],
  [
    "ملفاتك وتصاميمك",
    <>
      تحتفظ بجميع الحقوق في التصاميم وملفات PDF والعلب والملفات التي تُنشئها أو ترفعها. تُعالَج ملفات PDF المرفوعة داخل متصفحك ولا تُرسل إلى خوادمنا. نحفظ العلب التي تحفظها فقط لتقديم الخدمة، كما تصف <Link href="/privacy" className="text-ink underline">سياسة الخصوصية</Link>. لا ترفع إلا تصاميم يحق لك استخدامها.
    </>,
  ],
  ["تحقّق قبل الإنتاج", <>تتبع مخططات القطع قواعد الإنشاء المعيارية وتُفحص آليًا، لكن التغليف يعتمد على الكرتون والآلات والمطبعة لديك. تحقّق دائمًا من المقاسات ومن عيّنة فعلية على كرتون الإنتاج، واحصل على موافقة المطبعة أو صانع القوالب على المخطط، قبل صنع قوالب القطع أو الطباعة. العروض ثلاثية الأبعاد وصور المنتج وخرائط العمق معاينات بصرية وليست بروفات معتمدة.</>],
  ["الاستخدام المقبول", <>لا تستخدم الخدمة لمخالفة القانون أو التعدي على حقوق الآخرين أو مهاجمتها أو إثقالها أو الوصول إلى بيانات مستخدمين آخرين أو إعادة بيعها كخدمة خاصة بك. يجوز لنا تعليق الحساب الذي يفعل ذلك.</>],
  ["حقوقنا", <>التطبيق وشيفرته وتصميمه واسم «جرّي» ملك لاستوديو جرّي للتصميم. لا تمنحك هذه الشروط أي حق فيها سوى استخدام الخدمة.</>],
  ["التوفّر والتغييرات", <>نعمل على إبقاء الخدمة متاحة لكننا لا نضمن خلوّها من الانقطاع أو الأخطاء. يجوز لنا تغيير الميزات أو إضافتها أو إزالتها. وعند تغييرات مهمة في هذه الشروط نخبرك بالبريد قبل سريانها.</>],
  ["المسؤولية", <>تُقدَّم الخدمة «كما هي». في الحدود التي يسمح بها القانون، لا يتحمّل استوديو جرّي للتصميم المسؤولية عن الخسائر غير المباشرة، كفوات الربح أو دفعات الإنتاج أو المواد أو القوالب أو إعادة الطباعة، الناتجة عن استخدام مخططات أو ملفات أُنشئت بالخدمة. ولا يحدّ شيء في هذه الشروط من مسؤولية لا يجيز القانون تحديدها.</>],
  ["إغلاق حسابك", <>يمكنك طلب إغلاق حسابك في أي وقت بمراسلتنا على {mail}، فنحذف ملفك الشخصي ومشاريعك خلال 30 يومًا. نزّل الملفات التي تريد الاحتفاظ بها قبل ذلك.</>],
  ["القانون والنزاعات", <>تخضع هذه الشروط للقانون الجزائري. نسعى أولًا إلى تسوية أي نزاع وديًا، وإلا يُرفع إلى المحاكم الجزائرية المختصة.</>],
  ["التواصل", <>للأسئلة حول هذه الشروط: {mail}.</>],
];

export function TermsOfService() {
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
        <h1 className="mt-2 text-[32px] font-medium leading-tight">{lang === "ar" ? "شروط الخدمة" : "Terms of service"}</h1>
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
          <Link href="/privacy" className="underline">{lang === "ar" ? "سياسة الخصوصية" : "Privacy policy"}</Link> ·{" "}
          <Link href="/" className="underline">{t("Home")}</Link>
        </p>
      </main>
    </div>
  );
}
