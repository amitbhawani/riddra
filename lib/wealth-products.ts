export type WealthFamily = "etf" | "pms" | "aif" | "sif";

export type WealthProduct = {
  slug: string;
  family: WealthFamily;
  name: string;
  category: string;
  summary: string;
  angle: string;
  benchmark: string;
  structure: string;
  minimumTicket: string;
  riskLabel: string;
  manager: string;
  status: string;
  liquidity: string;
  taxation: string;
  costNote: string;
  thesis: string;
  keyPoints: string[];
  researchStats: Array<{ label: string; value: string }>;
  portfolioRole: string[];
  fitFor: string[];
  avoidIf: string[];
  dueDiligence: string[];
  compareLanes: string[];
};

export type WealthFamilyOverview = {
  family: WealthFamily;
  label: string;
  href: string;
  description: string;
  status: string;
  count: number;
  ticketSummary: string;
  statusSummary: string;
  categories: string[];
  benchmarkHighlights: string[];
  compareHighlights: string[];
};

export const wealthFamilyMeta: Record<
  WealthFamily,
  { label: string; href: string; description: string; status: string }
> = {
  etf: {
    label: "ETFs",
    href: "/etfs",
    description: "Passive and thematic ETF pages with benchmark, liquidity, tracking, and allocation context.",
    status: "Traffic plus subscriber hybrid",
  },
  pms: {
    label: "PMS",
    href: "/pms",
    description: "Portfolio management service pages with strategy, manager style, ticket size, and risk framing.",
    status: "High-intent wealth layer",
  },
  aif: {
    label: "AIF",
    href: "/aif",
    description: "Alternative investment fund pages with category, strategy, liquidity, and compliance-led context.",
    status: "Long-tail authority layer",
  },
  sif: {
    label: "SIF",
    href: "/sif",
    description: "Specialized investment fund pages for newer structured wealth-product exploration and future education-led demand.",
    status: "Emerging-category layer",
  },
};

