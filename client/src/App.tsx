import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { ptPT } from "@clerk/localizations";
import { shadcn } from "@clerk/themes";

const Home = lazy(() => import("@/pages/Home"));
const Contact = lazy(() => import("@/pages/Contact"));
const Loja = lazy(() => import("@/pages/loja/Loja"));
const Locations = lazy(() => import("@/pages/Locations"));
const AllNationalAccounts = lazy(() => import("@/pages/national-accounts/AllNationalAccounts"));
const NationalOverview = lazy(() => import("@/pages/national-accounts/Overview"));
const NationalSolutions = lazy(() => import("@/pages/national-accounts/Solutions"));
const AllServices = lazy(() => import("@/pages/services/AllServices"));
const Disinfestation = lazy(() => import("@/pages/services/Disinfestation"));
const Cleaning = lazy(() => import("@/pages/services/Cleaning"));
const Waste = lazy(() => import("@/pages/services/Waste"));
const Water = lazy(() => import("@/pages/services/Water"));
const Gardening = lazy(() => import("@/pages/services/Gardening"));
const Reports = lazy(() => import("@/pages/services/Reports"));
const BlogList = lazy(() => import("@/pages/blog/BlogList"));
const BlogLatestNews = lazy(() => import("@/pages/blog/BlogList").then((module) => ({ default: module.BlogLatestNews })));
const BlogPreventionTips = lazy(() => import("@/pages/blog/BlogList").then((module) => ({ default: module.BlogPreventionTips })));
const BlogPost = lazy(() => import("@/pages/blog/BlogPost"));
const About = lazy(() => import("@/pages/about/About"));
const History = lazy(() => import("@/pages/about/History"));
const Careers = lazy(() => import("@/pages/about/Careers"));
const ManagementPolicy = lazy(() => import("@/pages/about/ManagementPolicy"));
const Admin = lazy(() => import("@/pages/admin/Admin"));
const NotFound = lazy(() => import("@/pages/not-found"));

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Falta a configuração de autenticação da área de administração.");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#007cc3",
    colorForeground: "#001d3d",
    colorMutedForeground: "#60717b",
    colorDanger: "#a44232",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "#001d3d",
    colorNeutral: "#001d3d",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-none w-[440px] max-w-full overflow-hidden border border-[#dfe7eb] shadow-sm",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#001d3d]",
    headerSubtitle: "text-[#5e6c75]",
    socialButtonsBlockButtonText: "text-[#263b49]",
    formFieldLabel: "text-[#263b49]",
    footerActionLink: "text-[#007cc3]",
    footerActionText: "text-[#5e6c75]",
    dividerText: "text-[#60717b]",
    identityPreviewEditButton: "text-[#007cc3]",
    formFieldSuccessText: "text-[#276445]",
    alertText: "text-[#914533]",
    logoBox: "mx-auto",
    logoImage: "max-h-12",
    socialButtonsBlockButton: "border-[#d7e0e5] bg-white",
    formButtonPrimary: "bg-[#007cc3] hover:bg-[#006ba9] text-white",
    formFieldInput: "border-[#cbd6dc] bg-white text-[#001d3d]",
    footerAction: "text-[#5e6c75]",
    dividerLine: "bg-[#dfe7eb]",
    alert: "border-[#f0d3cc] bg-[#fff7f5]",
    otpCodeFieldInput: "border-[#cbd6dc] bg-white text-[#001d3d]",
    formFieldRow: "text-[#263b49]",
    main: "text-[#263b49]",
  },
};

function ScrollToHash() {
  const [location] = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.replace("#", "");
      const tryScroll = (attempts = 0) => {
        const el = document.getElementById(id);
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        } else if (attempts < 20) {
          setTimeout(() => tryScroll(attempts + 1), 300);
        }
      };
      tryScroll();
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location]);

  // detecta cliques em links com # na mesma página
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || !href.includes("#")) return;

      const hash = href.split("#")[1];
      const el = document.getElementById(hash);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#007cc3] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ScrollToHash />
      <Switch>
        <Route path="/sign-in/*?">
          <div className="flex min-h-[100dvh] items-center justify-center bg-[#f4f7f9] px-4 py-10">
            <SignIn
              routing="path"
              path={`${basePath}/sign-in`}
              signUpUrl={`${basePath}/sign-up`}
              fallbackRedirectUrl={`${basePath}/admin`}
            />
          </div>
        </Route>
        <Route path="/sign-up/*?">
          <div className="flex min-h-[100dvh] items-center justify-center bg-[#f4f7f9] px-4 py-10">
            <SignUp
              routing="path"
              path={`${basePath}/sign-up`}
              signInUrl={`${basePath}/sign-in`}
              fallbackRedirectUrl={`${basePath}/admin`}
            />
          </div>
        </Route>
        <Route path="/admin" component={Admin} />
        <Route path="/admin/:rest*" component={Admin} />
        <Route path="/" component={Home} />
        <Route path="/contact" component={Contact} />
        <Route path="/loja" component={Loja} />
        <Route path="/locations" component={Locations} />
        <Route path="/national-accounts" component={AllNationalAccounts} />
        <Route path="/national-accounts/overview" component={NationalOverview} />
        <Route path="/national-accounts/solutions" component={NationalSolutions} />
        <Route path="/services" component={AllServices} />
        <Route path="/services/disinfestation" component={Disinfestation} />
        <Route path="/services/cleaning" component={Cleaning} />
        <Route path="/services/waste" component={Waste} />
        <Route path="/services/water" component={Water} />
        <Route path="/services/gardening" component={Gardening} />
        <Route path="/reports" component={Reports} />
        <Route path="/services/reports" component={Reports} />
        <Route path="/about" component={About} />
        <Route path="/about/history" component={History} />
        <Route path="/about/careers" component={Careers} />
        <Route path="/about/management-policy" component={ManagementPolicy} />
        <Route path="/blog" component={BlogList} />
        <Route path="/blog/ultimas-noticias" component={BlogLatestNews} />
        <Route path="/blog/dicas-prevencao" component={BlogPreventionTips} />
        <Route path="/blog/:id" component={BlogPost} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const nextUserId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== nextUserId) {
        queryClient.clear();
      }
      previousUserId.current = nextUserId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={ptPT}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