export const wealthProducts: WealthProduct[] = [
  {
    slug: "nifty-bees",
    family: "etf",
    name: "Nippon India ETF Nifty BeES",
    category: "Large Cap ETF",
    summary: "Starter ETF page showing how Riddra can support passive products with benchmark, liquidity, and allocation context.",
    angle: "ETF pages should combine benchmark clarity, liquidity caution, and portfolio-use context without overwhelming first-time investors.",
    benchmark: "Nifty 50 TRI",
    structure: "Exchange-traded passive fund",
    minimumTicket: "1 unit plus brokerage",
    riskLabel: "Moderate to high",
    manager: "Nippon India AMC",
    status: "Active",
    liquidity: "Exchange liquidity with spread and depth checks required near volatile sessions",
    taxation: "Equity-style taxation for long-term holding periods subject to prevailing ETF rules",
    costNote: "Low TER is helpful, but actual trading cost also includes spread, slippage, and brokerage.",
    thesis:
      "A serious ETF page should explain benchmark fit, liquidity quality, tracking comfort, and where the product belongs inside a larger allocation plan instead of only repeating passive-fund marketing.",
    keyPoints: [
      "Good for passive index exposure pages.",
      "Should later include tracking error and liquidity snapshots.",
      "Naturally fits investor compare and portfolio-overlap workflows.",
    ],
    researchStats: [
      { label: "Use case", value: "Core large-cap passive allocation" },
      { label: "Tracking priority", value: "High" },
      { label: "Liquidity comfort", value: "Exchange dependent" },
      { label: "Portfolio role", value: "Index anchor" },
    ],
    portfolioRole: [
      "Acts as a low-maintenance core index sleeve for investors who want broad market participation.",
      "Works well as the passive benchmark against which active mutual funds or PMS ideas are judged.",
      "Can be used as a parking layer while waiting to deploy into higher-conviction opportunities.",
    ],
    fitFor: [
      "Investors who want simple Nifty exposure without constant manager-style risk.",
      "Users building SIP-style or rebalance-led portfolios with benchmark discipline.",
      "People comparing ETF cost plus liquidity against index funds and large-cap funds.",
    ],
    avoidIf: [
      "You expect hidden small-cap alpha from a plain vanilla index product.",
      "You are likely to transact in illiquid windows without checking spreads.",
      "You need hand-holding around sector tilts, tactical rotation, or active downside management.",
    ],
    dueDiligence: [
      "Review traded volumes, bid-ask spread, and tracking comfort before assuming low cost.",
      "Compare against equivalent index funds if the investing style is SIP-first rather than intraday tradable.",
      "Check whether the ETF is being used as core exposure, tactical allocation, or temporary liquidity parking.",
    ],
    compareLanes: ["Versus index funds", "Versus active large-cap funds", "Versus other Nifty 50 ETFs"],
  },
  {
    slug: "smallcase-like-momentum-pms",
    family: "pms",
    name: "Momentum Focus PMS",
    category: "Discretionary PMS",
    summary: "Placeholder PMS page showing how Riddra can support strategy-rich wealth pages with manager and allocation context.",
    angle: "PMS pages should balance performance storytelling with risk, concentration, ticket size, and suitability clarity.",
    benchmark: "Nifty 500 TRI",
    structure: "Discretionary PMS",
    minimumTicket: "₹50 lakh",
    riskLabel: "High",
    manager: "Sample Wealth Manager",
    status: "Open for review",
    liquidity: "Periodic capital adds and exits depend on PMS terms, tax effects, and portfolio turnover",
    taxation: "Investor outcomes depend on realized gains at the portfolio level and holding discipline",
    costNote: "Headline fees are only part of the picture; turnover, concentration, and execution quality matter too.",
    thesis:
      "A strong PMS page should make ticket size, style drift risk, concentration, and manager behavior obvious so high-intent users can judge fit before a sales conversation starts.",
    keyPoints: [
      "PMS pages should explain who the strategy suits and who it does not.",
      "Ticket size and portfolio concentration matter more than generic return claims.",
      "These pages can become high-intent subscriber and lead-generation assets.",
    ],
    researchStats: [
      { label: "Style", value: "Momentum and rotation led" },
      { label: "Typical concentration", value: "15-25 stocks" },
      { label: "Review rhythm", value: "Monthly plus tactical" },
      { label: "Investor profile", value: "Aggressive allocator" },
    ],
    portfolioRole: [
      "Designed as a high-conviction satellite sleeve rather than the full equity portfolio.",
      "Better judged against style-consistent peers than against broad mutual-fund averages alone.",
      "Useful for wealthy investors who can tolerate sharper drawdowns for a differentiated style expression.",
    ],
    fitFor: [
      "Experienced investors comfortable with concentration and manager-led turnover.",
      "Families already holding diversified core exposure elsewhere and looking for a tactical sleeve.",
      "Users evaluating direct-manager capability rather than packaged mutual-fund diversification.",
    ],
    avoidIf: [
      "You want a low-attention, low-volatility wealth product.",
      "You need easy entry/exit flexibility with small ticket experimentation.",
      "You are comparing only trailing returns without studying strategy behavior across cycles.",
    ],
    dueDiligence: [
      "Ask how many holdings usually carry the portfolio and what drawdown control actually means in practice.",
      "Review style persistence across bull and sideways phases instead of only a recent high-performance window.",
      "Map fees and tax impact against alternatives like flexi-cap funds or focused funds.",
    ],
    compareLanes: ["Versus focused mutual funds", "Versus multicap PMS peers", "Versus direct equity mandates"],
  },
  {
    slug: "icici-prudential-nifty-next-50-etf",
    family: "etf",
    name: "ICICI Prudential Nifty Next 50 ETF",
    category: "Broad-market ETF",
    summary: "A broader passive ETF route that gives Riddra a cleaner step-up from Nifty 50 exposure into the next layer of large-cap market breadth.",
    angle: "ETF pages should make benchmark jump, volatility change, and liquidity behavior obvious when users move beyond plain vanilla Nifty 50 products.",
    benchmark: "Nifty Next 50 TRI",
    structure: "Exchange-traded passive fund",
    minimumTicket: "1 unit plus brokerage",
    riskLabel: "Moderate to high",
    manager: "ICICI Prudential AMC",
    status: "Active",
    liquidity: "Exchange liquidity varies by session depth, market mood, and benchmark demand compared with Nifty 50 products",
    taxation: "Equity-style taxation for long-term holding periods subject to prevailing ETF rules",
    costNote: "Low TER helps, but actual investor cost still depends on spread, turnover, and execution timing.",
    thesis:
      "A serious broad-market ETF route should explain how Next 50 exposure differs from Nifty 50, where the volatility trade-off rises, and why investors may still prefer the structure over active large-cap or index-fund alternatives.",
    keyPoints: [
      "Useful for investors stepping beyond core Nifty exposure.",
      "Should later include liquidity, spread, and tracking snapshots.",
      "Naturally fits compare paths against index funds and broader passive sleeves.",
    ],
    researchStats: [
      { label: "Use case", value: "Broader large-cap passive exposure" },
      { label: "Tracking priority", value: "High" },
      { label: "Liquidity comfort", value: "Moderate to good" },
      { label: "Portfolio role", value: "Core-plus passive sleeve" },
    ],
    portfolioRole: [
      "Acts as a broader passive layer for users who want more growth tilt than the top 50 names alone.",
      "Works as a bridge between plain vanilla core ETF exposure and higher-risk active mid-cap or flexi-cap choices.",
      "Can be used as a benchmark-aware expansion sleeve when portfolios feel too concentrated in mega-caps.",
    ],
    fitFor: [
      "Investors who want a broader passive basket without fully moving into active-fund selection.",
      "Users comparing Nifty 50 ETFs, Nifty Next 50 ETFs, and large-cap index funds together.",
      "People building benchmark-led portfolios with a simple ladder from core to broader market exposure.",
    ],
    avoidIf: [
      "You expect mid-cap style upside from a still large-cap-heavy benchmark sleeve.",
      "You are likely to ignore liquidity checks while treating all ETFs as equally tradable.",
      "You need active downside management or tactical rotation rather than passive exposure.",
    ],
    dueDiligence: [
      "Compare traded volume and spread behavior with the plain Nifty 50 ETF before deciding purely on benchmark preference.",
      "Study whether the broader benchmark is being used as a long-term core-plus sleeve or as a tactical growth add-on.",
      "Check whether an index fund version of the same benchmark is more suitable for SIP-led investing than exchange execution.",
    ],
    compareLanes: ["Versus Nifty 50 ETFs", "Versus Nifty Next 50 index funds", "Versus active large-cap funds"],
  },
  {
    slug: "bharat-bond-etf-april-2033",
    family: "etf",
    name: "Bharat Bond ETF April 2033",
    category: "Debt ETF",
    summary: "A debt ETF route that broadens the ETF graph beyond equity passive products into yield, duration, and maturity-led allocation decisions.",
    angle: "Debt ETF pages should explain maturity target, credit comfort, yield framing, and duration risk instead of inheriting equity-style product language.",
    benchmark: "Nifty Bharat Bond Index - April 2033",
    structure: "Target-maturity debt ETF",
    minimumTicket: "1 unit plus brokerage",
    riskLabel: "Low to moderate",
    manager: "Edelweiss AMC",
    status: "Active",
    liquidity: "Exchange liquidity exists, but debt ETF execution and discount-premium behavior need more care than broad equity ETF trades",
    taxation: "Debt-product taxation depends on prevailing debt-fund and ETF rules at the time of holding and exit",
    costNote: "Yield comfort, duration fit, and maturity alignment often matter more than a TER-only comparison.",
    thesis:
      "A strong debt ETF route should tell investors what maturity they are buying, what duration and reinvestment risks they are taking, and when a target-maturity ETF is more sensible than a debt fund or fixed deposit ladder.",
    keyPoints: [
      "Expands ETF coverage beyond equity passive products.",
      "Needs yield, duration, and maturity framing close to the route headline.",
      "Useful for allocation compare paths against debt funds and fixed-income ladders.",
    ],
    researchStats: [
      { label: "Use case", value: "Target-maturity debt allocation" },
      { label: "Credit lens", value: "High-grade PSU basket" },
      { label: "Liquidity comfort", value: "Moderate" },
      { label: "Portfolio role", value: "Debt sleeve" },
    ],
    portfolioRole: [
      "Acts as a duration-defined debt sleeve for investors who want more maturity clarity than a flexible debt-fund mandate.",
      "Useful in allocation plans where a bond ladder or target-maturity bucket is easier to understand than rolling-duration products.",
      "Can complement equity ETFs and hybrid products when the portfolio needs a more explicit income or stability layer.",
    ],
    fitFor: [
      "Investors who want a debt-market route with clearer maturity visibility than many open-ended debt funds.",
      "Users comparing Bharat Bond style products against target-maturity index funds and debt mutual funds.",
      "Portfolios that need more deliberate fixed-income framing alongside equity-heavy allocations.",
    ],
    avoidIf: [
      "You want ultra-simple fixed-income parking without learning duration and maturity trade-offs.",
      "You are likely to compare it only on recent yield without matching the maturity bucket to your horizon.",
      "You need active credit-taking or dynamic duration management rather than a rules-based target-maturity route.",
    ],
    dueDiligence: [
      "Check residual maturity and duration fit against your actual cash-flow horizon before using the ETF as a simple debt substitute.",
      "Compare exchange liquidity, premium-discount behavior, and fund-size comfort with equivalent index-fund versions if available.",
      "Review taxation and rollover assumptions rather than judging only on indicated yield.",
    ],
    compareLanes: ["Versus debt index funds", "Versus target-maturity debt funds", "Versus fixed-income ladders"],
  },
  {
    slug: "quality-compounders-pms",
    family: "pms",
    name: "Quality Compounders PMS",
    category: "Discretionary PMS",
    summary: "A quality-led PMS route that broadens the PMS family beyond only momentum-style positioning and gives compare flows a cleaner style contrast.",
    angle: "PMS pages should show style differences clearly, because concentration and manager philosophy matter more than just trailing return snapshots.",
    benchmark: "Nifty 500 TRI",
    structure: "Discretionary PMS",
    minimumTicket: "₹50 lakh",
    riskLabel: "High",
    manager: "Sample Quality Capital",
    status: "Open for review",
    liquidity: "Exits, adds, and realized tax outcomes depend on mandate terms, portfolio turnover, and investor timing",
    taxation: "Investor outcomes depend on realized gains, turnover, and holding discipline under prevailing PMS rules",
    costNote: "Fees need to be judged alongside concentration, turnover, and how durable the quality bias really is across market cycles.",
    thesis:
      "A good quality-compounding PMS page should explain whether the style is truly patient, how concentrated the portfolio is, and why the manager’s process deserves a premium layer over simpler mutual-fund alternatives.",
    keyPoints: [
      "Adds style contrast within the PMS family.",
      "Helps compare routes move beyond one momentum-heavy PMS shell.",
      "Useful for wealth users deciding between concentrated quality and packaged active-fund options.",
    ],
    researchStats: [
      { label: "Style", value: "Quality growth / compounding" },
      { label: "Typical concentration", value: "12-20 stocks" },
      { label: "Review rhythm", value: "Quarterly plus selective action" },
      { label: "Investor profile", value: "Long-horizon allocator" },
    ],
    portfolioRole: [
      "Acts as a concentrated long-horizon equity sleeve rather than a fully diversified family-office core on its own.",
      "Works best when investors want deeper manager-led conviction than a diversified flexi-cap or multicap mutual fund can provide.",
      "Can complement tactical sleeves by bringing a steadier quality-bias allocation into the PMS mix.",
    ],
    fitFor: [
      "Investors comfortable with concentration but preferring quality-compounding over faster-turnover momentum styles.",
      "Families comparing direct-manager conviction against focused or flexi-cap mutual-fund alternatives.",
      "Users who value long-horizon business quality and manager discipline more than short-cycle tactical rotation.",
    ],
    avoidIf: [
      "You want a low-ticket, low-maintenance product with easy diversification.",
      "You need frequent tactical repositioning and rapid style change from the mandate.",
      "You are comparing only fees and trailing returns without understanding the manager’s quality filters.",
    ],
    dueDiligence: [
      "Review whether the quality bias stayed intact in difficult phases instead of only looking at bull-market compounding.",
      "Compare concentration and overlap against core mutual-fund holdings before assuming the PMS adds enough differentiation.",
      "Map fee structure and tax drag against focused-fund and flexi-cap alternatives with similar quality claims.",
    ],
    compareLanes: ["Versus momentum PMS", "Versus focused mutual funds", "Versus flexi-cap manager styles"],
  },
  {
    slug: "income-shield-pms",
    family: "pms",
    name: "Income Shield PMS",
    category: "Hybrid / income-focused PMS",
    summary: "A more conservative PMS route that broadens the family beyond pure equity aggression and helps wealth discovery feel more realistic for HNI capital-preservation conversations.",
    angle: "PMS pages should show whether the mandate is return-seeking, downside-aware, income-focused, or a hybrid of these, because investors often confuse all PMS products as one category.",
    benchmark: "CRISIL Hybrid / income benchmark",
    structure: "Discretionary PMS",
    minimumTicket: "₹50 lakh",
    riskLabel: "Moderate to high",
    manager: "Sample Income Advisory",
    status: "Open for review",
    liquidity: "Mandate terms, underlying instrument mix, and realized turnover influence investor flexibility and income stability",
    taxation: "Tax outcomes depend on realized gains and portfolio construction between debt-like and equity-like exposures",
    costNote: "Income-oriented positioning should still be judged on mandate quality, turnover, and downside behavior, not only fee language.",
    thesis:
      "A hybrid or income-focused PMS page should make it obvious whether the investor is buying yield comfort, lower drawdown ambition, or simply a softer marketing wrapper around a still-risky mandate.",
    keyPoints: [
      "Adds conservative-style breadth to the PMS family.",
      "Helps wealth discovery cover more than just aggressive tactical mandates.",
      "Useful when comparing PMS against balanced-advantage funds and debt-plus solutions.",
    ],
    researchStats: [
      { label: "Style", value: "Income-aware / hybrid discretionary" },
      { label: "Typical concentration", value: "20-35 line items" },
      { label: "Review rhythm", value: "Monthly income and allocation review" },
      { label: "Investor profile", value: "Capital-aware HNI allocator" },
    ],
    portfolioRole: [
      "Acts as a more moderated wealth sleeve for investors who still want PMS-led customization without full high-beta equity concentration.",
      "Can sit between debt-heavy products and aggressive PMS allocations in a broader HNI plan.",
      "Useful for users comparing whether a PMS adds enough value over hybrid mutual funds or debt-plus allocation products.",
    ],
    fitFor: [
      "Investors who want manager-led customization but with more downside or income awareness than aggressive PMS strategies.",
      "Families comparing PMS against balanced-advantage, equity-savings, or debt-plus allocation choices.",
      "Users prioritizing smoother capital behavior over raw upside chasing.",
    ],
    avoidIf: [
      "You want plain fixed-income simplicity or guaranteed cash-flow products.",
      "You expect very low volatility despite a still market-linked discretionary structure.",
      "You are treating the word income as proof of low-risk suitability without mandate analysis.",
    ],
    dueDiligence: [
      "Ask how the manager actually controls drawdown and whether the income framing reflects portfolio reality or only positioning language.",
      "Compare tax and cost impact against hybrid mutual funds if the mandate overlap is high.",
      "Review turnover, allocation flexibility, and instrument mix instead of assuming the product behaves like a debt proxy.",
    ],
    compareLanes: ["Versus balanced-advantage funds", "Versus debt-plus allocation sleeves", "Versus aggressive PMS mandates"],
  },
  {
    slug: "growth-equity-aif-cat-iii",
    family: "aif",
    name: "Growth Equity Opportunities AIF",
    category: "Category III AIF",
    summary: "Placeholder AIF page showing how the platform can handle alternative products with stronger compliance-aware framing.",
    angle: "AIF pages need clearer liquidity, structure, eligibility, and risk communication than retail-first stock pages.",
    benchmark: "Custom strategy benchmark",
    structure: "Category III AIF",
    minimumTicket: "₹1 crore",
    riskLabel: "Very high",
    manager: "Sample Alternative Capital",
    status: "Open for review",
    liquidity: "Lock-ins, side-pocketing, and redemption windows can materially change investor experience",
    taxation: "Depends on structure, category, and realized gains profile; suitability needs tax-led review",
    costNote: "Fees, carry, and fund-level expenses need to be evaluated together rather than as isolated numbers.",
    thesis:
      "A credible AIF page has to feel document-led and suitability-aware, with clear language around lock-ins, strategy complexity, manager discipline, and downside expectations.",
    keyPoints: [
      "AIF routes should be heavily structured and document-led.",
      "Eligibility, strategy, and lock-in context should always be obvious.",
      "This family should reuse the same CMS, documents, and lifecycle controls as other assets.",
    ],
    researchStats: [
      { label: "Category", value: "Category III alternative" },
      { label: "Access level", value: "Accredited / HNI" },
      { label: "Liquidity profile", value: "Limited windows" },
      { label: "Primary lens", value: "Alternative return stream" },
    ],
    portfolioRole: [
      "Useful as a non-plain-vanilla satellite allocation for investors already covered on core equity and debt.",
      "Should be assessed as part of a broader family office or HNI allocation plan, not as an isolated return promise.",
      "Can widen opportunity set, but only if governance and liquidity trade-offs are explicitly accepted.",
    ],
    fitFor: [
      "Eligible investors who need alternative strategy exposure and can absorb complexity.",
      "Users evaluating manager process, mandate boundaries, and downside governance in detail.",
      "Portfolios that already have enough plain-market exposure and want a differentiated sleeve.",
    ],
    avoidIf: [
      "You need instant liquidity or low-document complexity.",
      "You are uncomfortable with limited transparency compared with listed mutual products.",
      "You need retail-style simplicity in taxation, disclosures, and suitability checks.",
    ],
    dueDiligence: [
      "Read the PPM, liquidity terms, fee stack, and side-pocket or gating provisions carefully.",
      "Study the manager's strategy edge and whether risk controls are repeatable rather than narrative-heavy.",
      "Compare the lock-in and transparency trade-off against simpler listed alternatives before proceeding.",
    ],
    compareLanes: ["Versus Category II / III peers", "Versus PMS alternatives", "Versus listed tactical sleeves"],
  },
  {
    slug: "private-credit-yield-aif-cat-ii",
    family: "aif",
    name: "Private Credit Yield AIF",
    category: "Category II AIF",
    summary: "A private-credit AIF route that broadens the alternatives family beyond growth-equity exposure and makes income-oriented alternative research possible.",
    angle: "AIF pages need to separate equity-style alternative exposure from private-credit and yield-driven structures, because liquidity, documentation, and downside behavior can be completely different.",
    benchmark: "Private credit / target yield benchmark",
    structure: "Category II AIF",
    minimumTicket: "₹1 crore",
    riskLabel: "High",
    manager: "Sample Private Credit Partners",
    status: "Open for review",
    liquidity: "Capital can be locked for long periods, with exits dependent on fund structure, distributions, and underlying recovery timelines",
    taxation: "Needs product-specific review because yield distribution, accrual, and realized gains may not map neatly to listed-product assumptions",
    costNote: "Yield-led alternatives should always be judged against structure risk, manager underwriting quality, and true recovery comfort, not only headline payout math.",
    thesis:
      "A private-credit AIF page should feel diligence-led, because users need to understand underwriting style, portfolio transparency, liquidity trade-offs, and stress outcomes before treating yield as investable comfort.",
    keyPoints: [
      "Adds a non-equity alternative sleeve to the AIF family.",
      "Useful for comparing yield-led AIFs against debt-plus and structured-income ideas.",
      "Improves alternative-category realism beyond only growth-equity exposure.",
    ],
    researchStats: [
      { label: "Category", value: "Category II alternative" },
      { label: "Primary lens", value: "Yield and underwriting discipline" },
      { label: "Liquidity profile", value: "Locked and documentation heavy" },
      { label: "Investor profile", value: "HNI / accredited income-seeker" },
    ],
    portfolioRole: [
      "Acts as a differentiated income or yield-seeking sleeve for investors already covered across plain listed debt and equity.",
      "Can complement equity-heavy alternative allocations by adding a credit-underwriting lens instead of market-direction exposure.",
      "Should be treated as an institutional-style sleeve, not a retail fixed-income replacement.",
    ],
    fitFor: [
      "Eligible investors who understand credit risk, documentation, and yield-versus-liquidity trade-offs.",
      "Users comparing private credit against structured-income, debt-plus, and hybrid wealth sleeves.",
      "Portfolios seeking differentiated non-listed income exposure beyond conventional debt products.",
    ],
    avoidIf: [
      "You need listed-product liquidity or simple tax treatment.",
      "You are likely to evaluate only on target yield without manager underwriting review.",
      "You want low-document-complexity products with easy peer comparison.",
    ],
    dueDiligence: [
      "Review credit selection process, recovery assumptions, covenant strength, and manager track record before focusing on yield.",
      "Study fund terms, lock-in structure, and distribution expectations in adverse scenarios, not only base-case decks.",
      "Compare the complexity and liquidity trade-off against debt funds, debt ETFs, and other HNI income sleeves.",
    ],
    compareLanes: ["Versus debt-plus sleeves", "Versus structured-income products", "Versus growth-equity AIFs"],
  },
  {
    slug: "structured-income-sif",
    family: "sif",
    name: "Structured Income SIF",
    category: "Income-oriented SIF",
    summary: "Placeholder SIF page showing how Riddra can reserve space for new wealth-product families early and scale cleanly later.",
    angle: "SIF pages should be modular so new regulations, definitions, and product framing can be updated fast as the category matures.",
    benchmark: "Custom income benchmark",
    structure: "Specialized investment fund",
    minimumTicket: "As per issuer terms",
    riskLabel: "Product-specific",
    manager: "Sample Structured Asset Desk",
    status: "Emerging",
    liquidity: "Secondary liquidity and issuer exits can vary significantly across structures",
    taxation: "Should be reviewed product by product because structured features can alter the final tax lens",
    costNote: "Headline yield or income framing can hide embedded structure cost and complexity.",
    thesis:
      "SIF pages should educate first, then compare structure, issuer behavior, payout assumptions, and liquidity risks so the category can mature without confusing retail users.",
    keyPoints: [
      "SIF pages should stay glossary-friendly while still being institutionally structured.",
      "This route family is useful for future-first SEO and education demand.",
      "The backend should treat SIF as another installable asset family, not a one-off exception.",
    ],
    researchStats: [
      { label: "Category maturity", value: "Emerging" },
      { label: "Complexity", value: "High" },
      { label: "Primary lens", value: "Structured income / payoff" },
      { label: "Review need", value: "Documentation heavy" },
    ],
    portfolioRole: [
      "Reserved for niche structured sleeves where plain debt or equity products do not deliver the intended payoff profile.",
      "More useful for advanced users who understand issuer, payout, and liquidity trade-offs than for broad retail allocation.",
      "Can function as an educational category-builder while the market standardizes definitions and usage patterns.",
    ],
    fitFor: [
      "Advanced investors researching structured payoffs and issuer-linked products carefully.",
      "Users who want to compare emerging product design against traditional fixed-income or hybrid choices.",
      "Teams building future-ready coverage for categories that may become more mainstream later.",
    ],
    avoidIf: [
      "You want simple, liquid, and instantly comparable investment products.",
      "You are relying on a headline payoff without understanding embedded structure terms.",
      "You prefer categories with mature benchmarks and easy peer comparisons today.",
    ],
    dueDiligence: [
      "Review payoff mechanics, exit terms, issuer quality, and stress-case outcomes before evaluating yield alone.",
      "Document category definitions clearly because user misunderstanding risk is high while the market is still evolving.",
      "Keep glossary, FAQ, and suitability sections close to the product narrative rather than burying them in documents.",
    ],
    compareLanes: ["Versus target-maturity debt", "Versus structured notes", "Versus income-oriented alternates"],
  },
  {
    slug: "equity-hedged-sif",
    family: "sif",
    name: "Equity Hedged SIF",
    category: "Hedged-equity SIF",
    summary: "A hedged-equity SIF route that broadens the emerging SIF family beyond structured income and makes the category less one-dimensional.",
    angle: "SIF pages should clearly explain payoff logic, hedge behavior, and what kind of market environment the structure is actually built for, because category understanding is still immature.",
    benchmark: "Custom hedged-equity benchmark",
    structure: "Specialized investment fund",
    minimumTicket: "As per issuer terms",
    riskLabel: "Product-specific",
    manager: "Sample Hedged Strategies Desk",
    status: "Emerging",
    liquidity: "Liquidity depends on product structure, secondary market support, and issuer-specific exit design",
    taxation: "Needs product-specific review because hedge overlays and structured design can materially change the final tax lens",
    costNote: "Structured downside framing can hide complexity, embedded option cost, and conditional payoff trade-offs.",
    thesis:
      "A hedged-equity SIF page should help users understand what is being hedged, where upside is capped or reshaped, and why the product should not be confused with plain equity, debt, or hybrid mutual-fund categories.",
    keyPoints: [
      "Adds a second SIF style so the family is not limited to income-only framing.",
      "Useful for education-led discovery around hedge overlays and structured participation.",
      "Improves the future-ready product graph for emerging specialized categories.",
    ],
    researchStats: [
      { label: "Category maturity", value: "Emerging" },
      { label: "Primary lens", value: "Hedged equity participation" },
      { label: "Complexity", value: "High" },
      { label: "Review need", value: "Scenario and documentation heavy" },
    ],
    portfolioRole: [
      "Reserved for niche sleeves where investors want some equity participation but a different downside profile than plain listed equity.",
      "More useful as an educational and advanced-allocation route than a broad retail default product today.",
      "Can complement structured-income and alternative sleeves by giving SIF coverage a less one-dimensional product map.",
    ],
    fitFor: [
      "Advanced investors researching structured hedge overlays and payoff-shaped equity participation carefully.",
      "Users comparing whether structured hedging is preferable to hybrid, covered-call, or lower-beta public products.",
      "Teams building future-ready research coverage for emerging specialized fund structures.",
    ],
    avoidIf: [
      "You want simple listed-equity, passive, or hybrid choices with mature peer sets.",
      "You are relying on marketing around downside without understanding conditional payoff rules.",
      "You prefer categories that are already well standardized and easy to compare today.",
    ],
    dueDiligence: [
      "Review payoff scenarios, hedge construction, and exit terms before treating the product like a generic lower-risk equity substitute.",
      "Keep glossary, FAQ, and suitability guidance near the route headline because misunderstanding risk is high for this family.",
      "Compare the structure against plain hybrid, balanced-advantage, and covered-call style listed alternatives before proceeding.",
    ],
    compareLanes: ["Versus balanced-advantage funds", "Versus covered-call structures", "Versus structured-income SIFs"],
  },
];

export function getWealthProductsByFamily(family: WealthFamily) {
  return wealthProducts.filter((item) => item.family === family);
}

export function getWealthProductBySlug(family: WealthFamily, slug: string) {
  return wealthProducts.find((item) => item.family === family && item.slug === slug) ?? null;
}

function summarizeStatuses(products: WealthProduct[]) {
  const counts = new Map<string, number>();

  for (const product of products) {
    counts.set(product.status, (counts.get(product.status) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => `${count} ${label.toLowerCase()}`)
    .join(" / ");
}

function summarizeTicket(products: WealthProduct[]) {
  const tickets = Array.from(new Set(products.map((product) => product.minimumTicket)));

  if (tickets.length === 1) return tickets[0];
  if (tickets.length === 2) return `${tickets[0]} to ${tickets[1]}`;

  return `${tickets[0]} and broader ticket ranges`;
}

export function getWealthFamilyOverview(family: WealthFamily): WealthFamilyOverview {
  const products = getWealthProductsByFamily(family);
  const meta = wealthFamilyMeta[family];

  return {
    family,
    label: meta.label,
    href: meta.href,
    description: meta.description,
    status: meta.status,
    count: products.length,
    ticketSummary: summarizeTicket(products),
    statusSummary: summarizeStatuses(products),
    categories: Array.from(new Set(products.map((product) => product.category))).slice(0, 3),
    benchmarkHighlights: Array.from(new Set(products.map((product) => product.benchmark))).slice(0, 3),
    compareHighlights: Array.from(new Set(products.flatMap((product) => product.compareLanes))).slice(0, 3),
  };
}

export function getWealthFamilyOverviews() {
  return (Object.keys(wealthFamilyMeta) as WealthFamily[]).map((family) => getWealthFamilyOverview(family));
}
